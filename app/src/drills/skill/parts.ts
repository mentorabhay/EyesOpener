// Eyes Opener: Parts shared by the skill drills: answering by side, words sized to fit a phone, the row of choices,.
/**
 * Parts shared by the skill drills: answering by side, words sized to fit a phone, the row of choices,
 * quiet marks and the tumbling E. No state and no colours.
 */
import { H, W, type Ink, type Kit } from "@/games/kit";
import { arrow, tick, top, widthOf, type Way } from "@/games/skills/common";

export type Side = -1 | 1;

/** Words stay inside this width, and no baseline sits lower than `BASE`. */
export const WIDE = W - 56, BASE = H - 24;

/** One decimal place. */
export const r1 = (v: number) => Math.round(v * 10) / 10;

/**
 * The side the member chose in this frame: -1 for the Left key or a tap on the left half, 1 for the Right key or
 * a tap on the right half, 0 for nothing. A tap on the middle line says nothing.
 */
export function sided(k: Kit): Side | 0 {
  const i = k.input, l = i.pressed.has("left"), r = i.pressed.has("right");
  if (l !== r) return l ? -1 : 1;
  if (l || !i.tapped || Math.abs(i.x - W / 2) < 8) return 0;
  return i.x < W / 2 ? -1 : 1;
}

/** The largest size, up to `size`, at which the words fit on one line of `max` units. */
export function fitSize(k: Kit, s: string, max = WIDE, size = k.letter) {
  const wide = widthOf(k, s, size);
  return wide > max ? (size * max) / wide : size;
}

export interface Row { s: string; size: number; y: number }
export interface Foot { rows: Row[]; top: number }

/**
 * Lays lines of words out at the bottom of the scene, each at the member's letter size or shrunk to fit one line.
 * `top` is where the words begin: the play area ends above it.
 */
export function foot(k: Kit, lines: readonly string[], base = BASE, max = WIDE): Foot {
  const rows: Row[] = [];
  let y = base, high = base;
  for (let n = lines.length - 1; n >= 0; n--) {
    const size = fitSize(k, lines[n], max);
    rows.unshift({ s: lines[n], size, y });
    high = y - size;
    y = high - size * 0.3;
  }
  return { rows, top: high };
}

export function sayFoot(k: Kit, f: Foot, ink: Ink = "both") {
  for (const r of f.rows) k.text(r.s, W / 2, r.y, ink, r.size, "center");
}

/** The play area: under the score line and above the words at the bottom. */
export function area(k: Kit, bottom: number) {
  const y0 = top(k) + 6, y1 = Math.max(y0 + 40, bottom - 8);
  return { y0, y1, h: y1 - y0, cy: (y0 + y1) / 2 };
}

/* ───────────── a row of choices: an arrow and a word at each end, and a boxed word in the middle ───────────── */

/** The size at which the row fits the scene. */
export function choiceSize(k: Kit, left: string, right: string, mid = "", size = k.letter) {
  const said = widthOf(k, left, size) + widthOf(k, right, size) + (mid ? widthOf(k, mid, size) : 0);
  /* The arrows, the spaces beside them and the gaps between the choices, in letter heights. */
  const all = said + size * (mid ? 5.2 : 3.1);
  return all > WIDE ? (size * WIDE) / all : size;
}

/** Where the boxed middle choice sits: half way between the two end choices. */
function midBox(k: Kit, y: number, size: number, left: string, right: string, mid: string) {
  const x0 = (W - WIDE) / 2, side = size * 1.05, w = widthOf(k, mid, size) + size * 1.65;
  const from = x0 + side + widthOf(k, left, size), to = W - x0 - side - widthOf(k, right, size);
  return { x: (from + to) / 2 - w / 2, y: y - size * 1.05, w, h: size * 1.4 };
}

/** Draws the row with its baseline at `y`: Left for the first word, Right for the second, Down for the boxed one. */
export function choices(k: Kit, y: number, size: number, left: string, right: string, mid = "") {
  const a = size * 0.7, ay = y - size * 0.36, x0 = (W - WIDE) / 2;
  arrow(k, x0 + a / 2, ay, a, "left", "both");
  k.text(left, x0 + size * 1.05, y, "both", size, "left");
  arrow(k, W - x0 - a / 2, ay, a, "right", "both");
  k.text(right, W - x0 - size * 1.05, y, "both", size, "right");
  if (!mid) return;
  const b = midBox(k, y, size, left, right, mid);
  k.box(b.x, b.y, b.w, b.h, "both", false, 2);
  arrow(k, b.x + size * 0.3 + a / 2, ay, a, "down", "both");
  k.text(mid, b.x + size * 1.35, y, "both", size, "left");
}

/** True when this frame's tap landed on the boxed middle choice. Its reach is never under 26 * k.k. */
export function onMid(k: Kit, y: number, size: number, left: string, right: string, mid: string) {
  const b = midBox(k, y, size, left, right, mid), i = k.input;
  return i.tapped && Math.abs(i.x - (b.x + b.w / 2)) <= Math.max(b.w / 2, 26 * k.k) && Math.abs(i.y - (b.y + b.h / 2)) <= Math.max(b.h / 2, 26 * k.k);
}

/* ───────────── marks ───────────── */

/** A short level line for both eyes: "not that one". As quiet as the tick. */
export function dash(k: Kit, x: number, y: number, size: number) {
  k.line(x - size * 0.45, y, x + size * 0.45, y, "both", Math.max(3, size * 0.16));
}

/** The mark after an answer: a tick for right, a dash for wrong. */
export const mark = (k: Kit, x: number, y: number, size: number, right: boolean) => (right ? tick : dash)(k, x, y, size);

/** Draws in one ink at part strength, for shapes that should stay quiet or ease in. `draw` must use that ink only. */
export function dim(k: Kit, ink: Ink, alpha: number, draw: () => void) {
  const g = k.ctx(ink);
  g.globalAlpha = Math.max(0, Math.min(1, alpha));
  draw();
  g.globalAlpha = 1;
}

/** The tumbling E on a five by five grid: a spine one cell wide and three arms that point `way`, each one cell thick. */
export function letterE(k: Kit, cx: number, cy: number, size: number, way: Way) {
  const u = size / 5, x = cx - size / 2, y = cy - size / 2;
  if (way === "left" || way === "right") {
    k.box(way === "right" ? x : x + 4 * u, y, u, size, "both");
    for (const row of [0, 2, 4]) k.box(x, y + row * u, size, u, "both");
  } else {
    k.box(x, way === "down" ? y : y + 4 * u, size, u, "both");
    for (const col of [0, 2, 4]) k.box(x + col * u, y, u, size, "both");
  }
}
