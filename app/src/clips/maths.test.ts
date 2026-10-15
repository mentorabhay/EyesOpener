import { describe, expect, it } from "vitest";
import { offsetArcsec } from "@/engine";
import {
  CATCHES, FAR_MIN_CM, MIN_CYCLE_DOTS, NEAR_MAX_CM, bandLevels, bandVerdict, canDrawStripes, cycleDots, dotsForArcsec, dotsPerDegree, fieldRadiusDeg,
  frameStats, holdDemand, ppcFromDiagonal, ppcFromRuler, prismOfDots, arcminOfDots, readingSpeed, restingPosition, spotPlaces, standOf, wobbleLevels,
} from "./maths";

const laptop = { ppc: 37.8, dist: 60 }, tv = { ppc: 15, dist: 250 }, phone = { ppc: 60, dist: 35 };

describe("where the screen stands", () => {
  it("is near up to 100 cm, far from 200 cm, and neither in between", () => {
    expect(standOf(30)).toBe("near");
    expect(standOf(NEAR_MAX_CM)).toBe("near");
    expect(standOf(101)).toBe("mid");
    expect(standOf(199)).toBe("mid");
    expect(standOf(FAR_MIN_CM)).toBe("far");
  });
});

describe("the size of a large screen", () => {
  it("works out the dots to a centimetre from the diagonal, and lets the tape correct it", () => {
    /* a 43-inch 16:9 screen is 95.2 cm wide; at 1920 page dots that is 20.2 dots to a centimetre */
    const first = ppcFromDiagonal(43, 1920, 1080);
    expect(first).toBeCloseTo(20.17, 1);
    /* the ruler meant to be 20 cm measures 25 cm: the page dots are larger than thought */
    expect(ppcFromRuler(first, 20, 25)).toBeCloseTo(first * 0.8, 5);
    expect(ppcFromRuler(first, 20, 20)).toBe(first);
  });
});

describe("stripes", () => {
  it("counts the real dots in a pair of stripes from the screen's size and distance", () => {
    /* one degree at 60 cm is 1.047 cm: 39.6 dots on this laptop */
    expect(dotsPerDegree(laptop)).toBeCloseTo(39.6, 1);
    expect(cycleDots(laptop, 1, 6)).toBeCloseTo(6.6, 1);
    expect(cycleDots(laptop, 2, 12)).toBeCloseTo(6.6, 1);
  });

  it("refuses stripes finer than the screen can draw from the seat", () => {
    expect(canDrawStripes(laptop, 1, 1.5)).toBe(true);
    expect(canDrawStripes(laptop, 1, 6)).toBe(true);
    expect(canDrawStripes(laptop, 1, 12)).toBe(false);
    expect(canDrawStripes(laptop, 2, 12)).toBe(true);
    expect(canDrawStripes(tv, 1, 12)).toBe(true);
    expect(cycleDots(laptop, 1, 12)).toBeLessThan(MIN_CYCLE_DOTS);
  });
});

describe("depth steps", () => {
  it("halves from the largest step of a band down to its finest, in whole dots", () => {
    expect(bandLevels(laptop, 1, 400, [3200, 400])).toEqual([35, 17, 8, 4]);
    expect(bandLevels(laptop, 1, 400, [400, 100])).toEqual([4, 2, 1]);
    expect(bandLevels(laptop, 1, 400, [100, 0])).toEqual([1]);
    /* a sharper screen has finer steps to offer */
    expect(bandLevels(laptop, 2, 400, [100, 0])).toEqual([2, 1]);
    for (const band of [[3200, 400], [400, 100], [100, 0], [800, 0]] as const) {
      const levels = bandLevels(tv, 1, 300, band);
      for (let i = 1; i < levels.length; i++) expect(levels[i]).toBeLessThan(levels[i - 1]);
      expect(levels.every((d) => Number.isInteger(d) && d >= 1)).toBe(true);
    }
  });

  it("never starts wider than the drawing has room for", () => {
    expect(bandLevels(laptop, 1, 10, [3200, 400])[0]).toBe(10);
  });

  it("offers nothing when one dot of the screen is already coarser than the band", () => {
    const coarse = { ppc: 20, dist: 40 };
    expect(offsetArcsec(coarse, 1, 1)).toBeGreaterThan(125);
    expect(bandLevels(coarse, 1, 400, [100, 0])).toEqual([]);
    expect(bandLevels(coarse, 1, 400, [400, 100]).length).toBeGreaterThan(0);
  });

  it("is the nearest whole number of dots to an angle", () => {
    expect(dotsForArcsec(laptop, 1, 1600)).toBe(18);
    expect(dotsForArcsec(laptop, 1, 10)).toBe(1);
  });

  it("keeps a banded result only when the finest step read lies inside the band", () => {
    expect(bandVerdict("", 8, true)).toBe("kept");
    expect(bandVerdict("floor", 4, true)).toBe("finer");
    expect(bandVerdict("floor", 1, false)).toBe("kept");
    expect(bandVerdict("worse", 35, true)).toBe("kept");
    expect(bandVerdict("worse", 4, false)).toBe("coarser");
  });
});

