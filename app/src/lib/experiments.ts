/**
 * The rules of a community experiment: a check-up before, the idea's weeks, the same check-up after, and the
 * result of everyone added up. Pure functions only, so every rule and every number here has a test beside it.
 *
 * The rules, in one place:
 *
 * 1. Groups. A member picks a group when joining: "tried" does what the idea says, "control" carries on as usual.
 *    Nobody is put in a group by chance: the concept keeps random assignment for later, after an ethics board.
 * 2. Before. The "before" check-up is the member's latest run of the idea's check-up, taken in the last
 *    BASELINE_MAX_AGE_DAYS days. The idea's weeks are counted from the day it is tied to the enrolment.
 * 3. After. The "after" check-up is due weeks x 7 days later and can be taken on that day or in the
 *    FOLLOWUP_OPEN_DAYS days that follow. The first run in that window counts, so nobody can retake it and keep
 *    the best one. After the window the enrolment is "missed" and is never counted.
 * 4. Which eye. A check-up that measures each eye counts one eye only: the eye that read worse at the "before"
 *    check-up. The same eye is read at the "after" check-up, whatever the other eye did.
 * 5. Same screen. A check-up drawn on the screen is only as good as the measured screen behind it. The screen's
 *    size and viewing distance are kept with the "before" check-up. If they differ at the "after" check-up by
 *    more than SCREEN_TOLERANCE, the pair may not be comparable: the member is told, and the pair is not counted.
 * 6. At a limit. A "before" result at the limit of what the screen can show cannot show a change, so it is not
 *    accepted. An "after" result at a limit is counted at the limit, which understates the change.
 * 7. The pooled result. One number per member: after minus before. The result is the mean change in each group,
 *    the gap between the two means, and a 95% confidence interval for the gap by Welch's method (see `welch`).
 *    Nothing is published until MIN_FINISHED_PER_GROUP members in each group have a counted pair.
 * 8. Words. A pooled result is a signal from members who chose their own group. It is never called proof.
 */

export type Arm = "tried" | "control";
export type Side = "left" | "right";

/** A "before" check-up may be this many days old when it is tied to the enrolment. Most check-ups repeat weekly, so a member who keeps to the schedule always has one. */
export const BASELINE_MAX_AGE_DAYS = 7;
/** The "after" check-up may be taken on its due day or in this many days after it. The same for both groups, so the gap between check-ups is the same for both. */
export const FOLLOWUP_OPEN_DAYS = 7;
/**
 * Members with a counted pair that each group needs before any number is shown.
 * The concept document proposes 30 completers for the Signal step ("A set minimum of completers; I propose 30").
 * It is applied to each group: the result is a gap between two means, both must be steady, and a mean of a
 * handful of members would nearly give away each member's own result.
 */
export const MIN_FINISHED_PER_GROUP = 30;
/** How far a re-measured screen may differ and still be "the same screen": a card held to the screen and a typed distance are never measured twice alike. */
export const SCREEN_TOLERANCE = { pxPerCm: 0.05, distanceCm: 0.1 } as const;

const DAY = 86_400_000;
const IST = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });

/** The day a moment falls on for the member, as YYYY-MM-DD. India first, as in the rest of the app. */
export const dayKey = (d: Date) => IST.format(d);
export function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
/** Whole days from one day key to another. Negative when `to` is earlier. */
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);

/* ───────────── the course of one enrolment ───────────── */

export interface Schedule {
  /** The day the "before" check-up was tied: day 1 of the idea's weeks. */
  startDay: string;
  /** The first day the "after" check-up counts. */
  dueDay: string;
  /** The last day the "after" check-up counts. */
  lastDay: string;
  totalDays: number;
}

export function scheduleOf(startedAt: Date, weeks: number): Schedule {
  const startDay = dayKey(startedAt), totalDays = weeks * 7, dueDay = addDays(startDay, totalDays);
  return { startDay, dueDay, lastDay: addDays(dueDay, FOLLOWUP_OPEN_DAYS), totalDays };
}

