// Eyes Opener: Unit and regression test suite verifying status functionality.
import { describe, expect, it } from "vitest";
import { exercises, games } from "@/data";
import { bestOf, cleanDetail, DETAIL_MAX_KEYS, type PastSession } from "./detail";
import { cleanStatusMap, DEFAULT_STATUS, forWhom, isListed, itemKey, recommendedStatus, statusOf, STATUSES } from "./status";

describe("status of library items", () => {
  it("is open for everything until staff change it", () => {
    expect(DEFAULT_STATUS).toBe("open");
    for (const g of games) expect(statusOf({}, "game", g.slug)).toBe("open");
    for (const e of exercises) expect(statusOf({}, "exercise", e.slug)).toBe("open");
    expect(statusOf({}, "film", "two-eye-cinema")).toBe("open");
  });

  it("uses what staff set", () => {
    const map = { [itemKey("game", "firefly-catch")]: "off", [itemKey("exercise", "brock-string")]: "counsellor" } as const;
    expect(statusOf(map, "game", "firefly-catch")).toBe("off");
    expect(statusOf(map, "exercise", "brock-string")).toBe("counsellor");
    expect(statusOf(map, "game", "lantern-run")).toBe("open");
  });

  it("hides staff-only and switched-off items from members, and shows everything to a staff tester", () => {
    expect(STATUSES.filter((s) => isListed(s, false))).toEqual(["open", "counsellor"]);
    expect(STATUSES.filter((s) => isListed(s, true))).toEqual([...STATUSES]);
  });

  it("recommends counsellor-led for level 2 and open for the rest", () => {
    for (const g of games) expect(recommendedStatus("game", g.slug)).toBe(/level 2/.test(g.for) ? "counsellor" : "open");
    for (const e of exercises) expect(recommendedStatus("exercise", e.slug)).toBe(/level 2/.test(e.for) ? "counsellor" : "open");
    expect(exercises.filter((e) => recommendedStatus("exercise", e.slug) === "counsellor").length).toBeGreaterThan(0);
    expect(recommendedStatus("film", "two-eye-cinema")).toBe("open");
    expect(recommendedStatus("game", "no-such-game")).toBe("open");
  });

  it("keeps only well-formed entries of a stored map, and drops the default", () => {
    expect(cleanStatusMap({ "game:firefly-catch": "off", "game:lantern-run": "open", "game:x": "everyone", "page:home": "off", "exercise:Brock String": "off", junk: 1 }))
      .toEqual({ "game:firefly-catch": "off" });
    for (const bad of [null, undefined, "open", 3, ["game:a"]]) expect(cleanStatusMap(bad)).toEqual({});
  });

  it("takes the level note out of the 'who it is for' line", () => {
    expect(forWhom("Intermittent squint · level 2, counsellor plan")).toBe("Intermittent squint");
    expect(forWhom("Lazy eye · ages 4+ · level 1")).toBe("Lazy eye · ages 4+");
    expect(forWhom("Anyone at a screen")).toBe("Anyone at a screen");
  });
});

describe("what a session measured", () => {
  it("keeps finite numbers under short plain keys and rounds them", () => {
    expect(cleanDetail({ hits: 12, misses: 3.14159, break_pd: 14.25 })).toEqual({ hits: 12, misses: 3.14, break_pd: 14.25 });
  });

  it("drops anything that is not a plain number under a plain key", () => {
    expect(cleanDetail({ hits: 2, name: "Aarav", "Bad Key": 1, nan: Number.NaN, inf: Infinity, huge: 1e9, nested: { a: 1 }, "<script>": 1 })).toEqual({ hits: 2 });
    for (const bad of [null, undefined, 4, "x", [1, 2], {}]) expect(cleanDetail(bad)).toBeNull();
  });

  it("never keeps more than the limit", () => {
    const many = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`k${i}`, i]));
    expect(Object.keys(cleanDetail(many)!).length).toBe(DETAIL_MAX_KEYS);
  });

  it("finds the best so far, each way", () => {
    const row = (score: number | null, detail: Record<string, number> | null): PastSession => ({ id: String(Math.random()), at: new Date(), minutes: 1, score, detail, endReason: "done" });
    const rows = [row(4, { break_cm: 9, hits: 3 }), row(9, { break_cm: 6, hits: 8 }), row(null, { break_cm: 7 }), row(2, null)];
    expect(bestOf(rows, ["break_cm"])).toEqual({ score: 9, break_cm: 6, hits: 8 });
    expect(bestOf([])).toEqual({});
  });
});
