// Eyes Opener: Noon in India on a day key, so a test never sits on a day boundary by accident. .
import { describe, expect, it } from "vitest";
import {
  BASELINE_MAX_AGE_DAYS, FOLLOWUP_OPEN_DAYS, MIN_FINISHED_PER_GROUP,
  addDays, changeOf, countingEye, dayKey, dayNumber, daysBetween, earnedStep, enough, lean, mean, notCounted, pickAfter, pickBefore, pool,
  poolValue, sameSetup, scheduleOf, sd, setupDiff, sittings, stageOf, t975, welch,
  type Course, type Pair, type Reading, type Screen, type TestRule,
} from "./experiments";

/** Noon in India on a day key, so a test never sits on a day boundary by accident. */
const at = (day: string, hour = 12) => new Date(`${day}T${String(hour).padStart(2, "0")}:00:00+05:30`);

const acuity: TestRule = { unit: "logMAR", perEye: true, lowerIsBetter: true, onScreen: true };
const contrast: TestRule = { unit: "logCS", perEye: true, lowerIsBetter: false, onScreen: true };
const depth: TestRule = { unit: "arcsec", perEye: false, lowerIsBetter: true, onScreen: true };
const survey: TestRule = { unit: "score", perEye: false, lowerIsBetter: true, onScreen: false };

const screen: Screen = { id: "screen-1", pxPerCm: 37.8, distanceCm: 60, calibratedAt: at("2026-09-01") };
let n = 0;
const row = (day: string, value: number, more: Partial<Reading> = {}): Reading =>
  ({ id: `r${++n}`, takenAt: at(day), eye: null, value, note: null, deviceId: screen.id, ...more });
/** One run of a check-up that measures each eye. */
const eyes = (day: string, left: number, right: number, more: Partial<Reading> = {}): Reading[] =>
  [row(day, left, { eye: "left", ...more }), row(day, right, { eye: "right", ...more })];

describe("days", () => {
  it("names a moment by its day in India", () => {
    expect(dayKey(new Date("2026-10-05T18:29:00Z"))).toBe("2026-10-05");
    expect(dayKey(new Date("2026-10-05T18:31:00Z"))).toBe("2026-10-06");
  });
  it("adds and counts days across a month end", () => {
    expect(addDays("2026-10-28", 7)).toBe("2026-11-04");
    expect(daysBetween("2026-10-28", "2026-11-04")).toBe(7);
    expect(daysBetween("2026-11-04", "2026-10-28")).toBe(-7);
  });
});

describe("the course of an enrolment", () => {
  const fresh: Course = { leftAt: null, startedAt: null, baselineId: null, followupId: null, finishedAt: null };
  const started: Course = { ...fresh, startedAt: at("2026-10-01"), baselineId: "b" };

  it("is due weeks times seven days after the day the before check-up was tied, and stays open for the window", () => {
    const s = scheduleOf(at("2026-10-01"), 4);
    expect(s).toEqual({ startDay: "2026-10-01", dueDay: "2026-10-29", lastDay: addDays("2026-10-29", FOLLOWUP_OPEN_DAYS), totalDays: 28 });
    expect(s.lastDay).toBe("2026-11-05");
  });
  it("counts the days of the weeks from 1 and stops at the last", () => {
    const s = scheduleOf(at("2026-10-01"), 1);
    expect(dayNumber(s, at("2026-10-01"))).toBe(1);
    expect(dayNumber(s, at("2026-10-04"))).toBe(4);
    expect(dayNumber(s, at("2026-10-20"))).toBe(7);
  });
  it("waits for the before check-up until one is tied", () => {
    expect(stageOf(fresh, 4, at("2026-10-05"))).toBe("needs_before");
    /* a before check-up that was deleted sends the member back to the start */
    expect(stageOf({ ...started, baselineId: null }, 4, at("2026-10-05"))).toBe("needs_before");
  });
  it("is practising until the due day, due through the last day of the window, then missed", () => {
    expect(stageOf(started, 4, at("2026-10-28"))).toBe("practising");
    expect(stageOf(started, 4, at("2026-10-29"))).toBe("after_due");
    expect(stageOf(started, 4, at("2026-11-05", 23))).toBe("after_due");
    expect(stageOf(started, 4, at("2026-11-06", 1))).toBe("missed");
  });
  it("stays finished once finished, and leaving wins over everything", () => {
    const finished = { ...started, followupId: "f", finishedAt: at("2026-10-30") };
    expect(stageOf(finished, 4, at("2027-01-01"))).toBe("finished");
    expect(stageOf({ ...finished, leftAt: at("2026-11-02") }, 4, at("2027-01-01"))).toBe("left");
  });
});