/** Which day of the idea's weeks today is, from 1 to the last day. */
export const dayNumber = (s: Schedule, now: Date) => Math.max(1, Math.min(s.totalDays, daysBetween(s.startDay, dayKey(now)) + 1));

export type Stage = "left" | "needs_before" | "practising" | "after_due" | "missed" | "finished";
export interface Course { leftAt: Date | null; startedAt: Date | null; baselineId: string | null; followupId: string | null; finishedAt: Date | null }

/** Where an enrolment stands today. Leaving wins over everything; a finished enrolment stays finished. */
export function stageOf(e: Course, weeks: number, now: Date): Stage {
  if (e.leftAt) return "left";
  if (e.finishedAt) return "finished";
  if (!e.startedAt || !e.baselineId) return "needs_before";
  const s = scheduleOf(e.startedAt, weeks), today = dayKey(now);
  return today < s.dueDay ? "practising" : today <= s.lastDay ? "after_due" : "missed";
}

/* ───────────── picking the check-up that counts ───────────── */

/** What the rules need to know about a check-up. `onScreen` is false for one done away from the screen (near point, the survey). */
export interface TestRule { unit: string; perEye: boolean; lowerIsBetter: boolean; onScreen: boolean }
/** One stored row of a check-up. */
export interface Reading { id: string; takenAt: Date; eye: Side | null; value: number; note: string | null; deviceId: string | null }
/** The measured screen of the household, as it is now. Onboarding measures it again in place. */
export interface Screen { id: string; pxPerCm: number; distanceCm: number; calibratedAt: Date }
export interface Setup { pxPerCm: number; distanceCm: number }

const near = (a: number, b: number, share: number) => Math.abs(a - b) <= share * Math.max(Math.abs(a), Math.abs(b));

/** True when two check-ups were taken with the same screen set-up, or both away from the screen. */
export const sameSetup = (a: Setup | null, b: Setup | null) =>
  a === null || b === null ? a === b : near(a.pxPerCm, b.pxPerCm, SCREEN_TOLERANCE.pxPerCm) && near(a.distanceCm, b.distanceCm, SCREEN_TOLERANCE.distanceCm);

/** What differs between two screen set-ups, for telling the member plainly. */
export const setupDiff = (a: Setup, b: Setup) => ({
  distance: !near(a.distanceCm, b.distanceCm, SCREEN_TOLERANCE.distanceCm), size: !near(a.pxPerCm, b.pxPerCm, SCREEN_TOLERANCE.pxPerCm),
});

/** One run of a check-up: one row, or one row for each eye, saved at the same moment. Newest first. */
export function sittings(rows: Reading[]): Reading[][] {
  const by = new Map<number, Reading[]>();
  for (const r of rows) by.set(r.takenAt.getTime(), [...(by.get(r.takenAt.getTime()) ?? []), r]);
  return [...by.entries()].sort((a, b) => b[0] - a[0]).map(([, group]) => group);
}

/**
 * The eye that counts for a check-up that measures each eye: the one that read worse at the "before" check-up.
 * When both read the same it is the eye the profile calls weaker, else the left eye. The choice is made before
 * the "after" check-up exists, so it cannot be made to flatter the result.
 */
export function countingEye(left: number, right: number, lowerIsBetter: boolean, weakEye: Side | null): Side {
  if (left === right) return weakEye ?? "left";
  return left > right === lowerIsBetter ? "left" : "right";
}

const atLimit = (r: Reading) => r.note === "floor" || r.note === "worse";

/**
 * The screen set-up a run was taken with. Null inside `known: true` means it was done away from the screen.
 * Unknown when the run names another screen, or the screen was measured again after the run: the stored row
 * then no longer says what the run was drawn with.
 */
function setupOf(test: TestRule, r: Reading, screen: Screen | null): { known: true; setup: Setup | null } | { known: false } {
  if (!test.onScreen) return { known: true, setup: null };
  if (!screen || r.deviceId !== screen.id || screen.calibratedAt.getTime() > r.takenAt.getTime()) return { known: false };
  return { known: true, setup: { pxPerCm: screen.pxPerCm, distanceCm: screen.distanceCm } };
}

