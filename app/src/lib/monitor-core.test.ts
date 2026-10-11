// Eyes Opener: The monitor's engine played with made-up faces and a made-up clock: minutes of work, look-aways, a slowed page,.
/**
 * The monitor's engine played with made-up faces and a made-up clock: minutes of work, look-aways, a slowed page,
 * a camera with nobody in front of it. Each test builds its pictures with src/vision/made-up.ts, reads them with
 * the same functions the page uses, and checks what would be stored.
 */
import { describe, expect, it } from "vitest";
import { readFace } from "@/vision/face";
import { madeUpFace, type MadeUpFace } from "@/vision/made-up";
import { coreClock, coreFrame, coreLive, corePutOff, coreStartBreak, startCore, type Core, type CoreSettings } from "./monitor-core";
import { ALL_PROMPTS, minuteInput, RULE, type BreakEvent, type MinuteSample, type PromptKind } from "./monitor-rules";

const MIN = 60_000, T0 = Date.UTC(2026, 9, 5, 4, 30, 0);
const SET: CoreSettings = { scale: 0.9, usualCm: 55, sideScreen: false, prefs: ALL_PROMPTS };

/** What the camera shows at a moment: a made-up face, or null for an empty chair. `sec` runs from the start of the scene. */
type Scene = (sec: number) => MadeUpFace | null;
const facts = (face: MadeUpFace | null) => { if (!face) return null; const f = madeUpFace(face); return readFace(f.points, f.width, f.height); };

interface Played { core: Core; now: number; samples: MinuteSample[]; breaks: BreakEvent[]; prompts: { kind: PromptKind; at: number }[] }
const begin = (now = T0): Played => ({ core: startCore(now), now, samples: [], breaks: [], prompts: [] });

/** Plays `seconds` of a scene at `fps` pictures a second, with the clock ticking once a second as the page does. */
function play(p: Played, seconds: number, scene: Scene, o: { fps?: number; set?: CoreSettings } = {}): Played {
  const set = o.set ?? SET, every = 1000 / (o.fps ?? 15), from = p.now, end = p.now + seconds * 1000;
  let { core } = p, nextTick = from;
  const out = { ...p, samples: [...p.samples], breaks: [...p.breaks], prompts: [...p.prompts] };
  const take = (r: ReturnType<typeof coreFrame>, now: number) => {
    core = r.core;
    if (r.out.sample) out.samples.push(r.out.sample);
    if (r.out.taken) out.breaks.push(r.out.taken);
    if (r.out.appeared) out.prompts.push({ kind: r.out.appeared, at: now });
  };
  for (let now = from; now < end; now += every) {
    while (nextTick <= now) { take(coreClock(core, nextTick, set), nextTick); nextTick += 1000; }
    take(coreFrame(core, now, now - T0, facts(scene((now - from) / 1000)), set), now);
  }
  return { ...out, core, now: end };
}
/** Time passes with no pictures at all: only the clock ticks. */
function wait(p: Played, seconds: number, set = SET): Played {
  const out = { ...p, samples: [...p.samples], breaks: [...p.breaks], prompts: [...p.prompts] };
  let { core } = p;
  for (let now = p.now; now < p.now + seconds * 1000; now += 1000) {
    const r = coreClock(core, now, set);
    core = r.core;
    if (r.out.sample) out.samples.push(r.out.sample);
    if (r.out.taken) out.breaks.push(r.out.taken);
    if (r.out.appeared) out.prompts.push({ kind: r.out.appeared, at: now });
  }
  return { ...out, core, now: p.now + seconds * 1000 };
}

const working = (o: Partial<MadeUpFace> = {}): Scene => () => ({ distanceCm: 55, ...o });
/** A face that blinks fully every `everySec` seconds; each blink takes about a quarter of a second. */
const blinking = (everySec: number, o: Partial<MadeUpFace> = {}): Scene => (sec) => {
  const into = sec % everySec;
  return { distanceCm: 55, ...o, lids: into > 2 && into < 2.27 ? 0.05 : 1 };
};
const nobody: Scene = () => null;

