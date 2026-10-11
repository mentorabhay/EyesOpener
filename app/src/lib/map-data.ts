// Eyes Opener: Reading and writing Light the Map. Server only.
/**
 * Reading and writing Light the Map. Server only.
 *
 * The privacy rule lives in the queries, not only in the page:
 * - the count of an area leaves the database only when it holds MAP_MIN_HOUSEHOLDS households or more
 *   (`having count(*) >= ...`), so a page cannot show a smaller one;
 * - no query here selects a household's name, a profile or a person. The one household read by id is the member's own;
 * - a staff test household is never written, and is left out of every count in case one ever were.
 * A household is found by the signed-in member's own account id. The browser sends three digits, or the key of a
 * welcome line, and nothing that names a household.
 */
import { and, asc, count, eq, gte, isNull, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import {
  isWelcomeKey, joinRefusal, litAreas, MAP_MIN_HOUSEHOLDS, parseArea, regionOf, shown, welcomeFor, welcomeRefusal,
  type AreaProblem, type LitArea, type MapRefusal, type Region, type WelcomeKey,
} from "@/lib/map";
import type { Member } from "@/lib/session";

const P = s.mapPlace;
/** Households that count: real ones. A staff test household belongs to no family. */
const real = isNull(s.account.previewFor);

export interface OwnPlace {
  area: string;
  region: Region | null;
  joinedAt: Date;
  /** Households on the area, or null while it is below the minimum. */
  households: number | null;
  /** True when this household has been on the area longest. */
  first: boolean;
  /** The line this household chose as lamp-lighter. Null when it chose none, or is not the lamp-lighter. */
  ownWelcome: WelcomeKey | null;
  /** The line the lamp-lighter chose, when that is another household. */
  welcome: WelcomeKey | null;
}

export interface MapView {
  lit: LitArea[];
  /** Households in the lit areas, added up. Null while no area is lit. */
  total: number | null;
  own: OwnPlace | null;
}

/** The household that has been on an area longest: the lamp-lighter. Its id and its line, nothing else. */
async function firstOf(area: string, x: Pick<typeof db, "select"> = db) {
  const [row] = await x.select({ accountId: P.accountId, welcome: P.welcome }).from(P).innerJoin(s.account, eq(s.account.id, P.accountId))
    .where(and(eq(P.area, area), real)).orderBy(asc(P.joinedAt), asc(P.accountId)).limit(1);
  return row ?? null;
}

/** The map as a member may see it: the lit areas, their total, and the member's own household's place. */
export async function mapFor(m: Member): Promise<MapView> {
  const [areas, [mine]] = await Promise.all([
    db.select({ area: P.area, households: count() }).from(P).innerJoin(s.account, eq(s.account.id, P.accountId))
      .where(real).groupBy(P.area).having(gte(count(), MAP_MIN_HOUSEHOLDS)),
    db.select().from(P).where(eq(P.accountId, m.account.id)),
  ]);
  const lit = litAreas(areas);
  let own: OwnPlace | null = null;
  if (mine) {
    const first = await firstOf(mine.area);
    const isFirst = first?.accountId === m.account.id;
    own = {
      area: mine.area, region: regionOf(mine.area), joinedAt: mine.joinedAt,
      households: lit.find((a) => a.area === mine.area)?.households ?? null,
      first: isFirst, ownWelcome: isFirst && isWelcomeKey(mine.welcome) ? mine.welcome : null,
      welcome: welcomeFor(m.account.id, first),
    };
  }
  /* the total is of lit areas only: a total of every household would give away how many sit in areas that are not shown */
  return { lit, total: shown(lit.reduce((n, a) => n + a.households, 0)), own };
}

export type JoinResult = { ok: true; area: string } | { ok: false; why: MapRefusal | AreaProblem };

/**
 * Puts the member's household on the map. A guardian's choice; three digits are kept and nothing else.
 * What was typed is checked before anything is stored, and a longer number is refused, never shortened.
 */
export async function joinMap(m: Member, typed: string, now = new Date()): Promise<JoinResult> {
  const [on] = await db.select({ id: P.accountId }).from(P).where(eq(P.accountId, m.account.id));
  const refused = joinRefusal({ canShare: m.can("share"), tester: m.tester, onMap: !!on });
  if (refused) return { ok: false, why: refused };
  const parsed = parseArea(typed);
  if (!parsed.ok) return parsed;
  const made = await db.insert(P).values({ accountId: m.account.id, area: parsed.area, joinedBy: m.user.id, joinedAt: now }).onConflictDoNothing().returning({ area: P.area });
  return made.length ? { ok: true, area: parsed.area } : { ok: false, why: "already" };
}

/** Takes the household off the map. The row is deleted, with its three digits and its welcome line. */
export async function leaveMap(m: Member): Promise<{ ok: true } | { ok: false; why: MapRefusal }> {
  if (!m.can("share")) return { ok: false, why: "not_allowed" };
  const gone = await db.delete(P).where(eq(P.accountId, m.account.id)).returning({ id: P.accountId });
  return gone.length ? { ok: true } : { ok: false, why: "not_on_map" };
}

/**
 * Sets, or clears with "", the welcome line of the member's area. Only the lamp-lighter can, and only to a line
 * from the fixed list. Whether the household is the lamp-lighter is read inside the same transaction as the write.
 */
export async function setWelcome(m: Member, line: string): Promise<{ ok: true; line: WelcomeKey | null } | { ok: false; why: MapRefusal }> {
  return db.transaction(async (tx) => {
    const [mine] = await tx.select({ area: P.area }).from(P).where(eq(P.accountId, m.account.id)).for("update");
    /* hold the area while its first household is read, so a household leaving at this moment cannot be overtaken */
    if (mine) await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`map:${mine.area}`}))`);
    const first = mine ? await firstOf(mine.area, tx) : null;
    const refused = welcomeRefusal({ canShare: m.can("share"), accountId: m.account.id, onMap: !!mine, first: first?.accountId ?? null, line });
    if (refused) return { ok: false as const, why: refused };
    const key = isWelcomeKey(line) ? line : null;
    await tx.update(P).set({ welcome: key }).where(eq(P.accountId, m.account.id));
    return { ok: true as const, line: key };
  });
}
