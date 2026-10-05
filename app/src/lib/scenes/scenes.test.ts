import { describe, expect, it } from "vitest";
import { simulate, SIM_PROPS } from "@/games/sim";
import { makeKit, sizeKit, type Ink } from "@/games/kit";
import { starter } from "@/games/hero";
import { sceneDepths } from "@/lib/depth-day";
import { ceremonyScene } from "./ceremony-scene";
import { depthScene } from "./depth-scene";

const WIDTHS = [400, 640, 1280];

/** Plays one frame and records every depth step the scene asked the kit for. */
function depthsAsked(found: number, width: number) {
  const asked: number[] = [];
  const surface = new Proxy({}, { get: (_o, key) => (key === "measureText" ? () => ({ width: 40 }) : () => undefined), set: () => true }) as unknown as CanvasRenderingContext2D;
  const k = makeKit(SIM_PROPS, () => surface, 1);
  sizeKit(k, SIM_PROPS, 20, width, 2);
  const depth = k.depth.bind(k);
  k.depth = (arcsec: number, draw: (ink: Ink, shift: number) => void) => { asked.push(arcsec); depth(arcsec, draw); };
  const def = depthScene(found, { title: "First Depth Day", date: "27 Sept 2026" });
  def.draw(k, def.init(k));
  return { asked, pixel: k.pxArcsec };
}

describe("the depth scene", () => {
  it("plays for a minute at three sizes without a score, a hit or a miss: it is a scene, not a game", () => {
    for (const width of WIDTHS) for (const found of [1600, 400, 61]) {
      const r = simulate(depthScene(found, { title: "First Depth Day", date: "27 Sept 2026" }), { seconds: 60, width, props: { hero: starter("cat") } });
      expect(r.score).toBe(0);
      expect(r.stats.hits + r.stats.misses).toBe(0);
      expect(r.level).toBe(1);
      /* each eye gets its own picture, and the frame is for both */
      expect(r.inks.weak).toBeGreaterThan(0);
      expect(r.inks.strong).toBeGreaterThan(0);
      expect(r.inks.both).toBeGreaterThan(0);
    }
  });

  it("asks the kit only for the depths the rules allow: none finer than the check-up found or than a pixel", () => {
    for (const width of WIDTHS) for (const found of [1600, 800, 366, 100, 28]) {
      const { asked, pixel } = depthsAsked(found, width), d = sceneDepths(found, pixel);
      expect(new Set(asked)).toEqual(new Set([d.stars, d.lantern, d.hero]));
      for (const a of asked) if (a !== 0) expect(Math.abs(a)).toBeGreaterThanOrEqual(Math.max(Math.min(found, 1600), pixel) - 1e-6);
    }
  });

  it("draws with the kit's own figure when the member has made no hero", () => {
    expect(() => simulate(depthScene(800, { title: "The depth scene", date: "" }), { seconds: 5 })).not.toThrow();
  });
});

describe("the ceremony", () => {
  it("plays through at three sizes, with no score, and never uses the stronger eye's ink", () => {
    for (const width of WIDTHS) for (const weeks of [2, 6, 12]) {
      const r = simulate(ceremonyScene(weeks, { kept: `${weeks} weeks kept`, programme: "Lazy eye" }), { seconds: 30, width, props: { hero: starter("robot") } });
      expect(r.score).toBe(0);
      expect(r.stats.hits + r.stats.misses).toBe(0);
      expect(r.inks.strong).toBe(0);
      expect(r.inks.both).toBeGreaterThan(0);
      expect(r.inks.weak).toBeGreaterThan(0);
    }
  });

  it("rests on its last picture before it is played: every lantern is lit", () => {
    const calls: Record<Ink, number> = { weak: 0, strong: 0, both: 0 };
    const surface = new Proxy({}, { get: (_o, key) => (key === "measureText" ? () => ({ width: 40 }) : () => undefined), set: () => true }) as unknown as CanvasRenderingContext2D;
    const k = makeKit(SIM_PROPS, (ink) => { calls[ink]++; return surface; }, 1);
    sizeKit(k, SIM_PROPS, 20, 640, 2);
    const def = ceremonyScene(6, { kept: "6 weeks kept", programme: "Depth" });
    def.draw(k, def.init(k));
    expect(calls.weak).toBe(6);
  });
});
