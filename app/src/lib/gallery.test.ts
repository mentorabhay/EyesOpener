// Eyes Opener: Unit and regression test suite verifying gallery functionality.
import { describe, expect, it } from "vitest";
import { depthLevels, depthValue, pixelArcsec } from "@/engine";
import {
  DAYS_ITEMS, DEPTH_ITEMS, DEPTH_SLACK, FAINT_ITEMS, GALLERY_ITEMS, WEEKS_ITEMS,
  depthPixels, depthPlanes, depthReachedAt, dotCount, dotField, effortOf, effortProgress, effortReachedOn, eyeDots, eyeShifts, faintEyes, faintReachedAt, foundDepth,
  isPracticeDay, itemBySlug, latestDepth, latestFaint, mondayOf, practiceDays, practiceWeeks, reached, reachesDepth, reachesFaint, seedOf,
  type DayRow, type DepthResult, type FaintResult,
} from "./gallery";
import { SHAPES, runsPath, shapeIn, shapeRuns, shapeShare } from "./gallery-art";

const at = (day: string) => new Date(`${day}T10:00:00+05:30`);
const depth = (day: string, value: number, note: string | null = ""): DepthResult => ({ value, note, takenAt: at(day) });
const faint = (day: string, eye: "left" | "right", value: number): FaintResult => ({ eye, value, takenAt: at(day) });
const day = (d: string, trainMinutes: number, trainGoal = 60): DayRow => ({ day: d, trainMinutes, trainGoal });

describe("the list of pictures", () => {
  it("gives every item its own slug, and finds each by it", () => {
    const slugs = GALLERY_ITEMS.map((i) => i.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const i of GALLERY_ITEMS) expect(itemBySlug(i.slug)).toBe(i);
    expect(itemBySlug("nothing")).toBeUndefined();
  });

  it("makes each depth picture finer than the one before, and each faint picture fainter", () => {
    for (let i = 1; i < DEPTH_ITEMS.length; i++) expect(DEPTH_ITEMS[i].arcsec).toBeLessThan(DEPTH_ITEMS[i - 1].arcsec);
    for (let i = 1; i < FAINT_ITEMS.length; i++) expect(FAINT_ITEMS[i].logCs).toBeGreaterThan(FAINT_ITEMS[i - 1].logCs);
  });

  it("keeps every faint picture on a step the Faint letters check-up can give", () => {
    for (const f of FAINT_ITEMS) expect(Math.abs(f.logCs / 0.15 - Math.round(f.logCs / 0.15))).toBeLessThan(1e-9);
    expect(Math.max(...FAINT_ITEMS.map((f) => f.logCs))).toBeLessThanOrEqual(1.65);
  });

  it("has effort trophies that count days and weeks, never minutes", () => {
    expect(DAYS_ITEMS.map((i) => i.days)).toEqual([1, 7, 30, 60, 100]);
    expect(WEEKS_ITEMS.map((i) => i.weeks)).toEqual([4, 8, 12]);
  });
});

describe("a depth picture is reached by the member's own Depth check-up", () => {
  it("does not count a check-up that found no depth, whatever number it stored", () => {
    expect(foundDepth(depth("2026-09-01", 1600, "worse"))).toBe(false);
    expect(reachesDepth(depth("2026-09-01", 1600, "worse"), 3600)).toBe(false);
    expect(foundDepth(depth("2026-09-01", 1600))).toBe(true);
    expect(foundDepth(depth("2026-09-01", 60, "floor"))).toBe(true);
  });

  it("counts a result at the step or finer, with a tenth of slack for whole pixels", () => {
    expect(reachesDepth(depth("2026-09-01", 800), 800)).toBe(true);
    expect(reachesDepth(depth("2026-09-01", 801.2), 800)).toBe(true);
    expect(reachesDepth(depth("2026-09-01", 800 * DEPTH_SLACK + 1), 800)).toBe(false);
    expect(reachesDepth(depth("2026-09-01", 400), 800)).toBe(true);
    expect(reachesDepth(depth("2026-09-01", 1600), 800)).toBe(false);
  });

  it("dates it to the first check-up that reached it, and keeps that date when a later one is worse", () => {
    const rows = [depth("2026-09-20", 1600, "worse"), depth("2026-09-06", 380), depth("2026-08-30", 1600), depth("2026-09-13", 760)];
    expect(depthReachedAt(rows, 800)).toEqual(at("2026-09-06"));
    expect(depthReachedAt(rows, 400)).toEqual(at("2026-09-06"));
    expect(depthReachedAt(rows, 200)).toBeNull();
    expect(depthReachedAt([], 800)).toBeNull();
  });

  it("finds the latest check-up", () => {
    expect(latestDepth([depth("2026-09-06", 380), depth("2026-09-20", 1600, "worse")])?.note).toBe("worse");
    expect(latestDepth([])).toBeNull();
  });
});