describe("which eye counts", () => {
  it("is the eye that read worse at the before check-up", () => {
    expect(countingEye(0.5, 0.1, true, null)).toBe("left");     // letters: a larger logMAR is worse
    expect(countingEye(0.1, 0.5, true, null)).toBe("right");
    expect(countingEye(1.35, 1.65, false, null)).toBe("left");  // faint letters: a smaller logCS is worse
    expect(countingEye(1.65, 1.35, false, null)).toBe("right");
  });
  it("falls back to the profile's weaker eye, then to the left eye, when both read the same", () => {
    expect(countingEye(0.3, 0.3, true, "right")).toBe("right");
    expect(countingEye(0.3, 0.3, true, null)).toBe("left");
  });
});

describe("the same screen", () => {
  it("allows the small differences of measuring a screen twice", () => {
    expect(sameSetup({ pxPerCm: 37.8, distanceCm: 60 }, { pxPerCm: 38.9, distanceCm: 64 })).toBe(true);
  });
  it("does not allow a different distance or a different screen", () => {
    expect(sameSetup({ pxPerCm: 37.8, distanceCm: 60 }, { pxPerCm: 37.8, distanceCm: 50 })).toBe(false);
    expect(sameSetup({ pxPerCm: 37.8, distanceCm: 60 }, { pxPerCm: 15, distanceCm: 60 })).toBe(false);
  });
  it("says what differs, for telling the member", () => {
    expect(setupDiff({ pxPerCm: 37.8, distanceCm: 60 }, { pxPerCm: 37.8, distanceCm: 45 })).toEqual({ distance: true, size: false });
    expect(setupDiff({ pxPerCm: 37.8, distanceCm: 60 }, { pxPerCm: 15, distanceCm: 62 })).toEqual({ distance: false, size: true });
  });
  it("treats two check-ups away from the screen as alike, and a mixed pair as different", () => {
    expect(sameSetup(null, null)).toBe(true);
    expect(sameSetup(null, { pxPerCm: 37.8, distanceCm: 60 })).toBe(false);
  });
});

