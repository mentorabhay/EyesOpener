// Eyes Opener: Unit and regression test suite verifying care functionality.
import { describe, it, expect } from "vitest";
import {
  addDays, BREAKS_A_DAY, breakCounts, breakSeconds, isDayKey, isOutdoorEntry, OUTDOOR_DAY_CAP, outdoorCounted, pickSeeded, ranLongEnough, seedOf,
  weekDays, weekdayOf, weekStart,
} from "./care";

describe("days and weeks", () => {
  it("knows a real day key from a made-up one", () => {
    expect(isDayKey("2026-10-04")).toBe(true);
    for (const bad of ["2026-02-30", "2026-13-01", "04-10-2026", "2026-10-4", "", "today"]) expect(isDayKey(bad)).toBe(false);
  });
  it("moves across months and years", () => {
    expect(addDays("2026-10-04", -4)).toBe("2026-09-30");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
  it("starts the week on Monday", () => {
    expect(weekdayOf("2026-10-04")).toBe(0); // a Sunday
    expect(weekStart("2026-10-04")).toBe("2026-09-28");
    expect(weekStart("2026-09-28")).toBe("2026-09-28");
    expect(weekDays("2026-10-01")).toEqual(["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
  });
});

describe("outdoor minutes", () => {
  it("takes one entry of 5 to 180 whole minutes", () => {
    for (const ok of [5, 40, 180]) expect(isOutdoorEntry(ok)).toBe(true);
    for (const bad of [0, 4, 181, 30.5, NaN, -20]) expect(isOutdoorEntry(bad)).toBe(false);
  });
  it("caps the day at 600 minutes", () => {
    expect(outdoorCounted(40, 0)).toBe(40);
    expect(outdoorCounted(180, 500)).toBe(100);
    expect(outdoorCounted(60, OUTDOOR_DAY_CAP)).toBe(0);
    expect(outdoorCounted(60, 900)).toBe(0);
  });
  it("counts nothing for an entry outside the limits", () => {
    expect(outdoorCounted(300, 0)).toBe(0);
    expect(outdoorCounted(2, 0)).toBe(0);
  });
});

describe("breaks", () => {
  it("counts at most twelve a day", () => {
    expect(breakCounts(0)).toBe(true);
    expect(breakCounts(BREAKS_A_DAY - 1)).toBe(true);
    expect(breakCounts(BREAKS_A_DAY)).toBe(false);
    expect(breakCounts(40)).toBe(false);
  });
  it("needs the timer to have run", () => {
    expect(breakSeconds("blink")).toBe(60);
    expect(breakSeconds("far")).toBe(20);
    expect(ranLongEnough("far", 20_000)).toBe(true);
    expect(ranLongEnough("far", 5_000)).toBe(false);
    expect(ranLongEnough("blink", 30_000)).toBe(false);
    expect(ranLongEnough("blink", 60_500)).toBe(true);
  });
});

describe("picking by date", () => {
  const pool = Array.from({ length: 30 }, (_, i) => `thing-${i}`);
  it("gives the same pick for the same seed and a different one for another", () => {
    expect(pickSeeded(pool, 10, "sky:2026-10-04")).toEqual(pickSeeded(pool, 10, "sky:2026-10-04"));
    expect(pickSeeded(pool, 10, "sky:2026-10-04")).not.toEqual(pickSeeded(pool, 10, "sky:2026-10-05"));
    expect(seedOf("a")).not.toBe(seedOf("b"));
  });
  it("never repeats an item and never invents one", () => {
    for (const seed of ["a", "b", "sky:2026-10-04", "sky:2026-10-05"]) {
      const picked = pickSeeded(pool, 16, seed);
      expect(new Set(picked).size).toBe(16);
      expect(picked.every((p) => pool.includes(p))).toBe(true);
    }
    expect(pickSeeded(["a", "b"], 5, "s").sort()).toEqual(["a", "b"]);
  });
});
