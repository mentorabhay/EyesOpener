// Eyes Opener: The three inks and the colour matrix.
/**
 * The three inks and the colour matrix.
 * Contrast is set in real light, not in raw colour values, so every value goes through the screen's gamma.
 */

import { currentTune, type InkTune } from "./tune";

export const WEAK_INK = "#00ffff";
export const SHARED_INK = "#ffffff";
export const SCENE_FIELD = "#000000";

/** 0–255 channel value that shows `contrast` (0 to 1) of full light on a screen with this gamma. */
export function channel(contrast: number, gamma = 2.2): number {
  const c = Math.max(0, Math.min(1, contrast));
  return Math.round(255 * Math.pow(c, 1 / gamma));
}

/** CSS colour of the stronger eye's ink at the member's contrast. */
export const strongInk = (contrast: number, gamma = 2.2) => `rgb(${channel(contrast, gamma)} 0 0)`;

/**
 * CSS colour of the weaker eye's ink. It is dimmed only when the balance test asks for it. On a screen whose inks were
 * tuned for its glasses (tune.ts), the green and blue shares are those of the tuning's mix.
 */
export function weakInk(contrast = 1, gamma = 2.2, tune: InkTune = currentTune()): string {
  const c = Math.max(0, Math.min(1, contrast));
  return `rgb(0 ${channel(c * tune.green, gamma)} ${channel(c * tune.blue, gamma)})`;
}

/**
 * Colour matrix that turns ordinary video into a two-eye picture.
 * Both eyes get the picture's brightness. The red channel (stronger eye) is pulled toward mid-grey by `contrast`.
 * On a tuned screen (tune.ts) the green and blue rows are scaled by the tuning's mix and the red row by its ceiling.
 * Returns the 20 numbers an SVG feColorMatrix takes, row by row.
 */
export function videoMatrix(contrast: number, tune: InkTune = currentTune(), weakInk: "cyan" | "red" = "cyan"): number[] {
  const c = Math.max(0.05, Math.min(1, contrast)), top = tune.redTop, gr = tune.green, bl = tune.blue;
  const [r, g, b] = [0.2126, 0.7152, 0.0722];
  /* swapped: the red row is the weaker eye's, at full brightness and never under the ceiling; the cyan rows are the
     stronger eye's, pulled toward mid-grey by `contrast` as the red row is the usual way */
  if (weakInk === "red") return [
    r, g, b, 0, 0,
    gr * c * r, gr * c * g, gr * c * b, 0, gr * (1 - c) * 0.5,
    bl * c * r, bl * c * g, bl * c * b, 0, bl * (1 - c) * 0.5,
    0, 0, 0, 1, 0,
  ];
  return [
    top * c * r, top * c * g, top * c * b, 0, top * (1 - c) * 0.5,
    gr * r, gr * g, gr * b, 0, 0,
    bl * r, bl * g, bl * b, 0, 0,
    0, 0, 0, 1, 0,
  ];
}

/** What one eye sees through its lens, for the glasses-view simulator. */
export const lensFilter = (eye: "weak" | "strong") => (eye === "weak" ? WEAK_INK : "#ff0000");