describe("the check-up before", () => {
  const now = at("2026-10-05");
  it("groups stored rows into runs, newest first", () => {
    const runs = sittings([...eyes("2026-10-01", 0.5, 0), ...eyes("2026-10-04", 0.4, 0)]);
    expect(runs.map((r) => [dayKey(r[0].takenAt), r.length])).toEqual([["2026-10-04", 2], ["2026-10-01", 2]]);
  });
  it("takes the latest run and the eye that read worse in it", () => {
    const picked = pickBefore(acuity, [...eyes("2026-09-30", 0.6, 0), ...eyes("2026-10-04", 0.5, 0.1)], screen, null, now);
    expect(picked.ok && [picked.reading.eye, picked.reading.value, picked.setup]).toEqual(["left", 0.5, { pxPerCm: 37.8, distanceCm: 60 }]);
    const faint = pickBefore(contrast, eyes("2026-10-04", 1.65, 1.35), screen, null, now);
    expect(faint.ok && faint.reading.eye).toBe("right");
  });
  it("accepts a run up to the allowed age and refuses an older one", () => {
    expect(pickBefore(depth, [row(addDays("2026-10-05", -BASELINE_MAX_AGE_DAYS), 120)], screen, null, now).ok).toBe(true);
    expect(pickBefore(depth, [row(addDays("2026-10-05", -BASELINE_MAX_AGE_DAYS - 1), 120)], screen, null, now)).toEqual({ ok: false, why: "too_old" });
  });
  it("says so when there is no run, or only a run from the future", () => {
    expect(pickBefore(depth, [], screen, null, now)).toEqual({ ok: false, why: "none" });
    expect(pickBefore(depth, [row("2026-10-06", 120)], screen, null, now)).toEqual({ ok: false, why: "none" });
  });
  it("refuses a result at the limit of the screen: a change could not be seen from there", () => {
    expect(pickBefore(depth, [row("2026-10-04", 40, { note: "floor" })], screen, null, now)).toEqual({ ok: false, why: "at_limit" });
    expect(pickBefore(acuity, eyes("2026-10-04", 1.3, 0, { note: "worse" }), screen, null, now)).toEqual({ ok: false, why: "at_limit" });
  });
  it("only minds the limit of the eye that counts", () => {
    const run = [row("2026-10-04", 0.5, { eye: "left" }), row("2026-10-04", -0.1, { eye: "right", note: "floor" })];
    expect(pickBefore(acuity, run, screen, null, now).ok).toBe(true);
  });
  it("refuses a run for one eye only", () => {
    expect(pickBefore(acuity, [row("2026-10-04", 0.5, { eye: "left" })], screen, null, now)).toEqual({ ok: false, why: "one_eye" });
  });
  it("refuses a run whose screen is not known: another screen, no screen, or a screen measured again since", () => {
    expect(pickBefore(depth, [row("2026-10-04", 120, { deviceId: "tv" })], screen, null, now)).toEqual({ ok: false, why: "screen_unknown" });
    expect(pickBefore(depth, [row("2026-10-04", 120)], null, null, now)).toEqual({ ok: false, why: "screen_unknown" });
    expect(pickBefore(depth, [row("2026-10-04", 120)], { ...screen, calibratedAt: at("2026-10-04", 18) }, null, now)).toEqual({ ok: false, why: "screen_unknown" });
  });
  it("needs no screen for a check-up done away from it", () => {
    const picked = pickBefore(survey, [row("2026-10-04", 27, { deviceId: null })], null, null, now);
    expect(picked.ok && picked.setup).toBeNull();
  });
});

describe("the check-up after", () => {
  const base = { pxPerCm: 37.8, distanceCm: 60 };
  const s = scheduleOf(at("2026-09-07"), 4); // due 5 October, open through 12 October
  const now = at("2026-10-12", 20);

  it("ignores a run before the due day or after the window", () => {
    expect(s.dueDay).toBe("2026-10-05");
    expect(pickAfter(depth, [row("2026-10-04", 100), row("2026-10-13", 90)], screen, null, base, s, at("2026-10-14"))).toEqual({ ok: false, why: "none" });
  });
  it("takes the first run inside the window, not the best one", () => {
    const picked = pickAfter(depth, [row("2026-10-08", 60), row("2026-10-06", 110), row("2026-10-11", 50)], screen, null, base, s, now);
    expect(picked.ok && picked.reading.value).toBe(110);
  });
  it("reads the eye of the before check-up, whatever the other eye did", () => {
    const picked = pickAfter(acuity, eyes("2026-10-06", 0.1, 0.4), screen, "left", base, s, now);
    expect(picked.ok && [picked.reading.eye, picked.reading.value]).toEqual(["left", 0.1]);
  });
  it("marks a run from a changed screen set-up as not comparable", () => {
    const moved = { ...screen, distanceCm: 45, calibratedAt: at("2026-10-05", 9) };
    const picked = pickAfter(depth, [row("2026-10-06", 110)], moved, null, base, s, now);
    expect(picked.ok && picked.comparable).toBe(false);
    expect(picked.ok && picked.setup).toEqual({ pxPerCm: 37.8, distanceCm: 45 });
  });
  it("counts the pair as comparable when the screen is as it was", () => {
    const picked = pickAfter(depth, [row("2026-10-06", 110)], screen, null, base, s, now);
    expect(picked.ok && picked.comparable).toBe(true);
  });
  it("cannot use a run taken before the screen was measured again", () => {
    const remeasured = { ...screen, calibratedAt: at("2026-10-07") };
    expect(pickAfter(depth, [row("2026-10-06", 110)], remeasured, null, base, s, now)).toEqual({ ok: false, why: "screen_unknown" });
    /* a later run on the re-measured screen is usable */
    expect(pickAfter(depth, [row("2026-10-06", 110), row("2026-10-08", 100)], remeasured, null, base, s, now).ok).toBe(true);
  });
  it("compares two survey runs with no screen at all", () => {
    const picked = pickAfter(survey, [row("2026-10-05", 19, { deviceId: null })], null, null, null, s, now);
    expect(picked.ok && picked.comparable).toBe(true);
  });
});

