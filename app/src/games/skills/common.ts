// Eyes Opener: Small helpers shared by the seeing-skill games. No state, no colours: only layout, pointing and words. .
/** Small helpers shared by the seeing-skill games. No state, no colours: only layout, pointing and words. */
import { H, W, type Ink, type Kit } from "../kit";

export type Way = "left" | "right" | "up" | "down";
export const WAYS: readonly Way[] = ["left", "right", "up", "down"];
export const STEP: Record<Way, [number, number]> = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** Play stays under the score line. */
export const top = (k: Kit) => 30 + k.letter;
/** A smooth 0 to 1 ramp, for shapes that ease in instead of popping. */
export const ease = (v: number) => { const x = clamp(v, 0, 1); return x * x * (3 - 2 * x); };

/**
 * The way the member pointed in this frame: an arrow key, or a tap in the left, right, top or bottom part
 * of the scene around (cx, cy). The four parts meet along the scene's diagonals. A tap on the middle says nothing.
 */
export function pointed(k: Kit, cx: number, cy: number): Way | null {
  const i = k.input, keys = WAYS.filter((w) => i.pressed.has(w));
  if (keys.length === 1) return keys[0];
  if (!i.tapped) return null;
  const dx = i.x - cx, dy = i.y - cy;
  if (Math.hypot(dx, dy) < 12) return null;
  return Math.abs(dx) * H > Math.abs(dy) * W ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down";
}

/** Width of a word as the kit would draw it. */
export function widthOf(k: Kit, s: string, size: number) {
  const g = k.ctx("both");
  g.font = `700 ${size}px Verdana, sans-serif`;
  return g.measureText(s).width;
}

/** Breaks words into lines no wider than `max` at this size. */
export function wrap(k: Kit, s: string, max: number, size: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of s.split(" ")) {
    const longer = line ? `${line} ${word}` : word;
    if (line && widthOf(k, longer, size) > max) { lines.push(line); line = word; } else line = longer;
  }
  return [...lines, line];
}

/** Draws words centred on x, broken into lines no wider than `max`. `y` is the first baseline. */
export function words(k: Kit, s: string, x: number, y: number, max: number, ink: Ink = "both", size = k.letter) {
  wrap(k, s, max, size).forEach((line, n) => k.text(line, x, y + n * size * 1.25, ink, size, "center"));
}

/** The score line: the long wording when it fits the scene, else the short one. */
export const hud = (k: Kit, long: string, short: string) => k.hud(widthOf(k, long, k.letter) > W - 44 ? short : long);

/** A tick for both eyes: "yes, that one". */
export function tick(k: Kit, x: number, y: number, size: number) {
  k.line(x - size * 0.5, y, x - size * 0.12, y + size * 0.4, "both", Math.max(3, size * 0.16));
  k.line(x - size * 0.12, y + size * 0.4, x + size * 0.55, y - size * 0.45, "both", Math.max(3, size * 0.16));
}

/** A small arrow head pointing one way, centred on (x, y). */
export function arrow(k: Kit, x: number, y: number, size: number, way: Way, ink: Ink) {
  const [ax, ay] = STEP[way], h = size / 2;
  k.poly([[x + ax * h, y + ay * h], [x - ax * h + ay * h, y - ay * h + ax * h], [x - ax * h - ay * h, y - ay * h - ax * h]], ink);
}
