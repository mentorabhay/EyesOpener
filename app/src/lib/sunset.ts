/**
 * Sunset Rule: the rules, pure. Tested in sunset.test.ts; src/lib/sunset-data.ts reads the rows.
 *
 * The day's play closes when the day's minutes are done. That is already so: the engine (`canStart`) refuses a
 * new session, and the Stage ends a running one when its time is used. This file only decides what the family is
 * shown at that moment and afterwards.
 *
 * - The sunset is shown only when the engine itself says the day is done: the programme's minutes for today are
 *   used ("programme_done"), or the daily limit of 90 minutes is reached ("daily_cap"). Nothing else sets the sun.
 * - It is never shown on a day on which a session was stopped with "I feel unwell". That day's message is rest,
 *   in the words the stop rule already uses.
 * - It is never shown in a staff member's test household, where the daily limits are off and no day closes.
 * - After the sunset there is nothing more to earn. The league counts a finished day once and never counts minutes.
 * - The invitation outside ties to the Light ring: minutes of daylight still open today. It is made only while it
 *   can still be light; late in the evening and at night it waits for tomorrow.
 */
import { MAX_DAILY_MINUTES, type DoseBlock } from "@/engine/dose";

/** The reasons that mean "today's practice is used up". */
export const DAY_DONE: readonly DoseBlock[] = ["programme_done", "daily_cap"];
export const isDayDone = (reason: string | null | undefined): boolean => !!reason && (DAY_DONE as readonly string[]).includes(reason);

/** The hours, on the member's own clock, in which the invitation outside is made: from 6 in the morning to before 7 in the evening. */
export const LIGHT_FROM_HOUR = 6, LIGHT_UNTIL_HOUR = 19;
export const canBeLight = (hour: number) => hour >= LIGHT_FROM_HOUR && hour < LIGHT_UNTIL_HOUR;

export interface SunsetIn {
  /** Why the engine will not start practice now, or null when it will. */
  reason: DoseBlock | null;
  /** A staff member's own test household. */
  tester: boolean;
  /** A session of today ended on "I feel unwell". */
  stoppedToday: boolean;
  /** Practice minutes done today, and the minutes the programme sets for a day (0 with no programme). */
  minutes: number;
  dailyMinutes: number;
  /** The Light ring today. */
  light: { done: number; goal: number };
  /** The hour on the member's own clock, 0 to 23. */
  hour: number;
}

export type Outside =
  /** It can still be light and the Light ring has room: go outside. */
  | "go"
  /** The Light ring is full for today. */
  | "full"
  /** It is late: daylight waits for tomorrow. */
  | "tomorrow";

export type Sunset =
  /** Practice is still open. `share` is how much of the day's minutes is used, 0 to 1: the sun stands that low. */
  | { state: "open"; share: number; left: number }
  /** The day's minutes are done and nobody felt unwell: the sun sets. */
  | { state: "set"; cap: boolean; outside: Outside; lightLeft: number }
  /** A session was stopped today because someone felt unwell. No sunset: rest. `dayDone` says whether the day's minutes are also used. */
  | { state: "rest"; dayDone: boolean }
  /** Practice is closed for a reason that is not the end of the day (an eye doctor first, consent, a counsellor, age). */
  | { state: "closed"; why: DoseBlock }
  /** A staff test household: no day closes. */
  | { state: "tester" };

/** The minutes a day holds before it closes: the programme's own, or the daily limit when there is no programme. */
export const dayMinutes = (dailyMinutes: number) => (dailyMinutes > 0 ? Math.min(dailyMinutes, MAX_DAILY_MINUTES) : MAX_DAILY_MINUTES);

export function sunsetOf(i: SunsetIn): Sunset {
  if (i.tester) return { state: "tester" };
  /* a stop for feeling unwell comes first: whatever else is true of the day, its message is rest */
  if (i.stoppedToday) return { state: "rest", dayDone: isDayDone(i.reason) };
  if (isDayDone(i.reason)) {
    const full = i.light.goal > 0 && i.light.done >= i.light.goal;
    const lightLeft = Math.max(0, Math.ceil(i.light.goal - i.light.done));
    return { state: "set", cap: i.reason === "daily_cap", outside: full ? "full" : canBeLight(i.hour) ? "go" : "tomorrow", lightLeft };
  }
  if (i.reason) return { state: "closed", why: i.reason };
  const goal = dayMinutes(i.dailyMinutes), done = Math.max(0, Math.min(goal, i.minutes));
  return { state: "open", share: done / goal, left: Math.max(0, Math.ceil(goal - done)) };
}

/** How high the sun stands in the drawing, 1 at the top of its path and 0 on the horizon. */
export const sunHeight = (s: Sunset) => (s.state === "open" ? 1 - s.share : s.state === "set" ? 0 : 1);
