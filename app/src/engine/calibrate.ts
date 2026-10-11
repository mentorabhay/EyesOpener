// Eyes Opener: Calibration of one screen with one pair of red-cyan glasses: gamma, colour leak and ink balance.
/**
 * Calibration of one screen with one pair of red-cyan glasses: gamma, colour leak and ink balance.
 * Pure functions. The screens that take the measurements are in src/app/(app)/settings/screen.
 *
 * What this is, honestly. Each value is found by eye, at home, by making two patches look equally bright.
 * It is an estimate, not a reading from a light meter. A careful person repeats a match of two patches of one
 * colour to within about a tenth, and a match of two different colours less well than that. That is enough to
 * set contrast more truly than a guess and to spot glasses that let too much through. It is not enough to
 * certify a screen. Nothing in these steps flashes: a patch changes only when the person moves it, one small
 * step at a time, and there is no flicker test and no pattern that swaps.
 *
 * What the engine does with each value:
 *  1. Gamma goes into `channel()` (colour.ts), and so into every ink and every grey the engine draws.
 *  2. Colour leak is reported and judged (`leakFor`). It is not cancelled (see "Why the leak is not cancelled"), but
 *     the inks can be tuned for the glasses so that less of it shows (tune.ts, the fourth step).
 *  3. Ink balance is taken out of the balance check-up's result when the eye profile is derived (`derive`, profile.ts).
 * With nothing measured (gamma 2.2, no leak, no ink balance) the engine returns exactly what it did before
 * calibration existed.
 */
import { MIN_CONTRAST } from "./profile";
import { USUAL_TUNE, trainRed, weakLight, type InkTune } from "./tune";

/** The gamma of a standard screen, used until this screen is measured. */
export const USUAL_GAMMA = 2.2;

/** The ranges a calibration may fall in. The steps clamp to them and the server refuses anything outside. */
export const CAL = {
  /** A screen's gamma. Ordinary screens sit between about 1.8 and 2.6. */
  gamma: [1.6, 3],
  /** Grey value of the plain half in the gamma match. */
  grey: [128, 232],
  /** Channel value of the square that is moved in the leak match. */
  level: [0, 200],
  /** A lens's leak, as a share of that lens's own ink at full. */
  leak: [0, 0.7],
  /** Where the ink match may be set: log10 of red over cyan contrast. */
  inkSet: [-1.2, 1.2],
  /** The ink balance that is accepted. */
  ink: [-1, 1],
} as const satisfies Record<string, readonly [number, number]>;

const clamp = (v: number, [lo, hi]: readonly [number, number]) => Math.max(lo, Math.min(hi, v));
const inside = (v: number, [lo, hi]: readonly [number, number]) => Number.isFinite(v) && v >= lo && v <= hi;
const whole = (v: number, range: readonly [number, number]) => Number.isInteger(v) && inside(v, range);
const round = (v: number, places: number) => Math.round(v * 10 ** places) / 10 ** places;
const mean = (a: number, b: number) => (a + b) / 2;

/**
 * One value from two matches of the same thing. A match is made twice from opposite sides (once coming up from
 * too dark, once coming down from too bright), because a person stops a little early each way and the two errors cancel.
 * `spread` is how far apart the two matches were, in the value's own unit: the honest size of the estimate.
 * "apart": the two matches disagree by more than a careful person's would. "range": outside what a real screen gives.
 */
export type Estimate = { ok: true; value: number; spread: number } | { ok: false; why: "apart" | "range" };
export type Pair = readonly [number, number];

