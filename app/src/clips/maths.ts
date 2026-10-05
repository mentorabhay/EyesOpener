/**
 * The arithmetic of the clips. Pure functions: the same ones run in the browser while a clip is drawn and on the
 * server when its result is saved. Nothing here knows about React or the database. Tested in maths.test.ts.
 */
import { median, offsetArcsec, type Screen } from "@/engine";

const ARCSEC_PER_RADIAN = (180 / Math.PI) * 3600;
const DEG = Math.PI / 180;
const round = (v: number, places: number) => Math.round(v * 10 ** places) / 10 ** places;

/* ───────────── where the screen stands ───────────── */

/** Within arm's reach, and across the room, in centimetres. Between the two a clip that names a distance does not run. */
export const NEAR_MAX_CM = 100, FAR_MIN_CM = 200;
export type Stand = "near" | "mid" | "far";
export const standOf = (distCm: number): Stand => (distCm <= NEAR_MAX_CM ? "near" : distCm >= FAR_MIN_CM ? "far" : "mid");

/* ───────────── the size of the screen ───────────── */

/**
 * Page dots to a centimetre from the size printed on a screen: its diagonal in inches, and the whole screen's
 * width and height in page dots. This is a first value only: a browser's zoom changes the size of a page dot, so
 * the ruler step below corrects it.
 */
export const ppcFromDiagonal = (inches: number, widthPx: number, heightPx: number) => Math.hypot(widthPx, heightPx) / (inches * 2.54);

/** The corrected value: a ruler drawn `shownCm` long at `ppc` measured `measuredCm` with a tape. */
export const ppcFromRuler = (ppc: number, shownCm: number, measuredCm: number) => (ppc * shownCm) / measuredCm;

/** A tape that disagrees with the first value by more than this much means a wrong diagonal or a wrong reading: nothing is saved. */
export const RULER_OFF = 0.5;

/* ───────────── stripes ───────────── */

/** Real dots of the screen to one degree at the eye. */
export const dotsPerDegree = (s: Screen, dpr = 1) => s.dist * Math.tan(DEG) * s.ppc * dpr;
/** Real dots in one pair of stripes (one light, one dark) at `cpd` pairs to a degree. */
export const cycleDots = (s: Screen, dpr: number, cpd: number) => dotsPerDegree(s, dpr) / cpd;
/** Fewer dots than this to a pair, and the stripes cannot be drawn with a soft edge at the contrast asked: the clip is not run. */
export const MIN_CYCLE_DOTS = 4;
export const canDrawStripes = (s: Screen, dpr: number, cpd: number) => cycleDots(s, dpr, cpd) >= MIN_CYCLE_DOTS;
/** The patch is four degrees across where the panel has room. */
export const PATCH_DEG = 4;

/* ───────────── depth ───────────── */

/** The shift in whole real dots that is nearest to an angle, and never under one. */
export const dotsForArcsec = (s: Screen, dpr: number, arcsec: number) =>
  Math.max(1, Math.round(Math.tan(arcsec / ARCSEC_PER_RADIAN) * s.dist * s.ppc * dpr));

/**
 * The shifts a depth clip shows, in whole real dots, largest first, each half of the one before (rounded down).
 * `band` is [largest, finest] in arc seconds; a finest of 0 means "down to one dot". `maxDots` is the widest shift
 * the drawing has room for. Empty when the screen cannot show any step of the band: one dot is already coarser
 * than the band's largest step.
 */
export function bandLevels(s: Screen, dpr: number, maxDots: number, band: readonly [number, number]): number[] {
  const [largest, finest] = band;
  if (offsetArcsec(s, 1, dpr) > largest * 1.25) return [];
  const top = Math.max(1, Math.min(dotsForArcsec(s, dpr, largest), Math.floor(maxDots)));
  const bottom = finest > 0 ? dotsForArcsec(s, dpr, finest) : 1;
  const out: number[] = [];
  for (let d = top; d >= Math.max(1, bottom); d = Math.floor(d / 2)) { out.push(d); if (d === 1) break; }
  return out;
}

/**
 * What a banded depth clip may keep. A band is part of the whole test, so its result is the member's finest step
 * only when that step lies inside the band:
 *  - "kept": the finest step read is inside the band, or it is one dot of the screen (nothing finer can be shown),
 *    or even the largest step of the coarsest band was missed (the same record the depth check-up keeps);
 *  - "finer": every step of the band was read: the true step lies below it, so nothing is stored;
 *  - "coarser": the band's largest step was missed and a coarser band exists: nothing is stored.
 */
export function bandVerdict(note: "" | "floor" | "worse", dots: number, coarsest: boolean): "kept" | "finer" | "coarser" {
  if (note === "") return "kept";
  if (note === "floor") return dots === 1 ? "kept" : "finer";
  return coarsest ? "kept" : "coarser";
}

/** The hidden-picture clip starts at the step nearest to this, as the preschool random-dot tests do. */
export const HIDDEN_START_ARCSEC = 800;

/* ───────────── wobbly circle ───────────── */

