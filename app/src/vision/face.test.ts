import { describe, expect, it } from "vitest";
import { distanceCm, FACE_POINTS, isScale, LEAN_SHARE, median, postureOf, readFace, scaleFrom, type Point } from "./face";
import { madeUpFace } from "./made-up";

const read = (o: Parameters<typeof madeUpFace>[0]) => { const f = madeUpFace(o); return readFace(f.points, f.width, f.height); };

describe("no face in view", () => {
  it("answers null for nothing, for too few points and for points that are not numbers", () => {
    expect(readFace(null, 640, 480)).toBeNull();
    expect(readFace([], 640, 480)).toBeNull();
    const f = madeUpFace({ distanceCm: 50 });
    expect(readFace(f.points.slice(0, 468), 640, 480)).toBeNull();
    const broken: Point[] = f.points.map((p, i) => (i === 468 ? { x: NaN, y: 0.5, z: 0 } : p));
    expect(readFace(broken, 640, 480)).toBeNull();
    expect(readFace(f.points, 0, 480)).toBeNull();
    expect(f.points).toHaveLength(FACE_POINTS);
  });
  it("gives no iris width when an eye is off the edge of the picture, so no distance is claimed", () => {
    const facts = read({ distanceCm: 40, shiftX: 0.47 });
    expect(facts).not.toBeNull();
    expect(facts!.iris).toBeNull();
    expect(distanceCm(facts!.iris, facts!.offCentre, 0.9)).toBeNull();
  });
});

describe("viewing distance from the iris", () => {
  it("reads back the distance a made-up face was placed at, for several distances, cameras and picture sizes", () => {
    for (const scale of [0.6, 0.9, 1.2]) for (const d of [30, 45, 50, 65, 90]) for (const [width, height] of [[640, 480], [1280, 720]]) {
      const facts = read({ distanceCm: d, scale, width, height })!;
      expect(distanceCm(facts.iris, facts.offCentre, scale)!, `${d} cm, scale ${scale}, ${width}x${height}`).toBeCloseTo(d, 0);
    }
  });
  it("is the same for a face that sits away from the middle of the picture", () => {
    const facts = read({ distanceCm: 55, shiftX: 0.25, shiftY: -0.1 })!;
    expect(facts.offCentre).toBeGreaterThan(0.2);
    /* the eyes are 55 cm deep; their straight-line distance from the camera is a little more */
    const got = distanceCm(facts.iris, facts.offCentre, 0.9)!;
    expect(got).toBeGreaterThan(54.5);
    expect(got).toBeLessThan(59);
  });
  it("has no distance without a scale, and none with a scale no camera can have", () => {
    const facts = read({ distanceCm: 50 })!;
    expect(distanceCm(facts.iris, facts.offCentre, null)).toBeNull();
    expect(distanceCm(facts.iris, facts.offCentre, 5)).toBeNull();
    expect(distanceCm(null, 0, 0.9)).toBeNull();
    expect(isScale(0.9)).toBe(true);
    expect(isScale(0.2)).toBe(false);
    expect(isScale(NaN)).toBe(false);
  });
  it("sets the camera's scale in one step from a known distance, and that scale then reads other distances", () => {
    const at50 = read({ distanceCm: 50, scale: 0.78 })!;
    const scale = scaleFrom(at50.iris!, at50.offCentre, 50)!;
    expect(scale).toBeCloseTo(0.78, 2);
    const at38 = read({ distanceCm: 38, scale: 0.78 })!;
    expect(distanceCm(at38.iris, at38.offCentre, scale)!).toBeCloseTo(38, 0);
  });
  it("folds a person's own iris width into the scale: the reading is right for them and off for someone else", () => {
    const big = { irisMm: 12.2, scale: 0.9 };
    const cal = read({ distanceCm: 50, ...big })!;
    const scale = scaleFrom(cal.iris!, cal.offCentre, 50)!;
    const same = read({ distanceCm: 70, ...big })!;
    expect(distanceCm(same.iris, same.offCentre, scale)!).toBeCloseTo(70, 0);
    const other = read({ distanceCm: 70, irisMm: 11.2, scale: 0.9 })!;
    const off = distanceCm(other.iris, other.offCentre, scale)!;
    expect(off / 70).toBeGreaterThan(1.05);
    expect(off / 70).toBeLessThan(1.12);
  });
  it("refuses a set-up that gives a scale no web camera has", () => {
    const facts = read({ distanceCm: 50 })!;
    expect(scaleFrom(facts.iris!, facts.offCentre, 150)).toBeNull();
    expect(scaleFrom(facts.iris!, facts.offCentre, 10)).toBeNull();
    expect(scaleFrom(0, 0, 50)).toBeNull();
    expect(scaleFrom(facts.iris!, facts.offCentre, 0)).toBeNull();
  });
});

