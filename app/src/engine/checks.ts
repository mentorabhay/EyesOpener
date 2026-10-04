/**
 * The later check-ups (depth, fusion range, near point, suppression, symptoms) and the change rules.
 * Pure maths: the same functions run in the browser while a test is drawn and on the server when it is saved.
 */
import type { Screen } from "./profile";

const ARCSEC_PER_RADIAN = (180 / Math.PI) * 3600;
const round1 = (v: number) => Math.round(v * 10) / 10;
const half = (v: number) => Math.round(v * 2) / 2;

/** The middle value. With an even count, the mean of the middle two. NaN for an empty list. */
export function median(values: readonly number[]): number {
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b), mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export type CheckNote = "" | "floor" | "worse";

/* ───────────── depth: four rings, one floats nearer ───────────── */

/** The first depth step shown, in arcseconds. The screen shows the nearest whole number of device pixels. */
export const DEPTH_START_ARCSEC = 1600;

/** The angle, in arcseconds, between two copies drawn `px` device pixels apart on this screen at this distance. */
export const offsetArcsec = (s: Screen, px: number, dpr = 1) => Math.atan(px / (s.ppc * dpr) / s.dist) * ARCSEC_PER_RADIAN;

/** The finest depth step this screen can show: the angle of one device pixel. */
export const pixelArcsec = (s: Screen, dpr = 1) => offsetArcsec(s, 1, dpr);

/** The stored depth result for an offset in device pixels: arcseconds to one decimal place. */
export const depthValue = (s: Screen, px: number, dpr = 1) => round1(offsetArcsec(s, px, dpr));

/**
 * The offsets the depth test shows, in whole device pixels, largest first. It starts at the pixel count nearest to
 * 1600 arcseconds and halves (rounding down) to one pixel, so every step is at least twice as fine as the one before.
 * `maxPx` is the widest offset the drawing has room for.
 */
export function depthLevels(s: Screen, dpr = 1, maxPx = Infinity): number[] {
  const wanted = Math.round(Math.tan(DEPTH_START_ARCSEC / ARCSEC_PER_RADIAN) * s.dist * s.ppc * dpr);
  const out: number[] = [];
  for (let px = Math.max(1, Math.min(wanted, Math.floor(maxPx))); px >= 1; px = Math.floor(px / 2)) out.push(px);
  return out;
}

export interface DepthStair {
  /** How many offsets there are. `level` 0 is the largest. */
  levels: number;
  level: number;
  /** Right answers in a row at this level. */
  streak: number;
  /** Wrong answers in a row at the largest offset. */
  stuck: number;
  /** The way the last move went: 1 finer, -1 coarser, 0 before the first move. */
  last: -1 | 0 | 1;
  reversals: number;
  trials: number;
  /** Right answers and trials at each level. */
  right: number[];
  seen: number[];
  /** Set when finished: the finest level with at least two of three right, or -1 when no level had that. */
  result: number | null;
}

export const DEPTH_MAX_REVERSALS = 6;
export const DEPTH_MAX_TRIALS = 30;

export const startDepth = (levels: number): DepthStair => ({
  levels, level: 0, streak: 0, stuck: 0, last: 0, reversals: 0, trials: 0,
  right: Array<number>(levels).fill(0), seen: Array<number>(levels).fill(0), result: null,
});

/** At least two of three right: two right answers, and right answers are two thirds or more of the trials at that level. */
export const depthPassed = (s: DepthStair, level: number) => s.right[level] >= 2 && s.right[level] * 3 >= s.seen[level] * 2;

const finestPassed = (s: DepthStair) => {
  for (let l = s.levels - 1; l >= 0; l--) if (depthPassed(s, l)) return l;
  return -1;
};

/**
 * One answer. Two right in a row moves to a finer offset, one wrong moves to a coarser one.
 * The test stops after six changes of direction or thirty trials. It also stops early at either end:
 * two right in a row at one device pixel (the screen cannot go finer); two wrong in a row at the largest offset
 * (there is nothing coarser to show); or two wrong at the largest offset with nothing passed.
 */
export function answerDepth(s: DepthStair, correct: boolean): DepthStair {
  if (s.result !== null) return s;
  const n: DepthStair = { ...s, right: [...s.right], seen: [...s.seen], trials: s.trials + 1 };
  n.seen[n.level]++;
  if (correct) n.right[n.level]++;
  const finish = (): DepthStair => ({ ...n, result: finestPassed(n) });
  const move = (dir: -1 | 1) => {
    if (n.last !== 0 && dir !== n.last) n.reversals++;
    n.last = dir;
    n.level = Math.max(0, Math.min(n.levels - 1, n.level + dir));
    n.streak = 0;
  };

  if (correct) {
    n.stuck = 0;
    if (++n.streak >= 2) {
      if (n.level === n.levels - 1) return finish();
      move(1);
    }
  } else {
    if (n.level === 0 && (++n.stuck >= 2 || (n.seen[0] - n.right[0] >= 2 && finestPassed(n) < 0))) return finish();
    move(-1);
  }
  return n.reversals >= DEPTH_MAX_REVERSALS || n.trials >= DEPTH_MAX_TRIALS ? finish() : n;
}

