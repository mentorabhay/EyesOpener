/**
 * Plays the seeing-skill games the way a member would, to check what random input cannot: that the comet moves
 * smoothly and pays for staying on it, that a spot waits its half second, that the track staircase moves by the
 * rule its header states, and that these games, played without glasses, never use stronger-eye ink.
 */
import { describe, expect, it, vi } from "vitest";
import { W, type GameDef } from "../kit";
import { simulate } from "../sim";
import { place as cometAt, cometTrail } from "./comet-trail";
import { eSafari, sizeAt } from "./e-safari";
import { spotJump, where as spotAt } from "./spot-jump";
import { OTHER, rig } from "./test-rig";

vi.setConfig({ testTimeout: 60_000 });

describe("comet trail", () => {
  it("counts whole seconds on the comet and speeds up for a member who stays on it", () => {
    const g = rig(cometTrail);
    for (let f = 0; f < 60 * 60; f++) g.step(1, { down: cometAt(g.k, g.s, g.s.p) });
    expect(g.k.score).toBeGreaterThanOrEqual(57);
    expect(g.k.score).toBeLessThanOrEqual(60);
    expect(g.k.level).toBeGreaterThan(5);
  });
  it("moves smoothly: never more than five units in a frame, even at the top level", () => {
    const g = rig(cometTrail);
    g.k.level = 10;
    let last = cometAt(g.k, g.s, g.s.p), most = 0;
    for (let f = 0; f < 60 * 120; f++) {
      g.step(1);
      g.k.level = 10;
      const now = cometAt(g.k, g.s, g.s.p);
      most = Math.max(most, Math.hypot(now[0] - last[0], now[1] - last[1]));
      last = now;
    }
    expect(most).toBeLessThan(5);
  });
});

describe("spot jump", () => {
  it("waits at least half a second before the next spot, and keeps a spot until it is hit", () => {
    const g = rig(spotJump);
    g.step(600);
    expect(g.s.live).toBe(true);
    expect(g.k.score).toBe(0);
    let gone = -1;
    const waits: number[] = [];
    for (let f = 0; f < 60 * 60; f++) {
      const was = g.s.live;
      g.step(1, { press: g.s.side < 0 ? "left" : "right" });
      if (was && !g.s.live) gone = g.k.t;
      if (!was && g.s.live) waits.push(g.k.t - gone);
    }
    expect(waits.length).toBeGreaterThan(30);
    expect(Math.min(...waits)).toBeGreaterThanOrEqual(0.5);
    expect(g.k.score).toBe(waits.length + (g.s.live ? 0 : 1));
  });
  it("asks for longer jumps as the level rises and counts a wrong side as a quiet miss", () => {
    const g = rig(spotJump);
    const near = Math.abs(spotAt(g.k, g.s)[0] - W / 2);
    g.k.level = 10;
    expect(Math.abs(spotAt(g.k, g.s)[0] - W / 2)).toBeGreaterThan(near + 150);
    g.k.level = 3;
    g.step(20);
    g.step(1, { press: g.s.side < 0 ? "right" : "left" });
    g.step(1, { press: g.s.side < 0 ? "right" : "left" });
    expect(g.k.score).toBe(0);
    expect(g.s.live).toBe(true);
    expect(g.k.level).toBe(2);
  });
});

describe("e safari", () => {
  const answer = (g: ReturnType<typeof rig<ReturnType<typeof eSafari.init>>>, right: boolean) => {
    g.step(90);
    g.step(1, { press: right ? g.s.way : OTHER[g.s.way] });
  };
  it("shrinks the track by a fifth after two right in a row and enlarges it after one wrong", () => {
    const g = rig(eSafari), first = sizeAt(g.k, 0);
    answer(g, true);
    expect(g.s.step).toBe(0);
    answer(g, true);
    expect(g.s.step).toBe(1);
    expect(sizeAt(g.k, g.s.step)).toBeCloseTo(first * 0.8);
    answer(g, true); answer(g, true);
    expect(sizeAt(g.k, g.s.step)).toBeCloseTo(first * 0.64);
    expect(g.s.best).toBe(1);
    expect(g.k.stats.step).toBe(2);
    answer(g, false);
    expect(sizeAt(g.k, g.s.step)).toBeCloseTo(first * 0.8);
    answer(g, false); answer(g, false);
    expect(g.s.step).toBe(0);
    /* The saved figure is the smallest step read, not where the staircase stands now. */
    expect(g.k.stats.step).toBe(2);
  });
  it("never draws the track under 10 units tall, however long the child keeps answering right", () => {
    const g = rig(eSafari);
    for (let n = 0; n < 80; n++) { answer(g, true); expect(sizeAt(g.k, g.s.step)).toBeGreaterThanOrEqual(10); }
    expect(sizeAt(g.k, g.s.step)).toBe(10);
    expect(g.s.best).toBe(g.s.step);
  });
});

describe("games played without glasses", () => {
  it.each([["comet-trail", cometTrail], ["spot-jump", spotJump], ["e-safari", eSafari]] as const)("%s never uses stronger-eye ink", (_, def) => {
    for (const skill of [0.1, 0.9]) {
      const r = simulate(def as GameDef<unknown>, { seconds: 60, skill, seed: 4 });
      expect(r.inks.strong).toBe(0);
      expect(r.inks.both).toBeGreaterThan(0);
    }
  });
});
