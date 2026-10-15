/**
 * 4. Tuning the two inks for one pair of glasses on one screen. Pure, apart from the one setting the browser holds
 * for the page it is drawing (`setInkTune`).
 *
 * Why. Through the red lens the cyan ink should be black, and through the cyan lens the red ink should be black.
 * Real lenses let some through (calibrate.ts, "colour leak"): Woods and Harris measured red-cyan glasses on LCD
 * screens at 7.7% to 24.3% through the red lens and 0.2% to 7.7% through the cyan lens. The red lens covers the
 * stronger eye, so a cyan picture that shows through it lets the stronger eye see what was meant for the weaker eye
 * alone. For a member whose red ink is dim, that ghost can be as bright as the stronger eye's own pictures, and the
 * game can then be played with the stronger eye alone.
 *   Woods AJ, Harris CR. Proc. SPIE 7524, 75240Q (2010). https://doi.org/10.1117/12.840835
 *
 * Two corrections, one for each lens. Neither lifts the black field, neither adds a fourth ink, and neither raises the
 * stronger eye's contrast:
 *
 *  - Red lens: a new mix for the cyan ink (`green` and `blue`). The cyan ink is the green and blue channels together.
 *    What leaks through a red filter differs with the screen and the glasses: on one pair it is mostly the long-wave tail
 *    of the green light, on another mostly blue. So it is not worked out: a grown-up looks through the red lens only and
 *    moves a green and a blue slider until the cyan shapes are gone, or as faint as they get. The cost is light for the
 *    weaker eye: green carries most of the cyan ink's brightness (sRGB weights 0.7152 green and 0.0722 blue,
 *    IEC 61966-2-1), so `weakLight` says how much is kept. A mix that keeps less than `TUNE.minLight` is refused: hiding a
 *    leak by starving the weaker eye defeats the training (seen on 9 October 2026: a mix that hid every ghost left the
 *    weaker eye 2% of its light). The cyan ink is redefined for this screen and these glasses everywhere it is drawn,
 *    check-ups included, so a balance check-up taken after the tuning finds the balance point with the cyan ink as it
 *    now is. One taken before is flagged to be taken again (screen-rules.ts).
 *
 *  - Cyan lens: a ceiling on the red ink while training (`redTop`). The red ink is already dimmed to the member's
 *    contrast, so its shadow through the cyan lens is usually small. A grown-up looks through the cyan lens only at
 *    red shapes and lowers the ceiling until their shadow is gone. In training the red ink is then never
 *    brighter than that ceiling (`trainRed`). This lowers the stronger eye's picture only for a member whose contrast
 *    is above the ceiling, and it moves in the safe direction for a lazy eye (the stronger eye's picture gets weaker,
 *    never stronger). Check-ups and the calibration steps draw the red ink without the ceiling, so what they measure
 *    stays the eye and not the cap. The screen page names every person whose red ink the ceiling lowers.
 *
 * With nothing tuned (green 1, blue 1, ceiling 1) every ink is exactly what it was before tuning existed.
 */

export interface InkTune {
  /** Share of the green channel's light kept in the cyan ink, 0 to 1. */
  green: number;
  /** Share of the blue channel's light kept in the cyan ink, 0 to 1. */
  blue: number;
  /** The most light the red ink may have in training, 0.1 to 1. */
  redTop: number;
}

export const USUAL_TUNE: InkTune = Object.freeze({ green: 1, blue: 1, redTop: 1 });

/** The ranges a tuning may fall in, and the least share of the cyan ink's light the weaker eye must keep. */
export const TUNE = { green: [0, 1], blue: [0, 1], redTop: [0.1, 1], minLight: 0.5 } as const;

const clamp = (v: number, [lo, hi]: readonly [number, number]) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : hi);
const SRGB_G = 0.7152, SRGB_B = 0.0722;

/** Share of the cyan ink's brightness the weaker eye keeps with this mix: 1 untuned, about 0.91 with no blue. */
export const weakLight = (green: number, blue = 1) => (SRGB_G * clamp(green, TUNE.green) + SRGB_B * clamp(blue, TUNE.blue)) / (SRGB_G + SRGB_B);

