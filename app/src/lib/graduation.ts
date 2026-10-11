// Eyes Opener: Keeper Graduation: the rules, pure. Tested in graduation.test.ts; src/lib/graduation-data.ts reads and writes.
/**
 * Keeper Graduation: the rules, pure. Tested in graduation.test.ts; src/lib/graduation-data.ts reads and writes.
 *
 * What a graduation is. A course that has a set number of weeks ends when those weeks have run (programme-rules.ts).
 * A profile whose course ran all its weeks is a graduate of it. Graduation marks that the weeks were kept. It says
 * nothing about what changed in the eyes: an eye test says that.
 *
 * The journey book is a record of the course: its weeks, the days with practice, the check-ups taken and what
 * each one measured on its day. It gives numbers and dates and no reason for any of them.
 *
 * The keeper. A graduate's household may leave one welcome for one new family on the same programme.
 * Privacy decides the design:
 * 1. A welcome is one line picked from a fixed list. Nobody types a welcome, so nothing in it can name a child,
 *    a place, a clinic or a cure, and nothing needs a person to review it.
 * 2. Neither family is shown to the other. The new family reads "from a family that finished this programme" and
 *    the line. The keeper learns only that the welcome was read, and the fixed thank-you line if one was sent.
 *    No name, no age, no place, no result and no way to write back in free words.
 * 3. Both sides choose. A guardian leaves a welcome; a guardian of the new family asks for one. Nothing is sent to
 *    a family that did not ask, and a welcome that has not been given can be taken back.
 * 4. Matching is automatic: the oldest waiting welcome goes to the oldest waiting ask of the same programme, never
 *    inside one household. No member of staff takes part, and no member of staff can see who met whom, because
 *    neither row points at the other family.
 * 5. For a child's profile the household's parental consent must stand, on both sides.
 * 6. Being a keeper gives nothing else: no rank, no badge on a board, no say over anyone.
 */
import type { DayRow } from "./gallery";
import { isPracticeDay } from "./gallery";

/* ───────────── the fixed lines ───────────── */

/** The welcome lines a keeper can choose from. The words are in src/copy/graduation.ts. */
export const WELCOME_KEYS = ["first_weeks", "split_it", "rest_days", "glasses", "not_alone", "small_days"] as const;
export type WelcomeKey = (typeof WELCOME_KEYS)[number];
export const isWelcomeKey = (v: unknown): v is WelcomeKey => typeof v === "string" && (WELCOME_KEYS as readonly string[]).includes(v);

/** The thank-you lines a new family can send back. One, once. */
export const THANKS_KEYS = ["thank_you", "it_helped", "we_will"] as const;
export type ThanksKey = (typeof THANKS_KEYS)[number];
export const isThanksKey = (v: unknown): v is ThanksKey => typeof v === "string" && (THANKS_KEYS as readonly string[]).includes(v);

/** A family is new to a programme through its first four weeks: that is when it may ask for a welcome. */
export const NEW_FAMILY_WEEKS = 4;

/* ───────────── who may do what ───────────── */

export type KeeperRefusal =
  | "not_allowed"   // the seat may not share, or the device is in child mode
  | "tester"        // a staff test household is no family
  | "consent"       // a child's profile without the household's parental consent
  | "not_graduate"  // no course of this profile has run its weeks
  | "not_on_course" // no course is running for this profile
  | "not_new"       // the course is past its first weeks
  | "already"       // a welcome was already left, or already asked for
  | "bad_line"      // not a line from the list
  | "nothing"       // nothing to take back, or nothing received to thank for
  | "given";        // the welcome has been given and cannot be taken back

interface Who {
  /** The seat may share and the device is not in child mode. */
  canShare: boolean;
  tester: boolean;
  /** The active profile is a child, and whether the household's parental consent for it stands. */
  child: boolean;
  parental: boolean;
}
const who = (i: Who): KeeperRefusal | null => (!i.canShare ? "not_allowed" : i.tester ? "tester" : i.child && !i.parental ? "consent" : null);

/** May this household leave a welcome for the active profile's finished course? */
export function leaveRefusal(i: Who & { graduate: boolean; left: boolean; line: unknown }): KeeperRefusal | null {
  return who(i) ?? (!i.graduate ? "not_graduate" : i.left ? "already" : !isWelcomeKey(i.line) ? "bad_line" : null);
}

/** May this household take its welcome back? Only while no family has received it. */
export function takeBackRefusal(i: Pick<Who, "canShare"> & { left: boolean; given: boolean }): KeeperRefusal | null {
  return !i.canShare ? "not_allowed" : !i.left ? "nothing" : i.given ? "given" : null;
}

