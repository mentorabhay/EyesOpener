// Eyes Opener: Focus Wall: reading and writing. Server only. The rules are in wall-rules.ts.
/**
 * Focus Wall: reading and writing. Server only. The rules are in wall-rules.ts.
 *
 * A wall is shared by everyone, and a tile says nothing about who earned it: other families see that a tile is in
 * focus and nothing else. `profileId` on a tile is read only to mark a household's own tiles for that household,
 * and to make sure one finished day earns one tile.
 */
import { and, asc, count, desc, eq, gt, gte, inArray, isNull, lt, notExists, sql } from "drizzle-orm";
import { wall as words } from "@/copy/wall";
import { db, schema as s } from "@/db";
import { MAX_DAILY_MINUTES } from "@/engine";
import { DAY_SLACK_MINUTES } from "@/lib/league";
import { todayKey, type Member } from "@/lib/session";
import { artworkFor, earnsTile, focusOf, freeTile, isMonth, monthOf, shiftMonth, tilesDue, tilesFor, wallGrid } from "./wall-rules";
import { inEnglish } from "@/i18n/runtime";

type Wall = typeof s.focusWall.$inferSelect;
const D = s.daySummary, T = s.focusTile;

const inMonth = (month: string) => and(gte(D.day, `${month}-01`), lt(D.day, `${shiftMonth(month, 1)}-01`));
/**
 * Days that may be finished, as the database can tell: minutes were set and were reached. It is the same test as
 * `finishedDay` in the league's rules, which has the last word on every row before a tile is given.
 */
const maybeFinished = () => and(gt(D.trainGoal, 0), sql`${D.trainMinutes} >= least(${D.trainGoal}, ${MAX_DAILY_MINUTES}::real) - ${DAY_SLACK_MINUTES}::real`);
/** A staff member's own test household is left out of every count. */
const realHouseholds = () => isNull(s.account.previewFor);

export async function wallOf(month: string): Promise<Wall | null> {
  const [wall] = await db.select().from(s.focusWall).where(eq(s.focusWall.month, month));
  return wall ?? null;
}

/** Practice days finished in a month, across the community. */
export async function finishedIn(month: string): Promise<number> {
  const [row] = await db.select({ n: count() }).from(D)
    .innerJoin(s.profile, eq(s.profile.id, D.profileId)).innerJoin(s.account, eq(s.account.id, s.profile.accountId))
    .where(and(inMonth(month), maybeFinished(), realHouseholds()));
  return row?.n ?? 0;
}

/** The wall for a month, made when it is first needed: the month's own picture, sized from the month before. */
export async function ensureWall(month: string): Promise<Wall> {
  const have = await wallOf(month);
  if (have) return have;
  await db.insert(s.focusWall)
    .values({ month, title: inEnglish(() => words.art[artworkFor(month)].title), artist: inEnglish(() => words.artist), tiles: tilesFor(await finishedIn(shiftMonth(month, -1))) })
    .onConflictDoNothing({ target: s.focusWall.month });
  return (await wallOf(month))!;
}

/**
 * Gives every finished practice day of a month its tile, if it has none yet. Safe to run at any time and as often
 * as wanted: a day that has its tile is passed over, and the database refuses a second tile for the same profile
 * and day. With `profileIds` only those profiles' days are looked at. Returns the number of tiles added.
 */
