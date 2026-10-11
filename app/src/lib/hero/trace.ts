// Eyes Opener: Draw Your Hero: turning a picture of a drawing into a hero's shape, on the device.
/**
 * Draw Your Hero: turning a picture of a drawing into a hero's shape, on the device.
 *
 * The picture (a camera frame, a photo the family picked, or what was drawn on the screen) is read here, in the
 * browser, and nowhere else. It is never sent and never stored. What comes out is a grid of at most 48 by 48 cells
 * (see `Sprite` in src/games/hero.ts): only that is sent to the server.
 *
 * The steps, each a pure function so it can be tested with a drawn test image:
 *   1. grey      every pixel as one brightness, with see-through pixels read as white paper
 *   2. ink       a pixel is ink when it is much darker than the paper around it (so a shadow across the page is
 *                not ink), or much darker than the paper as a whole (so a filled-in shape stays filled)
 *   3. clean     small specks go; so does anything that runs off the edge of the picture (a table, a shadow),
 *                as long as a drawing is left; marks far from the drawing go
 *   4. fit       crop to the drawing and scale it so the longer side is 48 cells
 *   5. bold      a drawing made of thin lines is thickened by one cell, so the weaker eye can see it in a game
 * A family may then ask for the outline to be filled in (`filled`), which works on the finished grid.
 *
 * No picture library is used: the work is small enough to do by hand on a picture of 256 pixels a side.
 */
import { HERO_CELLS, HERO_MAX_RUNS, HERO_MAX_SHARE, HERO_MIN_ON, fitGrid, gridOf, newGrid, onCells, spriteOf, type Grid, type Sprite } from "@/games/hero";

/** A picture as a canvas gives it: red, green, blue and alpha for each pixel, row by row. */
export interface Picture { width: number; height: number; data: ArrayLike<number> }

/**
 * Why no drawing was found. The page says the same plain thing for all three ("we could not see a drawing")
 * and adds one hint: more light, a darker pen, or plain paper.
 */
export type TraceFail = "dark" | "empty" | "busy";
export type Traced = { ok: true; sprite: Sprite } | { ok: false; why: TraceFail };

/** The longest side the tracing works on. A larger picture is shrunk first. */
export const TRACE_SIDE = 256;
/** Paper must be at least this bright (0 to 255) for anything to be read from it. */
const MIN_PAPER = 90;
/** Ink is under this share of the brightness around it, and at least this much darker in plain steps. */
const LOCAL_SHARE = 0.62, LOCAL_STEP = 28;
/** Ink is also anything under this share of the paper's brightness as a whole. */
const GLOBAL_SHARE = 0.42;
/** The least and the most of the picture a drawing may cover. */
const MIN_INK = 0.0015, MAX_INK = 0.4;
/** A drawing is a few marks. More separate marks than this is a page of writing or a photograph. */
const MAX_MARKS = 160;

/* ───────────── 1. grey ───────────── */

/** Brightness of every pixel, 0 (black) to 255 (white). A see-through pixel is white paper. */
export function greyOf(p: Picture): Uint8Array {
  const n = p.width * p.height, out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const a = p.data[i * 4 + 3] / 255;
    out[i] = Math.round((0.299 * p.data[i * 4] + 0.587 * p.data[i * 4 + 1] + 0.114 * p.data[i * 4 + 2]) * a + 255 * (1 - a));
  }
  return out;
}

/** Shrinks a picture by whole steps until its longer side is at most `side`, averaging the pixels it merges. */
export function shrink(p: Picture, side = TRACE_SIDE): Picture {
  const f = Math.ceil(Math.max(p.width, p.height) / side);
  if (f <= 1) return p;
  const w = Math.floor(p.width / f), h = Math.floor(p.height / f), data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 4; c++) {
    let sum = 0;
    for (let dy = 0; dy < f; dy++) for (let dx = 0; dx < f; dx++) sum += p.data[((y * f + dy) * p.width + x * f + dx) * 4 + c];
    data[(y * w + x) * 4 + c] = sum / (f * f);
  }
  return { width: w, height: h, data };
}

/** The brightness that nine pixels in ten are at or under: the paper, when most of the picture is paper. */
export function paperLevel(grey: Uint8Array): number {
  const counts = new Uint32Array(256);
  for (const g of grey) counts[g]++;
  let seen = 0;
  for (let v = 0; v < 256; v++) { seen += counts[v]; if (seen >= grey.length * 0.9) return v; }
  return 255;
}

