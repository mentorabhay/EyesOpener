import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {}, schema: { careLog: {}, daySummary: {} } }));

import { BREAKS_A_DAY, FAR_SECONDS } from "./care";
import {
  ADULT_AGE, addFrame, ALL_PROMPTS, breakDue, breakInput, breakInTime, closeMinute, coachingFor, dayBins, dayKeyOf, dayTotals, isAdultProfile, minuteInput,
  minuteInTime, minuteOf, minuteOfDay, promptStep, putOff, RANGE, ringDecision, RULE, startMinute, startPrompts, startStretch, startTimed, stopTimed, stretchStep,
  type FrameNumbers, type MinuteSample, type PromptState, type SampleRow, type Stretch,
} from "./monitor-rules";

const MIN = 60_000, T0 = Date.UTC(2026, 9, 5, 4, 30, 0);

/** Plays pictures every `every` ms for `seconds`, all at the screen or all away. */
function hold(s: Stretch, from: number, seconds: number, atScreen: boolean, every = 100) {
  const taken = [];
  let restarted = false, now = from;
  for (; now < from + seconds * 1000; now += every) {
    const step = stretchStep(s, now, atScreen);
    s = step.stretch;
    if (step.taken) taken.push(step.taken);
    restarted ||= step.restarted;
  }
  return { s, taken, now, restarted };
}

describe("the rule's numbers", () => {
  it("uses the same 20 seconds as the Far Window companion, and the day's limit is the companions' limit", () => {
    expect(RULE.breakSeconds).toBe(FAR_SECONDS);
    expect(RULE.breakEveryMin).toBe(20);
    expect(BREAKS_A_DAY).toBe(12);
  });
  it("prompts for distance a little under the guidance, never over it", () => {
    expect(RULE.closeCm).toBe(50);
    expect(RULE.closePromptCm).toBeLessThan(RULE.closeCm);
  });
});

