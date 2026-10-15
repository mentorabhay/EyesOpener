/**
 * First Depth Day: the rules, pure. Tested in depth-day.test.ts; src/lib/depth-day-data.ts reads and writes.
 *
 * What "the depth test first passes" means here.
 * The Depth check-up shows four rings and asks which one floats nearer, at steps that halve from about 1600
 * arcseconds down to one pixel of the screen. It stores the finest step that was answered right at least two times
 * in three. When not even the largest step was passed it stores that step with the note "worse": no depth was
 * found. So a check-up "passes" when its note is not "worse": depth was found at some step.
 *
 * The first depth day is the day of the first check-up that found depth, when at least one earlier check-up did
 * not. A profile whose very first Depth check-up already found depth has no first depth day: the depth was there
 * before IOpener measured anything, so nothing was first and nobody is told that anything was gained.
 *
 * What this never says: why. A check-up measures on one day, on one screen, and it can be passed by luck: someone
 * who guesses every answer passes it about once in ninety tries (depth-day.test.ts plays the engine's own
 * staircase to keep that figure honest). The words therefore say what a check-up found, and what the check-ups
 * since have found. They never say that depth was gained, that the app caused it, or that it will stay.
 */
import { foundDepth, type DepthResult } from "./gallery";

export type DepthStory =
  /** No Depth check-up has been taken. */
  | { state: "untested" }
  /** Every check-up so far found no depth. */
  | { state: "not_yet"; checks: number; last: Date }
  /** The very first check-up found depth. There is no first day. */
  | { state: "from_start"; first: Date; arcsec: number }
  /** A check-up found depth after `before` check-ups that had not. */
  | { state: "first"; first: Date; arcsec: number; before: number };

/** What the profile's Depth check-ups say, read oldest first. `results` may be in any order. */
export function depthStory(results: readonly DepthResult[]): DepthStory {
  const rows = [...results].sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());
  if (!rows.length) return { state: "untested" };
  const i = rows.findIndex(foundDepth);
  if (i < 0) return { state: "not_yet", checks: rows.length, last: rows[rows.length - 1].takenAt };
  return i === 0 ? { state: "from_start", first: rows[0].takenAt, arcsec: rows[0].value } : { state: "first", first: rows[i].takenAt, arcsec: rows[i].value, before: i };
}

/** The check-ups taken after a moment: how many, how many of them found depth, and whether the latest did. */
export function sinceThen(results: readonly DepthResult[], after: Date): { checks: number; found: number; latestFound: boolean | null } {
  const later = results.filter((r) => r.takenAt.getTime() > after.getTime()).sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());
  return { checks: later.length, found: later.filter(foundDepth).length, latestFound: later.length ? foundDepth(later[later.length - 1]) : null };
}

/* ───────────── the day, kept like a birthday ───────────── */

const parts = (day: string) => day.split("-").map(Number) as [number, number, number];
const leap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const key = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** The day the anniversary falls on in a year. A day kept on 29 February is marked on 28 February in other years. */
export function anniversaryIn(day: string, year: number): string {
  const [, m, d] = parts(day);
  return m === 2 && d === 29 && !leap(year) ? key(year, 2, 28) : key(year, m, d);
}

/** How many years ago the day was, when today is its anniversary. Null on every other day, and on the day itself. */
export function yearsToday(day: string, today: string): number | null {
  const years = parts(today)[0] - parts(day)[0];
  return years >= 1 && anniversaryIn(day, parts(today)[0]) === today ? years : null;
}

/** The next anniversary on or after today. */
export function nextAnniversary(day: string, today: string): string {
  const year = Math.max(parts(today)[0], parts(day)[0] + 1), here = anniversaryIn(day, year);
  return here >= today ? here : anniversaryIn(day, year + 1);
}

/** How long the Today page points at a day whose scene has not been played: four weeks, then it stops asking. */
export const NOTE_DAYS = 28;

export interface TodayNote { kind: "new" | "years"; day: string; years: number }

/**
 * What the Today page says about a kept day: "years" on its anniversary, "new" while its scene has not been
 * played and the day is not more than four weeks old, and nothing on every other day.
 */
export function todayNote(kept: { day: string; played: boolean } | null, today: string): TodayNote | null {
  if (!kept) return null;
  const years = yearsToday(kept.day, today);
  if (years) return { kind: "years", day: kept.day, years };
  const age = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${kept.day}T00:00:00Z`)) / 86_400_000);
  return !kept.played && age >= 0 && age <= NOTE_DAYS ? { kind: "new", day: kept.day, years: 0 } : null;
}

/* ───────────── the scene ───────────── */

/** The coarsest step the Depth check-up shows: the scene never asks the eyes for more than the check-up did. */
export const SCENE_MAX_ARCSEC = 1600;
/** The scene's front layer is never drawn finer than this, so it is easy to see for anyone who passed any step. */
export const SCENE_MIN_ARCSEC = 400;

/**
 * The depth of each layer of the scene, in arcseconds: positive floats in front of the screen, negative sits behind.
 * The hero is in front, lanterns in between, and the stars behind. Every gap between two layers is at least the
 * step the member's check-up found (`found`), and at least one pixel of the screen (`pixelArcsec`), so nothing in
 * the scene is finer than what was measured or than the screen can show.
 */
export function sceneDepths(found: number, pixelArcsec: number): { hero: number; lantern: number; stars: number } {
  const px = pixelArcsec > 0 ? pixelArcsec : 0;
  const seen = Math.max(Number.isFinite(found) && found > 0 ? found : SCENE_MAX_ARCSEC, px);
  const hero = Math.min(Math.max(4 * seen, SCENE_MIN_ARCSEC), Math.max(SCENE_MAX_ARCSEC, seen));
  /* the lanterns float half as far out as the hero, when half is still a step the member has seen */
  const lantern = hero / 2 >= seen ? hero / 2 : 0;
  return { hero, lantern, stars: -Math.max(hero / 2, seen) };
}

/** May the scene be shown on a screen to this profile? Not under the screen age. */
export const SCENE_MIN_AGE = 4;
export const mayWatch = (age: number | null) => age === null || age >= SCENE_MIN_AGE;
