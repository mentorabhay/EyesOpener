// Eyes Opener: Locked Gallery: the shapes of the pictures. Pure: no browser and no React.
/**
 * Locked Gallery: the shapes of the pictures. Pure: no browser and no React.
 *
 * A shape is a rule that says, for any point of a 100 by 100 sheet, whether the point is part of the picture.
 * That is all the dot pictures and the faint pictures need: they ask the rule about each pixel. Nothing here is a
 * photograph or a file; every picture is made by this code.
 */
import type { ShapeKey } from "./gallery";

export type Shape = (x: number, y: number) => boolean;

const disc = (cx: number, cy: number, rx: number, ry = rx): Shape => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
const box = (x0: number, y0: number, w: number, h: number): Shape => (x, y) => x >= x0 && x <= x0 + w && y >= y0 && y <= y0 + h;
/** A straight stroke with round ends, `t` thick. */
const bar = (x1: number, y1: number, x2: number, y2: number, t: number): Shape => (x, y) => {
  const dx = x2 - x1, dy = y2 - y1, u = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - x1 - u * dx, y - y1 - u * dy) <= t / 2;
};
const poly = (...p: [number, number][]): Shape => (x, y) => {
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const star = (cx: number, cy: number, r: number): Shape =>
  poly(...Array.from({ length: 10 }, (_, i): [number, number] => {
    const a = (i * Math.PI) / 5 - Math.PI / 2, d = i % 2 ? r * 0.46 : r;
    return [cx + d * Math.cos(a), cy + d * Math.sin(a)];
  }));
/** On where any `ink` shape covers the point and no `gap` shape does. */
const drawn = (ink: Shape[], gap: Shape[] = []): Shape => (x, y) => ink.some((s) => s(x, y)) && !gap.some((s) => s(x, y));

/** Every part of a shape is at least about 9 units thick, so it holds enough dots to be found in a dot picture. */
export const SHAPES: Record<ShapeKey, Shape> = {
  kite: drawn([poly([50, 4], [82, 40], [50, 78], [18, 40]), bar(50, 78, 42, 96, 9), poly([36, 84], [50, 88], [38, 97]), poly([62, 86], [48, 90], [60, 99])]),
  fish: drawn([disc(44, 50, 34, 22), poly([70, 50], [97, 26], [97, 74]), poly([36, 30], [56, 12], [60, 32])], [disc(26, 44, 5)]),
  boat: drawn([poly([8, 66], [92, 66], [78, 90], [22, 90]), box(46, 8, 8, 60), poly([58, 12], [90, 58], [58, 58]), poly([42, 24], [14, 58], [42, 58])]),
  bird: drawn([disc(46, 56, 28, 20), disc(72, 36, 14), poly([84, 32], [99, 38], [84, 44]), poly([20, 52], [2, 34], [6, 66]), poly([34, 46], [58, 46], [44, 22]), bar(42, 74, 42, 92, 8), bar(54, 74, 54, 92, 8)], [disc(76, 33, 3.4)]),
  star: drawn([star(50, 53, 48)]),
  balloon: drawn([disc(50, 36, 30, 33), poly([30, 60], [70, 60], [58, 76], [42, 76]), box(40, 80, 20, 16)], [bar(50, 6, 50, 62, 7)]),
  tree: drawn([box(42, 58, 16, 38), disc(50, 34, 26), disc(30, 48, 18), disc(70, 48, 18)]),
  house: drawn([box(18, 44, 64, 50), poly([8, 48], [50, 8], [92, 48]), box(62, 10, 11, 26)], [box(42, 62, 16, 32), box(24, 54, 12, 12), box(64, 54, 12, 12)]),
  moon: drawn([disc(46, 50, 40), star(84, 20, 13)], [disc(64, 40, 34)]),
};

/**
 * A shape as rows of runs on a grid `n` cells each way: rows[y] = [start, length, start, length, ...].
 * Used for the small clear picture that is shown once a gallery picture is reached.
 */
export function shapeRuns(shape: Shape, n = 48): number[][] {
  const rows: number[][] = [];
  for (let y = 0; y < n; y++) {
    const row: number[] = [];
    for (let x = 0; x < n; x++) {
      if (!shape(((x + 0.5) * 100) / n, ((y + 0.5) * 100) / n)) continue;
      const start = x;
      while (x < n && shape(((x + 0.5) * 100) / n, ((y + 0.5) * 100) / n)) x++;
      row.push(start, x - start);
    }
    rows.push(row);
  }
  return rows;
}

/** The runs as one SVG path, a cell being one unit. */
export const runsPath = (rows: number[][]) =>
  rows.map((row, y) => { let d = ""; for (let i = 0; i < row.length; i += 2) d += `M${row[i]} ${y}h${row[i + 1]}v1h-${row[i + 1]}z`; return d; }).join("");

/** The share of the sheet a shape covers, 0 to 1. */
export function shapeShare(shape: Shape, n = 100): number {
  let on = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (shape(((x + 0.5) * 100) / n, ((y + 0.5) * 100) / n)) on++;
  return on / (n * n);
}

/**
 * Where a pixel of a panel `w` by `h` falls on the sheet: the sheet is fitted into the middle of the panel,
 * `pad` of the shorter side clear all round. Returns a function from pixel to "is it in the shape".
 */
export function shapeIn(shape: Shape, w: number, h: number, pad = 0.1): (x: number, y: number) => boolean {
  const side = Math.min(w, h) * (1 - 2 * pad), x0 = (w - side) / 2, y0 = (h - side) / 2;
  return (x, y) => {
    const u = ((x + 0.5 - x0) * 100) / side, v = ((y + 0.5 - y0) * 100) / side;
    return u >= 0 && u <= 100 && v >= 0 && v <= 100 && shape(u, v);
  };
}
