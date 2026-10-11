// Eyes Opener: Unit and regression test suite verifying map functionality.
import { describe, expect, it } from "vitest";
import {
  GRID, isArea, isWelcomeKey, joinRefusal, lampLighter, litAreas, MAP_MIN_HOUSEHOLDS, parseArea, regionOf, REGIONS, shown, tiles, WELCOME_KEYS, welcomeFor, welcomeRefusal,
} from "./map";
import { SPONSOR_MIN_GROUP } from "./roles";

describe("the regions of the drawing", () => {
  it("cover every allocated pair of first digits once, and none of the others", () => {
    const owner = new Map<number, string>();
    for (const r of REGIONS) for (let two = r.from; two <= r.to; two++) { expect(owner.has(two), `${two} is in two regions`).toBe(false); owner.set(two, r.key); }
    const none = [10, 29, 35, 54, 55, 86, 87, 88, 89];
    for (let two = 10; two <= 89; two++) expect(owner.has(two), String(two)).toBe(!none.includes(two));
    for (let two = 90; two <= 99; two++) expect(owner.has(two), String(two)).toBe(false);
    for (let two = 0; two <= 9; two++) expect(owner.has(two), String(two)).toBe(false);
  });
  it("give each region its own tile inside the grid", () => {
    const seen = new Set(REGIONS.map((r) => `${r.col},${r.row}`));
    expect(seen.size).toBe(REGIONS.length);
    expect(new Set(REGIONS.map((r) => r.key)).size).toBe(REGIONS.length);
    for (const r of REGIONS) { expect(r.col).toBeGreaterThanOrEqual(0); expect(r.col).toBeLessThan(GRID.cols); expect(r.row).toBeGreaterThanOrEqual(0); expect(r.row).toBeLessThan(GRID.rows); }
  });
  it("know some places", () => {
    expect(regionOf("110")?.name).toBe("Delhi");
    expect(regionOf("400")?.key).toBe("mh");
    expect(regionOf("403")?.name).toContain("Goa");
    expect(regionOf("560")?.name).toBe("Karnataka");
    expect(regionOf("737")?.name).toContain("Sikkim");
    expect(regionOf("799")?.name).toContain("Tripura");
    expect(regionOf("290")).toBeNull();
  });
});

describe("the area a family gives", () => {
  it("takes exactly three digits", () => {
    expect(parseArea("411")).toMatchObject({ ok: true, area: "411" });
    expect(parseArea(" 4 1 1 ")).toMatchObject({ ok: true, area: "411" });
    expect(isArea("411")).toBe(true);
  });
  it("refuses a full PIN code instead of shortening it, so six digits are never taken in", () => {
    for (const typed of ["411001", "4110", "41", "4", "", "41a", "four", "411-001", "٤١١"]) expect(parseArea(typed), typed).toEqual({ ok: false, why: "format" });
    expect(isArea("411001")).toBe(false);
  });
  it("refuses the army post, which names no place", () => {
    for (const typed of ["900", "911", "999"]) expect(parseArea(typed)).toEqual({ ok: false, why: "army" });
  });
  it("refuses first digits that are not given to any region", () => {
    for (const typed of ["000", "012", "100", "299", "350", "540", "555", "860", "899"]) expect(parseArea(typed), typed).toEqual({ ok: false, why: "unknown" });
  });
});

describe("what may be shown", () => {
  it("uses the same minimum as the sponsor counts", () => {
    expect(MAP_MIN_HOUSEHOLDS).toBe(SPONSOR_MIN_GROUP);
  });
  it("gives no count below the minimum", () => {
    expect(shown(MAP_MIN_HOUSEHOLDS - 1)).toBeNull();
    expect(shown(0)).toBeNull();
    expect(shown(MAP_MIN_HOUSEHOLDS)).toBe(MAP_MIN_HOUSEHOLDS);
    expect(shown(120)).toBe(120);
  });
  const counts = [{ area: "560", households: 6 }, { area: "400", households: 5 }, { area: "411", households: 4 }, { area: "110", households: 1 }, { area: "999", households: 50 }, { area: "4000", households: 9 }];
  it("lights only areas with enough households, in a known region, and lists them by area and not by size", () => {
    expect(litAreas(counts).map((a) => [a.area, a.households])).toEqual([["400", 5], ["560", 6]]);
    expect(litAreas([])).toEqual([]);
  });
  it("draws every region, lit only by the lit areas inside it", () => {
    const all = tiles(litAreas([...counts, { area: "401", households: 7 }]));
    expect(all).toHaveLength(REGIONS.length);
    expect(all.find((t) => t.key === "mh")).toMatchObject({ lit: 2, households: 12 });
    expect(all.find((t) => t.key === "ka")).toMatchObject({ lit: 1, households: 6 });
    /* an area below the minimum adds nothing to its tile: one family in Delhi leaves Delhi dark */
    expect(all.find((t) => t.key === "dl")).toMatchObject({ lit: 0, households: 0 });
    expect(all.filter((t) => t.lit > 0).map((t) => t.key).sort()).toEqual(["ka", "mh"]);
  });
});

