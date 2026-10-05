import { describe, expect, it } from "vitest";
import { answerDepth, depthOutcome, startDepth } from "@/engine";
import {
  NOTE_DAYS, SCENE_MAX_ARCSEC, SCENE_MIN_ARCSEC, anniversaryIn, depthStory, mayWatch, nextAnniversary, sceneDepths, sinceThen, todayNote, yearsToday,
} from "./depth-day";
import type { DepthResult } from "./gallery";

const at = (day: string) => new Date(`${day}T10:00:00+05:30`);
const none = (day: string): DepthResult => ({ value: 1600, note: "worse", takenAt: at(day) });
const some = (day: string, value = 800, note: string | null = ""): DepthResult => ({ value, note, takenAt: at(day) });

describe("what the Depth check-ups say", () => {
  it("says nothing was tested when there is no check-up", () => {
    expect(depthStory([])).toEqual({ state: "untested" });
  });

  it("says not yet while every check-up found no depth", () => {
    expect(depthStory([none("2026-08-30"), none("2026-09-27")])).toEqual({ state: "not_yet", checks: 2, last: at("2026-09-27") });
  });

  it("keeps a first day when a check-up found depth after one that had not", () => {
    expect(depthStory([none("2026-08-30"), none("2026-09-13"), some("2026-09-27", 760)])).toEqual({ state: "first", first: at("2026-09-27"), arcsec: 760, before: 2 });
  });

  it("reads the check-ups by date, whatever order they come in", () => {
    expect(depthStory([some("2026-09-27", 760), none("2026-08-30")])).toMatchObject({ state: "first", before: 1 });
    expect(depthStory([none("2026-09-27"), some("2026-08-30", 400)])).toMatchObject({ state: "from_start" });
  });

  it("keeps no first day for a member whose very first check-up already found depth", () => {
    expect(depthStory([some("2026-08-30", 200), some("2026-09-27", 100)])).toEqual({ state: "from_start", first: at("2026-08-30"), arcsec: 200 });
    /* not even when a later check-up missed it and the one after found it again */
    expect(depthStory([some("2026-08-30", 200), none("2026-09-13"), some("2026-09-27", 100)])).toMatchObject({ state: "from_start", arcsec: 200 });
  });

  it("counts a result at the screen's finest step as depth found", () => {
    expect(depthStory([none("2026-08-30"), some("2026-09-27", 61, "floor")])).toMatchObject({ state: "first", arcsec: 61 });
  });

  it("keeps the first day as the first: a later, finer result does not move it", () => {
    expect(depthStory([none("2026-08-30"), some("2026-09-13", 1600), some("2026-09-27", 200)])).toMatchObject({ state: "first", first: at("2026-09-13"), arcsec: 1600 });
  });

  it("is passed by pure guessing only about once in ninety tries, so the words may say what the check-up found", () => {
    /* the engine's own staircase, answered at random: one chance in four each time */
    let seed = 20261005;
    const chance = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (const levels of [4, 5, 6]) {
      const px = Array.from({ length: levels }, (_, i) => 2 ** (levels - 1 - i));
      let passed = 0;
      const tries = 20_000;
      for (let i = 0; i < tries; i++) {
        let stair = startDepth(levels);
        while (stair.result === null) stair = answerDepth(stair, chance() < 0.25);
        if (depthOutcome(stair, px).note !== "worse") passed++;
      }
      expect(passed / tries).toBeLessThan(0.025);
    }
  });
});

describe("the check-ups since the day", () => {
  const rows = [none("2026-08-30"), some("2026-09-13"), none("2026-09-20"), some("2026-09-27", 400)];
  it("counts the later ones, how many found depth, and whether the latest did", () => {
    expect(sinceThen(rows, at("2026-09-13"))).toEqual({ checks: 2, found: 1, latestFound: true });
    expect(sinceThen(rows.slice(0, 3), at("2026-09-13"))).toEqual({ checks: 1, found: 0, latestFound: false });
  });
  it("has nothing to say when no check-up came after", () => {
    expect(sinceThen(rows, at("2026-09-27"))).toEqual({ checks: 0, found: 0, latestFound: null });
  });
});