describe("head angles", () => {
  it("reads a face that is square to the camera as square", () => {
    const f = read({ distanceCm: 50 })!;
    expect(Math.abs(f.turn)).toBeLessThan(1);
    expect(Math.abs(f.nod)).toBeLessThan(1);
    expect(Math.abs(f.tilt)).toBeLessThan(1);
    expect(f.facing).toBe(true);
    expect(f.square).toBe(true);
  });
  it("reads back a turn, a nod and a tilt within three degrees", () => {
    for (const a of [-40, -25, -10, 10, 25, 40]) {
      expect(read({ distanceCm: 55, turn: a })!.turn, `turn ${a}`).toBeGreaterThan(a - 3);
      expect(read({ distanceCm: 55, turn: a })!.turn, `turn ${a}`).toBeLessThan(a + 3);
      expect(Math.abs(read({ distanceCm: 55, nod: a })!.nod - a), `nod ${a}`).toBeLessThan(3);
      expect(Math.abs(read({ distanceCm: 55, tilt: a })!.tilt - a), `tilt ${a}`).toBeLessThan(3);
    }
  });
  it("says a head turned or nodded far away is not facing the screen, and a tilted head still is", () => {
    expect(read({ distanceCm: 50, turn: 45 })!.facing).toBe(false);
    expect(read({ distanceCm: 50, turn: -45 })!.facing).toBe(false);
    expect(read({ distanceCm: 50, nod: 40 })!.facing).toBe(false);
    expect(read({ distanceCm: 50, tilt: 25 })!.facing).toBe(true);
  });
  it("uses a picture for distance only when the head is nearly square", () => {
    expect(read({ distanceCm: 50, turn: 12 })!.square).toBe(true);
    const turned = read({ distanceCm: 50, turn: 26 })!;
    expect(turned.facing).toBe(true);
    expect(turned.square).toBe(false);
  });
});

describe("lid opening", () => {
  it("falls as the lids close, and is the same at any distance", () => {
    const open = read({ distanceCm: 50, lids: 1 })!.open, half = read({ distanceCm: 50, lids: 0.5 })!.open, shut = read({ distanceCm: 50, lids: 0.05 })!.open;
    expect(open).toBeGreaterThan(0.3);
    expect(half / open).toBeCloseTo(0.5, 1);
    expect(shut / open).toBeLessThan(0.1);
    expect(read({ distanceCm: 80, lids: 1 })!.open).toBeCloseTo(open, 2);
  });
  it("changes little when the head turns a small way", () => {
    const square = read({ distanceCm: 50 })!.open, turned = read({ distanceCm: 50, turn: 20 })!.open;
    expect(Math.abs(turned / square - 1)).toBeLessThan(0.08);
  });
});

describe("head position", () => {
  it("is level up to a small tilt and not level beyond it", () => {
    expect(postureOf({ tilt: 8 }, null, null).level).toBe(true);
    expect(postureOf({ tilt: -20 }, null, null).level).toBe(false);
  });
  it("is leaning in when closer than the member's own usual distance by the set share, and unknown without both", () => {
    expect(postureOf({ tilt: 0 }, 60 * LEAN_SHARE - 1, 60).leaning).toBe(true);
    expect(postureOf({ tilt: 0 }, 58, 60).leaning).toBe(false);
    expect(postureOf({ tilt: 0 }, null, 60).leaning).toBeNull();
    expect(postureOf({ tilt: 0 }, 40, null).leaning).toBeNull();
  });
});

describe("median", () => {
  it("is the middle value, and null for nothing", () => {
    expect(median([])).toBeNull();
    expect(median([5])).toBe(5);
    expect(median([9, 1, 5])).toBe(5);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});
