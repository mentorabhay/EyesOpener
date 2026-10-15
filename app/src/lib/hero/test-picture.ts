/**
 * Test pictures for the hero tracing, drawn by code: paper, pen strokes, a shadow, camera noise.
 * Not part of the app: only test files and the demo seed import it.
 */
import type { Picture } from "./trace";

export type Sheet = Picture & { data: Uint8ClampedArray };

/** A sheet of paper of one brightness (0 to 255). */
export function sheet(width: number, height: number, level = 236): Sheet {
  const data = new Uint8ClampedArray(width * height * 4).fill(level);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  return { width, height, data };
}

const put = (p: Sheet, x: number, y: number, level: number) => {
  if (x < 0 || y < 0 || x >= p.width || y >= p.height) return;
  const i = (y * p.width + x) * 4;
  p.data[i] = p.data[i + 1] = p.data[i + 2] = level;
};

/** A pen stroke with round ends, `t` pixels thick. */
export function stroke(p: Sheet, x1: number, y1: number, x2: number, y2: number, t: number, level = 32) {
  const dx = x2 - x1, dy = y2 - y1, len = dx * dx + dy * dy || 1, r = t / 2;
  for (let y = Math.floor(Math.min(y1, y2) - r); y <= Math.ceil(Math.max(y1, y2) + r); y++) for (let x = Math.floor(Math.min(x1, x2) - r); x <= Math.ceil(Math.max(x1, x2) + r); x++) {
    const u = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / len));
    if (Math.hypot(x - x1 - u * dx, y - y1 - u * dy) <= r) put(p, x, y, level);
  }
  return p;
}

/** A circle drawn with a pen `t` pixels thick; `t` of 0 fills it. */
export function circle(p: Sheet, cx: number, cy: number, r: number, t = 0, level = 32) {
  for (let y = Math.floor(cy - r - t); y <= Math.ceil(cy + r + t); y++) for (let x = Math.floor(cx - r - t); x <= Math.ceil(cx + r + t); x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (t ? Math.abs(d - r) <= t / 2 : d <= r) put(p, x, y, level);
  }
  return p;
}

export function block(p: Sheet, x0: number, y0: number, w: number, h: number, level = 32) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) put(p, x, y, level);
  return p;
}

/** A soft shadow over the right-hand part of the sheet: everything there is `share` as bright. */
export function shadow(p: Sheet, share = 0.6, from = 0.45, soft = 0.12) {
  for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) {
    const u = Math.max(0, Math.min(1, (x / p.width - from) / soft)), k = 1 - (1 - share) * u, i = (y * p.width + x) * 4;
    for (let c = 0; c < 3; c++) p.data[i + c] *= k;
  }
  return p;
}

/** A small repeatable random number generator. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
}

/** Camera noise: every pixel moves up or down by up to `amount`. */
export function noise(p: Sheet, amount = 10, seed = 3) {
  const rand = seeded(seed);
  for (let i = 0; i < p.data.length; i += 4) { const d = (rand() * 2 - 1) * amount; for (let c = 0; c < 3; c++) p.data[i + c] += d; }
  return p;
}

/** Dust: `count` single dark pixels. */
export function dust(p: Sheet, count = 40, seed = 5) {
  const rand = seeded(seed);
  for (let n = 0; n < count; n++) put(p, Math.floor(rand() * p.width), Math.floor(rand() * p.height), 30);
  return p;
}

/**
 * A child's drawing for tests and the demo: a round head with two eyes and a smile, a body, two arms and two legs,
 * drawn with a pen `t` thick inside a box at (x, y) that is `size` tall and 0.7 as wide.
 */
export function figure(p: Sheet, x: number, y: number, size: number, t: number) {
  const u = size / 100, at = (px: number, py: number): [number, number] => [x + px * u, y + py * u];
  const [hx, hy] = at(35, 22);
  circle(p, hx, hy, 20 * u, t);
  circle(p, ...at(28, 18), Math.max(1.5, 2.6 * u));
  circle(p, ...at(42, 18), Math.max(1.5, 2.6 * u));
  stroke(p, ...at(27, 29), ...at(35, 33), t * 0.8);
  stroke(p, ...at(35, 33), ...at(43, 29), t * 0.8);
  stroke(p, ...at(35, 43), ...at(35, 72), t);
  stroke(p, ...at(35, 52), ...at(6, 44), t);
  stroke(p, ...at(35, 52), ...at(64, 44), t);
  stroke(p, ...at(35, 72), ...at(16, 98), t);
  stroke(p, ...at(35, 72), ...at(54, 98), t);
  return p;
}