describe("the stretch of screen work", () => {
  it("adds up time at the screen", () => {
    const { s } = hold(startStretch(), T0, 90, true);
    expect(s.screenMs).toBeGreaterThan(89_000);
    expect(s.screenMs).toBeLessThanOrEqual(90_000);
    expect(breakDue(s)).toBe(false);
  });
  it("does not count a short look-away as a break or as screen time", () => {
    let r = hold(startStretch(), T0, 60, true);
    const before = r.s.screenMs;
    r = hold(r.s, r.now, 12, false);
    expect(r.taken).toEqual([]);
    r = hold(r.s, r.now, 1, true);
    expect(r.s.screenMs - before).toBeLessThan(1100);
    expect(r.s.away).toBeNull();
  });
  it("counts a 20-second look-away as one break, seen by the camera, and starts the stretch again", () => {
    let r = hold(startStretch(), T0, 300, true);
    const awayFrom = r.now;
    r = hold(r.s, r.now, 45, false);
    expect(r.taken).toHaveLength(1);
    expect(r.taken[0]).toMatchObject({ at: awayFrom, seen: true, due: false, earned: false });
    expect(r.taken[0].afterMin).toBeCloseTo(5, 1);
    expect(r.s.screenMs).toBe(0);
    /* still away: nothing more is counted; back at the screen the clock runs from zero */
    r = hold(r.s, r.now, 120, false);
    expect(r.taken).toEqual([]);
    r = hold(r.s, r.now, 30, true);
    expect(r.s.screenMs).toBeGreaterThan(29_000);
    expect(r.s.screenMs).toBeLessThanOrEqual(30_000);
  });
  it("says a break was due when 20 minutes of screen work came before it", () => {
    let r = hold(startStretch(), T0, RULE.breakEveryMin * 60 + 5, true, 500);
    expect(breakDue(r.s)).toBe(true);
    r = hold(r.s, r.now, 25, false, 500);
    expect(r.taken[0]).toMatchObject({ seen: true, due: true, earned: true });
    expect(breakDue(r.s)).toBe(false);
  });
  it("is no break at all when no screen work came before it: an empty chair when the monitor starts earns nothing", () => {
    const r = hold(startStretch(), T0, 120, false);
    expect(r.taken).toEqual([]);
    expect(r.s.screenMs).toBe(0);
    /* the same for a second look-away straight after a break, with no work between */
    let w = hold(startStretch(), T0, 60, true);
    w = hold(w.s, w.now, 30, false);
    expect(w.taken).toHaveLength(1);
    const back = stretchStep(w.s, w.now, true).stretch;
    expect(hold(back, w.now + 100, 30, false).taken).toEqual([]);
  });
  it("earns one break for every 20 minutes of screen work, however the member spaces the look-aways", () => {
    /* a look-away every 15 minutes: the first is early, then three in the next 45 minutes of work would be too many */
    let r = hold(startStretch(), T0, 0, true);
    const earned: boolean[] = [];
    for (let i = 0; i < 8; i++) {
      r = hold(r.s, r.now, 15 * 60 + 5, true, 1000);
      r = hold(r.s, r.now, 25, false, 1000);
      earned.push(r.taken[0].earned);
      expect(r.taken[0].due).toBe(false);
    }
    /* two hours of work in eight stretches: six breaks earned, as for someone who waits the full 20 minutes */
    expect(earned).toEqual([false, true, true, true, false, true, true, true]);
    /* a look-away every minute earns nothing more than the rule gives */
    let q = hold(startStretch(), T0, 0, true), n = 0;
    for (let i = 0; i < 40; i++) { q = hold(q.s, q.now, 62, true, 1000); q = hold(q.s, q.now, 21, false, 1000); n += q.taken.filter((b) => b.earned).length; }
    expect(n).toBe(2);
  });
  it("forgets screen work that was never paid for after a long gap", () => {
    const r = hold(startStretch(), T0, 30 * 60, true, 1000);
    const step = stretchStep(r.s, r.now + RULE.longGapMin * MIN, true);
    expect(step.stretch.owedMs).toBe(0);
  });
  it("counts two look-aways with screen work between them as two breaks", () => {
    let r = hold(startStretch(), T0, 60, true), n = 0;
    r = hold(r.s, r.now, 25, false); n += r.taken.length;
    r = hold(r.s, r.now, 60, true);
    r = hold(r.s, r.now, 25, false); n += r.taken.length;
    expect(n).toBe(2);
  });
  it("counts no screen time and no break across a gap with no pictures", () => {
    let r = hold(startStretch(), T0, 600, true);
    const before = r.s.screenMs;
    /* two minutes with no pictures, then the member is there again */
    const step = stretchStep(r.s, r.now + 2 * MIN, true);
    expect(step.taken).toBeNull();
    expect(step.restarted).toBe(false);
    expect(step.stretch.screenMs).toBe(before);
    /* a look-away that began before a gap is timed again from after the gap */
    r = hold(r.s, r.now, 10, false);
    const after = stretchStep(r.s, r.now + 60_000, false);
    expect(after.taken).toBeNull();
    expect(after.stretch.away?.since).toBe(r.now + 60_000);
  });
  it("starts from zero after a long gap, with no break counted: nobody knows what happened in it", () => {
    const r = hold(startStretch(), T0, 900, true);
    const step = stretchStep(r.s, r.now + RULE.longGapMin * MIN, true);
    expect(step.restarted).toBe(true);
    expect(step.taken).toBeNull();
    expect(step.stretch.screenMs).toBe(0);
    /* the same when the clock jumps backwards */
    expect(stretchStep(r.s, r.now - 10_000, true).restarted).toBe(true);
  });
  it("ends a break timed by hand after 20 seconds by the clock, with or without pictures, and marks it not seen", () => {
    let r = hold(startStretch(), T0, 120, true);
    const s = startTimed(r.s, r.now);
    expect(stretchStep(s, r.now + 10_000, null).taken).toBeNull();
    const done = stretchStep(s, r.now + 20_000, null);
    expect(done.taken).toMatchObject({ at: r.now, seen: false, due: false, earned: false });
    expect(done.stretch.timed).toBeNull();
    expect(done.stretch.screenMs).toBe(0);
    /* with the member in view the whole time, screen time does not run during the break */
    r = hold(s, r.now, 19, true);
    expect(r.s.screenMs).toBe(s.screenMs);
    expect(r.taken).toEqual([]);
  });
  it("counts one break, not two, when the camera also sees the member look away during a timed break", () => {
    let r = hold(startStretch(), T0, 120, true);
    r = hold(startTimed(r.s, r.now), r.now, 60, false);
    expect(r.taken).toHaveLength(1);
    r = hold(r.s, r.now, 60, false);
    expect(r.taken).toEqual([]);
  });
  it("forgets a timed break the member stopped", () => {
    const r = hold(startStretch(), T0, 60, true);
    const s = stopTimed(startTimed(r.s, r.now));
    expect(stretchStep(s, r.now + 30_000, null).taken).toBeNull();
  });
});

