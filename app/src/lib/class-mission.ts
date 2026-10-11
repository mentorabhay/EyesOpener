// Eyes Opener: Class Mission: the child who wears a patch leads a five-minute game for the whole class. The rules, pure.
/**
 * Class Mission: the child who wears a patch leads a five-minute game for the whole class. The rules, pure.
 * Tested in class-mission.test.ts; src/lib/class-mission-data.ts reads and writes.
 *
 * What the mission is, and why it is this:
 * - Everyone covers one eye with a cupped hand for a minute at a time and tries two easy things: bringing two
 *   fingertips together, and following a slow target. For once the whole class does what the leader does every
 *   day, and finds out that it takes practice. Nobody wears anything, so there is nothing to hand round or clean.
 * - It is safe for children whose eyes work together well: covering an eye with a hand for a minute changes nothing,
 *   and nothing on the screen is dimmed, split between the eyes or flashing. The screen part is a game the
 *   library gives to anyone from age 5 with no glasses (SCREEN_GAME), played by the leader while the class watches.
 * - It is not an eye test. Nothing is scored, nobody is compared, and the kit tells the grown-up so.
 * - The leader's own patch or glasses stay exactly as the eye doctor set them. The mission never moves a patch.
 *
 * What the app keeps:
 * 1. A guardian or co-guardian decides whether a child gets the mission, and can take it back before it is run.
 *    Only a child profile can have one, and only while a guardian's consent for that child stands.
 * 2. One mission at a time for a child. After it is run, a guardian marks the day. Another can be given later.
 * 3. That is all: who was given a mission, and the day it was run. No school, no teacher, no classmate, no count
 *    of children, no note of how it went. Nothing about a classmate can be typed anywhere.
 * 4. A cheer seat and a device in child mode can look, and change nothing.
 */

/** The public game the leader plays on the class screen. Anyone from age 5, no glasses, level 0 in the library. */
export const SCREEN_GAME = "comet-trail";

export const STEP_KEYS = ["hello", "cover", "fingers", "follow", "secret"] as const;
export type StepKey = (typeof STEP_KEYS)[number];

/** The mission, step by step, with the seconds each takes. Together they are five minutes. */
export const MISSION_STEPS: readonly { key: StepKey; seconds: number; covered: boolean }[] = [
  { key: "hello", seconds: 30, covered: false },
  { key: "cover", seconds: 30, covered: false },
  { key: "fingers", seconds: 90, covered: true },
  { key: "follow", seconds: 90, covered: true },
  { key: "secret", seconds: 60, covered: false },
];
export const MISSION_SECONDS = 300;
/** Nobody keeps one eye covered for longer than this in one go: the class swaps hands, or uncovers. */
export const COVER_SECONDS = 45;

/** When each step starts, as "0:30", for the plan a grown-up reads from. */
export function stepTimes(steps = MISSION_STEPS): { key: StepKey; from: string; seconds: number }[] {
  let at = 0;
  return steps.map((s) => {
    const from = `${Math.floor(at / 60)}:${String(at % 60).padStart(2, "0")}`;
    at += s.seconds;
    return { key: s.key, from, seconds: s.seconds };
  });
}

/* ───────────── giving, taking back and marking done ───────────── */

export interface Mission { id: string; profileId: string; givenAt: Date; doneOn: string | null }

export type MissionState = "none" | "given" | "done";
/** Where a child stands: an open mission wins over an earlier one that was run. */
export function missionState(rows: readonly Pick<Mission, "doneOn">[]): MissionState {
  if (rows.some((r) => r.doneOn === null)) return "given";
  return rows.length ? "done" : "none";
}

export type MissionRefusal = "not_allowed" | "not_child" | "needs_consent" | "already" | "not_found" | "bad_day";

export interface GiveInput {
  /** `m.can("manage_family")`: a guardian or co-guardian, outside child mode. */
  canManage: boolean;
  /** The profile as the server found it in the member's own household. Null when it is not there. */
  profile: { kind: "adult" | "child" } | null;
  /** A guardian's consent for the child stands. */
  consented: boolean;
  /** The child already has a mission that has not been run. */
  open: boolean;
}

/** Why a mission cannot be given, or null. */
export function giveRefusal(i: GiveInput): MissionRefusal | null {
  if (!i.canManage) return "not_allowed";
  if (!i.profile) return "not_found";
  if (i.profile.kind !== "child") return "not_child";
  if (!i.consented) return "needs_consent";
  return i.open ? "already" : null;
}

const isDay = (key: string) => /^\d{4}-\d{2}-\d{2}$/.test(key) && !Number.isNaN(Date.parse(`${key}T00:00:00Z`)) && new Date(`${key}T00:00:00Z`).toISOString().slice(0, 10) === key;

export interface DoneInput {
  canManage: boolean;
  /** The mission as the server found it among the household's own. Null when it is not there. */
  mission: { doneOn: string | null; givenOn: string } | null;
  /** The day a guardian says it was run. */
  day: string;
  today: string;
}

/** Why a mission cannot be marked as run on this day, or null. The day lies between the day it was given and today. */
export function doneRefusal(i: DoneInput): MissionRefusal | null {
  if (!i.canManage) return "not_allowed";
  if (!i.mission) return "not_found";
  if (i.mission.doneOn) return "already";
  return isDay(i.day) && i.day >= i.mission.givenOn && i.day <= i.today ? null : "bad_day";
}

/** Why a mission cannot be taken back, or null. One that was run stays as the family's record. */
export function takeBackRefusal(i: { canManage: boolean; mission: { doneOn: string | null } | null }): MissionRefusal | null {
  if (!i.canManage) return "not_allowed";
  if (!i.mission) return "not_found";
  return i.mission.doneOn ? "already" : null;
}
