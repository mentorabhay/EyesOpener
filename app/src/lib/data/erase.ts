// Eyes Opener: Deleting for good: a whole household, or one profile of it.
/**
 * Deleting for good: a whole household, or one profile of it.
 *
 * Everything here runs inside one database transaction that the caller opens, so a deletion either happens
 * completely or not at all. What is removed is decided by the table list (tables.ts), not by this file:
 *
 *  1. The ids of every row about to go are gathered. Audit lines that mention any of them are scrubbed: the line
 *     stays (who on staff did what kind of thing, and when), but its target and its details are emptied, so no
 *     household name, idea title or id survives in the log.
 *  2. Rows the list marks "unlink" are kept with their pointer emptied (a tile on the shared wall).
 *  3. Rows are removed table by table in the listed order, the household itself last.
 *  4. The grown-ups: one who signs in only for this household is deleted, and their demo or Firebase session with them,
 *     because a session names a person who no longer exists. One who also signs in as staff, as a counsellor or for a
 *     sponsor keeps that sign-in and loses only the seat in the household.
 *
 * Never deleted: the demo family (every visitor of the public demo shares it).
 * What survives a deletion is written by the caller: one audit line with counts only.
 *
 * The sign-in service: a person who is deleted here must also be removed from Firebase Authentication. Their id
 * there is queued inside this transaction (`queueRemoval`), and the daily job removes the queued accounts right
 * after its deletions, in the same run (src/lib/signin/removal.ts). People who keep their sign-in are not queued.
 */
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { resolveStaffRole } from "@/lib/roles";
import { queueRemoval } from "@/lib/signin/removal";
import { columnsOf, ownedWhere, tableOf, type Scope } from "./owned";
import { splitPeople } from "./state";
import { ERASE_ORDER, ruleFor, TABLE_NAMES } from "./tables";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type Erased =
  | { ok: true; profiles: number; people: number; peopleKept: number; rows: number; testHousehold: boolean }
  | { ok: false; why: "missing" | "demo" | "last_one" };

interface People { gone: string[]; keep: string[] }
const NOBODY: People = { gone: [], keep: [] };

/** Removes the scope's rows. Returns how many rows went, across every table. */
async function sweep(tx: Tx, scope: Scope, people: People): Promise<number> {
  /* 1. the ids about to go, kept for the length of this transaction only */
  await tx.execute(sql`create temp table if not exists erase_ids (id text primary key) on commit drop`);
  await tx.execute(sql`delete from erase_ids`);
  for (const name of TABLE_NAMES) {
    const id = columnsOf(name).id, where = ruleFor(name).erase === "rows" ? ownedWhere(name, scope) : null;
    if (id && where) await tx.execute(sql`insert into erase_ids (id) select ${id}::text from ${tableOf(name)} where ${where} on conflict do nothing`);
  }
  if (people.gone.length) await tx.execute(sql`insert into erase_ids (id) values ${sql.join(people.gone.map((id) => sql`(${id})`), sql`, `)} on conflict do nothing`);
  await tx.execute(sql`
    update audit_log as a set target = null, meta = '{"erased": true}'::jsonb
    where exists (select 1 from erase_ids e where e.id = a.target)
       or (a.meta is not null and exists (
            select 1 from jsonb_path_query(a.meta, '$.**') as v(j)
            join erase_ids e on e.id = (v.j #>> '{}')
            where jsonb_typeof(v.j) = 'string'))`);

  /* 2. rows that stay, with the pointer emptied */
  for (const name of TABLE_NAMES) {
    const rule = ruleFor(name);
    if (rule.erase !== "unlink" || !scope.profileIds.length) continue;
    for (const c of rule.owner?.profile ?? []) {
      await tx.update(tableOf(name)).set({ [c]: null } as never).where(inArray(columnsOf(name)[c], [...scope.profileIds]));
    }
  }

  /* 3. and 4. rows removed in order; the grown-ups just before the household itself */
  let rows = 0;
  for (const name of ERASE_ORDER) {
    if (name === "account") {
      if (people.keep.length) await tx.update(schema.appUser).set({ accountId: null, seat: null }).where(inArray(schema.appUser.id, people.keep));
      /* Before the people go: note which sign-in accounts must be removed from the sign-in service. */
      if (people.gone.length) await queueRemoval(tx, people.gone);
      if (people.gone.length) rows += (await tx.delete(schema.appUser).where(inArray(schema.appUser.id, people.gone))).rowCount ?? 0;
    }
    const where = ownedWhere(name, scope);
    if (where) rows += (await tx.delete(tableOf(name)).where(where)).rowCount ?? 0;
  }
  return rows;
}