/** May this household ask for a welcome for the active profile's running course? */
export function askRefusal(i: Who & { onCourse: boolean; week: number; asked: boolean }): KeeperRefusal | null {
  return who(i) ?? (!i.onCourse ? "not_on_course" : i.asked ? "already" : i.week > NEW_FAMILY_WEEKS ? "not_new" : null);
}

/** May this household stop waiting for a welcome? Only while none has come. */
export function stopAskingRefusal(i: Pick<Who, "canShare"> & { asked: boolean; received: boolean }): KeeperRefusal | null {
  return !i.canShare ? "not_allowed" : !i.asked ? "nothing" : i.received ? "given" : null;
}

/** May this household send a thank-you line? Once, for a welcome it received. */
export function thanksRefusal(i: Pick<Who, "canShare"> & { received: boolean; thanked: boolean; line: unknown }): KeeperRefusal | null {
  return !i.canShare ? "not_allowed" : !i.received ? "nothing" : i.thanked ? "already" : !isThanksKey(i.line) ? "bad_line" : null;
}

/**
 * May these two meet? Never inside one household, only on the same programme, and only a welcome that is still
 * waiting with an ask that is still waiting.
 */
export function mayMeet(welcome: { accountId: string; programme: string; given: boolean }, ask: { accountId: string; programme: string; received: boolean }): boolean {
  return welcome.accountId !== ask.accountId && welcome.programme === ask.programme && !welcome.given && !ask.received;
}

/* ───────────── the journey ───────────── */

const DAY_MS = 86_400_000;
const utc = (key: string) => Date.parse(`${key}T00:00:00Z`);
const addDays = (key: string, n: number) => new Date(utc(key) + n * DAY_MS).toISOString().slice(0, 10);

export interface JourneyIn {
  /** The day the course started, and how many weeks it runs. */
  startDay: string;
  weeks: number;
  daysPerWeek: number;
  /** The profile's day rows. Rows outside the course are ignored. */
  days: readonly DayRow[];
  /** Days on which a session was stopped with "I feel unwell". */
  stopDays: readonly string[];
}

export interface JourneyWeek {
  week: number;
  /** Days of this week with any practice, and days on which the day's practice was done. */
  practised: number;
  finished: number;
}

export interface Journey {
  startDay: string;
  /** The last day of the course's last week. */
  lastDay: string;
  weeks: number;
  /** Days with any practice during the course. */
  practised: number;
  /** Days on which the day's practice was done. */
  finished: number;
  /** Weeks of the course that had at least one day with practice. */
  weeksWithPractice: number;
  /** Days of the course on which a session was stopped because someone felt unwell. */
  stopDays: number;
  byWeek: JourneyWeek[];
}

/** The last day of a course: the seventh day of its last week. */
export const lastDayOf = (startDay: string, weeks: number) => addDays(startDay, Math.max(1, weeks) * 7 - 1);

/**
 * The course in numbers: what was done, by the calendar of the course. It counts days, never minutes beyond a
 * day's practice, and it compares nothing with anybody else.
 */
export function journeyOf(i: JourneyIn): Journey {
  const weeks = Math.max(1, Math.floor(i.weeks)), lastDay = lastDayOf(i.startDay, weeks);
  const inCourse = (day: string) => day >= i.startDay && day <= lastDay;
  const weekOf = (day: string) => Math.floor((utc(day) - utc(i.startDay)) / (7 * DAY_MS)) + 1;
  const mine = new Map<string, DayRow>();
  for (const d of i.days) if (inCourse(d.day) && d.trainMinutes > 0) mine.set(d.day, d);
  const byWeek: JourneyWeek[] = Array.from({ length: weeks }, (_, k) => ({ week: k + 1, practised: 0, finished: 0 }));
  for (const d of mine.values()) {
    const w = byWeek[weekOf(d.day) - 1];
    w.practised += 1;
    if (isPracticeDay(d)) w.finished += 1;
  }
  return {
    startDay: i.startDay, lastDay, weeks,
    practised: byWeek.reduce((n, w) => n + w.practised, 0),
    finished: byWeek.reduce((n, w) => n + w.finished, 0),
    weeksWithPractice: byWeek.filter((w) => w.practised > 0).length,
    stopDays: new Set(i.stopDays.filter(inCourse)).size,
    byWeek,
  };
}

/* ───────────── the ceremony ───────────── */

/** How long the ceremony scene runs, in seconds, before it comes to rest on its last picture. */
export const CEREMONY_SECONDS = 24;
/** The scene shows one lantern for each week of the course, and never more than this many across the screen. */
export const CEREMONY_MAX_LANTERNS = 12;
export const lanternsFor = (weeks: number) => Math.max(1, Math.min(CEREMONY_MAX_LANTERNS, Math.floor(weeks)));
