/**
 * Draw Your Hero: the shape a child made, in the form the game kit draws.
 *
 * A hero is a small grid of cells that are on or off, at most 48 cells each way, with the longer side always
 * 48 cells. It is kept row by row as runs of "on" cells: rows[y] = [start, length, start, length, ...].
 * That is all a hero is: no photograph, no camera frame, no name, no colour. A game chooses the ink.
 *
 * Everything here is a pure function, used on the device (tracing a drawing), on the server (checking what a
 * browser sent before it is kept) and in the kit (drawing).
 */

/** Cells along the longer side of every hero. */
export const HERO_CELLS = 48;
/** The shorter side is never under this many cells: a single thin line is padded out to it. */
export const HERO_MIN_SIDE = 6;
/** A hero has at least this many cells on, and at most this share of its grid: a blank sheet or a solid block is no drawing. */
export const HERO_MIN_ON = 30;
export const HERO_MAX_SHARE = 0.96;
/** The most runs a hero may hold. A child's drawing uses a few hundred; a photograph of a busy room uses far more. */
export const HERO_MAX_RUNS = 720;

export interface Sprite { v: 1; w: number; h: number; rows: number[][] }
/** A grid as plain cells, row by row: 1 is on. */
export interface Grid { w: number; h: number; bits: Uint8Array }

export const newGrid = (w: number, h: number): Grid => ({ w, h, bits: new Uint8Array(w * h) });
export const onCells = (g: Grid) => g.bits.reduce((n, b) => n + b, 0);

/** Writes a grid as runs. */
export function spriteOf(g: Grid): Sprite {
  const rows: number[][] = [];
  for (let y = 0; y < g.h; y++) {
    const row: number[] = [];
    for (let x = 0; x < g.w; x++) {
      if (!g.bits[y * g.w + x]) continue;
      const start = x;
      while (x < g.w && g.bits[y * g.w + x]) x++;
      row.push(start, x - start);
    }
    rows.push(row);
  }
  return { v: 1, w: g.w, h: g.h, rows };
}

/** Reads a sprite back into cells. The sprite must already be clean. */
export function gridOf(s: Sprite): Grid {
  const g = newGrid(s.w, s.h);
  s.rows.forEach((row, y) => { for (let i = 0; i < row.length; i += 2) g.bits.fill(1, y * s.w + row[i], y * s.w + row[i] + row[i + 1]); });
  return g;
}