export async function settleTiles(month: string, { today = todayKey(), profileIds }: { today?: string; profileIds?: string[] } = {}): Promise<number> {
  if (!isMonth(month) || month > monthOf(today) || profileIds?.length === 0) return 0;
  const wall = await ensureWall(month);
  const days = await db.select({ profileId: D.profileId, day: D.day, trainMinutes: D.trainMinutes, trainGoal: D.trainGoal }).from(D)
    .innerJoin(s.profile, eq(s.profile.id, D.profileId)).innerJoin(s.account, eq(s.account.id, s.profile.accountId))
    .where(and(
      inMonth(month), maybeFinished(), realHouseholds(), profileIds ? inArray(D.profileId, profileIds) : undefined,
      notExists(db.select({ one: sql`1` }).from(T).where(and(eq(T.wallId, wall.id), eq(T.profileId, D.profileId), eq(T.day, D.day)))),
    ));
  const due = tilesDue(days.filter((d) => d.day <= today), new Set());
  if (!due.length) return 0;

  const read = () => db.select({ idx: T.idx, profileId: T.profileId, day: T.day }).from(T).where(eq(T.wallId, wall.id));
  let now = await read(), added = 0;
  for (const d of due) {
    /* A few tries: another family may take the same tile in the same moment. */
    for (let tries = 0; tries < 6; tries++) {
      const idx = freeTile(new Set(now.map((t) => t.idx)), wall.tiles, Math.random);
      if (idx === null) return added;
      const [row] = await db.insert(T).values({ wallId: wall.id, idx, profileId: d.profileId, day: d.day }).onConflictDoNothing().returning({ idx: T.idx });
      if (row) { now.push({ idx, profileId: d.profileId, day: d.day }); added++; break; }
      now = await read();
      if (now.some((t) => t.profileId === d.profileId && t.day === d.day)) break;
    }
  }
  return added;
}

export interface WallShown {
  month: string; art: ReturnType<typeof artworkFor>; tiles: number; cols: number; rows: number;
  sharp: ReadonlySet<number>; ours: ReadonlySet<number>; count: number; share: number; complete: boolean;
}

const shown = (wall: Wall, tiles: { idx: number; profileId: string | null }[], family: ReadonlySet<string>): WallShown => {
  const f = focusOf(wall.tiles, tiles.map((t) => t.idx));
  return {
    month: wall.month, art: artworkFor(wall.month), tiles: wall.tiles, ...wallGrid(wall.tiles),
    sharp: f.sharp, count: f.count, share: f.share, complete: f.complete,
    ours: new Set(tiles.filter((t) => t.profileId && family.has(t.profileId) && f.sharp.has(t.idx)).map((t) => t.idx)),
  };
};

/**
 * This month's wall for a household, its own day so far, and the months before.
 * The household's own finished days are given their tiles first, so a tile shows as soon as the practice is done;
 * everyone else's are given theirs by the daily job.
 */
export async function wallView(m: Member, today = todayKey()) {
  const month = monthOf(today), family = new Set(m.profiles.map((p) => p.id));
  if (!m.tester) await settleTiles(month, { today, profileIds: [...family] });
  const wall = await ensureWall(month);
  const [tiles, [day], past] = await Promise.all([
    db.select({ idx: T.idx, profileId: T.profileId, day: T.day }).from(T).where(eq(T.wallId, wall.id)),
    db.select({ trainMinutes: D.trainMinutes, trainGoal: D.trainGoal }).from(D).where(and(eq(D.profileId, m.profile.id), eq(D.day, today))),
    db.select().from(s.focusWall).where(lt(s.focusWall.month, month)).orderBy(desc(s.focusWall.month)).limit(24),
  ]);
  const earlier = past.filter((w) => isMonth(w.month)).slice(0, 12);
  const pastTiles = earlier.length
    ? await db.select({ wallId: T.wallId, idx: T.idx, profileId: T.profileId }).from(T).where(inArray(T.wallId, earlier.map((w) => w.id))).orderBy(asc(T.idx))
    : [];
  const goal = Math.min(day?.trainGoal ?? m.enrolment?.dailyMinutes ?? 0, MAX_DAILY_MINUTES), done = day?.trainMinutes ?? 0;
  return {
    now: shown(wall, tiles, family),
    /** The active profile's own day: has it earned its tile, and how far along is it? */
    today: {
      earned: tiles.some((t) => t.profileId === m.profile.id && t.day === today),
      finished: !!day && earnsTile(day), goal, done: Math.min(goal, Math.floor(done)),
    },
    gallery: earlier.map((w) => shown(w, pastTiles.filter((t) => t.wallId === w.id), family)),
  };
}
