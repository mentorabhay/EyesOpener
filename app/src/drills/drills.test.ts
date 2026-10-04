import { describe, expect, it } from "vitest";
import { exercises } from "@/data";
import { AUTO_KEYS, guideFor, TOOL_KIND } from "@/data/guides";
import { simulate } from "@/games/sim";
import { drillHelp, drills } from "./index";

/** What the kit and the vergence helpers keep in every session. */
const KIT_KEYS = ["hits", "misses", "level", "top", "conv", "div", "splits"];

describe("exercise drills", () => {
  const wanted = Object.entries(TOOL_KIND).filter(([, kind]) => kind === "drill").map(([slug]) => slug).sort();

  it("has a drill for every exercise whose tool is a drill, and no other", () => {
    expect(Object.keys(drills).sort()).toEqual(wanted);
    for (const slug of wanted) expect(exercises.some((e) => e.slug === slug), slug).toBe(true);
  });

  it("has a line of help and a guide for every drill", () => {
    for (const slug of wanted) {
      expect(drillHelp[slug]?.length ?? 0, slug).toBeGreaterThan(20);
      expect(guideFor(slug)?.tool.kind, slug).toBe("drill");
    }
  });

  for (const slug of wanted) {
    it(`${slug} runs at three screen sizes and reports only its own measures`, () => {
      for (const width of [360, 640, 1280]) {
        for (const skill of [0, 0.05, 0.3]) {
          const r = simulate(drills[slug], { seconds: 90, seed: 3 + width, skill, width });
          for (const [key, v] of Object.entries(r.stats)) {
            expect([...KIT_KEYS, ...AUTO_KEYS[slug]], `${slug} reported ${key}`).toContain(key);
            expect(Number.isFinite(v), `${slug} ${key}`).toBe(true);
            expect(v, `${slug} ${key}`).toBeGreaterThanOrEqual(0);
          }
          expect(r.inks.both, `${slug} draws for both eyes`).toBeGreaterThan(0);
        }
      }
    });
  }
});