const frame = (o: Partial<FrameNumbers> = {}): FrameNumbers => ({ coverMs: 66, atScreen: true, distanceCm: 55, level: true, leaning: false, blink: null, blinkMs: 66, ...o });
const minute = (n: number, o: Partial<FrameNumbers> = {}, at = T0) => { const acc = startMinute(at); for (let i = 0; i < n; i++) addFrame(acc, frame(o)); return acc; };

describe("one minute of numbers", () => {
  it("starts on the clock minute", () => {
    expect(minuteOf(T0 + 59_999)).toBe(T0);
    expect(startMinute(T0 + 31_000).at).toBe(T0);
  });
  it("gives the middle distance, the blink rate and the head-position share of a fully watched minute", () => {
    const acc = minute(900);
    for (let i = 0; i < 12; i++) addFrame(acc, frame({ coverMs: 0, blinkMs: 0, blink: i % 4 === 0 ? "half" : "full", distanceCm: null, level: null }));
    const s = closeMinute(acc, 7 * MIN)!;
    expect(s.distanceCm).toBe(55);
    expect(s.blinksPerMin).toBeCloseTo(12.1, 0);
    expect(s.halfBlinksPerMin).toBeCloseTo(3, 0);
    expect(s.posture).toBe(1);
    expect(s.tilted).toBe(0);
    expect(s.minutesSinceBreak).toBe(7);
    expect(s.faceSeconds).toBeCloseTo(59.4, 1);
    expect(minuteInput.safeParse({ at: s.at, faceSeconds: s.faceSeconds, distanceCm: s.distanceCm, blinksPerMin: s.blinksPerMin, halfBlinksPerMin: s.halfBlinksPerMin, posture: s.posture, minutesSinceBreak: s.minutesSinceBreak, prompt: s.prompt }).success).toBe(true);
  });
  it("is not measured when too little of it was watched", () => {
    expect(closeMinute(minute(600), 0)).toBeNull();                       // 39.6 s watched
    expect(closeMinute(minute(60, { coverMs: 0, blinkMs: 0 }), 0)).toBeNull(); // pictures, but each after a gap
    expect(closeMinute(startMinute(T0), 0)).toBeNull();
  });
  it("is not measured when a face was in view for too little of it", () => {
    const acc = minute(700, { atScreen: false, distanceCm: null, level: null, blinkMs: 0 });
    for (let i = 0; i < 200; i++) addFrame(acc, frame());
    expect(acc.faceMs / 1000).toBeLessThan(RULE.minuteFaceSec);
    expect(closeMinute(acc, 0)).toBeNull();
  });
  it("leaves out the distance when too few pictures carry one, and keeps the rest", () => {
    const acc = minute(900, { distanceCm: null });
    for (let i = 0; i < RULE.minuteReadings - 1; i++) addFrame(acc, frame({ coverMs: 0, blinkMs: 0, level: null, distanceCm: 48 }));
    const s = closeMinute(acc, 0)!;
    expect(s.distanceCm).toBeNull();
    expect(s.posture).toBe(1);
    expect(s.blinksPerMin).toBe(0);
  });
  it("leaves out the blink numbers when blinks could not be watched for most of the minute", () => {
    const s = closeMinute(minute(60, { coverMs: 1000, blinkMs: 0 }), 0)!;   // one picture a second
    expect(s.blinksPerMin).toBeNull();
    expect(s.halfBlinksPerMin).toBeNull();
    expect(s.distanceCm).toBe(55);
  });
  it("scales a blink count to a whole minute of watching", () => {
    const acc = minute(900, { blinkMs: 44 });                             // blinks watchable for 39.6 s: too little
    expect(closeMinute(acc, 0)!.blinksPerMin).toBeNull();
    const half = minute(900, { blinkMs: 50 });                            // 45 s
    for (let i = 0; i < 6; i++) addFrame(half, frame({ coverMs: 0, blinkMs: 0, blink: "full", level: null, distanceCm: null }));
    expect(closeMinute(half, 0)!.blinksPerMin).toBe(8);
  });
  it("counts a picture as good posture only when the head is level and not leaning in", () => {
    const acc = minute(300);
    for (let i = 0; i < 300; i++) addFrame(acc, frame({ level: false }));
    for (let i = 0; i < 300; i++) addFrame(acc, frame({ leaning: true }));
    const s = closeMinute(acc, 0)!;
    expect(s.posture).toBeCloseTo(1 / 3, 2);
    expect(s.tilted).toBeCloseTo(1 / 3, 2);
    /* with no distance, leaning is unknown and a level head is good */
    expect(closeMinute(minute(900, { leaning: null }), 0)!.posture).toBe(1);
  });
});