describe("the lamp-lighter", () => {
  const at = (iso: string) => new Date(iso);
  const places = [
    { accountId: "b", joinedAt: at("2026-09-02T10:00:00Z") },
    { accountId: "a", joinedAt: at("2026-09-01T10:00:00Z") },
    { accountId: "c", joinedAt: at("2026-09-03T10:00:00Z") },
  ];
  it("is the household that has been on the area longest", () => {
    expect(lampLighter(places)?.accountId).toBe("a");
    expect(lampLighter([])).toBeNull();
  });
  it("passes on by itself when that household leaves", () => {
    expect(lampLighter(places.filter((p) => p.accountId !== "a"))?.accountId).toBe("b");
  });
  it("is the same on every read when two joined at the same instant", () => {
    const same = [{ accountId: "z", joinedAt: at("2026-09-01T10:00:00Z") }, { accountId: "m", joinedAt: at("2026-09-01T10:00:00Z") }];
    expect(lampLighter(same)?.accountId).toBe("m");
    expect(lampLighter([...same].reverse())?.accountId).toBe("m");
  });
});

describe("joining and welcoming", () => {
  it("lets a guardian join once, and never a cheer seat, a child's device or a staff test household", () => {
    expect(joinRefusal({ canShare: true, tester: false, onMap: false })).toBeNull();
    expect(joinRefusal({ canShare: false, tester: false, onMap: false })).toBe("not_allowed");
    expect(joinRefusal({ canShare: true, tester: true, onMap: false })).toBe("tester");
    expect(joinRefusal({ canShare: true, tester: false, onMap: true })).toBe("already");
  });
  const first = { canShare: true, accountId: "a", onMap: true, first: "a", line: "hello" };
  it("lets only the lamp-lighter choose a welcome, and only a line from the list or none", () => {
    expect(welcomeRefusal(first)).toBeNull();
    expect(welcomeRefusal({ ...first, line: "" })).toBeNull();
    expect(welcomeRefusal({ ...first, first: "b" })).toBe("not_first");
    expect(welcomeRefusal({ ...first, first: null })).toBe("not_first");
    expect(welcomeRefusal({ ...first, onMap: false })).toBe("not_on_map");
    expect(welcomeRefusal({ ...first, canShare: false })).toBe("not_allowed");
    for (const line of ["Come to 12 Hill Road", "hello ", "HELLO", "<b>hi</b>", "constructor", "toString"]) expect(welcomeRefusal({ ...first, line }), line).toBe("bad_line");
  });
  it("has a short fixed list of lines, and nothing else is a line", () => {
    expect(WELCOME_KEYS.length).toBeGreaterThanOrEqual(3);
    expect(new Set(WELCOME_KEYS).size).toBe(WELCOME_KEYS.length);
    for (const key of WELCOME_KEYS) expect(isWelcomeKey(key)).toBe(true);
    for (const v of [null, undefined, 3, "", "free text", {}]) expect(isWelcomeKey(v)).toBe(false);
  });
  it("shows the welcome to the families that came later, never to the lamp-lighter itself, and never a line that is not on the list", () => {
    expect(welcomeFor("b", { accountId: "a", welcome: "hello" })).toBe("hello");
    expect(welcomeFor("a", { accountId: "a", welcome: "hello" })).toBeNull();
    expect(welcomeFor("b", { accountId: "a", welcome: null })).toBeNull();
    expect(welcomeFor("b", { accountId: "a", welcome: "Call me on 98200" })).toBeNull();
    expect(welcomeFor("b", null)).toBeNull();
  });
});