/* ───────────── 1. gamma ─────────────
 * A screen does not turn a number into light in even steps: light = (number / 255) ^ gamma.
 *
 * How it is measured. Fine lines, one white and one black in turn, give half of the screen's full light from the
 * seat, whatever the gamma, because the eye adds the lines up. A plain grey beside them is moved until the two
 * halves look equally bright. The grey value at the match gives gamma: 0.5 = (grey / 255) ^ gamma.
 * The lines do not move and do not swap; this is the still half of the usual gamma chart, with no flicker.
 *
 * One gamma, not one per ink. The red ink uses the red channel alone and the cyan ink the green and blue
 * channels, and on an uncorrected panel the three curves can differ a little. A match per channel was considered
 * and left out:
 *  - a match by eye places gamma to within about 0.1 to 0.2 (five grey steps either way are 0.19), which is as
 *    large as the difference between the channels of an ordinary screen, so three matches would mostly record
 *    the person and not the screen;
 *  - only the red ink is dimmed in play (the cyan ink is drawn at full, where gamma changes nothing), and at the
 *    15% starting contrast an error of 0.1 in gamma moves the light by about 8%, under a third of one step of
 *    the balance check-up (0.1 log unit, 26%);
 *  - the grey letters of the faint-letter check-up use all three channels together, which is what a grey match measures.
 * So one grey match serves the three inks.
 *
 * Limits. The match fixes the curve at one point (half light) and takes the rest to be a power curve. A screen
 * that blurs fine lines (a TV that rescales its picture) makes the lines look darker and reads as a low gamma;
 * a reading outside `CAL.gamma` is refused for that reason and the usual value stays. */

/** The share of full light that fine white-and-black lines give from the seat. */
export const STRIPE_LIGHT = 0.5;

/** The gamma of a screen on which a plain grey of this value (0 to 255) gives as much light as the lines. */
export const gammaOfGrey = (grey: number) => Math.log(STRIPE_LIGHT) / Math.log(grey / 255);

/** The grey value that matches the lines on a screen with this gamma: the way back from `gammaOfGrey`. */
export const greyOfGamma = (gamma: number) => 255 * Math.pow(STRIPE_LIGHT, 1 / gamma);

/** Two gamma matches further apart than this are not one reading: about nine grey steps. */
export const GAMMA_APART = 0.35;

export function gammaFromMatches(greys: Pair): Estimate {
  if (!greys.every((g) => whole(g, CAL.grey))) return { ok: false, why: "range" };
  const [a, b] = greys.map(gammaOfGrey);
  if (!inside(a, CAL.gamma) || !inside(b, CAL.gamma)) return { ok: false, why: "range" };
  const spread = Math.abs(a - b);
  if (spread > GAMMA_APART) return { ok: false, why: "apart" };
  return { ok: true, value: round(mean(a, b), 2), spread: round(spread, 2) };
}

/** The share of an ink's full light that a channel value (0 to 255) gives. The way back from `channel()`. */
export const lightOf = (level: number, gamma = USUAL_GAMMA) => Math.pow(clamp(level / 255, [0, 1]), gamma);

/* ───────────── 2. colour leak ─────────────
 * Through a perfect red lens the cyan ink would be black. Real lenses let some through, so each eye also sees a
 * faint copy of the other eye's picture. The leak of a lens is the light of the wrong ink through that lens as a
 * share of the light of the right ink at full through the same lens. This is the definition Woods and Harris use
 * (crosstalk = leakage / signal). They measured red-cyan glasses on LCD monitors at 7.7% to 24.3% through the red
 * lens and 0.2% to 7.7% through the cyan lens, so some leak is the ordinary case and not a fault:
 *   Woods AJ, Harris CR. Comparing levels of crosstalk with red/cyan, blue/yellow, and green/magenta anaglyph
 *   3D glasses. Proc. SPIE 7524, 75240Q (2010). https://doi.org/10.1117/12.840835
 *
 * How it is measured: one eye, one lens. The wrong ink at full sits beside the right ink, and the person moves
 * the right ink until the two squares look the same. Both squares are seen through the same lens by the same eye,
 * so the match does not depend on whose eye it is, and room light and the screen's own black glow fall on both
 * squares alike. The leak is the light of the matched level: (level / 255) ^ gamma. A person who cannot see the
 * wrong ink at all through the lens has a leak too small to see, stored as 0.
 * Through the cyan lens the two squares differ a little in colour, so that match is the rougher of the two.
 *
 * Why the leak is not cancelled. On a grey picture a ghost can be cancelled by taking the same light away from
 * the other eye's picture. Therapy scenes are drawn on a black field, and nothing can be taken away from black.
 * Lifting the field to grey would break the three-ink rule and lower contrast for both eyes; dimming the cyan ink
 * until its ghost was gone would take most of the light from the weaker eye. So the engine never changes an ink
 * because of the leak, and the leak can therefore never raise the stronger eye's contrast above what the eye
 * profile sets. The engine says what the leak does to each member (`leakFor`), and the screen page shows it.
 * What can be done is to change the inks themselves so that less of each shows through the wrong lens, without
 * lifting the field: less green in the cyan for the red lens, a ceiling on the red for the cyan lens (tune.ts). */