const sample = (i: number, o: Partial<MinuteSample> = {}): MinuteSample => ({
  at: T0 + i * MIN, watchedSeconds: 60, faceSeconds: 60, distanceCm: 55, blinksPerMin: 12, halfBlinksPerMin: 2, posture: 1, tilted: 0, minutesSinceBreak: i, prompt: null, ...o,
});
const run = (n: number, o: Partial<MinuteSample>, from = 0) => Array.from({ length: n }, (_, i) => sample(from + i, o));

describe("coaching prompts are called for by minutes in a row", () => {
  it("sit back: three minutes in a row closer than the prompt distance", () => {
    expect(coachingFor(run(3, { distanceCm: 41 }))).toEqual(["close"]);
    expect(coachingFor(run(2, { distanceCm: 41 }))).toEqual([]);
    expect(coachingFor([...run(2, { distanceCm: 41 }), sample(2, { distanceCm: 47 })])).toEqual([]);
    expect(coachingFor([...run(2, { distanceCm: 41 }), sample(2, { distanceCm: null })])).toEqual([]);
  });
  it("does not join minutes across a missing minute", () => {
    expect(coachingFor([sample(0, { distanceCm: 41 }), sample(1, { distanceCm: 41 }), sample(3, { distanceCm: 41 })])).toEqual([]);
  });
  it("blink: five minutes in a row under five blinks, each with a blink number", () => {
    expect(coachingFor(run(5, { blinksPerMin: 3 }))).toEqual(["blink"]);
    expect(coachingFor(run(5, { blinksPerMin: null, halfBlinksPerMin: null }))).toEqual([]);
    expect(coachingFor([...run(4, { blinksPerMin: 3 }), sample(4, { blinksPerMin: 6 })])).toEqual([]);
    expect(coachingFor(run(5, { blinksPerMin: RULE.lowBlinks }))).toEqual([]);
  });
  it("tilt: five minutes in a row with the head off level for most of each", () => {
    expect(coachingFor(run(5, { tilted: 0.8 }))).toEqual(["tilt"]);
    expect(coachingFor(run(5, { tilted: 0.4 }))).toEqual([]);
  });
  it("lists the most pressing first", () => {
    expect(coachingFor(run(5, { distanceCm: 40, blinksPerMin: 2, tilted: 0.9 }))).toEqual(["close", "blink", "tilt"]);
  });
});

