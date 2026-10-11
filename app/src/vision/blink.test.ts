// Eyes Opener: Lid opening of the made-up face with its lids at a share of fully open, read through face.ts. .
import { describe, expect, it } from "vitest";
import { BLINK_MAX_MS, blinkStep, MAX_GAP_MS, startBlinks, type BlinkKind, type BlinkState } from "./blink";
import { readFace } from "./face";
import { madeUpFace } from "./made-up";

/** Lid opening of the made-up face with its lids at a share of fully open, read through face.ts. */
const openAt = (lids: number, more: Partial<Parameters<typeof madeUpFace>[0]> = {}) => {
  const f = madeUpFace({ distanceCm: 50, lids, ...more });
  const facts = readFace(f.points, f.width, f.height);
  return facts && facts.facing ? facts.open : null;
};

/** Plays a script of pictures at a steady rate. Each entry is the lid share, or null for "no face or turned away". */
function play(script: (number | null)[], everyMs = 66, from: BlinkState = startBlinks(), t0 = 0) {
  let state = from, t = t0, watched = 0;
  const blinks: BlinkKind[] = [];
  for (const lids of script) {
    const step = blinkStep(state, t, lids === null ? null : openAt(lids));
    state = step.state; watched += step.watchedMs;
    if (step.blink) blinks.push(step.blink);
    t += everyMs;
  }
  return { state, blinks, watched, t };
}
const steady = (n: number, lids = 1) => Array.from({ length: n }, () => lids as number | null);
/** A blink sampled at about 15 pictures a second: down, shut, shut, up. */
const FULL = [0.5, 0.05, 0.1, 0.6], HALF = [0.7, 0.55, 0.6], WARM = steady(40);

describe("blinks", () => {
  it("counts nothing while the eyes stay open", () => {
    expect(play(steady(200)).blinks).toEqual([]);
  });
  it("counts a full blink once", () => {
    expect(play([...WARM, ...FULL, ...steady(20)]).blinks).toEqual(["full"]);
  });
  it("tells a half blink from a full blink by the lowest picture", () => {
    expect(play([...WARM, ...HALF, ...steady(20)]).blinks).toEqual(["half"]);
    expect(play([...WARM, ...FULL, ...steady(20), ...HALF, ...steady(20), ...FULL, ...steady(10)]).blinks).toEqual(["full", "half", "full"]);
  });
  it("does not need to know how wide a person's eyes are: a narrow-eyed face blinks the same", () => {
    const narrow = (script: number[]) => script.map((v) => v * 0.6);
    expect(play([...narrow(WARM as number[]), ...narrow(FULL), ...narrow(steady(20) as number[])]).blinks).toEqual(["full"]);
  });
  it("does not count looking down: the lids drop and stay down", () => {
    const down = steady(60, 0.55);
    const run = play([...WARM, ...down, ...steady(30)]);
    expect(run.blinks).toEqual([]);
  });
  it("does not count resting the eyes shut for a second or more", () => {
    expect(play([...WARM, ...steady(Math.ceil((BLINK_MAX_MS + 500) / 66), 0.05), ...steady(30)]).blinks).toEqual([]);
  });
  it("finds blinks again while the eyes stay lowered, once the open level has followed them down", () => {
    const lowered = 0.6, blinkLow = [0.3, 0.04, 0.06, 0.4];
    const run = play([...WARM, ...steady(150, lowered), ...blinkLow, ...steady(20, lowered), ...steady(30)]);
    expect(run.blinks).toEqual(["full"]);
  });
  it("does not count a face that turns away in the middle of a dip, or a face that is not there", () => {
    expect(play([...WARM, 0.5, 0.1, null, null, null, ...steady(30)]).blinks).toEqual([]);
    expect(play([...WARM, ...Array.from({ length: 30 }, () => null), ...steady(30)]).blinks).toEqual([]);
  });
  it("reads a head turned well away as no opening at all", () => {
    expect(openAt(1, { turn: 50 })).toBeNull();
    expect(openAt(1, { turn: 15 })).not.toBeNull();
  });
  it("claims nothing across a gap between pictures that could hide a blink", () => {
    const warm = play(WARM);
    /* the lids are low in one picture, then the next picture comes late */
    let step = blinkStep(warm.state, warm.t, openAt(0.1));
    step = blinkStep(step.state, warm.t + MAX_GAP_MS + 200, openAt(1));
    expect(step.blink).toBeNull();
    expect(step.watchedMs).toBe(0);
  });
  it("cannot count blinks at one picture a second, and says it watched for no time", () => {
    const run = play([...steady(20), 0.05, ...steady(20)], 1000);
    expect(run.blinks).toEqual([]);
    expect(run.watched).toBe(0);
  });
  it("adds up the time it could really see blinks, and none while it is still learning the open level", () => {
    const run = play(steady(100));
    /* 100 pictures at 66 ms is 6.5 s; the first 1.5 s go to learning the level */
    expect(run.watched).toBeGreaterThan(4500);
    expect(run.watched).toBeLessThan(5200);
  });
});