export type BeforeProblem = "none" | "too_old" | "one_eye" | "at_limit" | "screen_unknown";
export type PickedBefore = { ok: true; reading: Reading; setup: Setup | null } | { ok: false; why: BeforeProblem };

/** The "before" check-up for an enrolment: the member's latest run, if it is recent enough and can show a change. */
export function pickBefore(test: TestRule, rows: Reading[], screen: Screen | null, weakEye: Side | null, now: Date): PickedBefore {
  const [latest] = sittings(rows.filter((r) => r.takenAt.getTime() <= now.getTime()));
  if (!latest) return { ok: false, why: "none" };
  if (daysBetween(dayKey(latest[0].takenAt), dayKey(now)) > BASELINE_MAX_AGE_DAYS) return { ok: false, why: "too_old" };
  let reading = latest.find((r) => r.eye === null);
  if (test.perEye) {
    const left = latest.find((r) => r.eye === "left"), right = latest.find((r) => r.eye === "right");
    if (!left || !right) return { ok: false, why: "one_eye" };
    reading = countingEye(left.value, right.value, test.lowerIsBetter, weakEye) === "left" ? left : right;
  }
  if (!reading) return { ok: false, why: "none" };
  if (atLimit(reading)) return { ok: false, why: "at_limit" };
  const s = setupOf(test, reading, screen);
  return s.known ? { ok: true, reading, setup: s.setup } : { ok: false, why: "screen_unknown" };
}

export type AfterProblem = "none" | "screen_unknown";
export type PickedAfter = { ok: true; reading: Reading; setup: Setup | null; comparable: boolean } | { ok: false; why: AfterProblem };

/**
 * The "after" check-up for an enrolment: the first run inside the window that was taken with the same screen
 * set-up as the "before" check-up. When there is none, the first run inside the window, marked not comparable.
 * `eye` is the eye of the "before" check-up, or null for a check-up that does not measure each eye.
 */
export function pickAfter(test: TestRule, rows: Reading[], screen: Screen | null, eye: Side | null, base: Setup | null, s: Schedule, now: Date): PickedAfter {
  const inWindow = sittings(rows.filter((r) => r.takenAt.getTime() <= now.getTime() && dayKey(r.takenAt) >= s.dueDay && dayKey(r.takenAt) <= s.lastDay)).reverse();
  const usable = inWindow.flatMap((run) => {
    const reading = run.find((r) => r.eye === eye), set = reading && setupOf(test, reading, screen);
    return reading && set?.known ? [{ reading, setup: set.setup, comparable: sameSetup(base, set.setup) }] : [];
  });
  const picked = usable.find((u) => u.comparable) ?? usable[0];
  return picked ? { ok: true, ...picked } : { ok: false, why: inWindow.length ? "screen_unknown" : "none" };
}

/* ───────────── one member's change ───────────── */

/**
 * The number that is averaged. Stored values are used as they are, except eye balance: it is stored as a signed
 * log ratio and read by members as the stronger eye's contrast, so it is pooled as that contrast in points out of 100.
 */
export const poolValue = (unit: string, value: number) => (unit === "log_ratio" ? 100 * Math.pow(10, -Math.abs(value)) : value);
/** After minus before. */
export const changeOf = (unit: string, before: number, after: number) => poolValue(unit, after) - poolValue(unit, before);

export type NotCounted = "left" | "not_finished" | "result_gone" | "screen_changed" | "no_consent";
export interface Pair {
  leftAt: Date | null; finishedAt: Date | null;
  before: number | null; after: number | null;
  base: Setup | null; follow: Setup | null;
  /** False for a child profile whose parental consent has been taken back. */
  consent: boolean;
}

/** Why an enrolment is left out of the pooled result, or null when it is counted. */
export function notCounted(p: Pair): NotCounted | null {
  if (p.leftAt) return "left";
  if (!p.finishedAt) return "not_finished";
  if (!p.consent) return "no_consent";
  if (p.before === null || p.after === null) return "result_gone";
  return sameSetup(p.base, p.follow) ? null : "screen_changed";
}

