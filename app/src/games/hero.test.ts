// Eyes Opener: A grid from lines of text: "#" is on. .
import { describe, expect, it } from "vitest";
import { HERO_CELLS, HERO_MAX_RUNS, HERO_MIN_SIDE, STARTER_KEYS, boundsOf, cleanSprite, defaultHero, fitGrid, gridOf, newGrid, onCells, spriteOf, starter, type Sprite } from "./hero";

/** A grid from lines of text: "#" is on. */
const grid = (...lines: string[]) => {
  const g = newGrid(lines[0].length, lines.length);
  lines.forEach((line, y) => [...line].forEach((ch, x) => { if (ch === "#") g.bits[y * g.w + x] = 1; }));
  return g;
};
const copy = (s: Sprite) => JSON.parse(JSON.stringify(s)) as Sprite;

describe("a hero's shape", () => {
  it("is written as runs of cells and read back unchanged", () => {
    const g = grid("##..#", ".....", "#####", "..#..");
    const s = spriteOf(g);
    expect(s).toEqual({ v: 1, w: 5, h: 4, rows: [[0, 2, 4, 1], [], [0, 5], [2, 1]] });
    expect([...gridOf(s).bits]).toEqual([...g.bits]);
  });

  it("is cropped to the drawing and scaled so the longer side is 48 cells", () => {
    const g = newGrid(200, 120);
    /* A bar 60 wide and 30 tall, away from every edge. */
    for (let y = 40; y < 70; y++) g.bits.fill(1, y * 200 + 100, y * 200 + 160);
    const out = fitGrid(g)!;
    expect([out.w, out.h]).toEqual([HERO_CELLS, HERO_CELLS / 2]);
    expect(onCells(out)).toBe(out.w * out.h);
    expect(fitGrid(newGrid(30, 30))).toBeNull();
  });

  it("keeps a thin line when it shrinks a drawing, and pads a very long drawing to a band", () => {
    const g = newGrid(240, 240);
    for (let y = 20; y < 220; y++) g.bits.fill(1, y * 240 + 118, y * 240 + 120);
    const out = fitGrid(g)!;
    expect(out.h).toBe(HERO_CELLS);
    expect(out.w).toBe(HERO_MIN_SIDE);
    /* The line is two pixels of a five-pixel cell: still there in every row. */
    for (let y = 0; y < out.h; y++) expect(out.bits.slice(y * out.w, (y + 1) * out.w).some(Boolean), `row ${y}`).toBe(true);
    expect(boundsOf(out)).toMatchObject({ y0: 0, h: HERO_CELLS });
  });
});

describe("checking a shape before it is kept", () => {
  const good = () => copy(starter("cat"));

  it("passes every ready-made hero and writes it in the same form", () => {
    for (const key of STARTER_KEYS) {
      const s = starter(key);
      expect(cleanSprite(copy(s)), key).toEqual(s);
      expect(Math.max(s.w, s.h), key).toBe(HERO_CELLS);
      /* Cropped to the drawing: ink reaches all four sides. */
      expect(boundsOf(gridOf(s)), key).toEqual({ x0: 0, y0: 0, w: s.w, h: s.h });
    }
    expect(defaultHero()).toBe(starter("walker"));
  });

  it("keeps the grid and nothing else", () => {
    const s = cleanSprite({ ...good(), name: "Aarav", photo: "data:image/png;base64,AAAA", link: "https://example.org" })!;
    expect(Object.keys(s).sort()).toEqual(["h", "rows", "v", "w"]);
  });

  it("merges runs that touch", () => {
    const s = good();
    const y = s.rows.findIndex((r) => r.length === 2 && r[1] >= 4);
    const [start, length] = s.rows[y];
    const split = copy(s);
    split.rows[y] = [start, 2, start + 2, length - 2];
    expect(cleanSprite(split)).toEqual(s);
  });

  it("refuses anything that is not a small grid of whole numbers", () => {
    const bad: ((s: Sprite) => unknown)[] = [
      () => null, () => "hero", () => [],
      (s) => ({ ...s, v: 2 }),
      (s) => ({ ...s, w: 49 }),
      (s) => ({ ...s, h: 4800 }),
      (s) => ({ ...s, w: s.w - 0.5 }),
      (s) => ({ ...s, rows: s.rows.slice(1) }),
      (s) => ({ ...s, rows: [...s.rows.slice(1), "0,3"] }),
      (s) => ({ ...s, rows: [...s.rows.slice(1), [0]] }),
      (s) => ({ ...s, rows: [...s.rows.slice(1), [0, 0]] }),
      (s) => ({ ...s, rows: [...s.rows.slice(1), [-1, 3]] }),
      (s) => ({ ...s, rows: [...s.rows.slice(1), [0, s.w + 1]] }),
      (s) => ({ ...s, rows: [...s.rows.slice(1), [5, 3, 6, 2]] }),
      (s) => ({ ...s, rows: [...s.rows.slice(1), [1.5, 2]] }),
      (s) => ({ ...s, rows: [...s.rows.slice(1), ["1", 2]] }),
      (s) => ({ ...s, rows: [...s.rows.slice(1), Array.from({ length: 4000 }, (_, i) => i)] }),
    ];
    for (const [i, make] of bad.entries()) expect(cleanSprite(make(good())), `case ${i}`).toBeNull();
  });

  it("refuses a shape whose longer side is not 48 cells, a blank sheet and a solid block", () => {
    expect(cleanSprite({ v: 1, w: 20, h: 20, rows: Array.from({ length: 20 }, () => [0, 20]) })).toBeNull();
    expect(cleanSprite({ v: 1, w: 48, h: 48, rows: Array.from({ length: 48 }, () => []) })).toBeNull();
    expect(cleanSprite({ v: 1, w: 48, h: 48, rows: Array.from({ length: 48 }, (_, y) => (y === 3 ? [4, 9] : [])) })).toBeNull();
    expect(cleanSprite({ v: 1, w: 48, h: 48, rows: Array.from({ length: 48 }, () => [0, 48]) })).toBeNull();
  });

  it("refuses more runs than a drawing has: a checked pattern over the whole grid", () => {
    const rows = Array.from({ length: 48 }, (_, y) => Array.from({ length: 24 }, (_, i) => [i * 2 + (y % 2), 1]).flat().filter((_, i, all) => all[i - (i % 2)] < 48));
    expect(rows.reduce((n, r) => n + r.length / 2, 0)).toBeGreaterThan(HERO_MAX_RUNS);
    expect(cleanSprite({ v: 1, w: 48, h: 48, rows })).toBeNull();
  });
});
