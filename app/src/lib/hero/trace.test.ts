/**
 * The hero tracing, checked with pictures drawn by code: a drawn test image in, the expected shape out.
 */
import { describe, expect, it } from "vitest";
import { HERO_CELLS, HERO_MAX_RUNS, cleanSprite, gridOf, onCells, type Sprite } from "@/games/hero";
import { block, circle, dust, figure, noise, seeded, shadow, sheet, stroke } from "./test-picture";
import { drawingOf, filled, greyOf, inkOf, isThin, marksOf, paperLevel, shrink, speckSize, trace, TRACE_SIDE } from "./trace";

const shape = (r: ReturnType<typeof trace>): Sprite => { if (!r.ok) throw new Error(`no drawing: ${r.why}`); return r.sprite; };
const at = (s: Sprite, x: number, y: number) => gridOf(s).bits[y * s.w + x] === 1;
/** Cells that differ between two shapes of the same size. */
const differ = (a: Sprite, b: Sprite) => { const ga = gridOf(a), gb = gridOf(b); return ga.bits.reduce((n, v, i) => n + (v === gb.bits[i] ? 0 : 1), 0); };
/** A capital T drawn with a thick marker: a bar across the top, a post down the middle. */
const letterT = (x: number, y: number, size: number) => (p: ReturnType<typeof sheet>) => { block(p, x, y, size, size / 4); block(p, x + (size * 3) / 8, y, size / 4, size); return p; };

describe("tracing a drawing", () => {
  it("turns a drawn T into a T of cells: the bar across the top, the post down the middle, nothing else", () => {
    const s = shape(trace(letterT(40, 60, 160)(sheet(256, 256))));
    expect([s.w, s.h]).toEqual([HERO_CELLS, HERO_CELLS]);
    const g = gridOf(s);
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
      const want = y < 12 || (x >= 18 && x < 30);
      /* One cell of give where the marker's edge falls inside a cell. */
      const edge = y === 11 || y === 12 || x === 17 || x === 18 || x === 29 || x === 30;
      if (!edge) expect(g.bits[y * 48 + x] === 1, `cell ${x},${y}`).toBe(want);
    }
  });

  it("gives the same shape wherever the drawing sits on the page and however large it is", () => {
    const big = shape(trace(letterT(20, 20, 200)(sheet(256, 256))));
    const small = shape(trace(letterT(150, 30, 64)(sheet(256, 256))));
    const wide = shape(trace(letterT(300, 90, 120)(sheet(640, 300))));
    expect(differ(big, small)).toBeLessThan(48);
    expect(differ(big, wide)).toBeLessThan(48);
  });

  it("reads through a shadow across the page, camera noise and dust", () => {
    const clean = shape(trace(figure(sheet(256, 256), 60, 30, 190, 9)));
    const rough = shape(trace(dust(noise(shadow(figure(sheet(256, 256), 60, 30, 190, 9))))));
    expect([rough.w, rough.h]).toEqual([clean.w, clean.h]);
    expect(differ(clean, rough)).toBeLessThan(onCells(gridOf(clean)) * 0.08);
  });

  it("keeps the eyes inside a head and drops a mark far from the drawing", () => {
    const p = figure(sheet(256, 256), 20, 40, 150, 9);
    const alone = shape(trace(p));
    circle(p, 236, 236, 6);
    expect(shape(trace(p))).toEqual(alone);
    /* The two eyes are separate marks, and they are still there: ink inside the head's ring. */
    expect(at(alone, Math.round(alone.w * 0.4), Math.round(alone.h * 0.18))).toBe(true);
    expect(at(alone, Math.round(alone.w * 0.5), Math.round(alone.h * 0.12))).toBe(false);
  });

  it("leaves out a table edge or a shadow that runs off the picture, and keeps a drawing that does", () => {
    const alone = shape(trace(figure(sheet(256, 256), 60, 20, 170, 9)));
    const onTable = figure(sheet(256, 256), 60, 20, 170, 9);
    block(onTable, 0, 222, 256, 34, 18);
    block(onTable, 0, 0, 14, 256, 18);
    expect(shape(trace(onTable))).toEqual(alone);
    /* A drawing that itself runs off the edge is all there is, so it is kept. */
    const cut = sheet(256, 256);
    circle(cut, 128, 30, 90, 10);
    expect(trace(cut).ok).toBe(true);
  });

  it("thickens a drawing made of thin lines, and leaves a bold one as it is", () => {
    const thin = shape(trace(circle(sheet(256, 256), 128, 128, 90, 2.2)));
    const bold = shape(trace(circle(sheet(256, 256), 128, 128, 90, 22)));
    /* Across the left side of the ring, at mid height: how many cells the line is thick. */
    const thick = (s: Sprite) => { let n = 0; for (let x = 0; x < 12; x++) if (at(s, x, 24)) n++; return n; };
    expect(thick(thin)).toBeGreaterThanOrEqual(3);
    expect(thick(thin)).toBeLessThanOrEqual(4);
    expect(thick(bold)).toBeGreaterThanOrEqual(5);
    expect(thick(bold)).toBeLessThanOrEqual(7);
    expect(isThin(gridOf(bold))).toBe(false);
    expect(Math.max(thin.w, thin.h)).toBe(HERO_CELLS);
  });

  it("fills in a closed outline when asked, and says so when there is nothing to fill", () => {
    const ring = shape(trace(circle(sheet(256, 256), 128, 128, 90, 8)));
    expect(at(ring, 24, 24)).toBe(false);
    const ball = filled(ring)!;
    expect(at(ball, 24, 24)).toBe(true);
    expect(at(ball, 0, 0)).toBe(false);
    expect(cleanSprite(ball)).toEqual(ball);
    /* An open shape has no inside. A square outline fills to a solid block, which is no drawing. */
    expect(filled(shape(trace(letterT(40, 60, 160)(sheet(256, 256)))))).toBeNull();
    const square = sheet(256, 256);
    for (const [x, y, w, h] of [[50, 50, 150, 8], [50, 192, 150, 8], [50, 50, 8, 150], [192, 50, 8, 150]]) block(square, x, y, w, h);
    expect(filled(shape(trace(square)))).toBeNull();
  });
});