describe("one member's change", () => {
  it("is after minus before in the stored unit", () => {
    expect(changeOf("logMAR", 0.5, 0.3)).toBeCloseTo(-0.2, 10);
    expect(changeOf("score", 27, 19)).toBe(-8);
  });
  it("reads eye balance as the stronger eye's contrast in points out of 100, whichever way the ratio is signed", () => {
    expect(poolValue("log_ratio", -1)).toBeCloseTo(10, 10);
    expect(poolValue("log_ratio", 1)).toBeCloseTo(10, 10);
    expect(poolValue("log_ratio", 0)).toBe(100);
    /* from 10% to 15.8% of full contrast */
    expect(changeOf("log_ratio", -1, -0.8)).toBeCloseTo(5.849, 3);
  });
});

describe("what is counted", () => {
  const set = { pxPerCm: 37.8, distanceCm: 60 };
  const done: Pair = { leftAt: null, finishedAt: new Date(), before: 0.5, after: 0.4, base: set, follow: set, consent: true };
  it("counts a finished pair from the same screen", () => expect(notCounted(done)).toBeNull());
  it("never counts a member who left, even after finishing", () => expect(notCounted({ ...done, leftAt: new Date() })).toBe("left"));
  it("does not count an unfinished enrolment", () => expect(notCounted({ ...done, finishedAt: null, after: null })).toBe("not_finished"));
  it("does not count a child whose parent's permission was taken back", () => expect(notCounted({ ...done, consent: false })).toBe("no_consent"));
  it("does not count a pair with a result that is no longer stored", () => expect(notCounted({ ...done, before: null })).toBe("result_gone"));
  it("does not count a pair from a changed screen set-up", () => expect(notCounted({ ...done, follow: { pxPerCm: 37.8, distanceCm: 45 } })).toBe("screen_changed"));
  it("counts a pair taken away from the screen", () => expect(notCounted({ ...done, base: null, follow: null })).toBeNull());
});

