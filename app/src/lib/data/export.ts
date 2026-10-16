/**
 * A family's copy of everything stored about its household.
 *
 * WHERE THE FILE LIVES: nowhere. It is built at the moment a guardian downloads it and sent straight to their
 * browser. Nothing is written to a disk or a storage bucket, so there is no stored copy to leak, to expire or to
 * forget to delete, and no storage to pay for. The "job" for a copy is therefore small: asking makes the request
 * ready at once, and the download stays open for COPY_DAYS days (state.ts). Each download is read fresh from the
 * database in one read-only transaction, so every part of the file shows the same moment.
 * The cost of this choice: a household with years of one-minute monitor samples makes a file of some tens of
 * megabytes, built in memory. If that ever becomes too much for the server, write the parts out as a stream.
 *
 * WHAT IS IN IT is decided by the table list (tables.ts): every row the list calls the household's, in every
 * column, except the columns the list hides (the scrambled PINs). Rows are shaped by three plain rules:
 *  - an id that points inside the household is kept, so rows can be matched up;
 *  - an id that points at a person or a family member outside the household is replaced by a name;
 *  - an id that points at something shared (a team, a sponsor group) is replaced by what it is called.
 *
 * ONE GROWN-UP IS NOT ANOTHER. The file is made for the guardian who downloads it. Their own sign-in row is complete.
 * For the other grown-ups of the household it gives what the Family page already shows (name, seat, the day they
 * joined) and nothing else: not their email, and not a role they hold outside the household. For the same reason
 * the messages sent from the public site are only the downloader's own.
 */
import { asc, eq, inArray } from "drizzle-orm";
import { clips } from "@/copy/clips";
import { data as copy } from "@/copy/data";
import { results } from "@/copy/results";
import { exerciseBySlug, gameBySlug, programmeBySlug, testByKey } from "@/data";
import { clipTest } from "@/data/clips/keys";
import { gameGuideFor } from "@/data/game-guides";
import { guideFor } from "@/data/guides";
import { db, schema } from "@/db";
import { columnsOf, foreignKeys, ownedWhere, tableOf, type Scope } from "./owned";
import { PARTS, ruleFor, tableOfPart, type PartKey, type TableName } from "./tables";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type Row = Record<string, unknown>;

/** The slug every film session carries (CINEMA in src/lib/sessions.ts, repeated here so this file needs nothing of a signed-in request). */
const CINEMA = "two-eye-cinema";

export const FORMAT = "eyesopener-family-data";
export const FORMAT_VERSION = 1;

export interface FamilyFile {
  README: {
    what: string; madeAt: string; read: string[]; leftOut: string[]; notMedical: string;
    parts: Record<PartKey, { title: string; what: string; units?: Record<string, string>; rows: number }>;
  };
  format: typeof FORMAT;
  version: typeof FORMAT_VERSION;
  madeAt: string;
  names: {
    items: Record<string, { name: string; kind: string; numbers?: Record<string, string> }>;
    programmes: Record<string, string>;
    checkUps: Record<string, { name: string; unit: string; what: string }>;
  };
  data: Record<PartKey, Row[]>;
}

/** Rows are written oldest first, by the first of these columns a table has. */
const ORDER_BY = ["takenAt", "startedAt", "createdAt", "grantedAt", "calibratedAt", "joinedAt", "at", "day", "unlockedAt", "updatedAt"];

/** "counsellorId" and "approvedBy" become "counsellorName" and "approvedByName". */
const nameKey = (column: string) => `${column.replace(/Id$/, "")}Name`;
const baseKey = (column: string) => column.replace(/Id$/, "");
const idsIn = (rows: Row[], column: string) => [...new Set(rows.map((r) => r[column]).filter((v): v is string => typeof v === "string"))];

/**
 * Shared things a row can point at, and what each is called. The id is dropped and these words are written instead,
 * under the column's name without "Id": teamId becomes team and teamLeague.
 * `keepId` is for a thing the family can open in the app by that id.
 */