describe("a depth picture is drawn in whole pixels, and the drawing agrees with the rule", () => {
  it("uses the largest whole number of pixels that still counts as the step", () => {
    expect(depthPixels(800, 95)).toBe(9);    // 9 pixels are 855 arcseconds, inside the slack; 10 would be 950
    expect(depthPixels(100, 95)).toBe(1);
    expect(depthPixels(100, 61)).toBe(1);    // 2 pixels would be 122, over 110
    expect(depthPixels(200, 28.6)).toBe(7);
  });

  it("says 0 when the screen cannot show a step that fine, and for nonsense", () => {
    expect(depthPixels(50, 95)).toBe(0);
    expect(depthPixels(50, 61)).toBe(0);
    expect(depthPixels(50, 28.6)).toBe(1);
    expect(depthPixels(100, 0)).toBe(0);
    expect(depthPixels(0, 50)).toBe(0);
    expect(depthPixels(100, Number.NaN)).toBe(0);
  });

  it("is reached on a screen exactly by the results that are no coarser than what is drawn there", () => {
    /* every result this screen's check-up can give, against every picture, on a laptop, a monitor, a phone and a TV */
    for (const screen of [{ ppc: 45, dist: 60 }, { ppc: 36, dist: 60 }, { ppc: 60, dist: 40 }, { ppc: 15.8, dist: 250 }]) {
      for (const dpr of [1, 1.25, 2, 3]) {
        const px = pixelArcsec(screen, dpr);
        for (const item of DEPTH_ITEMS) {
          const drawn = depthPixels(item.arcsec, px);
          for (let n = 1; n <= 60; n++) {
            const result = { value: depthValue(screen, n, dpr), note: "" };
            /* the stored angle is rounded to a tenth, so a result within a tenth of the limit may fall either way */
            if (Math.abs(result.value - item.arcsec * DEPTH_SLACK) < 0.2) continue;
            expect(reachesDepth(result, item.arcsec), `${item.slug}, ${n} px of ${px.toFixed(1)}`).toBe(drawn >= 1 && n <= drawn);
          }
        }
      }
    }
  });

  it("is never drawn coarser than a step the member has not reached", () => {
    const screen = { ppc: 45, dist: 60 }, px = pixelArcsec(screen, 1.25);
    for (const level of depthLevels(screen, 1.25)) {
      const mine = depthValue(screen, level, 1.25);
      for (const item of DEPTH_ITEMS) {
        const drawn = depthPixels(item.arcsec, px);
        if (!reachesDepth({ value: mine, note: "" }, item.arcsec) && drawn >= 1) expect(drawn).toBeLessThan(level);
      }
    }
  });

  it("splits the step around the screen, in whole pixels that differ by exactly the step", () => {
    for (let n = 1; n <= 12; n++) {
      const p = depthPlanes(n);
      expect(p.shape - p.ground).toBe(n);
      expect(Number.isInteger(p.ground) && Number.isInteger(p.shape)).toBe(true);
      expect(p.ground).toBeLessThan(0);
    }
    expect(depthPlanes(1)).toEqual({ ground: -1, shape: 0 });
    expect(depthPlanes(4)).toEqual({ ground: -2, shape: 2 });
  });

  it("moves the two eyes' copies apart by exactly the offset: crossed for in front, uncrossed for behind", () => {
    for (let d = -9; d <= 9; d++) {
      const [left, right] = eyeShifts(d);
      /* the left eye's copy sits to the right of the right eye's by the offset */
      expect(left - right).toBe(d);
      expect(Number.isInteger(left) && Number.isInteger(right)).toBe(true);
    }
    expect(eyeShifts(3)).toEqual([2, -1]);
    expect(eyeShifts(-2)).toEqual([-1, 1]);
  });
});

