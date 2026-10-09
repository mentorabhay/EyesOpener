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
 *  - Red lens: less green in the cyan ink (`green`). The cyan ink is the green and blue channels together. Part of
 *    what leaks through a red filter is the long-wave tail of a screen's green light, which reaches into the band a
 *    red filter passes; how much, and how much blue leaks beside it, depends on the screen and the glasses. So it is
 *    not worked out: a grown-up looks through the red lens only and takes green out until the cyan shapes are gone,
 *    or as faint as they get. When taking green out does not help (the leak is mostly blue), the slider shows no
 *    change and the ink is left as it was. The cost
 *    is light for the weaker eye: green carries most of the cyan ink's brightness (sRGB weights 0.7152 green and
 *    0.0722 blue, IEC 61966-2-1), so `weakLight` says how much of it is kept, and the page says so before it is saved.
 *    The cyan ink is redefined for this screen and these glasses everywhere it is drawn, check-ups included, so a
 *    balance check-up taken after the tuning finds the balance point with the cyan ink as it now is. One taken
 *    before is flagged to be taken again (screen-rules.ts).
 *
 *  - Cyan lens: a ceiling on the red ink while training (`redTop`). The red ink is already dimmed to the member's
 *    contrast, so its shadow through the cyan lens is usually small. A grown-up looks through the cyan lens only at
 *    red shapes at full and lowers the ceiling until their shadow is gone. In training the red ink is then never
 *    brighter than that ceiling (`trainRed`). This lowers the stronger eye's picture only for a member whose contrast
 *    is above the ceiling, and it moves in the safe direction for a lazy eye (the stronger eye's picture gets weaker,
 *    never stronger). Check-ups and the calibration steps draw the red ink without the ceiling, so what they measure
 *    stays the eye and not the cap. The screen page names every person whose red ink the ceiling lowers.
 *
 * With nothing tuned (green 1, ceiling 1) every ink is exactly what it was before tuning existed.
 */

export interface InkTune {
  /** Share of the green channel's light kept in the cyan ink, 0.2 to 1. Blue always stays at full. */
  green: number;
  /** The most light the red ink may have in training, 0.1 to 1. */
  redTop: number;
}

export const USUAL_TUNE: InkTune = Object.freeze({ green: 1, redTop: 1 });

/** The ranges a tuning may fall in, and the size of one step of the slider (in light). */
export const TUNE = { green: [0.2, 1], redTop: [0.1, 1], step: 0.02 } as const;

const clamp = (v: number, [lo, hi]: readonly [number, number]) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : hi);
const SRGB_G = 0.7152, SRGB_B = 0.0722;

/** A tuning made safe: anything missing or out of range falls back to the usual ink. */
export const validTune = (t?: Partial<InkTune> | null): InkTune => ({
  green: t?.green == null ? 1 : clamp(t.green, TUNE.green),
  redTop: t?.redTop == null ? 1 : clamp(t.redTop, TUNE.redTop),
});

/** The tuning stored on a screen's row. Null columns mean "not tuned". */
export const tuneOf = (row?: { cyanGreen?: number | null; redTop?: number | null } | null): InkTune =>
  validTune({ green: row?.cyanGreen ?? undefined, redTop: row?.redTop ?? undefined });

export const isTuned = (t: InkTune) => t.green < 1 || t.redTop < 1;

/** Share of the cyan ink's brightness the weaker eye keeps with this much green: 1 untuned, about 0.27 at the floor of 0.2. */
export const weakLight = (green: number) => (SRGB_G * clamp(green, TUNE.green) + SRGB_B) / (SRGB_G + SRGB_B);

/** The red ink's contrast in training: the member's contrast, never above the ceiling. */
export const trainRed = (contrast: number, tune: InkTune) => Math.min(contrast, tune.redTop);

/* The browser draws one screen at a time, so the tuning of the household's screen is held here for the page it is
   drawing: the member layout sets it before any scene is drawn (components/ink-tune.tsx). The server never sets it,
   because a server answers many households: anything drawn on the server passes its tuning in. */
let current: InkTune = USUAL_TUNE;
export const currentTune = (): InkTune => current;
export function setInkTune(t: Partial<InkTune> | null | undefined) { current = validTune(t); }
