import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { print } from "@/copy/drills-tools";
import type { PrintKey } from "@/data/guides/types";
import { allCards, cardFor, CHART_ROWS } from "./cards";

/** Every key of `PrintKey`: the record makes the compiler say so when a key is added. */
const KEYS = Object.keys({ barrel: 0, dots: 0, lifesaver: 0, letters: 0, letter: 0, grid: 0, pairs: 0 } satisfies Record<PrintKey, 0>) as PrintKey[];
/** A4 with 12 mm margins. */
const MAX_W = 186, MAX_H = 273;

const pagesOf = (key: PrintKey) => cardFor(key).pages.map((page) => renderToStaticMarkup(page as ReactElement));
const mm = (svg: string, side: "width" | "height") => Number(new RegExp(`^<svg[^>]*\\s${side}="([0-9.]+)mm"`).exec(svg)?.[1] ?? NaN);

describe("printable cards", () => {
  it("has a card for every key", () => {
    expect(Object.keys(allCards()).sort()).toEqual([...KEYS].sort());
  });

  for (const key of KEYS) {
    describe(key, () => {
      const card = cardFor(key);

      it("has a title, how-to lines and at least one page", () => {
        expect(card.title.length).toBeGreaterThan(3);
        expect(card.how.length).toBeGreaterThanOrEqual(2);
        for (const line of card.how) expect(line.trim().length).toBeGreaterThan(10);
        expect(card.pages.length).toBeGreaterThanOrEqual(1);
      });

      it("draws every page in millimetres, inside A4 with 12 mm margins", () => {
        for (const svg of pagesOf(key)) {
          expect(svg.startsWith("<svg")).toBe(true);
          const w = mm(svg, "width"), h = mm(svg, "height");
          expect(w).toBeGreaterThan(0);
          expect(w).toBeLessThanOrEqual(MAX_W);
          expect(h).toBeGreaterThan(0);
          expect(h).toBeLessThanOrEqual(MAX_H);
          /* one unit of the drawing is one millimetre */
          expect(svg).toContain(`viewBox="0 0 ${w} ${h}"`);
        }
      });

      it("prints its name and the 50 mm check line on every page", () => {
        for (const svg of pagesOf(key)) {
          expect(svg).toContain(card.title);
          expect(svg).toContain(print.line);
          /* the check line: two end marks 50 units apart, joined */
          expect(/M([0-9.]+) 9\.5V12\.5M([0-9.]+) 9\.5V12\.5M\1 11H\2/.test(svg)).toBe(true);
          const [, a, b] = /M([0-9.]+) 9\.5V12\.5M([0-9.]+) 9\.5V12\.5/.exec(svg)!;
          expect(Number(b) - Number(a)).toBeCloseTo(50, 5);
        }
      });

      it("uses black, red and green only", () => {
        const allowed = new Set(["#000000", "#d00000", "#00843d", "#ffffff", "none"]);
        for (const svg of pagesOf(key)) {
          for (const [, colour] of svg.matchAll(/(?:fill|stroke)="([^"]+)"/g)) expect(allowed.has(colour)).toBe(true);
        }
      });

      it("keeps every number in the drawing finite", () => {
        for (const svg of pagesOf(key)) expect(/NaN|undefined|Infinity/.test(svg)).toBe(false);
      });
    });
  }

  it("draws the letter chart as ten rows of ten from the fifteen letters, no letter twice in a row", () => {
    expect(CHART_ROWS).toHaveLength(10);
    for (const row of CHART_ROWS) {
      expect(row).toMatch(/^[ACDEFHKNOPRSTVZ]{10}$/);
      expect(new Set(row).size).toBe(10);
    }
    /* far chart: 100 letters at 20 mm; near sheet: four cards of 100 letters at 3 mm */
    const [far, near] = pagesOf("letters");
    expect(far.match(/scale\(0\.4\)/g)).toHaveLength(100);
    expect(near.match(/scale\(0\.06\)/g)).toHaveLength(400);
  });

  it("draws the letter targets at 60, 5 and 3 mm", () => {
    const [svg] = pagesOf("letter");
    expect(svg.match(/scale\(1\.2\)/g)).toHaveLength(1);
    expect(svg.match(/scale\(0\.1\)/g)).toHaveLength(3);
    expect(svg.match(/scale\(0\.06\)/g)).toHaveLength(1);
  });

  it("draws the grid check 100 mm square with 20 squares a side", () => {
    const [svg] = pagesOf("grid");
    expect(svg.match(/<rect width="100" height="100"/g)).toHaveLength(2);
    expect(svg).toContain("M0 5H100M5 0V100");
    expect(svg).toContain("M0 95H100M95 0V100");
  });

  it("sets the lifesaver pairs 20, 35, 50 and 65 mm apart and the stereogram rings 60 mm apart", () => {
    const [life] = pagesOf("lifesaver");
    const rings = [...life.matchAll(/<circle cx="([0-9.]+)" cy="([0-9.]+)" r="9"/g)].map((m) => [Number(m[1]), Number(m[2])]);
    expect(rings).toHaveLength(8);
    const gaps = [0, 2, 4, 6].map((i) => rings[i + 1][0] - rings[i][0]);
    expect(gaps).toEqual([20, 35, 50, 65]);

    const [pairs] = pagesOf("pairs");
    const big = [...pairs.matchAll(/<circle cx="([0-9.]+)" cy="([0-9.]+)" r="21\.9"/g)].map((m) => Number(m[1]));
    expect(big).toHaveLength(6);
    for (const i of [0, 2, 4]) expect(big[i + 1] - big[i]).toBe(60);
  });

  it("numbers the dots of the dot card every 3 cm, 30 mm apart", () => {
    const [svg] = pagesOf("dots");
    const dots = [...svg.matchAll(/<circle cx="[0-9.]+" cy="([0-9.]+)" r="2\.2"/g)].map((m) => Number(m[1]));
    expect(dots).toHaveLength(8);
    for (let i = 1; i < dots.length; i++) expect(dots[i - 1] - dots[i]).toBe(30);
    for (const cm of [3, 6, 9, 12, 15, 18, 21, 24]) expect(svg).toMatch(new RegExp(`>${cm}(<!-- -->)? cm<`));
  });

  it("lines the barrels up on the two faces of the barrel card", () => {
    const [svg] = pagesOf("barrel");
    const at = [...svg.matchAll(/translate\(([0-9.]+) ([0-9.]+)\) rotate\(90\)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    expect(at).toHaveLength(6);
    const fold = 60.2;
    /* the same distance from the fold and from the nose end on both faces */
    for (let i = 0; i < 3; i++) {
      expect(fold - at[i][0]).toBeCloseTo(at[i + 3][0] - fold, 5);
      expect(at[i][1]).toBe(at[i + 3][1]);
    }
  });
});