describe("a measured minute", () => {
  it("carries the distance the face was at, its blinks and its head position, and passes the server's check", () => {
    const p = play(begin(), 3 * 60 + 1, blinking(5));
    expect(p.samples).toHaveLength(3);
    const s = p.samples[1];
    expect(s.at).toBe(T0 + MIN);
    expect(s.distanceCm).toBeGreaterThan(54);
    expect(s.distanceCm).toBeLessThan(56);
    expect(s.blinksPerMin).toBeGreaterThanOrEqual(11);
    expect(s.blinksPerMin).toBeLessThanOrEqual(13);
    expect(s.halfBlinksPerMin).toBe(0);
    expect(s.posture).toBe(1);
    expect(s.faceSeconds).toBeGreaterThan(59);
    expect(s.minutesSinceBreak).toBeCloseTo(2, 1);
    const sent = { at: s.at, faceSeconds: s.faceSeconds, distanceCm: s.distanceCm, blinksPerMin: s.blinksPerMin, halfBlinksPerMin: s.halfBlinksPerMin, posture: s.posture, minutesSinceBreak: s.minutesSinceBreak, prompt: s.prompt };
    expect(minuteInput.safeParse(sent).success).toBe(true);
  });
  it("has no distance until the camera's scale is set, and still has the rest", () => {
    const p = play(begin(), 121, blinking(6), { set: { ...SET, scale: null, usualCm: null } });
    expect(p.samples).toHaveLength(2);
    expect(p.samples[0].distanceCm).toBeNull();
    expect(p.samples[0].blinksPerMin).toBeGreaterThan(8);
    expect(p.samples[0].posture).toBe(1);
  });
  it("does not use a turned head for distance, and does not count blinks on a face turned away", () => {
    const turned = play(begin(), 61, blinking(5, { turn: 26 }));
    expect(turned.samples[0].distanceCm).toBeNull();
    expect(turned.samples[0].blinksPerMin).toBeGreaterThan(8);
    const away = play(begin(), 61, blinking(5, { turn: 50 }), { set: { ...SET, sideScreen: true } });
    expect(away.samples[0].faceSeconds).toBeGreaterThan(59);
    expect(away.samples[0].blinksPerMin).toBeNull();
    expect(away.samples[0].distanceCm).toBeNull();
    expect(away.samples[0].posture).toBeNull();
  });
});

describe("a minute that was not measured is never stored", () => {
  it("gives nothing while nobody is in view", () => {
    const p = play(begin(), 5 * 60, nobody);
    expect(p.samples).toEqual([]);
    expect(p.prompts).toEqual([]);
    expect(p.breaks).toEqual([]);
  });
  it("gives nothing when no pictures arrive at all", () => {
    const p = wait(play(begin(), 10, working()), 10 * 60);
    expect(p.samples).toEqual([]);
    expect(coreLive(p.core, p.now).watching).toBe(false);
  });
  it("gives nothing when pictures come too far apart to say the screen was watched", () => {
    expect(play(begin(), 5 * 60, working(), { fps: 0.2 }).samples).toEqual([]);
  });
  it("gives nothing for a minute the face was in view for only a few seconds", () => {
    const scene: Scene = (sec) => (sec % 60 < 10 ? { distanceCm: 55 } : null);
    expect(play(begin(), 3 * 60, scene).samples).toEqual([]);
  });
  it("gives nothing for the part-minute in which the monitor was started", () => {
    const p = play(begin(T0 + 40_000), 20 + 61, working());
    expect(p.samples.map((s) => s.at)).toEqual([T0 + MIN]);
  });
  it("keeps distance but drops the blink number when the page is slowed to one picture a second", () => {
    const p = play(begin(), 3 * 60 + 1, blinking(5), { fps: 1 });
    expect(p.samples).toHaveLength(3);
    for (const s of p.samples) {
      expect(s.blinksPerMin).toBeNull();
      expect(s.halfBlinksPerMin).toBeNull();
      expect(s.distanceCm).toBeGreaterThan(54);
    }
    expect(coreLive(p.core, p.now - 1000).blinksBlind).toBe(true);
    expect(coreLive(play(begin(), 30, blinking(5)).core, T0 + 30_000 - 66).blinksBlind).toBe(false);
  });
});

