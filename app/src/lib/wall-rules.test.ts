// Eyes Opener: Unit and regression test suite verifying wall-rules functionality.
import { describe, expect, it } from "vitest";
import { ARTWORKS, WALL_SIZES, artworkFor, earnsTile, focusOf, freeTile, isMonth, monthOf, shiftMonth, tileKey, tilesDue, tilesFor, wallGrid } from "./wall-rules";

describe("the month's picture", () => {
  it("gives every month a picture of its own, the same one each year", () => {
    const year = Array.from({ length: 12 }, (_, i) => artworkFor(`2026-${String(i + 1).padStart(2, "0")}`));
    expect(new Set(year).size).toBe(12);
    expect(year).toEqual([...ARTWORKS]);
    expect(artworkFor("2027-10")).toBe(artworkFor("2026-10"));
    expect(artworkFor("2026-10")).toBe("kite");
  });
  it("knows a month from a day and steps over a year's end", () => {
    expect(monthOf("2026-10-05")).toBe("2026-10");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-10", -2)).toBe("2026-08");
    expect(isMonth("2026-10")).toBe(true);
    for (const bad of ["2026-13", "2026-1", "zz-12", "2026-10-05", ""]) expect(isMonth(bad)).toBe(false);
  });
});

describe("earning a tile", () => {
  const day = (profileId: string, d: string, trainMinutes: number, trainGoal = 60) => ({ profileId, day: d, trainMinutes, trainGoal });

  it("takes a finished practice day: the minutes the programme set were reached", () => {
    expect(earnsTile({ trainMinutes: 60, trainGoal: 60 })).toBe(true);
    expect(earnsTile({ trainMinutes: 59.97, trainGoal: 60 })).toBe(true);
    expect(earnsTile({ trainMinutes: 47.7, trainGoal: 60 })).toBe(false);
    expect(earnsTile({ trainMinutes: 0, trainGoal: 60 })).toBe(false);
  });
  it("gives nothing for a day with no minutes set, however long the member trained", () => {
    expect(earnsTile({ trainMinutes: 90, trainGoal: 0 })).toBe(false);
  });
  it("gives one tile for a finished day and no more for extra minutes", () => {
    expect(tilesDue([day("a", "2026-10-01", 60)], new Set())).toEqual([{ profileId: "a", day: "2026-10-01" }]);
    expect(tilesDue([day("a", "2026-10-01", 90, 30)], new Set()).length).toBe(1);
    expect(tilesDue([day("a", "2026-10-01", 90, 30), day("a", "2026-10-01", 90, 30)], new Set()).length).toBe(1);
  });
  it("gives nothing for a day that already has its tile, however often the days are counted", () => {
    const days = [day("a", "2026-10-01", 60), day("a", "2026-10-02", 75), day("b", "2026-10-01", 60), day("b", "2026-10-02", 10)];
    const first = tilesDue(days, new Set());
    expect(first).toEqual([{ profileId: "a", day: "2026-10-01" }, { profileId: "b", day: "2026-10-01" }, { profileId: "a", day: "2026-10-02" }]);
    expect(tilesDue(days, new Set(first.map(tileKey)))).toEqual([]);
    expect(tilesDue(days, new Set([tileKey(first[0])]))).toEqual(first.slice(1));
  });
});

describe("the wall's size and grid", () => {
  it("sizes a new wall from the practice days finished the month before, between 32 and 512 tiles", () => {
    expect(tilesFor(0)).toBe(32);
    expect(tilesFor(31)).toBe(32);
    expect(tilesFor(100)).toBe(72);
    expect(tilesFor(128)).toBe(128);
    expect(tilesFor(5000)).toBe(512);
  });
  it("lays every size out twice as wide as tall, with a place for every tile", () => {
    for (const n of WALL_SIZES) {
      const g = wallGrid(n);
      expect(g.cols * g.rows, String(n)).toBe(n);
      expect(g.cols, String(n)).toBe(g.rows * 2);
    }
    expect(wallGrid(32)).toEqual({ cols: 8, rows: 4 });
    /* An odd count still gets a grid that holds it. */
    const odd = wallGrid(40);
    expect(odd.cols * odd.rows).toBeGreaterThanOrEqual(40);
  });
  it("picks only a tile that is still out of focus, and none when the picture is whole", () => {
    const taken = new Set([0, 1, 2, 4, 5, 6, 7]);
    for (const r of [0, 0.3, 0.999, 1]) expect(freeTile(taken, 8, () => r)).toBe(3);
    const picked = new Set(Array.from({ length: 50 }, (_, i) => freeTile(new Set([1]), 4, () => i / 50)));
    expect([...picked].sort()).toEqual([0, 2, 3]);
    expect(freeTile(new Set([0, 1, 2, 3]), 4, () => 0.5)).toBeNull();
  });
  it("counts a tile once, and only tiles that are on the wall", () => {
    const f = focusOf(4, [0, 1, 1, 9, -1, 2.5]);
    expect(f.count).toBe(2);
    expect(f.share).toBe(0.5);
    expect(f.complete).toBe(false);
    expect(focusOf(4, [0, 1, 2, 3, 3]).complete).toBe(true);
    expect(focusOf(0, []).complete).toBe(false);
  });
});