/* ───────────── statistics ───────────── */

export const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
/** Sample standard deviation (n − 1). Zero for a single value. */
export function sd(xs: readonly number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

const Z975 = 1.959963985;
/**
 * The value of Student's t that leaves 2.5% in each tail, for `df` degrees of freedom (need not be whole).
 * Cornish-Fisher series from Abramowitz and Stegun, formula 26.7.5. It agrees with printed t tables to 0.001
 * from 4 degrees of freedom up; the app only uses it from 29 up, where it agrees to 0.00001.
 */
export function t975(df: number) {
  const z = Z975, z3 = z ** 3, z5 = z ** 5, z7 = z ** 7, z9 = z ** 9;
  return z + (z3 + z) / (4 * df) + (5 * z5 + 16 * z3 + 3 * z) / (96 * df ** 2) + (3 * z7 + 19 * z5 + 17 * z3 - 15 * z) / (384 * df ** 3)
    + (79 * z9 + 776 * z7 + 1482 * z5 - 1920 * z3 - 945 * z) / (92160 * df ** 4);
}

export interface Gap { gap: number; se: number; df: number; low: number; high: number }
/**
 * The gap between two group means with a 95% confidence interval, by Welch's method for two groups that may
 * vary by different amounts:
 *   gap = mean(a) − mean(b)
 *   se  = √(sa²/na + sb²/nb)
 *   df  = (sa²/na + sb²/nb)² / ((sa²/na)²/(na − 1) + (sb²/nb)²/(nb − 1))      (Welch-Satterthwaite)
 *   interval = gap ± t(0.975, df) × se
 * Each group needs two values or more. When nobody's change differs from anybody else's, the interval is the gap itself.
 */
export function welch(a: readonly number[], b: readonly number[]): Gap {
  const va = sd(a) ** 2 / a.length, vb = sd(b) ** 2 / b.length, gap = mean(a) - mean(b), se = Math.sqrt(va + vb);
  if (se === 0) return { gap, se: 0, df: a.length + b.length - 2, low: gap, high: gap };
  const df = (va + vb) ** 2 / (va ** 2 / (a.length - 1) + vb ** 2 / (b.length - 1));
  const half = t975(df) * se;
  return { gap, se, df, low: gap - half, high: gap + half };
}

export interface Pooled {
  nTried: number; nControl: number;
  changeTried: number; changeControl: number;
  sdTried: number; sdControl: number;
  low: number; high: number;
}

/** True when both groups are large enough for a number to be shown. */
export const enough = (nTried: number, nControl: number, min = MIN_FINISHED_PER_GROUP) => nTried >= min && nControl >= min;

/**
 * The pooled result from every counted change in the two groups. Null while either group is too small:
 * showing nothing is better than showing a number that a few more members could turn around.
 */
export function pool(tried: readonly number[], control: readonly number[], min = MIN_FINISHED_PER_GROUP): Pooled | null {
  if (!enough(tried.length, control.length, Math.max(2, min))) return null;
  const g = welch(tried, control);
  return {
    nTried: tried.length, nControl: control.length, changeTried: mean(tried), changeControl: mean(control),
    sdTried: sd(tried), sdControl: sd(control), low: g.low, high: g.high,
  };
}

export type Lean = "better" | "worse" | "unclear";
/**
 * What the interval of the gap supports, and nothing more. "better" and "worse" only when the whole interval is
 * on one side of zero; an interval that reaches zero is "unclear", however large the gap looks.
 */
export function lean(range: { low: number; high: number }, lowerIsBetter: boolean): Lean {
  if (range.low <= 0 && range.high >= 0) return "unclear";
  return range.high < 0 === lowerIsBetter ? "better" : "worse";
}

/** The ladder step an idea's experiment has earned. A person sets the two steps above "signal"; this never does. */
export const earnedStep = (hasSignal: boolean, enrolled: number): "protocol" | "experiment" | "signal" =>
  hasSignal ? "signal" : enrolled > 0 ? "experiment" : "protocol";