describe("prompts on show", () => {
  const base = { due: false, away: false, prefs: ALL_PROMPTS };
  const show = (p: PromptState, now: number, i: Partial<Parameters<typeof promptStep>[2]> = {}) => promptStep(p, now, { ...base, ...i });

  it("shows nothing when nothing is due", () => {
    expect(show(startPrompts(), T0)).toEqual({ prompts: startPrompts(), appeared: null });
  });
  it("shows the break prompt when a break is due, once, and keeps it until the break is taken", () => {
    const a = show(startPrompts(), T0, { due: true });
    expect(a.appeared).toBe("break");
    const b = show(a.prompts, T0 + 10 * MIN, { due: true });
    expect(b.appeared).toBeNull();
    expect(b.prompts.showing?.kind).toBe("break");
    const c = show(b.prompts, T0 + 11 * MIN, { due: false });
    expect(c.prompts.showing).toBeNull();
  });
  it("puts the break prompt off for five minutes on Later, then brings it back if the break is still due", () => {
    const a = show(startPrompts(), T0, { due: true });
    const later = putOff(a.prompts, T0 + 5000);
    expect(later.showing).toBeNull();
    expect(show(later, T0 + 4 * MIN, { due: true }).appeared).toBeNull();
    expect(show(later, T0 + 5000 + RULE.laterMin * MIN, { due: true }).appeared).toBe("break");
  });
  it("does not show a break prompt to someone who is looking away, or when break prompts are switched off", () => {
    expect(show(startPrompts(), T0, { due: true, away: true }).appeared).toBeNull();
    expect(show(startPrompts(), T0, { due: true, prefs: { ...ALL_PROMPTS, break: false } }).appeared).toBeNull();
  });
  it("shows one coaching prompt, and takes it away by itself", () => {
    const a = show(startPrompts(), T0, { coaching: ["close", "blink"] });
    expect(a.appeared).toBe("close");
    expect(show(a.prompts, T0 + 30_000, { coaching: ["blink"] }).appeared).toBeNull();
    const gone = show(a.prompts, T0 + RULE.coachSeconds * 1000);
    expect(gone.prompts.showing).toBeNull();
    expect(gone.prompts.lastClosed).toBe(T0 + RULE.coachSeconds * 1000);
  });
  it("never repeats a coaching prompt within 20 minutes, and keeps quiet for five minutes after any prompt", () => {
    let p = show(startPrompts(), T0, { coaching: ["close"] }).prompts;
    p = putOff(p, T0 + 10_000);
    /* another kind, two minutes later: still the quiet time */
    expect(show(p, T0 + 2 * MIN, { coaching: ["close", "blink"] }).appeared).toBeNull();
    /* after the quiet time the other kind may come; the same kind may not */
    expect(show(p, T0 + 6 * MIN, { coaching: ["close", "blink"] }).appeared).toBe("blink");
    expect(show(p, T0 + 6 * MIN, { coaching: ["close"] }).appeared).toBeNull();
    expect(show(p, T0 + 19 * MIN, { coaching: ["close"] }).appeared).toBeNull();
    expect(show(p, T0 + RULE.sameKindMin * MIN, { coaching: ["close"] }).appeared).toBe("close");
  });
  it("leaves out a coaching prompt that is switched off", () => {
    expect(show(startPrompts(), T0, { coaching: ["close", "tilt"], prefs: { ...ALL_PROMPTS, close: false } }).appeared).toBe("tilt");
  });
  it("lets the break prompt take the place of a coaching prompt, and never shows two", () => {
    const a = show(startPrompts(), T0, { coaching: ["blink"] });
    const b = show(a.prompts, T0 + 20_000, { due: true, coaching: ["close"] });
    expect(b.appeared).toBe("break");
    expect(b.prompts.showing?.kind).toBe("break");
    expect(show(b.prompts, T0 + 21 * MIN, { due: true, coaching: ["close"] }).appeared).toBeNull();
  });
  it("does not coach someone who is looking away", () => {
    expect(show(startPrompts(), T0, { away: true, coaching: ["close"] }).appeared).toBeNull();
  });
});

