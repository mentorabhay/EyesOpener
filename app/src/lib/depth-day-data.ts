// Eyes Opener: First Depth Day: reading the active profile's depth day and keeping it. Server only. The rules are in depth-day.ts.
/**
 * First Depth Day: reading the active profile's depth day and keeping it. Server only. The rules are in depth-day.ts.
 *
 * Privacy. The day is worked out from one profile's own Depth check-ups and is shown only inside that profile's
 * household. Every query is scoped by `m.profile.id`; nothing here takes an id from the browser, and nothing here
 * is read by a counsellor, a sponsor or staff.
 *
 * The row (`depth_day`) is written once, from the check-up rows, the first time anyone of the household opens
 * Today or the page after the check-up. It is never rewritten: the day stays the day, whatever later check-ups find.
 */
import { and, asc, eq, isNull } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { depthStory, mayWatch, sinceThen, todayNote, yearsToday, type DepthStory, type TodayNote } from "@/lib/depth-day";
import type { DepthResult } from "@/lib/gallery";
import { dayOf } from "@/lib/league";
import type { Member } from "@/lib/session";

const D = s.depthDay, T = s.testResult;

export interface KeptDay { day: string; arcsec: number; playedAt: Date | null }

const resultsOf = async (profileId: string): Promise<DepthResult[]> =>
  db.select({ value: T.value, note: T.note, takenAt: T.takenAt }).from(T).where(and(eq(T.profileId, profileId), eq(T.testKey, "stereo"))).orderBy(asc(T.takenAt));

const keptOf = async (profileId: string): Promise<KeptDay | null> => {
  const [row] = await db.select({ day: D.day, arcsec: D.arcsec, playedAt: D.playedAt }).from(D).where(eq(D.profileId, profileId));
  return row ?? null;
};

/**
 * Keeps the profile's first depth day when its check-ups have one and none is kept yet. Safe to run any number of
 * times: a day that is kept is never changed. Returns the kept day, or null when there is none.
 */
export async function syncDepthDay(profileId: string, results?: readonly DepthResult[]): Promise<KeptDay | null> {
  const kept = await keptOf(profileId);
  if (kept) return kept;
  const story = depthStory(results ?? (await resultsOf(profileId)));
  if (story.state !== "first") return null;
  await db.insert(D).values({ profileId, day: dayOf(story.first), arcsec: story.arcsec }).onConflictDoNothing();
  return keptOf(profileId);
}

export interface DepthDayView {
  story: DepthStory;
  kept: KeptDay | null;
  /** The check-ups since the day (or since the first check-up, when depth was there from the start). */
  since: { checks: number; found: number; latestFound: boolean | null } | null;
  /** Years since the day, when today is its anniversary. */
  years: number | null;
  /** The scene may be shown to this profile (not under the screen age). */
  mayWatch: boolean;
}

/** Everything the First Depth Day page shows for the active profile. Reading it also keeps the day. */
export async function depthDayFor(m: Member, now = new Date()): Promise<DepthDayView> {
  const results = await resultsOf(m.profile.id);
  const story = depthStory(results), kept = await syncDepthDay(m.profile.id, results);
  /* counted from the kept day's own check-up: the first one that found depth on that day */
  const onDay = kept ? results.find((r) => dayOf(r.takenAt) === kept.day && r.note !== "worse") : undefined;
  const from = onDay?.takenAt ?? (story.state === "first" || story.state === "from_start" ? story.first : null);
  return {
    story, kept,
    since: from ? sinceThen(results, from) : null,
    years: kept ? yearsToday(kept.day, dayOf(now)) : null,
    mayWatch: mayWatch(m.age),
  };
}

/** What the Today page says about the depth day, if anything. Reading it also keeps the day. */
export async function depthDayNote(m: Member, now = new Date()): Promise<TodayNote | null> {
  const kept = await syncDepthDay(m.profile.id);
  return todayNote(kept && { day: kept.day, played: !!kept.playedAt }, dayOf(now));
}

/**
 * Records that the scene was played, the first time. Only someone who may train can set it: the member, or a
 * guardian at the device. A cheer seat looking at the page leaves the scene unplayed for the member.
 */
export async function markPlayed(m: Member, now = new Date()): Promise<boolean> {
  if (!m.can("train")) return false;
  const rows = await db.update(D).set({ playedAt: now }).where(and(eq(D.profileId, m.profile.id), isNull(D.playedAt))).returning({ id: D.profileId });
  return rows.length > 0;
}