describe("statistics", () => {
  /*
   * Hand-worked example. Changes in a symptom score:
   *   tried   −6 −4 −8 −2 −5   mean −5   squared distances from the mean 1 1 9 9 0 = 20   variance 20/4 = 5
   *   control −1  1 −3  0 −2   mean −1   squared distances from the mean 0 4 4 1 1 = 10   variance 10/4 = 2.5
   *   gap = −5 − (−1) = −4
   *   se  = √(5/5 + 2.5/5) = √1.5 = 1.2247
   *   df  = 1.5² / (1²/4 + 0.5²/4) = 2.25 / 0.3125 = 7.2
   *   t(0.975, 7.2) = 2.351 (between 2.365 at 7 and 2.306 at 8 in a t table)
   *   interval = −4 ± 2.351 × 1.2247 = −6.88 to −1.12
   */
  const tried = [-6, -4, -8, -2, -5], control = [-1, 1, -3, 0, -2];

  it("works out a mean and a sample standard deviation", () => {
    expect(mean(tried)).toBe(-5);
    expect(sd(tried)).toBeCloseTo(Math.sqrt(5), 10);
    expect(sd(control)).toBeCloseTo(Math.sqrt(2.5), 10);
    expect(sd([4])).toBe(0);
  });
  it("matches a printed t table", () => {
    expect(t975(4)).toBeCloseTo(2.776, 2);
    expect(t975(10)).toBeCloseTo(2.228, 3);
    expect(t975(29)).toBeCloseTo(2.045, 3);
    expect(t975(58)).toBeCloseTo(2.002, 3);
    expect(t975(120)).toBeCloseTo(1.98, 3);
    expect(t975(1e9)).toBeCloseTo(1.96, 3);
  });
  it("works out the gap and its 95% interval by Welch's method", () => {
    const g = welch(tried, control);
    expect(g.gap).toBe(-4);
    expect(g.se).toBeCloseTo(1.2247, 4);
    expect(g.df).toBeCloseTo(7.2, 10);
    expect(g.low).toBeCloseTo(-6.88, 2);
    expect(g.high).toBeCloseTo(-1.12, 2);
  });
  it("handles groups of different size and spread", () => {
    /*
     * a: 2 4 6        mean 4, variance (4+0+4)/2 = 4,      4/3 = 1.3333
     * b: 1 1 2 2 4    mean 2, variance (1+1+0+0+4)/4 = 1.5, 1.5/5 = 0.3
     * gap 2, se = √1.6333 = 1.2780, df = 1.6333² / (1.3333²/2 + 0.3²/4) = 2.6678 / 0.9114 = 2.927
     */
    const g = welch([2, 4, 6], [1, 1, 2, 2, 4]);
    expect(g.gap).toBe(2);
    expect(g.se).toBeCloseTo(1.278, 3);
    expect(g.df).toBeCloseTo(2.927, 3);
    expect(g.low).toBeLessThan(0);
    expect(g.high).toBeGreaterThan(4);
  });
  it("gives the gap itself when nobody's change differs", () => {
    expect(welch([-2, -2, -2], [0, 0, 0])).toMatchObject({ gap: -2, low: -2, high: -2 });
  });

  it("shows nothing until both groups reach the minimum", () => {
    expect(MIN_FINISHED_PER_GROUP).toBe(30);
    expect(pool(tried, control)).toBeNull();
    const many = (k: number, shift: number) => Array.from({ length: k }, (_, i) => shift + (i % 5) - 2);
    expect(pool(many(30, -5), many(29, -1))).toBeNull();
    expect(pool(many(29, -5), many(30, -1))).toBeNull();
    expect(enough(30, 30)).toBe(true);
    expect(enough(64, 29)).toBe(false);
    const p = pool(many(30, -5), many(30, -1));
    expect(p).toMatchObject({ nTried: 30, nControl: 30, changeTried: -5, changeControl: -1 });
    /* 30 values −2…2 six times each: variance 60/29, the same in both groups; df = 58; se = √(2 × 60/29/30) */
    const half = t975(58) * Math.sqrt((2 * 60) / 29 / 30);
    expect(p!.sdTried).toBeCloseTo(Math.sqrt(60 / 29), 10);
    expect(p!.low).toBeCloseTo(-4 - half, 10);
    expect(p!.high).toBeCloseTo(-4 + half, 10);
  });
  it("never pools a group of one, whatever minimum is asked for", () => {
    expect(pool([1], [2], 1)).toBeNull();
    expect(pool(tried, control, 5)).toMatchObject({ nTried: 5, nControl: 5, changeTried: -5, changeControl: -1 });
  });
});

describe("what the numbers support", () => {
  it("leans better only when the whole range is on the better side of zero", () => {
    expect(lean({ low: -6.88, high: -1.12 }, true)).toBe("better");   // a lower symptom score is better
    expect(lean({ low: 1.1, high: 6.9 }, false)).toBe("better");      // a wider fusion range is better
  });
  it("leans worse when the whole range is on the worse side", () => {
    expect(lean({ low: 1.1, high: 6.9 }, true)).toBe("worse");
    expect(lean({ low: -6.88, high: -1.12 }, false)).toBe("worse");
  });
  it("is unclear whenever the range reaches zero, however large the gap", () => {
    expect(lean({ low: -9, high: 0.2 }, true)).toBe("unclear");
    expect(lean({ low: 0, high: 5 }, false)).toBe("unclear");
    expect(lean({ low: -5, high: 0 }, true)).toBe("unclear");
  });
  it("earns the ladder steps from members and numbers, and never more than signal", () => {
    expect(earnedStep(false, 0)).toBe("protocol");
    expect(earnedStep(false, 3)).toBe("experiment");
    expect(earnedStep(true, 70)).toBe("signal");
  });
});