export interface Leak {
  /** Through the red lens: the cyan ink's light as a share of the red ink at full. */
  red: number;
  /** Through the cyan lens: the red ink's light as a share of the cyan ink at full. */
  cyan: number;
}

/**
 * Below this a ghost is too faint to matter. Baker, Kaestner and Gouws found that crosstalk under about 2% is
 * unlikely to disturb two-eye rivalry: Measurement of crosstalk in stereoscopic display systems used for vision
 * research. Journal of Vision 16(15):14 (2016). https://doi.org/10.1167/16.15.14
 */
export const LEAK_FAINT = 0.02;
/**
 * Above this, suspect the wrong lens or glasses that are not red and cyan: it is more than the worst red-cyan
 * pair Woods and Harris measured on any screen (26.8%).
 */
export const LEAK_SUSPECT = 0.3;

/** One lens's two matches, as channel values of the square that was moved, or "unseen" when the wrong ink could not be seen at all. */
export type LensMatch = Pair | "unseen";

export function leakFromMatches(match: LensMatch, gamma = USUAL_GAMMA): Estimate {
  if (match === "unseen") return { ok: true, value: 0, spread: 0 };
  if (!match.every((v) => whole(v, CAL.level)) || !inside(gamma, CAL.gamma)) return { ok: false, why: "range" };
  const [a, b] = match.map((v) => lightOf(v, gamma));
  const spread = Math.abs(a - b);
  /* Two matches agree when they are within two points of each other, or within half of the larger one. */
  if (spread > Math.max(LEAK_FAINT, 0.5 * Math.max(a, b))) return { ok: false, why: "apart" };
  const value = lightOf(mean(match[0], match[1]), gamma);
  if (!inside(value, CAL.leak)) return { ok: false, why: "range" };
  return { ok: true, value: round(value, 3), spread: round(spread, 3) };
}

export type LeakLevel = "clean" | "ghost" | "high";

export interface LeakEffect {
  /** The weaker eye's pictures as the stronger eye sees them through the red lens, next to its own pictures. 1 means as bright. */
  inStrong: number;
  /** The stronger eye's pictures as the weaker eye sees them through the cyan lens, next to its own pictures. */
  inWeak: number;
  level: LeakLevel;
}

/**
 * What the leak does to one member, whose stronger eye is shown at `contrast` (0.05 to 1).
 *
 * The cyan ink is always at full and the red ink is at the member's contrast. So the ghost of the weaker eye's
 * pictures in the stronger eye is `red / contrast` of that eye's own pictures: dimming the red ink does not dim the ghost.
 * - "high": that ghost is at least as bright as the stronger eye's own pictures. The stronger eye then sees
 *   everything in the scene about equally well, the split between the two inks is lost for it, and a two-eye game
 *   can be played with the stronger eye alone. The game does not work as intended on this screen with these glasses.
 * - "ghost": a leak a person can see (`LEAK_FAINT` or more) through either lens. Games work, but a faint second
 *   picture shows, and fine depth steps and joining tasks are less exact.
 * - "clean": under `LEAK_FAINT` through both lenses.
 * The level never gets better as a leak grows, and never gets worse as the member's contrast rises.
 *
 * With the inks tuned (tune.ts): the red lens's leak is measured with the cyan ink as it is drawn, so it already holds
 * the cyan mix; the red ink is the member's contrast under the ceiling, so a ceiling below the member's contrast
 * makes the ghost in the stronger eye relatively brighter; and the weaker eye's own pictures carry `weakLight` of the
 * cyan ink's untuned light, which the cyan lens's leak was measured against.
 */
export function leakFor(leak: Leak, contrast: number, tune: InkTune = USUAL_TUNE): LeakEffect {
  const con = trainRed(clamp(contrast, [MIN_CONTRAST, 1]), tune);
  const red = clamp(leak.red, [0, 1]), cyan = clamp(leak.cyan, [0, 1]);
  const inStrong = red / con, inWeak = (cyan * con) / weakLight(tune.green, tune.blue);
  return { inStrong, inWeak, level: inStrong >= 1 ? "high" : Math.max(red, cyan) >= LEAK_FAINT ? "ghost" : "clean" };
}

