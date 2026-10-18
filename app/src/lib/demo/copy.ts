/**
 * Each person trying the demo works in their own copy of the seeded family (Ved, 18 October 2026), so one tester's
 * sessions, check-ups and settings never mix with another's. Server only.
 *
 *  - At the demo sign-in a tester types their name and picks a person of the family. The first time, the whole
 *    household is copied for that name (`copyFor`); the next time, the same name finds the same copy.
 *  - The copy holds everything that is the family's own: the household, its grown-ups, profiles, consent, safety
 *    answers, screens, setup runs, eye settings, check-ups, programmes, sessions, days, care plans and logs,
 *    workday samples, streaks, clip runs, reminders, heroes, and the links to the demo counsellor (so Dr Rao sees
 *    each copy as a family of their own). Community things (ideas, mail, lights, teams, duets, walls, the sponsor
 *    group) are not copied: they are shared, and a copy would show them twice to everyone.
 *  - Ids are new; every pointer to a copied row is moved to its copy, and a pointer to anything else (Dr Rao, a staff
 *    member) is kept. Times are kept, so the copy's history reads as the seeded one does.
 *  - A copy is a demo household (`isDemo`) with `demoCopyOf` set. The demo list shows the seeded household only, and
 *    the copy's grown-ups have addresses no real mailbox can have (name+tag@eyesopener.test).
 */
import crypto from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { db, schema } from "@/db";
import { auth as words } from "@/copy/auth";
import { columnsOf, ownedWhere, tableOf, type Scope } from "@/lib/data/owned";
import type { TableName } from "@/lib/data/tables";

/** What is copied, parents before the rows that point at them. */
export const COPIED: readonly TableName[] = [
  "account", "appUser", "profile", "consent", "triage", "device", "onboardingRun", "eyeProfile", "testResult",
  "enrolment", "session", "daySummary", "carePlan", "careLog", "monitorSample", "streak", "counsellorLink", "hero",
  "clipRun", "reminder",
];

export const TESTER_MAX = 40;
/** The name as typed, tidied; null when it cannot be used. Letters of any script, numbers, spaces, dots and dashes. */
export function testerName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.replace(/\s+/g, " ").trim();
  return name && name.length <= TESTER_MAX && /^[\p{L}\p{M}\p{N} .'-]+$/u.test(name) ? name : null;
}
/** The key that finds a tester's copy again: the name in small letters. */
export const testerKey = (name: string) => name.toLocaleLowerCase("en").normalize("NFC");
/** A short tag for the copy's addresses, the same for the same name. */
const tagOf = (key: string) => crypto.createHash("sha256").update(`demo-copy:${key}`).digest("hex").slice(0, 8);
const copiedEmail = (email: string, tag: string) => { const at = email.lastIndexOf("@"); return `${email.slice(0, at).split("+")[0]}+${tag}@eyesopener.test`; };

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Row = Record<string, unknown>;