describe("the wobbly circle", () => {
  it("offers only ripples the screen can draw", () => {
    expect(wobbleLevels(200)).toEqual([8, 4, 2, 1, 0.5, 0.25]);
    expect(wobbleLevels(40)).toEqual([8, 4, 2, 1, 0.5]);
    expect(wobbleLevels(5)).toEqual([8, 4]);
    expect(wobbleLevels(1)).toEqual([8]);
  });
});

describe("the resting position", () => {
  it("turns a gap in dots into prism dioptres and minutes of arc", () => {
    /* 37.8 dots are 1 cm; 1 cm at 60 cm is 1.67 prism dioptres */
    expect(prismOfDots(37.8, laptop, 1)).toBeCloseTo(100 / 60, 3);
    expect(arcminOfDots(37.8, laptop, 1)).toBeCloseTo(57.3, 1);
    expect(prismOfDots(37.8, laptop, 2)).toBeCloseTo(50 / 60, 3);
  });

  it("stores turned out as negative and turned in as positive, from the middle of three settings", () => {
    /* the right eye's line had to be moved to the right to look lined up: the eyes rest turned out */
    expect(restingPosition([30, 45, 38], laptop, 1, "prism_dioptre")).toBeCloseTo(-1.7, 1);
    expect(restingPosition([-38, -30, -45], laptop, 1, "prism_dioptre")).toBeCloseTo(1.7, 1);
    expect(restingPosition([0, 1, -1], laptop, 1, "prism_dioptre")).toBe(0);
    expect(Object.is(restingPosition([0, 0, 0], laptop, 1, "arcmin"), 0)).toBe(true);
    /* one wild setting does not move the middle one */
    expect(restingPosition([38, 38, 400], laptop, 1, "prism_dioptre")).toBeCloseTo(-1.7, 1);
  });
});

describe("the browser's own timing", () => {
  it("reports pictures a second and the share that came late", () => {
    const steady = Array<number>(600).fill(16.7);
    expect(frameStats(steady)).toEqual({ fps: 59.9, late: 0, frames: 600 });
    const some = [...Array<number>(540).fill(16.7), ...Array<number>(60).fill(33.4)];
    expect(frameStats(some)).toMatchObject({ fps: 59.9, late: 0.1 });
  });
  it("says nothing from too few pictures", () => {
    expect(frameStats(Array<number>(20).fill(16.7))).toBeNull();
    expect(frameStats([])).toBeNull();
  });
});

describe("spots", () => {
  it("places eight spots on each ring, all inside the field, none at the middle", () => {
    for (const rings of [2, 3]) {
      const places = spotPlaces(rings);
      expect(places).toHaveLength(rings * 8);
      for (const p of places) { const far = Math.hypot(p.x, p.y); expect(far).toBeGreaterThan(0.25); expect(far).toBeLessThanOrEqual(0.9001); }
      expect(new Set(places.map((p) => `${p.x} ${p.y}`)).size).toBe(places.length);
    }
    expect(CATCHES).toBeGreaterThanOrEqual(3);
  });
  it("tests out to ten degrees where there is room, and to what fits where there is not", () => {
    expect(fieldRadiusDeg(20, 60)).toBe(10);
    expect(fieldRadiusDeg(5, 60)).toBeCloseTo(4.8, 1);
  });
});

describe("reading", () => {
  it("gives words a minute, and nothing for a passage that was not read", () => {
    expect(readingSpeed(110, 33)).toBe(200);
    expect(readingSpeed(110, 5)).toBeNull();
    expect(readingSpeed(110, 10.5)).toBeNull();
    expect(readingSpeed(110, 600)).toBeNull();
    expect(readingSpeed(0, 30)).toBeNull();
  });
});

describe("the pull of a hold", () => {
  it("is half of the last fusion break, inside 2 to 15, or the default", () => {
    expect(holdDemand(null)).toBe(6);
    expect(holdDemand(20)).toBe(10);
    expect(holdDemand(2)).toBe(2);
    expect(holdDemand(30)).toBe(15);
    expect(phone.ppc).toBeGreaterThan(0);
  });
});
