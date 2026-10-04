/**
 * The three inks and the colour matrix.
 * Contrast is set in real light, not in raw colour values, so every value goes through the screen's gamma.
 */

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

/** CSS colour of the weaker eye's ink. It is dimmed only when the balance test asks for it. */
export function weakInk(contrast = 1, gamma = 2.2): string {
  const v = channel(contrast, gamma);
  return `rgb(0 ${v} ${v})`;
}

/**
 * Colour matrix that turns ordinary video into a two-eye picture.
 * Both eyes get the picture's brightness. The red channel (stronger eye) is pulled toward mid-grey by `contrast`.
 * Returns the 20 numbers an SVG feColorMatrix takes, row by row.
 */
export function videoMatrix(contrast: number): number[] {
  const c = Math.max(0.05, Math.min(1, contrast));
  const [r, g, b] = [0.2126, 0.7152, 0.0722];
  return [
    c * r, c * g, c * b, 0, (1 - c) * 0.5,
    r, g, b, 0, 0,
    r, g, b, 0, 0,
    0, 0, 0, 1, 0,
  ];
}

/** What one eye sees through its lens, for the glasses-view simulator. */
export const lensFilter = (eye: "weak" | "strong") => (eye === "weak" ? WEAK_INK : "#ff0000");