/** The household's whole scope: its profiles (archived ones too), its grown-ups and the addresses of those who go. */
async function scopeOf(tx: Tx, accountId: string) {
  const profiles = await tx.select({ id: schema.profile.id }).from(schema.profile).where(eq(schema.profile.accountId, accountId));
  const people = await tx.select({ id: schema.appUser.id, email: schema.appUser.email, staffRole: schema.appUser.staffRole, isCounsellor: schema.appUser.isCounsellor })
    .from(schema.appUser).where(eq(schema.appUser.accountId, accountId)).for("update");
  const ids = people.map((p) => p.id);
  const [sponsors, counsellors] = ids.length ? await Promise.all([
    tx.selectDistinct({ id: schema.sponsorUser.userId }).from(schema.sponsorUser).where(inArray(schema.sponsorUser.userId, ids)),
    tx.selectDistinct({ id: schema.counsellorLink.counsellorId }).from(schema.counsellorLink).where(inArray(schema.counsellorLink.counsellorId, ids)),
  ]) : [[], []];
  const { keep, gone } = splitPeople(people.map((p) => ({
    ...p,
    staff: !!resolveStaffRole(p.staffRole, p.email, process.env.ADMIN_EMAILS ?? ""),
    counsellor: p.isCounsellor || counsellors.some((c) => c.id === p.id),
    sponsor: sponsors.some((s) => s.id === p.id),
  })));
  const scope: Scope = { accountId, profileIds: profiles.map((p) => p.id), personIds: ids, emails: gone.map((p) => p.email.toLowerCase()) };
  return { scope, people: { gone: gone.map((p) => p.id), keep: keep.map((p) => p.id) } };
}

/**
 * Deletes a household and everything about it. The caller's transaction must already be open.
 * Refuses the demo family. Answers "missing" when the household is already gone, so running twice is safe.
 */
export async function eraseHousehold(tx: Tx, accountId: string): Promise<Erased> {
  /* Hold the household's row, so a request made at the same moment waits for this to finish. */
  const [account] = await tx.select({ id: schema.account.id, isDemo: schema.account.isDemo, previewFor: schema.account.previewFor })
    .from(schema.account).where(eq(schema.account.id, accountId)).for("update");
  if (!account) return { ok: false, why: "missing" };
  if (account.isDemo) return { ok: false, why: "demo" };
  const { scope, people } = await scopeOf(tx, accountId);
  let rows = 0;
  /* A person who is deleted may once have been staff with a test household of their own. It would be left pointing at nobody, so it goes too. */
  if (people.gone.length) {
    const tests = await tx.select({ id: schema.account.id }).from(schema.account).where(and(inArray(schema.account.previewFor, people.gone), ne(schema.account.id, accountId)));
    for (const t of tests) rows += await sweep(tx, (await scopeOf(tx, t.id)).scope, NOBODY);
  }
  rows += await sweep(tx, scope, people);
  return { ok: true, profiles: scope.profileIds.length, people: people.gone.length, peopleKept: people.keep.length, rows, testHousehold: !!account.previewFor };
}

/**
 * Deletes one profile and everything about it, and leaves the rest of the household alone: its screens, its other
 * profiles, its grown-ups. Refuses the demo family, and refuses to remove the last profile a household can open.
 */
export async function eraseProfile(tx: Tx, profileId: string): Promise<Erased> {
  const [profile] = await tx.select({ id: schema.profile.id, accountId: schema.profile.accountId }).from(schema.profile).where(eq(schema.profile.id, profileId));
  if (!profile) return { ok: false, why: "missing" };
  const [account] = await tx.select({ isDemo: schema.account.isDemo, previewFor: schema.account.previewFor })
    .from(schema.account).where(eq(schema.account.id, profile.accountId)).for("update");
  if (!account) return { ok: false, why: "missing" };
  if (account.isDemo) return { ok: false, why: "demo" };
  const others = await tx.select({ id: schema.profile.id }).from(schema.profile)
    .where(and(eq(schema.profile.accountId, profile.accountId), ne(schema.profile.id, profileId), isNull(schema.profile.archivedAt))).limit(1);
  if (!others.length) return { ok: false, why: "last_one" };
  const rows = await sweep(tx, { accountId: null, profileIds: [profileId], personIds: [], emails: [] }, NOBODY);
  return { ok: true, profiles: 1, people: 0, peopleKept: 0, rows, testHousehold: !!account.previewFor };
}
