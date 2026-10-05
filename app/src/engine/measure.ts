/**
 * The measurement core: letter sizes, contrast steps and the two staircases.
 * State machines are pure, so the same logic is unit-tested here and drawn by any screen.
 */
import type { Screen, Eye } from "./profile";

const ARCMIN = Math.PI / 180 / 60;

/* ───────────── acuity: tumbling E ───────────── */

export interface AcuityLevel {
  /** Stroke width in device pixels. The letter is five strokes tall. */
  stroke: number;
  /** logMAR this letter tests at the screen's size and distance. */
  logMar: number;
}

/** logMAR of a tumbling E whose stroke is `stroke` device pixels. */
export const acuityOf = (s: Screen, stroke: number, dpr = 1) =>
  Math.log10(Math.atan((5 * stroke) / dpr / s.ppc / s.dist) / ARCMIN / 5);

/**
 * The letter sizes this screen can show, largest first, about 0.1 logMAR apart from 1.0 downward.
 * A stroke must be a whole number of device pixels, so small sizes are further apart on coarse screens.
 */
export function acuityLevels(s: Screen, dpr = 1, maxCssPx = 190): AcuityLevel[] {
  const smax = Math.max(1, Math.floor((maxCssPx * dpr) / 5));
  const out: AcuityLevel[] = [];
  for (let target = 1; target >= -0.3001; target -= 0.1) {
    let bs = 1, bd = 9;
    for (let st = 1; st <= smax; st++) {
      const d = Math.abs(acuityOf(s, st, dpr) - target);
      if (d < bd) { bd = d; bs = st; }
    }
    if (!out.some((o) => o.stroke === bs)) out.push({ stroke: bs, logMar: Math.round(acuityOf(s, bs, dpr) * 100) / 100 });
  }
  return out.sort((a, b) => b.stroke - a.stroke);
}

/* ───────────── contrast: fading E ───────────── */

/** logCS steps of 0.15, from full black down to the faintest step an 8-bit screen shows. */
export const contrastLevels = (): number[] => Array.from({ length: 12 }, (_, i) => Math.round(i * 15) / 100);

export const CONTRAST_BACKGROUND = 186;

/**
 * Grey value of the mid-grey background: half of full light on a screen with this gamma. With the usual gamma it is
 * `CONTRAST_BACKGROUND`. The letter's grey follows the screen's gamma, so the background must follow it too: on a
 * screen measured at another gamma a fixed 186 would no longer be half light, and the faintest letters would come
 * out lighter than the background instead of darker.
 */
export const contrastField = (gamma = 2.2) => Math.round(255 * Math.pow(0.5, 1 / gamma));

/** Grey value of the letter for a logCS step, on the mid-grey background. */
export const contrastGrey = (logCs: number, gamma = 2.2) =>
  Math.round(255 * Math.pow(0.5 * (1 - Math.pow(10, -logCs)), 1 / gamma));

/* ───────────── four-way staircase ─────────────
 * Fast descent (two levels per correct answer), then two-of-three at each level.
 * `level` indexes a list sorted easiest first. */

export interface Staircase {
  levels: number;
  level: number;
  fast: boolean;
  tally: [number, number];
  trials: number;
  passed: number[];
  failed: number[];
  /** Set when finished: the hardest level passed, or -1 when even the easiest was missed. */
  result: number | null;
}

export const MAX_TRIALS = 18;

export const startStaircase = (levels: number): Staircase => ({
  levels, level: 0, fast: true, tally: [0, 0], trials: 0, passed: [], failed: [], result: null,
});

export function answerStaircase(s: Staircase, correct: boolean): Staircase {
  if (s.result !== null) return s;
  const n: Staircase = { ...s, tally: [...s.tally] as [number, number], passed: [...s.passed], failed: [...s.failed], trials: s.trials + 1 };
  const last = n.levels - 1;
  const finish = (r: number) => ({ ...n, result: r });

  if (n.trials >= MAX_TRIALS) return finish(n.passed.length ? Math.max(...n.passed) : -1);

  if (n.fast) {
    if (correct && n.level < last) { n.level = Math.min(last, n.level + 2); return n; }
    n.fast = false;
    if (correct) n.tally = [1, 0];
    else { n.tally = [0, 0]; n.level = Math.max(0, n.level - 1); }
    return n;
  }

  n.tally[correct ? 0 : 1]++;
  if (n.tally[0] >= 2) {
    n.passed.push(n.level); n.tally = [0, 0];
    if (n.level === last || n.failed.includes(n.level + 1)) return finish(n.level);
    n.level++;
  } else if (n.tally[1] >= 2) {
    n.failed.push(n.level); n.tally = [0, 0];
    if (n.passed.includes(n.level - 1)) return finish(n.level - 1);
    if (n.level === 0) return finish(-1);
    n.level--;
  }
  return n;
}

/* ───────────── balance: two overlapping letters ─────────────
 * x is log10 of red over cyan contrast. Choosing the red letter dims red; choosing cyan dims cyan. */

export interface BalanceState {
  x: number;
  step: number;
  last: -1 | 0 | 1;
  reversals: number[];
  trials: number;
  result: number | null;
}

export const BALANCE_LIMIT = 1.3;
export const BALANCE_MAX_TRIALS = 14;

export const startBalance = (): BalanceState => ({ x: 0, step: 0.2, last: 0, reversals: [], trials: 0, result: null });

const clampX = (v: number) => Math.max(-BALANCE_LIMIT, Math.min(BALANCE_LIMIT, v));
const round2 = (v: number) => Math.round(v * 100) / 100;

/** `picked` is the ink of the letter that looked stronger, or "equal" to stop at the current point. */
export function answerBalance(b: BalanceState, picked: "red" | "cyan" | "equal"): BalanceState {
  if (b.result !== null) return b;
  if (picked === "equal") return { ...b, result: round2(clampX(b.x)) };
  const dir = picked === "red" ? -1 : 1;
  const n: BalanceState = { ...b, reversals: [...b.reversals], trials: b.trials + 1 };
  if (n.last !== 0 && dir !== n.last) { n.reversals.push(n.x); n.step = 0.1; }
  n.last = dir;
  n.x = clampX(n.x + dir * n.step);
  if (n.reversals.length >= 4 || n.trials >= BALANCE_MAX_TRIALS) {
    const r = n.reversals.slice(-4);
    n.result = round2(clampX(r.length ? r.reduce((a, v) => a + v, 0) / r.length : n.x));
  }
  return n;
}

/** Contrast of each ink for a balance value. */
export const balanceContrasts = (x: number) => ({ red: x < 0 ? Math.pow(10, x) : 1, cyan: x > 0 ? Math.pow(10, -x) : 1 });

/** Which eye wears the cyan lens for the balance test: the eye that read worse, else the left. */
export const balanceCyanEye = (vaLeft: number, vaRight: number): Eye =>
  Math.abs(vaLeft - vaRight) >= 0.05 ? (vaLeft > vaRight ? "L" : "R") : "L";