describe("breaks", () => {
  it("prompts for a break after 20 minutes at the screen, marks that minute, and closes the prompt when the break is taken", () => {
    let p = play(begin(), 20 * 60 + 30, blinking(4), { fps: 8 });
    expect(p.prompts).toEqual([{ kind: "break", at: expect.any(Number) }]);
    expect(p.prompts[0].at - T0).toBeGreaterThanOrEqual(20 * MIN);
    expect(p.prompts[0].at - T0).toBeLessThan(20 * MIN + 2000);
    expect(coreLive(p.core, p.now).prompt).toBe("break");
    p = play(p, 40, nobody, { fps: 8 });
    expect(p.breaks).toHaveLength(1);
    expect(p.breaks[0]).toMatchObject({ seen: true, due: true, earned: true });
    expect(coreLive(p.core, p.now).prompt).toBeNull();
    p = play(p, 5 * 60, blinking(4), { fps: 8 });
    expect(p.samples.filter((s) => s.prompt === "break")).toHaveLength(1);
    expect(p.samples.find((s) => s.prompt === "break")!.at).toBe(T0 + 20 * MIN);
    expect(p.samples[p.samples.length - 1].minutesSinceBreak).toBeLessThan(6);
    expect(p.prompts).toHaveLength(1);
  });
  it("counts a look-away before a break is due as an early break, and then needs no prompt at 20 minutes", () => {
    let p = play(begin(), 12 * 60, working(), { fps: 5 });
    p = play(p, 30, nobody, { fps: 5 });
    expect(p.breaks).toHaveLength(1);
    expect(p.breaks[0]).toMatchObject({ due: false, earned: false });
    p = play(p, 10 * 60, working(), { fps: 5 });
    expect(p.prompts).toEqual([]);
  });
  it("counts a head turned well away as a look-away, unless the member said they work on a side screen", () => {
    const turn: Scene = (sec) => ({ distanceCm: 55, turn: sec > 60 ? 50 : 0 });
    expect(play(begin(), 100, turn, { fps: 5 }).breaks).toHaveLength(1);
    expect(play(begin(), 100, turn, { fps: 5, set: { ...SET, sideScreen: true } }).breaks).toEqual([]);
  });
  it("brings the prompt back five minutes after Later, and marks the break as due only once", () => {
    let p = play(begin(), 20 * 60 + 10, working(), { fps: 5 });
    p = { ...p, core: corePutOff(p.core, p.now) };
    expect(coreLive(p.core, p.now).prompt).toBeNull();
    p = play(p, 4 * 60, working(), { fps: 5 });
    expect(p.prompts).toHaveLength(1);
    p = play(p, 90, working(), { fps: 5 });
    expect(p.prompts.map((x) => x.kind)).toEqual(["break", "break"]);
    p = play(p, 60, working(), { fps: 5 });
    expect(p.samples.filter((s) => s.prompt === "break")).toHaveLength(1);
  });
  it("takes a break timed by hand even when the camera saw the member the whole time, and says the camera did not see it", () => {
    let p = play(begin(), 21 * 60, working(), { fps: 5 });
    p = { ...p, core: coreStartBreak(p.core, p.now) };
    expect(coreLive(p.core, p.now).timedLeftSec).toBe(20);
    p = play(p, 25, working(), { fps: 5 });
    expect(p.breaks).toEqual([expect.objectContaining({ seen: false, due: true })]);
    expect(coreLive(p.core, p.now).sinceBreakSec).toBeLessThan(6);
  });
  it("does not prompt and does not count a break across a gap with no pictures", () => {
    let p = play(begin(), 15 * 60, working(), { fps: 5 });
    p = wait(p, 10 * 60);
    p = play(p, 60, working(), { fps: 5 });
    expect(p.breaks).toEqual([]);
    expect(p.prompts).toEqual([]);
    expect(coreLive(p.core, p.now).sinceBreakSec).toBeLessThan(61);
  });
});