describe("a dot picture hides its shape from one eye", () => {
  const W = 600, H = 400, cell = 5, reach = 20;
  const inShape = (x: number, y: number) => x >= 200 && x < 400 && y >= 100 && y < 300;
  const ground = dotField(seedOf("depth-800"), dotCount(W, H, cell, reach), W, H, cell, reach);
  const figure = dotField(seedOf("depth-800/shape"), dotCount(W, H, cell, reach), W, H, cell, reach);
  /** The share of a box that one eye's dots cover. */
  const cover = (dots: { x: number; y: number }[], x0: number, y0: number, x1: number, y1: number) => {
    const on = new Uint8Array(W * H);
    for (const d of dots) for (let y = Math.max(0, d.y); y < Math.min(H, d.y + cell); y++) for (let x = Math.max(0, d.x); x < Math.min(W, d.x + cell); x++) on[y * W + x] = 1;
    let n = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) n += on[y * W + x];
    return n / ((x1 - x0) * (y1 - y0));
  };

  it("scatters the same dots for the same seed, in whole pixels, and different dots for another picture", () => {
    expect(dotField(7, 50, W, H, cell)).toEqual(dotField(7, 50, W, H, cell));
    expect(dotField(7, 50, W, H, cell)).not.toEqual(dotField(8, 50, W, H, cell));
    expect(ground.every((d) => Number.isInteger(d.x) && Number.isInteger(d.y))).toBe(true);
    expect(seedOf("depth-800")).not.toBe(seedOf("depth-400"));
  });

  it("covers about four tenths of the panel", () => {
    const share = cover(eyeDots(ground, figure, cell, () => false, 0, 0), 0, 0, W, H);
    expect(share).toBeGreaterThan(0.3);
    expect(share).toBeLessThan(0.5);
  });

  it("gives one eye the same share of dots inside the shape, outside it and along its edge", () => {
    for (const n of [1, 4, 9, 30]) {
      const planes = depthPlanes(n);
      for (const eye of [0, 1] as const) {
        const dots = eyeDots(ground, figure, cell, inShape, eyeShifts(planes.ground)[eye], eyeShifts(planes.shape)[eye]);
        const inside = cover(dots, 220, 120, 380, 280), outside = cover(dots, 20, 20, 180, 380);
        /* a band 16 pixels wide over each upright edge of the shape, where a cue would show first */
        const edges = (cover(dots, 192, 100, 208, 300) + cover(dots, 392, 100, 408, 300)) / 2;
        expect(Math.abs(inside - outside), `${n} px, eye ${eye}`).toBeLessThan(0.06);
        expect(Math.abs(edges - outside), `${n} px, eye ${eye}, edges`).toBeLessThan(0.08);
      }
    }
  });

  it("never cuts a dot: every dot of either eye is one whole dot of a scatter, moved sideways", () => {
    const planes = depthPlanes(4), [gl] = eyeShifts(planes.ground), [fl] = eyeShifts(planes.shape);
    const left = eyeDots(ground, figure, cell, inShape, gl, fl);
    const whole = new Set([...ground.map((d) => `${d.x + gl},${d.y}`), ...figure.map((d) => `${d.x + fl},${d.y}`)]);
    expect(left.every((d) => whole.has(`${d.x},${d.y}`))).toBe(true);
  });

  it("shows the two eyes the shape's dots moved apart by the step, and nothing else of the shape", () => {
    const n = 4, planes = depthPlanes(n), [gl, gr] = eyeShifts(planes.ground), [fl, fr] = eyeShifts(planes.shape);
    const key = (d: { x: number; y: number }) => `${d.x},${d.y}`;
    const left = new Set(eyeDots(ground, figure, cell, inShape, gl, fl).map(key)), right = new Set(eyeDots(ground, figure, cell, inShape, gr, fr).map(key));
    const mine = figure.filter((d) => inShape(d.x + cell / 2, d.y + cell / 2));
    expect(mine.length).toBeGreaterThan(100);
    for (const d of mine) {
      expect(left.has(key({ x: d.x + fl, y: d.y }))).toBe(true);
      expect(right.has(key({ x: d.x + fr, y: d.y }))).toBe(true);
    }
    expect(fl - fr).toBe(planes.shape);
    expect(gl - gr).toBe(planes.ground);
    expect(planes.shape - planes.ground).toBe(n);
    /* a ground dot far from the shape is in both eyes, moved apart by the ground's own offset */
    const far = ground.filter((d) => d.x > 20 && d.x < 150 && d.y > 0 && d.y < H - cell);
    for (const d of far) expect(left.has(key({ x: d.x + gl, y: d.y })) && right.has(key({ x: d.x + gr, y: d.y }))).toBe(true);
  });

  it("hides the ground behind the shape from each eye", () => {
    const planes = depthPlanes(6), [gl] = eyeShifts(planes.ground), [fl] = eyeShifts(planes.shape);
    const left = eyeDots(ground, figure, cell, inShape, gl, fl);
    const groundSeen = new Set(ground.map((d) => `${d.x + gl},${d.y}`)), figureSeen = new Set(figure.map((d) => `${d.x + fl},${d.y}`));
    /* well inside the shape as the left eye sees it, every dot is one of the shape's */
    for (const d of left) if (d.x > 220 && d.x < 370 && d.y > 110 && d.y < 285) expect(figureSeen.has(`${d.x},${d.y}`) || !groundSeen.has(`${d.x},${d.y}`)).toBe(true);
  });

  it("gives both eyes the very same dots when there is no step at all", () => {
    expect(eyeDots(ground, figure, cell, inShape, 0, 0)).toEqual(eyeDots(ground, figure, cell, inShape, 0, 0));
  });
});