const SHARED: Partial<Record<TableName, { keepId?: boolean; describe: (tx: Tx, ids: string[]) => Promise<Map<string, Record<string, unknown>>> }>> = {
  team: {
    describe: async (tx, ids) => new Map((await tx.select({ id: schema.team.id, name: schema.team.name, league: schema.league.name })
      .from(schema.team).innerJoin(schema.league, eq(schema.league.id, schema.team.leagueId)).where(inArray(schema.team.id, ids)))
      .map((r) => [r.id, { "": r.name, League: r.league }])),
  },
  focusWall: {
    describe: async (tx, ids) => new Map((await tx.select({ id: schema.focusWall.id, title: schema.focusWall.title, month: schema.focusWall.month })
      .from(schema.focusWall).where(inArray(schema.focusWall.id, ids))).map((r) => [r.id, { "": r.title, Month: r.month }])),
  },
  glassesPair: {
    describe: async (tx, ids) => new Map((await tx.select({ id: schema.glassesPair.id, code: schema.glassesPair.code })
      .from(schema.glassesPair).where(inArray(schema.glassesPair.id, ids))).map((r) => [r.id, { "": r.code }])),
  },
  sponsorGroup: {
    describe: async (tx, ids) => new Map((await tx.select({ id: schema.sponsorGroup.id, name: schema.sponsorGroup.name, sponsor: schema.sponsor.name })
      .from(schema.sponsorGroup).innerJoin(schema.sponsor, eq(schema.sponsor.id, schema.sponsorGroup.sponsorId)).where(inArray(schema.sponsorGroup.id, ids)))
      .map((r) => [r.id, { "": r.name, Sponsor: r.sponsor }])),
  },
  experiment: {
    keepId: true,
    describe: async (tx, ids) => new Map((await tx.select({ id: schema.experiment.id, idea: schema.protocol.title })
      .from(schema.experiment).innerJoin(schema.protocol, eq(schema.protocol.id, schema.experiment.protocolId)).where(inArray(schema.experiment.id, ids)))
      .map((r) => [r.id, { Idea: r.idea }])),
  },
  discoveryRound: {
    describe: async (tx, ids) => new Map((await tx.select({ id: schema.discoveryRound.id, title: schema.discoveryRound.title })
      .from(schema.discoveryRound).where(inArray(schema.discoveryRound.id, ids))).map((r) => [r.id, { "": r.title }])),
  },
  discoveryQuestion: {
    describe: async (tx, ids) => new Map((await tx.select({ id: schema.discoveryQuestion.id, question: schema.discoveryQuestion.question })
      .from(schema.discoveryQuestion).where(inArray(schema.discoveryQuestion.id, ids))).map((r) => [r.id, { "": r.question }])),
  },
};
/** The shared tables the copy can put into words. A test checks that every key from a family's rows to a shared table is one of these. */
export const DESCRIBED = Object.keys(SHARED) as TableName[];

/** Facts added to a part beside its stored columns, where a column is hidden and the family should still know something of it. */
const EXTRA: Partial<Record<PartKey, (raw: Row) => Row>> = {
  household: (r) => ({ exitPinSet: !!r.exitPinHash, staffTestHousehold: !!r.previewFor }),
  profiles: (r) => ({ pinSet: !!r.pinHash }),
};

/** What the file gives about a grown-up of the household other than the one who downloads it. */
export const OTHER_PERSON_COLUMNS = ["id", "displayName", "accountId", "seat", "createdAt"];

/**
 * Builds the file for one household, for the guardian `viewer` who downloads it. Null when the household does not exist.
 * The caller decides who may have it: this function trusts the id it is given.
 */