/**
 * What a finished depth test stores: the offset in device pixels and a note.
 * "floor" means one device pixel was reached; "worse" means the largest offset was not passed, and that offset is stored.
 */
export function depthOutcome(s: DepthStair, levels: readonly number[]): { px: number; note: CheckNote } {
  const r = s.result ?? finestPassed(s);
  if (r < 0) return { px: levels[0], note: "worse" };
  return { px: levels[r], note: r === levels.length - 1 ? "floor" : "" };
}

/* ───────────── fusion range: turning in ─────────────
 * One prism dioptre is one centimetre of separation at one metre. */

/** How fast the two copies move apart and back, in prism dioptres a second. */
export const FUSION_RATE = 1;
/** The test never asks for more than this, however large the screen. */
export const FUSION_MAX = 30;
/** The two copies sit at most this share of the panel's width apart. */
export const FUSION_PANEL_SHARE = 0.4;
export const FUSION_REPEATS = 3;

export const prismOf = (separationCm: number, distCm: number) => (100 * separationCm) / distCm;
export const separationCm = (prism: number, distCm: number) => (prism * distCm) / 100;
/** The separation of the two copies in whole device pixels. */
export const separationPx = (s: Screen, prism: number, dpr = 1) => Math.round(separationCm(prism, s.dist) * s.ppc * dpr);

/** The largest demand a panel `panelPx` CSS pixels wide can show, rounded down to half a prism dioptre. */
export const fusionLimit = (s: Screen, panelPx: number) =>
  Math.floor(Math.min(FUSION_MAX, prismOf((FUSION_PANEL_SHARE * panelPx) / s.ppc, s.dist)) * 2) / 2;

/** The demand `seconds` after the copies start to move apart from zero. */
export const demandOut = (seconds: number, limit: number) => Math.max(0, Math.min(limit, seconds * FUSION_RATE));
/** The demand `seconds` after the copies start to move back from `from`. */
export const demandBack = (from: number, seconds: number) => Math.max(0, from - Math.max(0, seconds) * FUSION_RATE);
/** A demand as it is recorded: to the nearest half prism dioptre. */
export const recordDemand = half;

export interface FusionTry {
  /** The demand at which the picture split, or the screen's limit when it never did. */
  break: number;
  /** The demand at which the picture joined again. Equal to the limit when it never split. */
  recovery: number;
  /** True when the copies reached the screen's limit without a split. */
  atLimit: boolean;
}

/** A repeat in which the picture stayed single all the way to the screen's limit. */
export const limitTry = (limit: number): FusionTry => ({ break: limit, recovery: limit, atLimit: true });

/**
 * The two stored results of one run: the median break and the median recovery.
 * "floor" means the median sits at the screen's limit: the screen ran out of room before the eyes did.
 */
export function fusionSummary(tries: readonly FusionTry[], limit: number): Record<"break" | "recovery", { value: number; note: CheckNote }> {
  const of = (values: number[]) => {
    const value = half(median(values));
    return { value, note: (value >= limit ? "floor" : "") as CheckNote };
  };
  return { break: of(tries.map((t) => t.break)), recovery: of(tries.map((t) => t.recovery)) };
}

/* ───────────── near point ───────────── */

export const NEAR_POINT_TRIES = 3;
/** The stored near point: the median of the tries, to half a centimetre. */
export const nearPoint = (tries: readonly number[]) => half(median(tries));

/* ───────────── suppression: the four-dot check ─────────────
 * One red dot, two cyan dots and one white dot. The eye behind the red lens can see the red dot and the white dot (two);
 * the eye behind the cyan lens can see the two cyan dots and the white dot (three). */

export type DotCount = 2 | 3 | 4 | 5;
export type Lens = "red" | "cyan";

/** 0: four dots, both eyes working together. 1: five dots, both eyes on but not joined. 2: two or three, one eye's picture was not seen. */
export const suppressionScore = (dots: DotCount): 0 | 1 | 2 => (dots === 4 ? 0 : dots === 5 ? 1 : 2);

/** The lens in front of the eye whose picture was not seen, when two or three dots were reported. */
export const unseenLens = (dots: DotCount): Lens | null => (dots === 2 ? "cyan" : dots === 3 ? "red" : null);

