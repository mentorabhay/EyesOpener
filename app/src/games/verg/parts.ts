// Eyes Opener: Parts the vergence games share: what counts as "it is one picture", and where there is room to draw.
/**
 * Parts the vergence games share: what counts as "it is one picture", and where there is room to draw.
 * The demand itself is never handled here: every game uses the helpers in `../vergence`.
 */
import { H, type Kit } from "../kit";
import { onSplitSpot, splitPressed, type Demand } from "../vergence";

/** "It is one picture": OK, or a tap anywhere but the split spot. Never true on a frame where the member said it split. */
export const single = (k: Kit) => !splitPressed(k) && (k.input.action || (k.input.tapped && !onSplitSpot(k)));

/** True once the drawn demand has reached its goal. */
export const settled = (d: Demand) => Math.abs(d.goal - d.now) < 0.05;

/** The part of the scene that is free for play: under the score line and above the split spot. */
export function band(k: Kit) {
  const top = Math.min(H / 2 - 30, 30 + k.letter + 8), bottom = Math.max(H / 2 + 30, H - 16 - k.letter * 1.9 - 8);
  return { top, bottom, mid: (top + bottom) / 2, tall: bottom - top };
}

/** A sketch size scaled for this member, but never larger than fits. */
export const size = (k: Kit, sketch: number, most: number) => Math.max(8, Math.min(sketch * k.k, most));

/** Draws scenery for both eyes at a lower strength, so it never competes with the fusion target. */
export function faint(k: Kit, alpha: number, draw: () => void) {
  const g = k.ctx("both");
  g.globalAlpha = alpha;
  draw();
  g.globalAlpha = 1;
}
