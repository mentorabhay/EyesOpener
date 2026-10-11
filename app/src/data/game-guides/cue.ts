// Eyes Opener: Small builders for cue pictures, so the same thing looks the same in every guide.
/**
 * Small builders for cue pictures, so the same thing looks the same in every guide.
 * A picture is 160 wide and 90 tall. Keep important shapes inside x 8 to 152 and y 16 to 82.
 */
import type { CueInk, Shape } from "./types";

export const CUE_W = 160, CUE_H = 90;

/** The white frame every scene has. */
export const frame = (): Shape => ({ t: "box", x: 3, y: 3, w: CUE_W - 6, h: CUE_H - 6, ink: "both" });

/** The score line in the top left corner. */
export const hud = (s: string): Shape => ({ t: "text", x: 9, y: 15, s, ink: "both", size: 8 });

/** A line of words in the middle of the scene, for both eyes. */
export const words = (s: string, y: number, size = 8, ink: CueInk = "both"): Shape => ({ t: "text", x: CUE_W / 2, y, s, ink, size, anchor: "middle" });

/** The "It split" box in the bottom right corner. `pressed` marks it as the thing to tap. */
export const splitBox = (pressed = false): Shape[] => [
  { t: "box", x: 108, y: 70, w: 44, h: 13, ink: "both" },
  { t: "text", x: 130, y: 79.5, s: "It split", ink: "both", size: 7, anchor: "middle" },
  ...(pressed ? [{ t: "tap", x: 147, y: 64 } as Shape] : []),
];

/**
 * The fusion target: one ring for each eye. The left eye's ring carries a dot at the top, the right eye's a dot at the bottom.
 * `gap` is how far apart the two rings are drawn: 0 shows them joined as one ring with both dots,
 * which is what a member sees through the glasses when both eyes are on and working together.
 * `eye` draws only one eye's ring: what is left when the other eye has switched off.
 */
export function fusion(x: number, y: number, r: number, gap: number, eye: "both" | "left" | "right" = "both"): Shape[] {
  const left: Shape[] = [{ t: "ring", x: x + gap / 2, y, r, ink: "weak", w: 2.2 }, { t: "disc", x: x + gap / 2, y: y - r * 0.55, r: Math.max(1.6, r * 0.14), ink: "weak" }];
  const right: Shape[] = [{ t: "ring", x: x - gap / 2, y, r, ink: "strong", w: 2.2 }, { t: "disc", x: x - gap / 2, y: y + r * 0.55, r: Math.max(1.6, r * 0.14), ink: "strong" }];
  return eye === "left" ? left : eye === "right" ? right : [...right, ...left];
}

export const tap = (x: number, y: number): Shape => ({ t: "tap", x, y });
export const key = (x: number, y: number, s: string): Shape => ({ t: "key", x, y, s });
