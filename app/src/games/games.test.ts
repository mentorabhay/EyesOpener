// Eyes Opener: Unit and regression test suite verifying games functionality.
import { describe, expect, it } from "vitest";
import { gameBySlug } from "@/data";
import { builtSlugs, helpFor, isBuilt, kindOf } from "./built";
import { slugs as careSlugs } from "./care/slugs";
import { defs, families } from "./defs";
import { cinema as cinemaSlugs } from "./extra";
import { makeKit, sizeKit, type Ink } from "./kit";
import { SIM_PROPS, simulate } from "./sim";
import { aim, ease, jumpTo, maxJump, newDemand, ramp } from "./vergence";

const all = Object.entries(defs);

describe("the kit", () => {
  const surface = new Proxy({}, { get: () => () => undefined, set: () => true }) as unknown as CanvasRenderingContext2D;
  const kit = (over = {}) => { const p = { ...SIM_PROPS, ...over }; const k = makeKit(p, () => surface, 1); sizeKit(k, p, 20, 640, 2); return k; };

  it("turns prism dioptres into centimetres on the screen: 1 prism dioptre is 1 cm at 1 m", () => {
    const k = kit({ distCm: 100, ppc: 40 });
    expect(k.prismUnits(1) / k.perCm).toBeCloseTo(1);
    expect(kit({ distCm: 50, ppc: 40 }).prismUnits(10) / 40).toBeCloseTo(5);
  });
  it("crosses the two pictures to turn the eyes in, with the cyan eye's picture in weaker-eye ink", () => {
    const seen: [Ink, number][] = [];
    kit({ cyanEye: "L" }).fuse(4, (ink, shift) => seen.push([ink, shift]));
    expect(seen[0][0]).toBe("weak");
    expect(seen[0][1]).toBeGreaterThan(0);
    expect(seen[1][0]).toBe("strong");
    expect(seen[1][1]).toBe(-seen[0][1]);
    const other: [Ink, number][] = [];
    kit({ cyanEye: "R" }).fuse(4, (ink, shift) => other.push([ink, shift]));
    expect(other[0]).toEqual(["strong", seen[0][1]]);
  });
  it("never asks the eyes to turn out past 4 cm of separation, whatever a game asks for", () => {
    const k = kit({ distCm: 50, ppc: 40 });
    const seen: number[] = [];
    k.fuse(-40, (_, shift) => seen.push(shift));
    expect(Math.abs(seen[0] - seen[1]) / k.perCm).toBeLessThanOrEqual(4.0001);
    expect(k.divMax).toBeCloseTo(8);
  });
  it("keeps turning-in demand inside the screen and under 30 prism dioptres", () => {
    const small = kit({ distCm: 40, ppc: 40 }), big = kit({ distCm: 300, ppc: 12 });
    expect(small.prismUnits(small.convMax)).toBeLessThanOrEqual(0.4 * 640 + 0.001);
    expect(big.convMax).toBeLessThanOrEqual(30);
  });
  it("raises the level after three hits and lowers it after two misses", () => {
    const k = kit();
    k.hit(); k.hit(); k.hit();
    expect(k.level).toBe(2);
    k.miss(); k.miss();
    expect(k.level).toBe(1);
    k.miss(); k.miss();
    expect(k.level).toBe(1);
  });
  it("reports the finest depth step the screen can show", () => {
    expect(kit({ distCm: 50, ppc: 40 }).pxArcsec).toBeCloseTo(51.6, 0);
  });
});

describe("vergence demand", () => {
  const surface = new Proxy({}, { get: () => () => undefined, set: () => true }) as unknown as CanvasRenderingContext2D;
  const kit = () => { const k = makeKit(SIM_PROPS, () => surface, 1); sizeKit(k, SIM_PROPS, 20, 640, 2); k.dt = 1 / 60; return k; };

  it("never moves faster than 2 prism dioptres a second, whatever rate a game asks for", () => {
    const k = kit(), d = newDemand();
    aim(k, d, 10);
    for (let f = 0; f < 60; f++) ramp(k, d, 50);
    expect(d.now).toBeCloseTo(2, 5);
  });
  it("keeps the goal inside the screen's limits", () => {
    const k = kit(), d = newDemand();
    aim(k, d, 99); expect(d.goal).toBe(k.convMax);
    aim(k, d, -99); expect(d.goal).toBe(-k.divMax);
  });
  it("limits a jump by level", () => {
    const k = kit(), d = newDemand();
    jumpTo(k, d, 30);
    expect(d.now).toBeCloseTo(maxJump(k));
    expect(maxJump(k)).toBeLessThanOrEqual(2.1);
    k.level = 10;
    expect(maxJump(k)).toBe(12);
  });
  it("eases toward rest by 2 when the member says the picture split, from either side", () => {
    const k = kit(), d = { now: 6, goal: 8 };
    ease(k, d); expect(d).toEqual({ now: 4, goal: 6 });
    const out = { now: -1, goal: -1 };
    ease(k, out); expect(out).toEqual({ now: 0, goal: 0 });
  });
});

describe("every built game", () => {
  it("is listed once, is in the catalogue and says how to play", () => {
    const slugs = builtSlugs();
    const listed = [...Object.values(families).flatMap((f) => Object.keys(f)), ...cinemaSlugs, ...careSlugs];
    /* No slug sits in two families: the merged list is as long as the families added together. */
    expect(listed.length).toBe(slugs.length);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(gameBySlug(slug), slug).toBeTruthy();
      expect(isBuilt(slug), slug).toBe(true);
      expect(helpFor(slug)?.length ?? 0, `help for ${slug}`).toBeGreaterThan(20);
    }
    for (const slug of Object.keys(defs)) expect(kindOf(slug)).toBe("kit");
    for (const slug of cinemaSlugs) expect(kindOf(slug)).toBe("cinema");
    for (const slug of careSlugs) expect(kindOf(slug)).toBe("care");
  });

  it.each(all)("%s plays for two minutes without breaking", { timeout: 30_000 }, (_, def) => {
    for (const [seed, skill] of [[1, 0.05], [2, 0.3], [3, 0.9]] as const) {
      const r = simulate(def, { seconds: 120, seed, skill });
      expect(Number.isFinite(r.score)).toBe(true);
      expect(r.level).toBeGreaterThanOrEqual(1);
      expect(r.level).toBeLessThanOrEqual(10);
      /* Every scene gives both eyes something to hold on to. */
      expect(r.inks.both).toBeGreaterThan(0);
    }
  });

  it.each(all)("%s runs on a phone, on a TV and for a member with no eye profile", { timeout: 30_000 }, (_, def) => {
    simulate(def, { seconds: 20, width: 340, props: { ppc: 60, distCm: 35, targetPx: 60, letterPx: 70 } });
    simulate(def, { seconds: 20, width: 1600, props: { ppc: 14, distCm: 250, targetPx: 30, letterPx: 40 } });
    simulate(def, { seconds: 20, props: { ppc: 0, distCm: 0, targetPx: 0, letterPx: 0, contrast: 1, cyanEye: "R" } });
  });
});