/** The ripple of the odd circle, as a percent of its radius, largest first. */
export const WOBBLE_STEPS = [8, 4, 2, 1, 0.5, 0.25] as const;
/** A ripple smaller than this many real dots cannot be drawn truthfully, even with soft edges. */
export const MIN_RIPPLE_DOTS = 0.2;
/** The ripples a circle of this radius (in real dots) can show. */
export const wobbleLevels = (radiusDots: number): number[] => WOBBLE_STEPS.filter((p, i) => i === 0 || (p / 100) * radiusDots >= MIN_RIPPLE_DOTS);
/** Bumps around the circle. */
export const WOBBLE_BUMPS = 8;

/* ───────────── resting position ───────────── */

/** A sideways gap in real dots as prism dioptres: one prism dioptre is 1 cm at 1 m. */
export const prismOfDots = (dots: number, s: Screen, dpr: number) => (100 * dots) / (s.ppc * dpr) / s.dist;
/** The same gap as minutes of arc at the eye. */
export const arcminOfDots = (dots: number, s: Screen, dpr: number) => (Math.atan(dots / (s.ppc * dpr) / s.dist) / DEG) * 60;

/**
 * The stored resting position from three settings of the movable line. `offsets` are where the right eye's line
 * was left, measured from the left eye's line in real dots: to the right (or downward) is positive.
 *
 * Sideways: eyes that rest turned out see the right eye's line shifted to the left, so it has to be moved to the
 * right to look lined up. A positive offset is therefore "turned out", stored as a negative number; "turned in" is
 * positive. Up and down: a right eye that rests higher sees its line lower, so the line is moved up (a negative
 * offset); the stored number is positive when the right eye rests higher.
 */
export function restingPosition(offsets: readonly number[], s: Screen, dpr: number, unit: "prism_dioptre" | "arcmin"): number {
  const mid = median(offsets);
  const size = unit === "arcmin" ? arcminOfDots(Math.abs(mid), s, dpr) : prismOfDots(Math.abs(mid), s, dpr);
  const value = -Math.sign(mid) * size;
  return round(value, 1) || 0;
}

/* ───────────── the browser's own timing ───────────── */

/** A picture counts as late when it took more than one and a half times the usual gap. */
export const LATE_FACTOR = 1.5;
export interface FrameStats { fps: number; late: number; frames: number }
/** Pictures a second and the share that came late, from the gaps between pictures in milliseconds. Null with too few. */
export function frameStats(gaps: readonly number[]): FrameStats | null {
  const good = gaps.filter((g) => g > 0 && Number.isFinite(g));
  if (good.length < 60) return null;
  const usual = median(good);
  return { fps: round(1000 / usual, 1), late: round(good.filter((g) => g > usual * LATE_FACTOR).length / good.length, 3), frames: good.length };
}
/** Up to this share late is fine; up to the second is worth a note; more is a problem. Product thresholds, not published limits. */
export const LATE_FINE = 0.02, LATE_NOTE = 0.1;

/* ───────────── spots ───────────── */

export interface Place { x: number; y: number }
/** Places around the middle, as shares of the field's radius: `rings` distances by eight directions. The outermost ring sits at 0.9. */
export function spotPlaces(rings: number): Place[] {
  const out: Place[] = [];
  for (let r = 1; r <= rings; r++) {
    const reach = (0.9 * r) / rings;
    /* every other ring is turned by half a step, so the places do not sit on straight spokes */
    for (let d = 0; d < 8; d++) { const a = ((d + (r % 2 ? 0 : 0.5)) * Math.PI) / 4; out.push({ x: round(reach * Math.cos(a), 4), y: round(reach * Math.sin(a), 4) }); }
  }
  return out;
}
/** Trials with nothing shown, mixed in to catch a "yes" that is a guess. */
export const CATCHES = 4;
/** This many "yes" answers with nothing shown, and the run cannot be trusted: it is not kept. */
export const CATCH_LIMIT = 2;
/** The field is tested out to this many degrees from the middle where the panel has room. */
export const FIELD_DEG = 10;
/** The field's radius in degrees for a panel whose half-height is `halfCm`. */
export const fieldRadiusDeg = (halfCm: number, distCm: number) => Math.min(FIELD_DEG, round(Math.atan(halfCm / distCm) / DEG, 1));

/* ───────────── reading ───────────── */

/** Under this many seconds, or faster than this, the passage was not read: nothing is kept. */
export const READ_MIN_SECONDS = 10, READ_MAX_WPM = 600, READ_MIN_WPM = 20;
export function readingSpeed(words: number, seconds: number): number | null {
  if (!(words > 0) || !(seconds >= READ_MIN_SECONDS)) return null;
  const wpm = Math.round((words * 60) / seconds);
  return wpm >= READ_MIN_WPM && wpm <= READ_MAX_WPM ? wpm : null;
}

/* ───────────── the pull set for a hold ───────────── */

/** With no fusion result to go by, a hold is set at this many prism dioptres. A cautious product choice. */
export const HOLD_DEFAULT_PD = 6;
/** Half of the last fusion break, in whole prism dioptres, never under 2 and never over 15. */
export const holdDemand = (lastBreak: number | null) => (lastBreak === null ? HOLD_DEFAULT_PD : Math.max(2, Math.min(15, Math.round(lastBreak / 2))));