/* ───────────── symptom survey ───────────── */

export const SURVEY_QUESTIONS = 15;
/** Each answer is 0 (never) to 4 (always). */
export const SURVEY_TOP_ANSWER = 4;
export const SURVEY_TOP_SCORE = SURVEY_QUESTIONS * SURVEY_TOP_ANSWER;

/** The total, or null when the answers are not fifteen whole numbers from 0 to 4. */
export function surveyTotal(answers: readonly number[]): number | null {
  if (answers.length !== SURVEY_QUESTIONS) return null;
  if (!answers.every((a) => Number.isInteger(a) && a >= 0 && a <= SURVEY_TOP_ANSWER)) return null;
  return answers.reduce((sum, a) => sum + a, 0);
}

/* ───────────── change rules ─────────────
 * These are cautious product thresholds. Each is set larger than the ordinary wobble between two home tests,
 * so an alert means "take it again", not "something is wrong". They are not clinical limits and they do not diagnose. */

/** Letter size worse by this many logMAR (two chart lines) or more. */
export const ALERT_ACUITY_LOGMAR = 0.2;
/** A letter-size loss this large in either eye since the last test asks for an eye doctor soon (three chart lines). */
export const URGENT_ACUITY_LOGMAR = 0.3;
/** Faint letters worse by this many logCS (two steps of the test) or more. */
export const ALERT_CONTRAST_LOGCS = 0.3;
/** Depth worse by two steps of the test: each step doubles the offset, so a factor of four. */
export const ALERT_DEPTH_FACTOR = 4;
/** Fusion break lower by this many prism dioptres or more. */
export const ALERT_FUSION_BREAK = 5;
/** Near point farther away by this many centimetres or more. */
export const ALERT_NEAR_POINT_CM = 4;
/** Symptom total higher by this many points or more. */
export const ALERT_SYMPTOM_POINTS = 10;
/** The suppression score has no margin: any higher score than before is an alert. */
export const ALERT_SUPPRESSION_STEPS = 1;

/** Stored values are four-byte reals, so a difference that should be exactly on a threshold can land a hair under it. */
const SLACK = 1e-4;

type Rule = { worse: (from: number, to: number) => number; by: number };
const RULES: Record<string, Rule> = {
  acuity: { worse: (from, to) => to - from, by: ALERT_ACUITY_LOGMAR },
  contrast: { worse: (from, to) => from - to, by: ALERT_CONTRAST_LOGCS },
  /* depth is compared as a ratio; the stored angles are rounded, so the ratio gets one percent of slack */
  stereo: { worse: (from, to) => (from > 0 ? (to / from) * 1.01 : 0), by: ALERT_DEPTH_FACTOR },
  fusion_break: { worse: (from, to) => from - to, by: ALERT_FUSION_BREAK },
  near_point: { worse: (from, to) => to - from, by: ALERT_NEAR_POINT_CM },
  suppression: { worse: (from, to) => to - from, by: ALERT_SUPPRESSION_STEPS },
  symptoms: { worse: (from, to) => to - from, by: ALERT_SYMPTOM_POINTS },
};

/** True when this test has a change rule. Eye balance and fusion recovery have none. */
export const hasChangeRule = (testKey: string) => testKey in RULES;

/** True when `to` is worse than `from` by the test's threshold or more. */
export function changedMoreThanUsual(testKey: string, from: number, to: number): boolean {
  const rule = RULES[testKey];
  return !!rule && rule.worse(from, to) >= rule.by - SLACK;
}

/** True for a letter-size loss of 0.3 logMAR or more between two results. */
export const needsDoctorSoon = (testKey: string, from: number, to: number) =>
  testKey === "acuity" && to - from >= URGENT_ACUITY_LOGMAR - SLACK;

export interface ChangeCheck {
  /** The latest result is worse than the one before it, or than the baseline, by the threshold or more. */
  alert: boolean;
  /** Letter size dropped by 0.3 logMAR or more since the last test. */
  urgent: boolean;
  /** Which earlier result the alert is measured against. */
  against: ("previous" | "baseline")[];
}

/**
 * Compares the latest result with the previous one and with the baseline.
 * Pass null for a result that does not exist (a first result has neither).
 */
export function changeCheck(testKey: string, latest: number, previous: number | null, baseline: number | null): ChangeCheck {
  const against: ChangeCheck["against"] = [];
  if (previous !== null && changedMoreThanUsual(testKey, previous, latest)) against.push("previous");
  if (baseline !== null && changedMoreThanUsual(testKey, baseline, latest)) against.push("baseline");
  return { alert: against.length > 0, urgent: previous !== null && needsDoctorSoon(testKey, previous, latest), against };
}