const whole = (v: unknown, lo: number, hi: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi;

/**
 * Checks a shape that came from a browser or from the database, and writes it again in one standard form.
 * Null when it is not a hero: the wrong size, too few or too many cells, too many runs, or anything that is not
 * a small whole number. Nothing but the grid survives, so a sprite cannot carry a name, a picture or a link.
 */
export function cleanSprite(input: unknown): Sprite | null {
  if (!input || typeof input !== "object") return null;
  const { v, w, h, rows } = input as Record<string, unknown>;
  if (v !== 1 || !whole(w, HERO_MIN_SIDE, HERO_CELLS) || !whole(h, HERO_MIN_SIDE, HERO_CELLS) || Math.max(w, h) !== HERO_CELLS) return null;
  if (!Array.isArray(rows) || rows.length !== h) return null;
  const g = newGrid(w, h);
  let runs = 0;
  for (let y = 0; y < h; y++) {
    const row: unknown = rows[y];
    if (!Array.isArray(row) || row.length % 2 || row.length > w + 1) return null;
    runs += row.length / 2;
    if (runs > HERO_MAX_RUNS) return null;
    let end = 0;
    for (let i = 0; i < row.length; i += 2) {
      const start: unknown = row[i], length: unknown = row[i + 1];
      if (!whole(start, end, w - 1) || !whole(length, 1, w - start)) return null;
      g.bits.fill(1, y * w + start, y * w + start + length);
      end = start + length;
    }
  }
  const on = onCells(g);
  if (on < HERO_MIN_ON || on > w * h * HERO_MAX_SHARE) return null;
  return spriteOf(g);
}

/* ───────────── cropping and scaling ───────────── */

/** The smallest box that holds every "on" cell. Null for an empty grid. */
export function boundsOf(g: Grid) {
  let x0 = g.w, y0 = g.h, x1 = -1, y1 = -1;
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.bits[y * g.w + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return x1 < 0 ? null : { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * Crops a grid to its drawing and scales it so the longer side is `cells` long. A cell of the result is on when
 * at least a fifth of the area it covers was on, so a thin pen line is kept. A very long, thin drawing is centred
 * in a band `HERO_MIN_SIDE` cells wide. Null for an empty grid.
 */
export function fitGrid(src: Grid, cells = HERO_CELLS): Grid | null {
  const b = boundsOf(src);
  if (!b) return null;
  const scale = cells / Math.max(b.w, b.h);
  const w = Math.max(1, Math.min(cells, Math.round(b.w * scale))), h = Math.max(1, Math.min(cells, Math.round(b.h * scale)));
  const out = newGrid(Math.max(w, HERO_MIN_SIDE), Math.max(h, HERO_MIN_SIDE));
  const ox = Math.floor((out.w - w) / 2), oy = Math.floor((out.h - h) / 2);
  for (let y = 0; y < h; y++) {
    const sy0 = b.y0 + (y * b.h) / h, sy1 = b.y0 + ((y + 1) * b.h) / h;
    for (let x = 0; x < w; x++) {
      const sx0 = b.x0 + (x * b.w) / w, sx1 = b.x0 + ((x + 1) * b.w) / w;
      /* Every source cell the result cell touches counts by the area of the overlap. */
      let on = 0;
      for (let sy = Math.floor(sy0); sy < Math.ceil(sy1); sy++) {
        const hy = Math.min(sy + 1, sy1) - Math.max(sy, sy0);
        for (let sx = Math.floor(sx0); sx < Math.ceil(sx1); sx++) if (src.bits[sy * src.w + sx]) on += hy * (Math.min(sx + 1, sx1) - Math.max(sx, sx0));
      }
      if (on >= 0.2 * (sy1 - sy0) * (sx1 - sx0)) out.bits[(y + oy) * out.w + x + ox] = 1;
    }
  }
  return out;
}

/* ───────────── ready-made heroes ───────────── */

type Shape = (x: number, y: number) => boolean;
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

/** A drawing on a 100 by 100 sheet: on where any `ink` shape covers the point and no `gap` shape does. */
function drawn(ink: Shape[], gap: Shape[] = []): Sprite {
  const n = 144, g = newGrid(n, n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const px = ((x + 0.5) * 100) / n, py = ((y + 0.5) * 100) / n;
    if (ink.some((s) => s(px, py)) && !gap.some((s) => s(px, py))) g.bits[y * n + x] = 1;
  }
  return spriteOf(fitGrid(g)!);
}

/** The ready-made heroes a family can pick, by key. The words for each are in the copy file. */
const RECIPES = {
  walker: () => drawn(
    [disc(50, 16, 13), bar(50, 34, 50, 60, 17), bar(47, 38, 26, 54, 8), bar(53, 38, 76, 50, 8), bar(47, 62, 36, 94, 9.5), bar(53, 62, 66, 94, 9.5)],
    [disc(45, 14, 2.6), disc(55, 14, 2.6)],
  ),
  cat: () => drawn(
    [disc(50, 34, 24, 21), poly([28, 26], [30, 2], [47, 15]), poly([72, 26], [70, 2], [53, 15]), disc(50, 74, 21, 24), bar(69, 88, 90, 62, 7.5)],
    [disc(41, 32, 4.4), disc(59, 32, 4.4), poly([46.5, 40], [53.5, 40], [50, 44.5])],
  ),
  robot: () => drawn(
    [box(31, 12, 38, 26), bar(50, 12, 50, 3, 4), disc(50, 3, 4), box(44, 38, 12, 5), box(25, 43, 50, 34), box(11, 45, 10, 27), box(79, 45, 10, 27), box(31, 77, 13, 21), box(56, 77, 13, 21)],
    [box(37, 20, 8, 8), box(55, 20, 8, 8), box(39, 53, 22, 9)],
  ),
  rocket: () => drawn(
    [disc(50, 44, 17, 40), poly([36, 60], [17, 90], [40, 80]), poly([64, 60], [83, 90], [60, 80]), poly([43, 86], [50, 100], [57, 86])],
    [disc(50, 36, 7.5)],
  ),
  star: () => drawn([star(50, 52, 50)], [disc(42, 46, 3.6), disc(58, 46, 3.6), bar(43, 60, 57, 60, 3.4)]),
} as const;
export type StarterKey = keyof typeof RECIPES;
export const STARTER_KEYS = Object.keys(RECIPES) as StarterKey[];

const made = new Map<StarterKey, Sprite>();
/** A ready-made hero. Drawn the first time it is asked for, then kept. */
export function starter(key: StarterKey): Sprite {
  let s = made.get(key);
  if (!s) made.set(key, (s = RECIPES[key]()));
  return s;
}

/** The figure the kit draws when a game asks for the hero and the member has not made one. */
export const defaultHero = () => starter("walker");
