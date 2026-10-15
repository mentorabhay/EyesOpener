/**
 * Parts shared by the games in this package: the depth ladder and words that stay inside the scene.
 * Nothing here draws in one eye's ink: words are always for both eyes.
 */
import { W, type Kit } from "../kit";

/** The depth ladder in arcseconds, one step for each level. Three hits move down it, two misses move back up. */
export const STEPS = [1200, 800, 600, 400, 300, 200, 150, 100, 60, 40] as const;

/**
 * The depth step for this level as this screen can really draw it: a whole number of screen pixels and
 * never under one. A finer step would only be blur, so the game shows the step it drew, not the one it wanted.
 */
export function depthStep(k: Kit): number {
  const want = STEPS[Math.max(0, Math.min(STEPS.length - 1, k.level - 1))];
  return Math.max(1, Math.round(want / k.pxArcsec)) * k.pxArcsec;
}

/** Width of words at a size, in scene units. */
export function wide(k: Kit, s: string, size = k.letter): number {
  const g = k.ctx("both");
  g.font = `700 ${size}px Verdana, sans-serif`;
  return g.measureText(s).width;
}

/** Keeps centred words of this width inside the scene's margins. */
export const centre = (x: number, span: number) => (span >= W - 44 ? W / 2 : Math.max(22 + span / 2, Math.min(W - 22 - span / 2, x)));

/** Writes one line for both eyes at the member's letter size, never smaller. Centred words are kept inside the scene's margins. */
export function label(k: Kit, s: string, x: number, y: number, align: CanvasTextAlign = "center") {
  k.text(s, align === "center" ? centre(x, wide(k, s)) : x, y, "both", k.letter, align);
}