describe("what the server accepts", () => {
  const good = { at: T0, faceSeconds: 58, distanceCm: 52.5, blinksPerMin: 11, halfBlinksPerMin: 2, posture: 0.9, minutesSinceBreak: 12.5, prompt: null };
  it("takes a measured minute, with or without each number", () => {
    expect(minuteInput.safeParse(good).success).toBe(true);
    expect(minuteInput.safeParse({ ...good, distanceCm: null, blinksPerMin: null, halfBlinksPerMin: null, posture: null, prompt: "break" }).success).toBe(true);
  });
  it("refuses numbers outside their ranges", () => {
    for (const bad of [
      { distanceCm: 5 }, { distanceCm: 900 }, { blinksPerMin: -1 }, { blinksPerMin: 200 }, { posture: 1.2 }, { posture: -0.1 },
      { minutesSinceBreak: -1 }, { minutesSinceBreak: 5000 }, { faceSeconds: 3 }, { faceSeconds: 90 }, { at: T0 + 1 }, { at: 1.5 }, { prompt: "stress" },
      { halfBlinksPerMin: 14 }, { halfBlinksPerMin: null }, { distanceCm: "50" }, { distanceCm: NaN },
    ]) expect(minuteInput.safeParse({ ...good, ...bad }).success, JSON.stringify(bad)).toBe(false);
  });
  it("refuses anything that is not one of the numbers: no picture, no points, no free text can ride along", () => {
    expect(minuteInput.safeParse({ ...good, image: "data:image/png;base64,AAAA" }).success).toBe(false);
    expect(minuteInput.safeParse({ ...good, landmarks: [[0.1, 0.2, 0.3]] }).success).toBe(false);
    expect(minuteInput.safeParse({ ...good, profileId: "someone-else" }).success).toBe(false);
    expect(breakInput.safeParse({ at: T0, seen: true, due: false, earned: false, note: "x" }).success).toBe(false);
    expect(breakInput.safeParse({ at: T0, seen: true, due: false }).success).toBe(false);
    expect(breakInput.safeParse({ at: T0, seen: true, due: false, earned: false }).success).toBe(true);
  });
  it("takes a minute only once it is over, not long after, and not from before the run began", () => {
    const started = T0 - 30_000;
    expect(minuteInTime(T0, T0 + MIN + 2000, started)).toBe(true);
    expect(minuteInTime(T0, T0 + 20_000, started)).toBe(false);            // the minute is still running
    expect(minuteInTime(T0, T0 + 16 * MIN, started)).toBe(false);           // too old
    expect(minuteInTime(T0 - 5 * MIN, T0 + MIN, started)).toBe(false);      // before the run
    expect(minuteInTime(T0 + 10 * MIN, T0 + MIN, started)).toBe(false);     // the future
  });
  it("takes a break only after its 20 seconds have passed", () => {
    expect(breakInTime(T0, T0 + 21_000, T0 - MIN)).toBe(true);
    expect(breakInTime(T0, T0 + 3000, T0 - MIN)).toBe(false);
    expect(breakInTime(T0, T0 + 16 * MIN, T0 - MIN)).toBe(false);
    expect(breakInTime(T0, T0 + 30_000, T0 + 5 * MIN)).toBe(false);
  });
  it("keeps the ranges it promises", () => {
    expect(RANGE.distanceCm).toEqual([15, 200]);
    expect(RANGE.faceSeconds[0]).toBe(RULE.minuteFaceSec);
  });
});

describe("a monitor break and the Rest ring", () => {
  it("counts when no other break counted within 20 minutes", () => {
    expect(ringDecision(T0, [])).toBe("count");
    expect(ringDecision(T0, [{ at: T0 - 25 * MIN, monitor: true, counted: true }])).toBe("count");
    expect(ringDecision(T0, [{ at: T0 - 5 * MIN, monitor: true, counted: false }])).toBe("count");
  });
  it("is kept without moving the ring when a break counted less than 20 minutes away, from the monitor or a companion", () => {
    expect(ringDecision(T0, [{ at: T0 - 12 * MIN, monitor: true, counted: true }])).toBe("soon");
    expect(ringDecision(T0, [{ at: T0 - 12 * MIN, monitor: false, counted: true }])).toBe("soon");
    expect(ringDecision(T0, [{ at: T0 + 7 * MIN, monitor: false, counted: true }])).toBe("soon");
  });
  it("is the same look-away when a companion logged a break that began within two minutes of it, or the page sent it twice", () => {
    expect(ringDecision(T0, [{ at: T0 + 40_000, monitor: false, counted: true }])).toBe("same");
    expect(ringDecision(T0, [{ at: T0 - 90_000, monitor: false, counted: false }])).toBe("same");
    expect(ringDecision(T0, [{ at: T0, monitor: true, counted: true }])).toBe("same");
    expect(ringDecision(T0, [{ at: T0 - 90_000, monitor: true, counted: true }])).toBe("soon");
  });
});

describe("who may use it", () => {
  it("is for grown-ups: no child profile, and no adult profile with an age under 18", () => {
    expect(ADULT_AGE).toBe(18);
    expect(isAdultProfile({ kind: "adult" }, null)).toBe(true);
    expect(isAdultProfile({ kind: "adult" }, 34)).toBe(true);
    expect(isAdultProfile({ kind: "adult" }, 16)).toBe(false);
    expect(isAdultProfile({ kind: "child" }, 6)).toBe(false);
    expect(isAdultProfile({ kind: "child" }, null)).toBe(false);
  });
});