describe("a faint picture is reached by the eye it is meant for", () => {
  it("is meant for the weaker eye when one is known, otherwise for both", () => {
    expect(faintEyes("left")).toEqual(["left"]);
    expect(faintEyes(null)).toEqual(["left", "right"]);
  });

  it("allows for a stored step that comes back a hair short", () => {
    expect(reachesFaint(1.6499999, 1.65)).toBe(true);
    expect(reachesFaint(1.5, 1.65)).toBe(false);
    expect(reachesFaint(Number.NaN, 0.9)).toBe(false);
  });

  it("does not count the stronger eye's result for a member with a weaker eye", () => {
    const rows = [faint("2026-08-31", "right", 1.65), faint("2026-08-31", "left", 1.35), faint("2026-09-30", "left", 1.5)];
    expect(faintReachedAt(rows, 1.2, "left")).toEqual(at("2026-08-31"));
    expect(faintReachedAt(rows, 1.5, "left")).toEqual(at("2026-09-30"));
    expect(faintReachedAt(rows, 1.65, "left")).toBeNull();
    expect(faintReachedAt(rows, 1.65, "right")).toEqual(at("2026-08-31"));
  });

  it("needs both eyes when no weaker eye is known, and dates it to the later of the two", () => {
    const rows = [faint("2026-08-31", "right", 1.65), faint("2026-08-31", "left", 1.35), faint("2026-09-30", "left", 1.65)];
    expect(faintReachedAt(rows, 1.65, null)).toEqual(at("2026-09-30"));
    expect(faintReachedAt(rows.slice(0, 2), 1.65, null)).toBeNull();
    expect(faintReachedAt(rows.slice(0, 1), 0.9, null)).toBeNull();
  });

  it("gives the latest result of each eye the pictures are meant for", () => {
    const rows = [faint("2026-08-31", "left", 1.35), faint("2026-09-30", "left", 1.5), faint("2026-08-31", "right", 1.65)];
    expect(latestFaint(rows, "left")).toEqual([{ eye: "left", value: 1.5 }]);
    expect(latestFaint(rows, null)).toEqual([{ eye: "left", value: 1.5 }, { eye: "right", value: 1.65 }]);
    expect(latestFaint([], "right")).toEqual([{ eye: "right", value: null }]);
  });
});

