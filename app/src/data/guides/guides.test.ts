// Eyes Opener: Words a guide must never use: promises and jargon the copy rules rule out. .
import { describe, expect, it } from "vitest";
import { exercises } from "@/data";
import { AUTO_KEYS, guides, TOOL_KIND } from "./index";

const KEY = /^[a-z][a-z0-9_]{0,23}$/;
/** Words a guide must never use: promises and jargon the copy rules rule out. */
const BANNED = /\b(cure[sd]?|curing|guarantee[sd]?|miracle|heals?|fix(es)? your (eyes|vision))\b/i;

describe("exercise guides", () => {
  it("has one guide for every exercise, and no guide without an exercise", () => {
    const have = guides.map((g) => g.slug).sort(), want = exercises.map((e) => e.slug).sort();
    expect(new Set(have).size).toBe(have.length);
    expect(have.filter((s) => !want.includes(s))).toEqual([]);
    expect(want.filter((s) => !have.includes(s))).toEqual([]);
  });

  for (const g of guides) {
    describe(g.slug, () => {
      it("is complete and the right size", () => {
        expect(g.what.length).toBeGreaterThan(30);
        expect(g.need.length).toBeGreaterThanOrEqual(1);
        expect(g.setup.length).toBeGreaterThanOrEqual(2);
        expect(g.setup.length).toBeLessThanOrEqual(4);
        expect(g.steps.length).toBeGreaterThanOrEqual(4);
        expect(g.steps.length).toBeLessThanOrEqual(8);
        expect(g.right.length).toBeGreaterThanOrEqual(2);
        expect(g.right.length).toBeLessThanOrEqual(4);
        expect(g.mistakes.length).toBeGreaterThanOrEqual(2);
        expect(g.mistakes.length).toBeLessThanOrEqual(4);
        expect(g.stop.length).toBeGreaterThanOrEqual(4);
        expect(g.evidence.length).toBeGreaterThan(20);
      });

      it("uses plain lines: no line over 260 characters, no promise of a result", () => {
        const lines = [g.what, g.evidence, ...g.need, ...g.setup, ...g.steps, ...g.right, ...g.mistakes, ...g.stop, ...g.measures.flatMap((m) => [m.label, m.how, m.usual?.text ?? ""])];
        for (const line of lines) {
          expect(line.length, line).toBeLessThanOrEqual(260);
          expect(BANNED.test(line), line).toBe(false);
          expect(line.trim(), line).toBe(line);
        }
      });

      it("has well-formed measures", () => {
        const timeIsTheRecord = g.tool.kind === "cinema" || g.tool.kind === "companion";
        expect(g.measures.length).toBeGreaterThanOrEqual(timeIsTheRecord ? 0 : 1);
        expect(g.measures.length).toBeLessThanOrEqual(3);
        expect(new Set(g.measures.map((m) => m.key)).size).toBe(g.measures.length);
        const filled = "measure" in g.tool ? [g.tool.measure] : (AUTO_KEYS[g.slug] ?? []);
        for (const m of g.measures) {
          expect(m.key, m.key).toMatch(KEY);
          expect(m.label.length).toBeGreaterThan(3);
          expect(m.how.length).toBeGreaterThan(15);
          expect(m.max).toBeGreaterThan(m.min);
          expect(m.step).toBeGreaterThan(0);
          /* "auto" is only for what the tool itself fills in. */
          expect(m.from === "auto", `${m.key} is ${m.from}`).toBe(filled.includes(m.key));
          if (m.usual) {
            expect(m.usual.text.length).toBeGreaterThan(10);
            expect(g.sources[m.usual.source], `${m.key} usual source`).toBeDefined();
          }
        }
        /* Everything the tool fills in is listed, so the page can name it. At most three are shown, so a drill lists its first three. */
        for (const key of filled.slice(0, 3)) expect(g.measures.map((m) => m.key), key).toContain(key);
      });

      it("uses the tool this exercise has", () => {
        const fixed = TOOL_KIND[g.slug];
        if (fixed) expect(g.tool.kind).toBe(fixed);
        else expect(["drill", "reading", "grid"]).not.toContain(g.tool.kind);
        if (g.tool.kind === "count") { expect(g.tool.seconds).toBeGreaterThanOrEqual(20); expect(g.tool.tap.length).toBeGreaterThan(3); }
        if (g.tool.kind === "checklist") expect(g.tool.items.length).toBeGreaterThanOrEqual(3);
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
