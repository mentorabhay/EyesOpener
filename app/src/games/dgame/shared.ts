/** Small helpers the two-eye games share. */
import { H, W, type Ink, type Kit } from "../kit";

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Play stays under the score line, however large the member's letters are. */
export const topOf = (k: Kit) => Math.min(H * 0.4, 30 + k.letter);

/** Time for this frame with reduced motion applied: every speed in a game is multiplied by it. */
export const tick = (k: Kit) => k.dt * k.slow;

/**
 * Keeps what these inks draw inside the white frame, for scenes that scroll things in from the side.
 * Call the function it returns when the drawing is done.
 */
export function inside(k: Kit, inks: Ink[] = ["weak", "strong", "both"]) {
  for (const ink of inks) { const g = k.ctx(ink); g.save(); g.beginPath(); g.rect(10, 10, W - 20, H - 20); g.clip(); }
  return () => { for (const ink of inks) k.ctx(ink).restore(); };
}