/** True when a cyan mix leaves the weaker eye at least `TUNE.minLight` of its light. */
export const mixKeepsEnough = (green: number, blue: number) => weakLight(green, blue) >= TUNE.minLight - 1e-9;

/**
 * A tuning made safe: anything missing or out of range falls back to the usual ink, and a cyan mix that would leave the
 * weaker eye under the floor (one saved before the floor existed) is read as the usual cyan.
 */
export const validTune = (t?: Partial<InkTune> | null): InkTune => {
  const green = t?.green == null ? 1 : clamp(t.green, TUNE.green), blue = t?.blue == null ? 1 : clamp(t.blue, TUNE.blue);
  const ok = mixKeepsEnough(green, blue);
  return { green: ok ? green : 1, blue: ok ? blue : 1, redTop: t?.redTop == null ? 1 : clamp(t.redTop, TUNE.redTop) };
};

/** The tuning stored on a screen's row. Null columns mean "not tuned". */
export const tuneOf = (row?: { cyanGreen?: number | null; cyanBlue?: number | null; redTop?: number | null } | null): InkTune =>
  validTune({ green: row?.cyanGreen ?? undefined, blue: row?.cyanBlue ?? undefined, redTop: row?.redTop ?? undefined });

export const isTuned = (t: InkTune) => t.green < 1 || t.blue < 1 || t.redTop < 1;

/** The red ink's contrast in training: the member's contrast, never above the ceiling. */
export const trainRed = (contrast: number, tune: InkTune) => Math.min(contrast, tune.redTop);

/* The codes a person reads and types: the cyan ink at full as #00GGBB, the red ceiling as #RR0000. Channel values are
   worked out from light with the screen's gamma, as every other ink is (colour.ts). */
const hex2 = (n: number) => Math.round(n).toString(16).toUpperCase().padStart(2, "0");
const toChannel = (light: number, gamma: number) => Math.round(255 * Math.pow(Math.max(0, Math.min(1, light)), 1 / gamma));
const toLight = (ch: number, gamma: number) => Math.round(Math.pow(Math.max(0, Math.min(255, ch)) / 255, gamma) * 1000) / 1000;
export const cyanCode = (t: Pick<InkTune, "green" | "blue">, gamma: number) => `#00${hex2(toChannel(t.green, gamma))}${hex2(toChannel(t.blue, gamma))}`;
export const redCode = (top: number, gamma: number) => `#${hex2(toChannel(top, gamma))}0000`;
/** A typed cyan code back to its mix, or why it is refused: it must hold no red. */
export function parseCyanCode(code: string, gamma: number): { ok: true; green: number; blue: number } | { ok: false; why: "red" | "form" } {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(code.trim());
  if (!m) return { ok: false, why: "form" };
  if (parseInt(m[1], 16) !== 0) return { ok: false, why: "red" };
  return { ok: true, green: toLight(parseInt(m[2], 16), gamma), blue: toLight(parseInt(m[3], 16), gamma) };
}
/** A typed red code back to its ceiling, or why it is refused: it must hold no green or blue. */
export function parseRedCode(code: string, gamma: number): { ok: true; top: number } | { ok: false; why: "other" | "form" } {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(code.trim());
  if (!m) return { ok: false, why: "form" };
  if (parseInt(m[2], 16) !== 0 || parseInt(m[3], 16) !== 0) return { ok: false, why: "other" };
  return { ok: true, top: toLight(parseInt(m[1], 16), gamma) };
}
export const channelOf = toChannel;
export const lightOfChannel = toLight;

/* The browser draws one screen at a time, so the tuning of the household's screen is held here for the page it is
   drawing: the member layout sets it before any scene is drawn (components/ink-tune.tsx). The server never sets it,
   because a server answers many households: anything drawn on the server passes its tuning in. */
let current: InkTune = USUAL_TUNE;
export const currentTune = (): InkTune => current;
export function setInkTune(t: Partial<InkTune> | null | undefined) { current = validTune(t); }