describe("effort trophies come from showing up", () => {
  it("counts a day once its practice was done, and a day with no minutes set once it had any practice", () => {
    expect(isPracticeDay(day("2026-09-01", 60))).toBe(true);
    expect(isPracticeDay(day("2026-09-01", 59.6))).toBe(true);
    expect(isPracticeDay(day("2026-09-01", 40))).toBe(false);
    expect(isPracticeDay(day("2026-09-01", 0))).toBe(false);
    expect(isPracticeDay(day("2026-09-01", 12, 0))).toBe(true);
    expect(isPracticeDay(day("2026-09-01", 0, 0))).toBe(false);
  });

  it("gives nothing more for more minutes: a long day is one day", () => {
    const usual = effortOf([day("2026-09-01", 60), day("2026-09-02", 60)]);
    const long = effortOf([day("2026-09-01", 90), day("2026-09-02", 90)]);
    expect(long).toEqual(usual);
    expect(practiceDays([day("2026-09-01", 60), day("2026-09-01", 60)])).toEqual(["2026-09-01"]);
  });

  it("counts weeks that had practice, whether or not they follow one another", () => {
    expect(mondayOf("2026-10-05")).toBe("2026-10-05");
    expect(mondayOf("2026-10-11")).toBe("2026-10-05");
    expect(practiceWeeks(["2026-09-02", "2026-09-04", "2026-09-22", "2026-09-21"])).toEqual(["2026-09-02", "2026-09-21"]);
  });

  it("dates a trophy to the day its count was reached, and shows progress that never passes the count", () => {
    const rows = Array.from({ length: 9 }, (_, i) => day(`2026-09-${String(i + 1).padStart(2, "0")}`, 60));
    const e = effortOf(rows);
    expect(effortReachedOn(DAYS_ITEMS[0], e)).toBe("2026-09-01");
    expect(effortReachedOn(DAYS_ITEMS[1], e)).toBe("2026-09-07");
    expect(effortReachedOn(DAYS_ITEMS[2], e)).toBeNull();
    expect(effortProgress(DAYS_ITEMS[1], e)).toEqual({ done: 7, of: 7 });
    expect(effortProgress(DAYS_ITEMS[2], e)).toEqual({ done: 9, of: 30 });
    expect(effortReachedOn(WEEKS_ITEMS[0], e)).toBeNull();
    expect(effortProgress(WEEKS_ITEMS[0], e)).toEqual({ done: 2, of: 4 });
  });
});

describe("what the facts reach", () => {
  const startOfDay = (d: string) => new Date(`${d}T00:00:00+05:30`);

  it("is nothing for a member with no results and no practice", () => {
    expect(reached({ depth: [], faint: [], weakEye: null, days: [], startOfDay })).toEqual([]);
  });

  it("is each item the member's own rows reach, with the moment it was first reached", () => {
    const got = reached({
      depth: [depth("2026-09-01", 1600, "worse"), depth("2026-09-28", 760)],
      faint: [faint("2026-08-31", "left", 1.35), faint("2026-08-31", "right", 1.65)],
      weakEye: "left",
      days: [day("2026-09-14", 60), day("2026-09-15", 20)],
      startOfDay,
    });
    expect(got).toEqual([
      { slug: "depth-800", at: at("2026-09-28") },
      { slug: "faint-090", at: at("2026-08-31") },
      { slug: "faint-120", at: at("2026-08-31") },
      { slug: "days-1", at: startOfDay("2026-09-14") },
    ]);
  });

  it("cannot be raised by anything but a result or a practice day", () => {
    /* the only inputs are rows: there is no flag, no tap and no score to pass in */
    const base = { depth: [depth("2026-09-01", 1600, "worse")], faint: [], weakEye: null, days: [day("2026-09-14", 5)], startOfDay } as const;
    expect(reached(base)).toEqual([]);
  });
});

describe("the shapes", () => {
  it("are big enough to hold dots and leave room around them", () => {
    for (const [key, shape] of Object.entries(SHAPES)) {
      const share = shapeShare(shape);
      expect(share, key).toBeGreaterThan(0.12);
      expect(share, key).toBeLessThan(0.6);
    }
  });

  it("can be written as rows of runs and as a path", () => {
    const rows = shapeRuns(SHAPES.star, 48);
    expect(rows.length).toBe(48);
    expect(rows.every((r) => r.length % 2 === 0)).toBe(true);
    expect(runsPath(rows)).toMatch(/^M\d+ \d+h\d+v1h-\d+z/);
  });

  it("sit in the middle of a panel of any shape, clear of its edges", () => {
    for (const [w, h] of [[400, 300], [300, 400], [640, 360]]) {
      const inShape = shapeIn(SHAPES.tree, w, h);
      let minX = w, maxX = 0, minY = h, maxY = 0;
      for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (inShape(x, y)) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
      expect(minX).toBeGreaterThan(w * 0.05);
      expect(maxX).toBeLessThan(w * 0.95);
      expect(minY).toBeGreaterThan(h * 0.05);
      expect(maxY).toBeLessThan(h * 0.95);
    }
  });
});