describe("the day is kept like a birthday", () => {
  it("falls on the same day each year, and a 29 February is marked on the 28th in other years", () => {
    expect(anniversaryIn("2026-09-27", 2027)).toBe("2027-09-27");
    expect(anniversaryIn("2028-02-29", 2029)).toBe("2029-02-28");
    expect(anniversaryIn("2028-02-29", 2032)).toBe("2032-02-29");
  });

  it("counts the years only on the anniversary itself, never on the day and never before it", () => {
    expect(yearsToday("2026-09-27", "2027-09-27")).toBe(1);
    expect(yearsToday("2026-09-27", "2029-09-27")).toBe(3);
    expect(yearsToday("2026-09-27", "2026-09-27")).toBeNull();
    expect(yearsToday("2026-09-27", "2027-09-26")).toBeNull();
    expect(yearsToday("2026-09-27", "2025-09-27")).toBeNull();
    expect(yearsToday("2028-02-29", "2029-02-28")).toBe(1);
  });

  it("finds the next anniversary", () => {
    expect(nextAnniversary("2026-09-27", "2026-10-05")).toBe("2027-09-27");
    expect(nextAnniversary("2026-09-27", "2027-09-27")).toBe("2027-09-27");
    expect(nextAnniversary("2026-09-27", "2027-09-28")).toBe("2028-09-27");
    expect(nextAnniversary("2026-09-27", "2026-09-27")).toBe("2027-09-27");
  });
});

describe("what the Today page says", () => {
  it("points at a new day until its scene is played", () => {
    expect(todayNote({ day: "2026-09-27", played: false }, "2026-10-05")).toEqual({ kind: "new", day: "2026-09-27", years: 0 });
    expect(todayNote({ day: "2026-09-27", played: true }, "2026-10-05")).toBeNull();
  });

  it("stops asking after four weeks", () => {
    expect(todayNote({ day: "2026-09-01", played: false }, "2026-09-29")).not.toBeNull();
    expect(NOTE_DAYS).toBe(28);
    expect(todayNote({ day: "2026-09-01", played: false }, "2026-09-30")).toBeNull();
  });

  it("is quiet on every other day, and marks the anniversary whether or not the scene was played", () => {
    expect(todayNote(null, "2026-10-05")).toBeNull();
    expect(todayNote({ day: "2026-09-27", played: true }, "2027-09-27")).toEqual({ kind: "years", day: "2026-09-27", years: 1 });
    expect(todayNote({ day: "2026-09-27", played: false }, "2028-09-27")).toMatchObject({ kind: "years", years: 2 });
    expect(todayNote({ day: "2026-09-27", played: true }, "2027-09-28")).toBeNull();
  });
});

describe("the scene never asks for more than was measured", () => {
  it("keeps every gap between two layers at least as wide as the step the check-up found", () => {
    for (const found of [1600, 1586, 1000, 800, 793, 400, 366, 200, 183, 100, 61, 28.6]) {
      for (const px of [28.6, 38, 61, 95]) {
        const d = sceneDepths(found, px), seen = Math.max(found, px);
        const layers = [d.hero, d.lantern, 0, d.stars].filter((v, i, all) => all.indexOf(v) === i).sort((a, b) => b - a);
        for (let i = 1; i < layers.length; i++) expect(layers[i - 1] - layers[i], `${found} on ${px}`).toBeGreaterThanOrEqual(seen - 1e-9);
        expect(d.hero).toBeGreaterThan(0);
        expect(d.stars).toBeLessThan(0);
        expect(d.hero).toBeGreaterThanOrEqual(px);
      }
    }
  });

  it("stays inside what the check-up itself shows, and is never finer than its own easy step", () => {
    for (const found of [1600, 800, 400, 100, 50]) {
      const d = sceneDepths(found, 60);
      expect(d.hero).toBeLessThanOrEqual(SCENE_MAX_ARCSEC);
      expect(d.hero).toBeGreaterThanOrEqual(SCENE_MIN_ARCSEC);
      expect(-d.stars).toBeLessThanOrEqual(SCENE_MAX_ARCSEC);
    }
    expect(sceneDepths(1600, 60)).toEqual({ hero: 1600, lantern: 0, stars: -1600 });
    expect(sceneDepths(100, 60)).toEqual({ hero: 400, lantern: 200, stars: -200 });
  });

  it("falls back to the coarsest step for a number that is no measurement", () => {
    expect(sceneDepths(Number.NaN, 60).hero).toBe(1600);
    expect(sceneDepths(0, 0).hero).toBe(1600);
  });

  it("is not shown on a screen to a child under four", () => {
    expect(mayWatch(3)).toBe(false);
    expect(mayWatch(4)).toBe(true);
    expect(mayWatch(null)).toBe(true);
  });
});