/** The tester's copy of a seeded household, made now when there is none. Returns the copy's id. */
export async function copyFor(sourceId: string, name: string): Promise<string | null> {
  const key = testerKey(name);
  return db.transaction(async (tx) => {
    /* one copy per name: two presses at once wait for each other */
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`demo-copy:${sourceId}:${key}`}, 0))`);
    const [found] = await tx.select({ id: schema.account.id }).from(schema.account)
      .where(and(eq(schema.account.demoCopyOf, sourceId), eq(schema.account.demoTesterKey, key))).limit(1);
    if (found) return found.id;
    const [source] = await tx.select().from(schema.account)
      .where(and(eq(schema.account.id, sourceId), eq(schema.account.isDemo, true), isNull(schema.account.demoCopyOf))).limit(1);
    if (!source) return null;
    return copyHousehold(tx, source, name, key);
  });
}

async function copyHousehold(tx: Tx, source: typeof schema.account.$inferSelect, name: string, key: string): Promise<string> {
  const profiles = await tx.select({ id: schema.profile.id }).from(schema.profile).where(eq(schema.profile.accountId, source.id));
  const people = await tx.select({ id: schema.appUser.id, email: schema.appUser.email }).from(schema.appUser).where(eq(schema.appUser.accountId, source.id));
  const scope: Scope = { accountId: source.id, profileIds: profiles.map((p) => p.id), personIds: people.map((p) => p.id), emails: [] };
  const ids = new Map<string, string>();
  const tag = tagOf(key);
  let copyId = "";

  for (const table of COPIED) {
    const where = ownedWhere(table, scope);
    if (!where) continue;
    const rows = (await tx.select().from(tableOf(table) as PgTable).where(where)) as Row[];
    if (!rows.length) continue;
    const hasId = !!columnsOf(table).id;
    /* the new ids first, so a row that points at another row of the same table finds it */
    if (hasId) for (const r of rows) ids.set(String(r.id), crypto.randomUUID());
    const out = rows.map((r) => {
      const c: Row = {};
      for (const [col, v] of Object.entries(r)) c[col] = typeof v === "string" && ids.has(v) ? ids.get(v) : v;
      return adjust(table, c, { source, name, key, tag });
    });
    /* in parts, so a long history (the workday samples) stays inside the database's limit on one statement */
    for (let i = 0; i < out.length; i += 400) await tx.insert(tableOf(table) as PgTable).values(out.slice(i, i + 400) as never);
    if (table === "account") copyId = String(out[0].id);
  }
  return copyId;
}

/** The few columns a copy must not share with the seeded rows. */
function adjust(table: TableName, row: Row, o: { source: typeof schema.account.$inferSelect; name: string; key: string; tag: string }): Row {
  if (table === "account") {
    return { ...row, displayName: words.tester.household(o.source.displayName, o.name), isDemo: true, previewFor: null, demoCopyOf: o.source.id, demoTester: o.name, demoTesterKey: o.key, createdAt: new Date() };
  }
  if (table === "appUser") return { ...row, email: copiedEmail(String(row.email), o.tag), firebaseUid: null, sessionsValidAfter: null };
  return row;
}

/** The person and their seeded demo household, when the id is a grown-up of one. Null for anyone else. */
export async function seededFamilyOf(userId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return null;
  const [picked] = await db.select({ user: schema.appUser, account: schema.account }).from(schema.appUser)
    .innerJoin(schema.account, eq(schema.account.id, schema.appUser.accountId))
    .where(and(eq(schema.appUser.id, userId), eq(schema.account.isDemo, true), isNull(schema.account.demoCopyOf))).limit(1);
  return picked ?? null;
}

/**
 * The grown-up in the tester's copy who stands for the person picked in the seeded household: the same seat and the
 * same name. Null when the picked person is not in a seeded demo household (staff, a counsellor, a sponsor).
 */
export async function standInFor(userId: string, name: string): Promise<{ userId: string } | { problem: "not_household" | "failed" }> {
  const picked = await seededFamilyOf(userId);
  if (!picked) return { problem: "not_household" };
  const copyId = await copyFor(picked.account.id, name);
  if (!copyId) return { problem: "failed" };
  const want = copiedEmail(picked.user.email, tagOf(testerKey(name)));
  const [same] = await db.select({ id: schema.appUser.id }).from(schema.appUser)
    .where(and(eq(schema.appUser.accountId, copyId), eq(schema.appUser.email, want))).limit(1);
  return same ? { userId: same.id } : { problem: "failed" };
}

/** The names of the testers who have a copy of a seeded household, in the order the copies were made. */
export async function testersOf(sourceId: string): Promise<string[]> {
  const rows = await db.select({ name: schema.account.demoTester }).from(schema.account)
    .where(eq(schema.account.demoCopyOf, sourceId)).orderBy(schema.account.createdAt);
  return rows.flatMap((r) => (r.name ? [r.name] : []));
}