describe("coaching prompts", () => {
  it("says sit back after three minutes too close, and not again for 20 minutes", () => {
    let p = play(begin(), 3 * 60 + 2, working({ distanceCm: 40 }), { fps: 5 });
    expect(p.prompts.map((x) => x.kind)).toEqual(["close"]);
    expect(p.prompts[0].at).toBe(T0 + 3 * MIN);
    p = play(p, 14 * 60, working({ distanceCm: 40 }), { fps: 5 });
    expect(p.prompts.map((x) => x.kind)).toEqual(["close"]);
    /* the next minute carries the prompt that came on show in it */
    expect(p.samples.find((s) => s.prompt === "close")!.at).toBe(T0 + 3 * MIN);
  });
  it("says nothing about distance at 50 cm or more, or when the distance is not measured", () => {
    expect(play(begin(), 6 * 60, working({ distanceCm: 52 }), { fps: 5 }).prompts).toEqual([]);
    expect(play(begin(), 6 * 60, working({ distanceCm: 40 }), { fps: 5, set: { ...SET, scale: null, usualCm: null } }).prompts).toEqual([]);
  });
  it("reminds about blinking after five minutes with almost none, and not when the member blinks", () => {
    const few = play(begin(), 5 * 60 + 2, blinking(40), { fps: 15 });
    expect(few.samples.every((s) => s.blinksPerMin !== null && s.blinksPerMin < RULE.lowBlinks)).toBe(true);
    expect(few.prompts.map((x) => x.kind)).toEqual(["blink"]);
    expect(play(begin(), 6 * 60, blinking(5), { fps: 15 }).prompts).toEqual([]);
  });
  it("cannot remind about blinking when blinks could not be counted", () => {
    expect(play(begin(), 8 * 60, working(), { fps: 1 }).prompts).toEqual([]);
  });
  it("mentions a tilted head after five minutes of it", () => {
    const p = play(begin(), 5 * 60 + 2, blinking(5, { tilt: 24 }), { fps: 5 });
    expect(p.prompts.map((x) => x.kind)).toEqual(["tilt"]);
    expect(p.samples[0].posture).toBe(0);
  });
  it("shows no prompt of a kind that is switched off", () => {
    const set = { ...SET, prefs: { ...ALL_PROMPTS, close: false, break: false } };
    const p = play(begin(), 22 * 60, working({ distanceCm: 40 }), { fps: 5, set });
    expect(p.prompts).toEqual([]);
    /* the break still fell due, and the day's record says so */
    expect(p.samples.filter((s) => s.prompt === "break")).toHaveLength(1);
  });
});

describe("what the screen shows while it runs", () => {
  it("shows the distance, the time since the last break and that it is watching", () => {
    const p = play(begin(), 90, working({ distanceCm: 47 }));
    const live = coreLive(p.core, p.now);
    expect(live).toMatchObject({ watching: true, face: true, facing: true, prompt: null, breakDue: false });
    expect(live.distanceCm).toBeGreaterThan(46);
    expect(live.distanceCm).toBeLessThan(48);
    expect(live.sinceBreakSec).toBeGreaterThan(88);
  });
  it("says it is not watching a few seconds after the pictures stop, and shows no stale numbers", () => {
    const p = wait(play(begin(), 30, working()), 5);
    expect(coreLive(p.core, p.now)).toMatchObject({ watching: false, face: false, distanceCm: null });
  });
  it("counts the seconds of a look-away", () => {
    const p = play(play(begin(), 30, working()), 8, nobody);
    expect(coreLive(p.core, p.now)).toMatchObject({ watching: true, face: false });
    expect(coreLive(p.core, p.now).awaySec).toBeGreaterThanOrEqual(7);
  });
});
