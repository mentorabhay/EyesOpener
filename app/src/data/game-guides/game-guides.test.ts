// Eyes Opener: Words a guide must never use: promises of a result. .
import { describe, expect, it } from "vitest";
import { gameBySlug } from "@/data";
import { builtSlugs, kindOf } from "@/games/built";
import { CUE_H, CUE_W } from "./cue";
import { gameGuides } from "./index";
import type { Shape } from "./types";

const KEY = /^[a-z][a-z0-9_]{0,23}$/;
/** Words a guide must never use: promises of a result. */
const BANNED = /\b(cure[sd]?|curing|guarantee[sd]?|miracle|heals?|fix(es)? your (eyes|vision))\b/i;

/** The corners of the box a shape takes up, to check it stays inside the picture. */
function reach(s: Shape): [number, number][] {
  switch (s.t) {
    case "ring": case "disc": return [[s.x - s.r, s.y - s.r], [s.x + s.r, s.y + s.r]];
    case "box": return [[s.x, s.y], [s.x + s.w, s.y + s.h]];
    case "line": return [[s.x1, s.y1], [s.x2, s.y2]];
    case "poly": return s.pts;
    case "text": case "tap": case "key": return [[s.x, s.y]];
  }
}

describe("game guides", () => {
  it("has one guide for every game that is built, and none for a game that is not in this edition", () => {
    const have = gameGuides.map((g) => g.slug).sort(), want = builtSlugs().sort();
    expect(new Set(have).size).toBe(have.length);
    expect(have.filter((s) => !want.includes(s))).toEqual([]);
    expect(want.filter((s) => !have.includes(s))).toEqual([]);
  });

  for (const g of gameGuides) {
    describe(g.slug, () => {
      const care = kindOf(g.slug) === "care";

      it("is complete and the right size", () => {
        expect(gameBySlug(g.slug), "is in the catalogue").toBeDefined();
        expect(g.what.length).toBeGreaterThan(40);
        expect(g.helps.length).toBeGreaterThan(80);
        expect(g.need.length).toBeGreaterThanOrEqual(1);
        expect(g.see.length).toBeGreaterThanOrEqual(2);
        expect(g.see.length).toBeLessThanOrEqual(4);
        expect(g.play.length).toBeGreaterThanOrEqual(3);
        expect(g.play.length).toBeLessThanOrEqual(7);
        expect(g.controls.touch.length).toBeGreaterThan(15);
        expect(g.controls.keys.length).toBeGreaterThan(15);
        expect(g.success.length).toBeGreaterThanOrEqual(2);
        expect(g.success.length).toBeLessThanOrEqual(4);
        expect(g.mistakes.length).toBeGreaterThanOrEqual(2);
        expect(g.mistakes.length).toBeLessThanOrEqual(4);
        expect(g.stop.length).toBeGreaterThanOrEqual(care ? 1 : 4);
        expect(g.evidence.length).toBeGreaterThan(20);
      });

      it("says red-cyan glasses are needed when the game needs them", () => {
        if (/red-cyan/i.test(gameBySlug(g.slug)!.gear)) expect(g.need.join(" ")).toMatch(/red-cyan glasses/i);
      });

      it("uses plain lines: none too long, no promise of a result", () => {
        const lines = [g.what, g.evidence, ...g.need, ...g.see, ...g.play, g.controls.touch, g.controls.keys, ...g.success, ...g.mistakes, ...g.stop,
          ...g.cues.flatMap((c) => [c.title, c.then]), ...g.measures.flatMap((m) => [m.label, m.how])];
        for (const line of lines) {
          expect(line.length, line).toBeLessThanOrEqual(280);
          expect(BANNED.test(line), line).toBe(false);
          expect(line.trim(), line).toBe(line);
        }
        expect(g.helps.length).toBeLessThanOrEqual(520);
        expect(BANNED.test(g.helps), g.helps).toBe(false);
      });

      it("has cue pictures that fit the picture and say what to do", () => {
        expect(g.cues.length).toBeGreaterThanOrEqual(care ? 0 : 2);
        expect(g.cues.length).toBeLessThanOrEqual(4);
        if (g.cues.length) expect(g.cues.some((c) => c.tone === "go"), "one picture shows the moment to act").toBe(true);
        expect(new Set(g.cues.map((c) => c.title)).size).toBe(g.cues.length);
        for (const c of g.cues) {
          expect(c.title.length).toBeGreaterThan(5);
          expect(c.title.length).toBeLessThanOrEqual(60);
          expect(c.then.length).toBeGreaterThan(8);
          expect(c.shapes.length).toBeGreaterThanOrEqual(2);
          for (const s of c.shapes) {
            for (const [x, y] of reach(s)) {
              expect(Number.isFinite(x) && Number.isFinite(y), `${c.title}: ${s.t}`).toBe(true);
              expect(x, `${c.title}: ${s.t} x`).toBeGreaterThanOrEqual(0);
              expect(x, `${c.title}: ${s.t} x`).toBeLessThanOrEqual(CUE_W);
              expect(y, `${c.title}: ${s.t} y`).toBeGreaterThanOrEqual(0);
              expect(y, `${c.title}: ${s.t} y`).toBeLessThanOrEqual(CUE_H);
            }
            if (s.t === "text") expect(s.s.length, `${c.title}: words in a picture are short`).toBeLessThanOrEqual(30);
          }
        }
      });

      it("has well-formed measures", () => {
        expect(g.measures.length).toBeGreaterThanOrEqual(care ? 0 : 1);
        expect(g.measures.length).toBeLessThanOrEqual(5);
        expect(new Set(g.measures.map((m) => m.key)).size).toBe(g.measures.length);
        for (const m of g.measures) {
          expect(m.key, m.key).toMatch(KEY);
          expect(m.label.length).toBeGreaterThan(3);
          expect(m.how.length).toBeGreaterThan(15);
        }
      });

      it("names its sources", () => {
        expect(g.sources.length).toBeGreaterThanOrEqual(1);
        for (const s of g.sources) {
          expect(s.label.length).toBeGreaterThan(10);
          expect(s.url).toMatch(/^https:\/\/[a-z0-9.-]+\//);
        }
      });
    });
  }
});