/* ───────────── 2. ink ───────────── */

/** Which pixels are ink. `paper` is the paper's brightness as a whole (see `paperLevel`). */
export function inkOf(grey: Uint8Array, w: number, h: number, paper: number): Grid {
  /* Sums of every rectangle from the top left corner, so the mean around a pixel costs four look-ups. */
  const sum = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) { row += grey[y * w + x]; sum[(y + 1) * (w + 1) + x + 1] = sum[y * (w + 1) + x + 1] + row; }
  }
  const r = Math.max(8, Math.round(Math.min(w, h) / 6)), out = newGrid(w, h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
      const mean = (sum[y1 * (w + 1) + x1] - sum[y0 * (w + 1) + x1] - sum[y1 * (w + 1) + x0] + sum[y0 * (w + 1) + x0]) / ((x1 - x0) * (y1 - y0));
      const g = grey[y * w + x];
      if ((g < mean * LOCAL_SHARE && mean - g >= LOCAL_STEP) || g < paper * GLOBAL_SHARE) out.bits[y * w + x] = 1;
    }
  }
  return out;
}

/* ───────────── 3. clean ───────────── */

export interface Mark { cells: number[]; x0: number; y0: number; x1: number; y1: number; edge: boolean }

/** Every separate mark: pixels that touch, corners included. */
export function marksOf(g: Grid): Mark[] {
  const seen = new Uint8Array(g.bits.length), marks: Mark[] = [];
  for (let start = 0; start < g.bits.length; start++) {
    if (!g.bits[start] || seen[start]) continue;
    const m: Mark = { cells: [start], x0: g.w, y0: g.h, x1: -1, y1: -1, edge: false };
    seen[start] = 1;
    for (let n = 0; n < m.cells.length; n++) {
      const c = m.cells[n], x = c % g.w, y = (c - x) / g.w;
      m.x0 = Math.min(m.x0, x); m.x1 = Math.max(m.x1, x); m.y0 = Math.min(m.y0, y); m.y1 = Math.max(m.y1, y);
      if (x === 0 || y === 0 || x === g.w - 1 || y === g.h - 1) m.edge = true;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, d = ny * g.w + nx;
        if (nx >= 0 && ny >= 0 && nx < g.w && ny < g.h && g.bits[d] && !seen[d]) { seen[d] = 1; m.cells.push(d); }
      }
    }
    marks.push(m);
  }
  return marks;
}

/** A speck is a mark smaller than this many pixels: dust, paper grain, the noise of a camera. */
export const speckSize = (w: number, h: number) => Math.max(5, Math.round(w * h * 0.00012));

/**
 * The marks that make up the drawing: specks dropped, marks that run off the edge dropped when a drawing is left
 * without them, and marks far from the largest mark dropped. An empty list when nothing is left.
 */
export function drawingOf(marks: Mark[], w: number, h: number): Mark[] {
  let kept = marks.filter((m) => m.cells.length >= speckSize(w, h));
  const inner = kept.filter((m) => !m.edge);
  if (inner.reduce((n, m) => n + m.cells.length, 0) >= w * h * MIN_INK) kept = inner;
  if (!kept.length) return [];
  const main = kept.reduce((a, b) => (b.cells.length > a.cells.length ? b : a));
  const reach = 0.35 * Math.max(main.x1 - main.x0 + 1, main.y1 - main.y0 + 1);
  return kept.filter((m) => {
    const cx = (m.x0 + m.x1) / 2, cy = (m.y0 + m.y1) / 2;
    return cx >= main.x0 - reach && cx <= main.x1 + reach && cy >= main.y0 - reach && cy <= main.y1 + reach;
  });
}

/* ───────────── 5. bold ───────────── */

/**
 * True when the shape is mostly line: fewer than 45 cells in a hundred have ink on all four sides.
 * A line three cells thick or less counts as thin; thickened, it is four or five cells, a twelfth of the hero's
 * height, about what the limbs of the game's own runner are.
 */
export function isThin(g: Grid): boolean {
  let on = 0, deep = 0;
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    if (!g.bits[y * g.w + x]) continue;
    on++;
    if (x > 0 && y > 0 && x < g.w - 1 && y < g.h - 1 && g.bits[y * g.w + x - 1] && g.bits[y * g.w + x + 1] && g.bits[(y - 1) * g.w + x] && g.bits[(y + 1) * g.w + x]) deep++;
  }
  return deep < on * 0.45;
}