/* ───────────── 3. ink balance ─────────────
 * On a standard screen the cyan ink (green and blue together) carries 79% of white's light and the red ink 21%
 * (the sRGB weights 0.7152 + 0.0722 and 0.2126, IEC 61966-2-1), and the two lenses do not pass equal shares
 * either. So with both inks "at full", one eye's picture is brighter than the other's before anyone's eyes come
 * into it. The ink balance is that difference: log10 of the cyan ink through the cyan lens over the red ink
 * through the red lens. It is on the same axis as the balance check-up (measure.ts): positive means the cyan ink
 * must be dimmed for the two to look equal.
 *
 * It is not the member's own eye balance. The balance check-up finds the point at which a member's two eyes pull
 * equally on this screen, and that point holds two things added together: how the member's eyes differ, and how
 * the inks differ. The ink balance is the second part alone, a property of the screen and the glasses.
 *
 * How it is measured: a grown-up whose two eyes see about equally well wears the glasses and makes a red square
 * and a cyan square look equally bright. Each eye sees one square; they sit side by side inside a white frame and
 * move only when the person moves them. The member in therapy does not do this step: a weaker eye would put its
 * own difference into the reading. It is done twice, the second time with the glasses turned round, so that a small
 * difference between the grown-up's own eyes cancels (the first match reads ink + own, the second ink - own) along
 * with the habit of stopping early. When the glasses cannot be turned, the second match still cancels the habit,
 * and the grown-up's own difference stays in the reading: the record says which it was.
 *
 * How it is used: `derive` takes it out of the balance check-up's result (`ownBalance`) before deciding which eye
 * is weaker. Without it, a person with two equal eyes reads as having a weaker eye behind the red lens on any
 * screen where the cyan ink is the brighter one. The stronger eye's contrast stays the balance point that was
 * found on this screen with the cyan lens on the weaker eye, and is never above full. The starting level used
 * when no balance check-up exists is never raised to make up for a dim red ink: calibration does not raise contrast.
 *
 * Limits. Red against cyan is a match of two different colours, the hardest kind to make by eye; expect it to be
 * good to about 0.1 to 0.2 log unit. It is a match of brightness, while the balance check-up asks which of two
 * letters looks stronger: the two are close but not the same question. */

/** What a standard screen gives before any lens: log10(0.7874 / 0.2126). For comparison only; the engine's default is 0, "not measured". */
export const SRGB_INK_BALANCE = Math.log10((0.7152 + 0.0722) / 0.2126);

/** Two ink matches further apart than this are not one reading: a factor of two in light. */
export const INK_APART = 0.3;

export function inkFromMatches(xs: Pair): Estimate {
  if (!xs.every((x) => inside(x, CAL.inkSet))) return { ok: false, why: "range" };
  const spread = Math.abs(xs[0] - xs[1]);
  if (spread > INK_APART) return { ok: false, why: "apart" };
  const value = mean(xs[0], xs[1]);
  if (!inside(value, CAL.ink)) return { ok: false, why: "range" };
  return { ok: true, value: round(value, 2), spread: round(spread, 2) };
}

/** How many times brighter the cyan ink looks through its lens than the red ink through its lens. Under 1 means red is the brighter. */
export const inkTimes = (inkBalance: number) => Math.pow(10, inkBalance);

/**
 * The member's own share of a balance check-up result: what is left when the inks' share is taken out.
 * Negative means the eye behind the cyan lens is the weaker one. With no ink balance measured this is the result itself.
 */
export const ownBalance = (x: number, inkBalance: number | null | undefined = 0) => x - (Number.isFinite(inkBalance) ? (inkBalance as number) : 0);

/* ───────────── when gamma is measured after the others ─────────────
 * A leak and an ink balance are worked out from channel values with the gamma known at the time. The channel
 * values that were matched on the screen do not change when gamma is measured later, but the light they stand for
 * does, so both are worked out again with the new gamma. */

/** A balance value set with one gamma, restated for another: the contrast 10^x was drawn as a channel value, which is what was matched. */
export const regammaBalance = (x: number, from: number, to: number) => (x * to) / from;

/** A screen's calibration as the engine reads it. Null means "not measured". */
export interface Rig { gamma: number; leak: Leak | null; ink: number | null }
export const USUAL_RIG: Rig = { gamma: USUAL_GAMMA, leak: null, ink: null };