describe("pictures with no drawing in them", () => {
  it("an empty sheet: we could not see a drawing", () => {
    expect(trace(sheet(256, 256))).toEqual({ ok: false, why: "empty" });
    expect(trace(noise(sheet(256, 256), 12))).toEqual({ ok: false, why: "empty" });
    expect(trace(dust(sheet(256, 256), 60))).toEqual({ ok: false, why: "empty" });
    /* A see-through picture is white paper. */
    expect(trace({ width: 64, height: 64, data: new Uint8ClampedArray(64 * 64 * 4) })).toEqual({ ok: false, why: "empty" });
    expect(trace(sheet(8, 8))).toEqual({ ok: false, why: "empty" });
  });

  it("an all-dark picture: we could not see a drawing", () => {
    expect(trace(sheet(256, 256, 0))).toEqual({ ok: false, why: "dark" });
    expect(trace(noise(sheet(256, 256, 14), 12))).toEqual({ ok: false, why: "dark" });
    /* A drawing in a room too dark to read it. */
    expect(trace(figure(sheet(256, 256, 60), 60, 30, 190, 9))).toEqual({ ok: false, why: "dark" });
  });

  it("a pencil line too faint to count is not ink", () => {
    expect(trace(figure(sheet(256, 256), 60, 30, 190, 9)).ok).toBe(true);
    const faint = sheet(256, 256);
    stroke(faint, 40, 40, 200, 200, 8, 190);
    expect(trace(faint)).toEqual({ ok: false, why: "empty" });
  });

  it("a page of writing or a photograph is not a drawing", () => {
    const rand = seeded(11), text = sheet(256, 256);
    for (let y = 12; y < 244; y += 9) for (let x = 10; x < 244; x += 7) if (rand() < 0.8) block(text, x, y, 4, 5);
    expect(trace(text)).toEqual({ ok: false, why: "busy" });
    const photo = sheet(256, 256);
    for (let i = 0; i < photo.data.length; i += 4) { const v = rand() < 0.5 ? 20 : 230; photo.data[i] = photo.data[i + 1] = photo.data[i + 2] = v; }
    expect(trace(photo)).toEqual({ ok: false, why: "busy" });
    const halfBlack = block(sheet(256, 256), 40, 0, 216, 256, 10);
    expect(trace(halfBlack).ok).toBe(false);
  });
});

describe("the caps", () => {
  it("every shape that comes out is at most 48 cells a side, holds a few hundred runs at most and passes the server's check", () => {
    const pictures = [
      figure(sheet(256, 256), 60, 30, 190, 4),
      figure(sheet(256, 256), 150, 140, 70, 2.2),
      dust(noise(shadow(figure(sheet(256, 256), 60, 30, 190, 9)))),
      circle(sheet(256, 256), 128, 128, 90, 3),
      stroke(sheet(256, 256), 20, 128, 236, 130, 5),
      figure(sheet(1600, 1200), 500, 100, 900, 26),
    ];
    for (const [i, p] of pictures.entries()) {
      const s = shape(trace(p));
      expect(Math.max(s.w, s.h), `picture ${i}`).toBe(HERO_CELLS);
      expect(s.rows.reduce((n, r) => n + r.length / 2, 0), `picture ${i}`).toBeLessThan(HERO_MAX_RUNS / 2);
      expect(cleanSprite(JSON.parse(JSON.stringify(s))), `picture ${i}`).toEqual(s);
      expect(JSON.stringify(s).length, `picture ${i}`).toBeLessThan(4000);
    }
  });

  it("shrinks a large photograph before it reads it", () => {
    const big = figure(sheet(1600, 1200), 500, 100, 900, 26), small = shrink(big);
    expect(Math.max(small.width, small.height)).toBeLessThanOrEqual(TRACE_SIDE);
    expect(small.width / small.height).toBeCloseTo(1600 / 1200, 1);
    expect(shrink(small)).toBe(small);
  });
});

describe("the steps", () => {
  it("reads brightness, and reads a see-through pixel as paper", () => {
    expect([...greyOf({ width: 3, height: 1, data: [255, 255, 255, 255, 0, 0, 0, 255, 0, 0, 0, 0] })]).toEqual([255, 0, 255]);
    expect(paperLevel(greyOf(figure(sheet(128, 128, 220), 30, 10, 100, 6)))).toBe(220);
  });

  it("does not call the dark side of a shadow ink", () => {
    const p = shadow(sheet(256, 256), 0.6, 0.5, 0.02), grey = greyOf(p);
    expect(onCells(inkOf(grey, 256, 256, paperLevel(grey)))).toBe(0);
  });

  it("counts marks, knows which run off the edge, and drops specks", () => {
    const p = sheet(128, 128);
    block(p, 0, 50, 30, 10);
    circle(p, 80, 80, 20, 5);
    block(p, 100, 10, 2, 2);
    const grey = greyOf(p), marks = marksOf(inkOf(grey, 128, 128, paperLevel(grey)));
    expect(marks.length).toBe(3);
    expect(marks.filter((m) => m.edge).length).toBe(1);
    expect(speckSize(128, 128)).toBe(5);
    const kept = drawingOf(marks, 128, 128);
    expect(kept.length).toBe(1);
    expect(kept[0].edge).toBe(false);
  });
});