/** Grows the grid by one cell on every side and the shape by one cell all round. */
export function thicken(g: Grid): Grid {
  const out = newGrid(g.w + 2, g.h + 2);
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    if (!g.bits[y * g.w + x]) continue;
    for (let dy = 0; dy <= 2; dy++) out.bits.fill(1, (y + dy) * out.w + x, (y + dy) * out.w + x + 3);
  }
  return out;
}

/** Steps 4 and 5: the drawing as a hero's grid, with the longer side 48 cells. Null for an empty grid. */
export function heroGrid(drawing: Grid): Grid | null {
  const small = fitGrid(drawing, HERO_CELLS - 2);
  if (!small) return null;
  return isThin(small) ? thicken(small) : fitGrid(drawing, HERO_CELLS);
}

/* ───────────── the whole way ───────────── */

const runsOf = (s: Sprite) => s.rows.reduce((n, r) => n + r.length / 2, 0);
/** Is this grid a hero: enough of it on, not a solid block, not too many runs? */
const fits = (g: Grid, s: Sprite) => { const on = onCells(g); return on >= HERO_MIN_ON && on <= g.w * g.h * HERO_MAX_SHARE && runsOf(s) <= HERO_MAX_RUNS; };

/**
 * A picture in, a hero's shape out.
 * A dark or empty picture, or one that is not a drawing on plain paper, gives a reason and no shape.
 */
export function trace(picture: Picture): Traced {
  const p = shrink(picture), w = p.width, h = p.height;
  if (w < 16 || h < 16) return { ok: false, why: "empty" };
  const grey = greyOf(p), paper = paperLevel(grey);
  if (paper < MIN_PAPER) return { ok: false, why: "dark" };
  const ink = inkOf(grey, w, h, paper);
  if (onCells(ink) > w * h * 0.6) return { ok: false, why: "busy" };
  const marks = marksOf(ink);
  if (marks.filter((m) => m.cells.length >= speckSize(w, h)).length > MAX_MARKS) return { ok: false, why: "busy" };
  const kept = drawingOf(marks, w, h), area = kept.reduce((n, m) => n + m.cells.length, 0);
  if (area < w * h * MIN_INK) return { ok: false, why: "empty" };
  if (area > w * h * MAX_INK) return { ok: false, why: "busy" };
  const drawing = newGrid(w, h);
  for (const m of kept) for (const c of m.cells) drawing.bits[c] = 1;
  const grid = heroGrid(drawing);
  if (!grid) return { ok: false, why: "empty" };
  const sprite = spriteOf(grid);
  if (onCells(grid) < HERO_MIN_ON) return { ok: false, why: "empty" };
  return fits(grid, sprite) ? { ok: true, sprite } : { ok: false, why: "busy" };
}

/** Turns everything a closed line surrounds into ink. */
export function fillInside(g: Grid): Grid {
  const out = newGrid(g.w, g.h), open = new Uint8Array(g.bits.length), line: number[] = [];
  const visit = (x: number, y: number) => { const c = y * g.w + x; if (!g.bits[c] && !open[c]) { open[c] = 1; line.push(c); } };
  for (let x = 0; x < g.w; x++) { visit(x, 0); visit(x, g.h - 1); }
  for (let y = 0; y < g.h; y++) { visit(0, y); visit(g.w - 1, y); }
  for (let n = 0; n < line.length; n++) {
    const c = line[n], x = c % g.w, y = (c - x) / g.w;
    if (x > 0) visit(x - 1, y);
    if (x < g.w - 1) visit(x + 1, y);
    if (y > 0) visit(x, y - 1);
    if (y < g.h - 1) visit(x, y + 1);
  }
  for (let c = 0; c < out.bits.length; c++) out.bits[c] = open[c] ? 0 : 1;
  return out;
}


/**
 * The same hero with every closed outline filled in: a drawn circle becomes a solid ball.
 * Null when filling leaves nothing but a solid block, or changes nothing.
 */
export function filled(s: Sprite): Sprite | null {
  const before = gridOf(s), g = fillInside(before), out = spriteOf(g);
  return onCells(g) > onCells(before) && fits(g, out) ? out : null;
}