export async function buildFamilyFile(accountId: string, viewer: { id: string; email: string } | null, now = new Date()): Promise<FamilyFile | null> {
  return db.transaction(async (tx) => {
    const [account] = await tx.select({ id: schema.account.id }).from(schema.account).where(eq(schema.account.id, accountId)).limit(1);
    if (!account) return null;
    const [profiles, people] = await Promise.all([
      tx.select({ id: schema.profile.id }).from(schema.profile).where(eq(schema.profile.accountId, accountId)),
      tx.select({ id: schema.appUser.id, email: schema.appUser.email }).from(schema.appUser).where(eq(schema.appUser.accountId, accountId)),
    ]);
    const scope: Scope = { accountId, profileIds: profiles.map((p) => p.id), personIds: people.map((p) => p.id), emails: viewer ? [viewer.email.toLowerCase()] : [] };
    const ourProfiles = new Set(scope.profileIds), ourPeople = new Set(scope.personIds);

    /* 1. every row the list calls the household's, as stored */
    const raw = {} as Record<PartKey, Row[]>;
    for (const part of PARTS) {
      const name = tableOfPart(part), where = ownedWhere(name, scope), cols = columnsOf(name);
      const order = [ORDER_BY.find((c) => cols[c]), cols.id ? "id" : undefined].filter((c): c is string => !!c).map((c) => asc(cols[c]));
      raw[part] = where ? await tx.select().from(tableOf(name)).where(where).orderBy(...order) : [];
    }

    /* 2. names for whoever and whatever a row points at outside the household */
    const outside = { people: new Set<string>(), profiles: new Set<string>() };
    const shared = new Map<TableName, Set<string>>();
    for (const part of PARTS) {
      for (const fk of foreignKeys(tableOfPart(part))) {
        const ids = idsIn(raw[part], fk.column);
        if (fk.to === "appUser") ids.filter((id) => !ourPeople.has(id)).forEach((id) => outside.people.add(id));
        else if (fk.to === "profile") ids.filter((id) => !ourProfiles.has(id)).forEach((id) => outside.profiles.add(id));
        else if (SHARED[fk.to]) ids.forEach((id) => (shared.get(fk.to) ?? shared.set(fk.to, new Set()).get(fk.to)!).add(id));
      }
    }
    /* A counsellor is named only when linked to this household: the family already sees that name in Settings. */
    const linked = new Set(idsIn(raw.counsellorLinks, "counsellorId"));
    const [counsellors, strangers] = await Promise.all([
      linked.size ? tx.select({ id: schema.appUser.id, name: schema.appUser.displayName }).from(schema.appUser).where(inArray(schema.appUser.id, [...linked])) : [],
      /* A light shows the giver's or receiver's name in the app already. */
      outside.profiles.size ? tx.select({ id: schema.profile.id, name: schema.profile.displayName }).from(schema.profile).where(inArray(schema.profile.id, [...outside.profiles])) : [],
    ]);
    const personName = (id: string) => { const c = counsellors.find((x) => x.id === id); return c ? copy.file.counsellor(c.name) : copy.file.outside; };
    const profileName = (id: string) => strangers.find((x) => x.id === id)?.name ?? copy.file.otherFamily;
    const words = new Map<TableName, Map<string, Record<string, unknown>>>();
    for (const [table, ids] of shared) words.set(table, await SHARED[table]!.describe(tx, [...ids]));

    /* 3. shape each row */
    const dataOut = {} as Record<PartKey, Row[]>;
    for (const part of PARTS) {
      const name = tableOfPart(part), rule = ruleFor(name);
      const hide = new Set(Object.keys(("part" in rule.copy && rule.copy.hide) || {}));
      const keys = new Map(foreignKeys(name).map((fk) => [fk.column, fk.to]));
      dataOut[part] = raw[part].map((row) => {
        const out: Row = {};
        for (const [column, value] of Object.entries(row)) {
          if (hide.has(column)) continue;
          const to = keys.get(column);
          if (typeof value !== "string" || !to) out[column] = value;
          else if (to === "appUser") { if (ourPeople.has(value)) out[column] = value; else out[nameKey(column)] = personName(value); }
          else if (to === "profile") { if (ourProfiles.has(value)) out[column] = value; else out[nameKey(column)] = profileName(value); }
          else if (SHARED[to]) {
            if (SHARED[to].keepId) out[column] = value;
            for (const [suffix, word] of Object.entries(words.get(to)?.get(value) ?? {})) out[baseKey(column) + suffix] = word;
          } else out[column] = value;
        }
        return { ...out, ...EXTRA[part]?.(row) };
      });
    }
    dataOut.people = dataOut.people.map((p) => (p.id === viewer?.id ? p : Object.fromEntries(Object.entries(p).filter(([k]) => OTHER_PERSON_COLUMNS.includes(k)))));

    /* 4. what the short codes mean */
    const names: FamilyFile["names"] = { items: {}, programmes: {}, checkUps: {} };
    const numbers = (list: readonly { key: string; label: string; unit: string }[] | undefined, kit: boolean) => {
      const out: Record<string, string> = {};
      if (kit) for (const [key, m] of Object.entries(results.game)) out[key] = copy.file.measure(m.label, m.unit);
      if (kit) out.level = copy.file.level;
      for (const m of list ?? []) out[m.key] = copy.file.measure(m.label, m.unit);
      return Object.keys(out).length ? out : undefined;
    };
    for (const slug of new Set([...idsIn(raw.sessions, "itemSlug"), ...idsIn(raw.careLog, "itemSlug")])) {
      const game = gameBySlug(slug), exercise = exerciseBySlug(slug);
      if (game) names.items[slug] = { name: game.name, kind: copy.file.kinds.game, numbers: numbers(gameGuideFor(slug)?.measures, true) };
      else if (exercise) names.items[slug] = { name: exercise.name, kind: copy.file.kinds.exercise, numbers: numbers(guideFor(slug)?.measures, false) };
      else if (slug === CINEMA) names.items[slug] = { name: copy.file.cinema, kind: copy.file.kinds.film };
      /* the workday monitor is not a catalogue item: its runs and the breaks it saw carry this slug (src/lib/monitor-rules.ts) */
      else if (slug === "workday-monitor") names.items[slug] = { name: copy.file.monitor, kind: copy.file.kinds.monitor };
    }
    for (const slug of idsIn(raw.programmes, "programme")) { const p = programmeBySlug(slug); if (p) names.programmes[slug] = p.name; }
    for (const key of new Set([...idsIn(raw.checkUps, "testKey"), ...raw.sessions.filter((s) => s.kind === "test").map((s) => String(s.itemSlug))])) {
      const t = testByKey(key), own = t ? undefined : clipTest(key);
      if (t) names.checkUps[key] = { name: t.name, unit: t.unit, what: t.what };
      /* a result a clip keeps under a key of its own (src/data/clips/keys.ts) */
      else if (own) names.checkUps[key] = { name: own.name, unit: own.unit, what: clips.inFile };
    }

    const madeAt = now.toISOString(), r = copy.file.readme;
    const parts = Object.fromEntries(PARTS.map((p) => [p, { ...copy.file.parts[p], rows: dataOut[p].length }])) as FamilyFile["README"]["parts"];
    return { README: { what: r.what, madeAt, read: r.read, leftOut: r.leftOut, notMedical: r.notMedical, parts }, format: FORMAT, version: FORMAT_VERSION, madeAt, names, data: dataOut };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}
