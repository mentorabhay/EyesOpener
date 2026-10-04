/**
 * What the depth game in this edition promises, checked with no screen: the depth step is honest, one eye
 * alone gets no clue, and the words are never smaller than the member's letters.
 */
import { describe, expect, it } from "vitest";
import { H, W, makeKit, sizeKit } from "../kit";
import { SIM_PROPS } from "../sim";
import { depthDarts } from "./depth-darts";
import { STEPS, depthStep } from "./parts";
import { SCREENS, ok, rig } from "./rig";

describe("the depth step", () => {
  it.each(SCREENS)("on a %s is a whole number of screen pixels and never under one", (_, width, dpr, props) => {
    const p = { ...SIM_PROPS, ...props }, k = makeKit(p, () => ({}) as CanvasRenderingContext2D, 1);
    sizeKit(k, p, 20, width, dpr);
    for (k.level = 1; k.level <= 10; k.level++) {
      const step = depthStep(k), pixels = step / k.pxArcsec;
      expect(step).toBeGreaterThanOrEqual(k.pxArcsec);
      expect(pixels).toBeCloseTo(Math.round(pixels), 6);
      expect(Math.abs(step - STEPS[k.level - 1])).toBeLessThanOrEqual(Math.max(k.pxArcsec / 2, k.pxArcsec - STEPS[k.level - 1]) + 1e-6);
    }
  });
});

describe("depth darts", () => {
  it.each([0, 1, 2])("floats one target by the step, leaves the others flat, and pays only for the near one (screen %i)", (screen) => {
    const g = rig(depthDarts, screen);
    g.step();
    for (let round = 0; round < 40; round++) {
      const o = g.s.round, asked = g.depths.map(([a]) => a).filter((a) => a !== 0);
      expect(asked).toEqual([o.step, o.step]);
      expect(g.depths.length).toBe(o.n * 2);
      expect(o.step).toBeGreaterThanOrEqual(g.k.pxArcsec);
      /* One eye alone: every copy stays inside the same sway round its slot, and inside the frame. */
      const half = g.k.arcsecUnits(o.step) / 2, sway = Math.max(8, 4 * half);
      o.xs.forEach((x: number, n: number) => {
        expect(Math.abs(x - o.slots[n]) + (n === o.near ? half : 0)).toBeLessThanOrEqual(sway + 1e-9);
        expect(x - o.r - half).toBeGreaterThan(14);
        expect(x + o.r + half).toBeLessThan(W - 14);
      });
      const before = g.k.score, right = round % 4 !== 3, pick = right ? o.near : (o.near + 1) % o.n;
      g.step((k) => { k.input.tapped = true; k.input.x = o.xs[pick]; k.input.y = o.y; });
      g.run(3);
      expect(g.k.score - before).toBe(right ? 1 : 0);
      expect(g.s.round).not.toBe(o);
    }
  });
  it("takes a member who always sees it down to the finest step the screen can show, and no further", () => {
    const g = rig(depthDarts);
    for (let round = 0; round < 40; round++) { g.step((k) => { k.input.tapped = true; k.input.x = g.s.round.xs[g.s.round.near]; k.input.y = g.s.round.y; }); g.run(3); }
    expect(g.k.level).toBe(10);
    expect(g.s.round.step).toBeCloseTo(g.k.pxArcsec, 6);
    const guess = rig(depthDarts);
    for (let round = 0; round < 60; round++) { guess.step((k) => { k.input.tapped = true; k.input.x = guess.s.round.xs[0]; k.input.y = guess.s.round.y; }); guess.run(3); }
    expect(guess.k.level).toBeLessThanOrEqual(3);
  });
  it("is playable with Left, Right and OK alone", () => {
    const g = rig(depthDarts, 1);
    g.step(ok);
    for (let round = 0; round < 6; round++) {
      for (let n = 0; n < 4; n++) g.step((k) => { if (g.s.mark !== g.s.round.near) k.input.pressed.add(g.s.mark > g.s.round.near ? "left" : "right"); });
      g.step(ok);
      g.run(3);
    }
    expect(g.k.score).toBe(6);
  });
});

describe("words", () => {
  it.each(SCREENS.map(([name], n) => [name, n] as const))("on a %s are never smaller than the member's letters and stay inside the frame", (_, screen) => {
    const g = rig(depthDarts, screen), seen = new Set<string>();
    let small = 0, out = 0;
    for (let f = 0; f < 60 * 60; f++) {
      /* A throw every two seconds, at each target in turn, so both answers ("hit" and "nearest") are written. */
      g.step(f % 120 === 0 ? (k) => { const o = g.s.round; k.input.tapped = true; k.input.x = o.xs[(f / 120) % o.n]; k.input.y = o.y; } : undefined);
      for (const w of g.texts) {
        seen.add(w.s);
        if (w.size < g.k.letter - 1e-9) small++;
        if (w.x0 < 10 || w.x1 > W - 10 || w.y > H - 10 || w.y - w.size < 10) out++;
      }
    }
    expect(small).toBe(0);
    expect(out).toBe(0);
    expect(seen.size).toBeGreaterThan(4);
  });
});