describe("the day in India", () => {
  it("agrees with the app's day key, at any hour", () => {
    const india = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
    for (const at of [T0, Date.UTC(2026, 9, 5, 18, 29, 59), Date.UTC(2026, 9, 5, 18, 30, 0), Date.UTC(2026, 0, 1, 0, 0, 0), Date.UTC(2026, 5, 30, 23, 59, 0)]) {
      expect(dayKeyOf(at)).toBe(india(new Date(at)));
    }
    expect(minuteOfDay(Date.UTC(2026, 9, 5, 18, 30, 0))).toBe(0);
    expect(minuteOfDay(Date.UTC(2026, 9, 5, 4, 0, 0))).toBe(9 * 60 + 30);
  });
});

const row = (minuteOfDayIndia: number, o: Partial<SampleRow> = {}): SampleRow => ({
  at: Date.UTC(2026, 9, 4, 18, 30, 0) + minuteOfDayIndia * MIN, distanceCm: 56, blinksPerMin: 10, halfBlinksPerMin: 2, posture: 0.9, faceSeconds: 60, prompt: null, ...o,
});

describe("what the member sees afterwards", () => {
  it("puts a day into ten-minute bins from its first measured hour to its last, and leaves unmeasured bins empty", () => {
    const samples = [...Array.from({ length: 10 }, (_, i) => row(9 * 60 + 30 + i)), ...Array.from({ length: 4 }, (_, i) => row(11 * 60 + 5 + i, { distanceCm: 44 }))];
    const { from, to, bins } = dayBins(samples, []);
    expect([from, to]).toEqual([9, 12]);
    expect(bins).toHaveLength(18);
    expect(bins[0]).toMatchObject({ start: 540, measured: 0, distanceCm: null, blinksPerMin: null });
    expect(bins[3]).toMatchObject({ start: 570, measured: 10, distanceCm: 56, blinksPerMin: 10 });
    expect(bins[12]).toMatchObject({ start: 660, measured: 4, distanceCm: 44 });
    expect(bins.filter((b) => b.measured === 0)).toHaveLength(16);
  });
  it("gives a bin no figure when fewer than three of its minutes carry one", () => {
    const { bins } = dayBins([row(600), row(601), row(602, { distanceCm: null })], []);
    expect(bins[0].measured).toBe(3);
    expect(bins[0].distanceCm).toBeNull();
    expect(bins[0].blinksPerMin).toBe(10);
  });
  it("places breaks that fell due and breaks taken in their bins", () => {
    const samples = [row(600, { prompt: "break" }), row(601), row(602)];
    const breaks = [{ at: row(603).at, counted: true, due: true, seen: true }, { at: row(641).at, counted: false, due: false, seen: true }];
    const { bins } = dayBins(samples, breaks, [10, 11]);
    expect(bins[0]).toMatchObject({ due: 1, taken: 1 });
    expect(bins[4]).toMatchObject({ due: 0, taken: 1, measured: 0 });
  });
  it("adds a day up: minutes, middle values, breaks due and taken", () => {
    const samples = [
      ...Array.from({ length: 30 }, (_, i) => row(600 + i, { distanceCm: 58 })),
      ...Array.from({ length: 10 }, (_, i) => row(640 + i, { distanceCm: 43, blinksPerMin: null, halfBlinksPerMin: null, prompt: i === 0 ? "break" : null })),
      row(700, { prompt: "break" }),
    ];
    const breaks = [{ at: row(652).at, counted: true, due: true, seen: true }, { at: row(615).at, counted: false, due: false, seen: false }];
    const t = dayTotals(samples, breaks);
    expect(t).toMatchObject({ measured: 41, distanceCm: 58, blinksPerMin: 10, closeMinutes: 10, distanceMinutes: 41, due: 2, taken: 1, early: 1, counted: 1 });
    expect(t.halfShare).toBeCloseTo(0.2, 2);
    expect(t.posture).toBeCloseTo(0.9, 2);
  });
  it("has nothing to say about a day with no samples, and never shows more breaks taken than fell due", () => {
    expect(dayTotals([], [])).toMatchObject({ measured: 0, distanceCm: null, blinksPerMin: null, halfShare: null, posture: null, due: 0, taken: 0 });
    expect(dayTotals([row(600)], [{ at: row(601).at, counted: true, due: true, seen: true }])).toMatchObject({ due: 1, taken: 1 });
  });
});
