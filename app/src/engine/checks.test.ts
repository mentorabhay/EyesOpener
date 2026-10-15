import { describe, it, expect } from "vitest";
import {
  median,
  DEPTH_MAX_REVERSALS, DEPTH_MAX_TRIALS, DEPTH_START_ARCSEC, answerDepth, depthLevels, depthOutcome, depthPassed, depthValue, offsetArcsec, pixelArcsec, startDepth,
  type DepthStair,
  FUSION_MAX, demandBack, demandOut, fusionLimit, fusionSummary, limitTry, prismOf, recordDemand, separationCm, separationPx,
  nearPoint,
  suppressionScore, unseenLens,
  SURVEY_TOP_SCORE, surveyTotal,
  ALERT_ACUITY_LOGMAR, ALERT_CONTRAST_LOGCS, ALERT_DEPTH_FACTOR, ALERT_FUSION_BREAK, ALERT_NEAR_POINT_CM, ALERT_SYMPTOM_POINTS, URGENT_ACUITY_LOGMAR,
  changeCheck, changedMoreThanUsual, hasChangeRule, needsDoctorSoon,
} from "./index";

const laptop = { ppc: 37.8, dist: 60 };
const phone = { ppc: 62, dist: 40 };
const tv = { ppc: 15, dist: 200 };

/** Plays a staircase with a list of answers; stops when it finishes. */
const play = (levels: number, answers: boolean[]) => answers.reduce((s, a) => answerDepth(s, a), startDepth(levels));
/** Plays a member who sees every offset down to `threshold` (a level index) and is wrong at anything finer. */
function playTo(levels: number, threshold: number): DepthStair {
  let s = startDepth(levels);
  while (s.result === null) s = answerDepth(s, s.level <= threshold);
  return s;
}

describe("median", () => {
  it("takes the middle of three whatever the order", () => {
    expect(median([9, 6, 14])).toBe(9);
    expect(median([6, 6, 14])).toBe(6);
    expect(median([3])).toBe(3);
  });
  it("takes the mean of the middle two for an even count", () => expect(median([4, 10, 8, 6])).toBe(7));
  it("does not change the list it is given", () => {
    const tries = [9, 6, 14];
    median(tries);
    expect(tries).toEqual([9, 6, 14]);
  });
  it("is NaN for nothing", () => expect(median([])).toBeNaN());
});

describe("depth: pixels to arcseconds", () => {
  it("gives the angle of one device pixel", () => {
    /* 1 / 37.8 cm at 60 cm is 1/2268 of a radian */
    expect(pixelArcsec(laptop)).toBeCloseTo(206264.8 / 2268, 1);
    expect(pixelArcsec(laptop)).toBeCloseTo(90.9, 1);
  });
  it("halves the angle on a screen with two device pixels to each CSS pixel", () => {
    expect(pixelArcsec(laptop, 2)).toBeCloseTo(pixelArcsec(laptop) / 2, 3);
  });
  it("makes the same offset a smaller angle from farther away", () => {
    expect(offsetArcsec({ ppc: 37.8, dist: 120 }, 4)).toBeCloseTo(offsetArcsec(laptop, 4) / 2, 1);
  });
  it("grows in step with the pixel count at these small angles", () => {
    expect(offsetArcsec(laptop, 18)).toBeCloseTo(18 * pixelArcsec(laptop), 0);
  });
  it("stores one decimal place", () => {
    expect(depthValue(laptop, 1)).toBe(90.9);
    expect(depthValue(laptop, 18)).toBe(1637);
  });
});

describe("depth: the offsets a screen shows", () => {
  it("starts at the pixel count nearest 1600 arcseconds and halves down to one pixel", () => {
    expect(depthLevels(laptop)).toEqual([18, 9, 4, 2, 1]);
    expect(depthLevels(phone, 2)).toEqual([38, 19, 9, 4, 2, 1]);
    expect(depthLevels(tv)).toEqual([23, 11, 5, 2, 1]);
  });
  it("starts close to 1600 arcseconds on every screen that can", () => {
    for (const [s, dpr] of [[laptop, 1], [laptop, 2], [phone, 2], [phone, 3], [tv, 1]] as const) {
      const first = offsetArcsec(s, depthLevels(s, dpr)[0], dpr);
      expect(Math.abs(first - DEPTH_START_ARCSEC)).toBeLessThanOrEqual(pixelArcsec(s, dpr) / 2 + 0.01);
    }
  });
  it("makes every step at least twice as fine as the one before", () => {
    for (const levels of [depthLevels(laptop), depthLevels(phone, 3), depthLevels(tv), depthLevels(laptop, 1, 13)]) {
      for (let i = 1; i < levels.length; i++) expect(levels[i - 1] / levels[i]).toBeGreaterThanOrEqual(2);
      expect(levels.at(-1)).toBe(1);
    }
  });
  it("never starts wider than the drawing has room for", () => {
    expect(depthLevels(laptop, 1, 10)).toEqual([10, 5, 2, 1]);
    expect(depthLevels(laptop, 1, 10.9)[0]).toBe(10);
  });
  it("still has one step on a coarse screen close up", () => {
    const coarse = { ppc: 10, dist: 30 };
    expect(pixelArcsec(coarse)).toBeGreaterThan(600);
    expect(depthLevels(coarse)).toEqual([2, 1]);
    expect(depthLevels(coarse, 1, 0)).toEqual([1]);
  });
});

describe("depth: the staircase", () => {
  it("goes finer only after two right in a row", () => {
    let s = answerDepth(startDepth(5), true);
    expect(s.level).toBe(0);
    s = answerDepth(s, true);
    expect(s.level).toBe(1);
    expect(s.streak).toBe(0);
  });
  it("goes coarser after one wrong", () => {
    const s = play(5, [true, true, true, true, false]);
    expect(s.level).toBe(1);
    expect(s.reversals).toBe(1);
  });
  it("breaks a run of right answers on a wrong one", () => {
    const s = play(5, [true, true, true, false]);
    expect(s.level).toBe(0);
    expect(s.streak).toBe(0);
  });
  it("counts a reversal only when the direction changes", () => {
    /* finer, finer, coarser (1), coarser, finer (2) */
    const s = play(6, [true, true, true, true, false, false, true, true]);
    expect(s.reversals).toBe(2);
    expect(s.level).toBe(1);
  });
  it("stops after six reversals at the finest offset with two of three right", () => {
    const s = playTo(5, 2);
    expect(s.reversals).toBe(DEPTH_MAX_REVERSALS);
    expect(s.result).toBe(2);
    expect(depthPassed(s, 2)).toBe(true);
    expect(depthPassed(s, 3)).toBe(false);
    expect(s.trials).toBeLessThan(DEPTH_MAX_TRIALS);
  });
  it("finds every threshold a steady member can have", () => {
    for (let threshold = 0; threshold < 5; threshold++) expect(playTo(6, threshold).result).toBe(threshold);
  });
  it("stops at one device pixel after two right there, and marks the floor", () => {
    const levels = depthLevels(laptop);
    const s = playTo(levels.length, levels.length - 1);
    expect(s.result).toBe(levels.length - 1);
    expect(s.trials).toBe(2 * levels.length);
    expect(depthOutcome(s, levels)).toEqual({ px: 1, note: "floor" });
  });
  it("stops after two wrong at the largest offset and stores it as worse", () => {
    const levels = depthLevels(laptop);
    const s = play(levels.length, [false, false]);
    expect(s.result).toBe(-1);
    expect(s.trials).toBe(2);
    expect(depthOutcome(s, levels)).toEqual({ px: 18, note: "worse" });
  });
  it("stops after two wrong in a row at the largest offset, keeping what was passed before", () => {
    /* three levels passed, then nothing is seen any more */
    const s = play(5, [true, true, true, true, true, true, false, false, false, false, false]);
    expect(s.result).toBe(2);
    expect(s.trials).toBe(11);
    expect(depthOutcome(s, depthLevels(laptop))).toEqual({ px: 4, note: "" });
  });
  it("does not stop for two wrong answers at the largest offset that are not in a row, once something passed", () => {
    const s = play(5, [true, true, false, false, true, true, false, false]);
    expect(s.level).toBe(0);
    expect(s.stuck).toBe(1);
    expect(s.result).toBeNull();
  });
  it("keeps going at the largest offset after one wrong answer", () => {
    const s = play(5, [false, true, true]);
    expect(s.result).toBeNull();
    expect(s.level).toBe(1);
  });
  it("does not call the largest offset passed on two of four", () => {
    const s = play(5, [true, false, true, false]);
    expect(s.result).toBe(-1);
  });
  it("counts two of three at a level as passed, and two of four as not", () => {
    const base = startDepth(3);
    expect(depthPassed({ ...base, right: [2, 0, 0], seen: [2, 0, 0] }, 0)).toBe(true);
    expect(depthPassed({ ...base, right: [2, 0, 0], seen: [3, 0, 0] }, 0)).toBe(true);
    expect(depthPassed({ ...base, right: [2, 0, 0], seen: [4, 0, 0] }, 0)).toBe(false);
    expect(depthPassed({ ...base, right: [1, 0, 0], seen: [1, 0, 0] }, 0)).toBe(false);
    expect(depthPassed({ ...base, right: [4, 0, 0], seen: [6, 0, 0] }, 0)).toBe(true);
  });
  it("never runs past thirty trials, whatever the answers", () => {
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let run = 0; run < 300; run++) {
      const levels = 1 + Math.floor(rand() * 7), chance = rand();
      let s = startDepth(levels), guard = 0;
      while (s.result === null && guard++ < 100) s = answerDepth(s, rand() < chance);
      expect(s.result).not.toBeNull();
      expect(s.trials).toBeLessThanOrEqual(DEPTH_MAX_TRIALS);
      expect(s.reversals).toBeLessThanOrEqual(DEPTH_MAX_REVERSALS);
      expect(s.result!).toBeGreaterThanOrEqual(-1);
      expect(s.result!).toBeLessThan(levels);
      if (s.result! >= 0) expect(depthPassed(s, s.result!)).toBe(true);
    }
  });
  it("ignores answers after it has finished", () => {
    const done = play(5, [false, false]);
    expect(answerDepth(done, true)).toBe(done);
  });
  it("does not change the state it is given", () => {
    const s = startDepth(4);
    answerDepth(s, true);
    expect(s).toEqual(startDepth(4));
  });
  it("gives the plain result in the middle of the range", () => {
    const levels = depthLevels(laptop);
    expect(depthOutcome(playTo(levels.length, 2), levels)).toEqual({ px: 4, note: "" });
  });
  it("works with a single offset", () => {
    expect(depthOutcome(play(1, [true, true]), [1])).toEqual({ px: 1, note: "floor" });
    expect(depthOutcome(play(1, [false, false]), [1])).toEqual({ px: 1, note: "worse" });
    expect(depthOutcome(play(1, [false, true, true]), [1])).toEqual({ px: 1, note: "floor" });
  });
});

describe("fusion range: separation to prism dioptres", () => {
  it("counts one centimetre at one metre as one prism dioptre", () => {
    expect(prismOf(1, 100)).toBe(1);
    expect(prismOf(6, 60)).toBe(10);
    expect(prismOf(1, 40)).toBe(2.5);
  });
  it("turns a demand back into the same separation", () => {
    expect(separationCm(10, 60)).toBe(6);
    for (const dist of [33, 40, 60, 200]) expect(prismOf(separationCm(7.5, dist), dist)).toBeCloseTo(7.5, 9);
  });
  it("gives the separation in whole device pixels", () => {
    expect(separationPx(laptop, 10)).toBe(227);
    expect(separationPx(laptop, 10, 2)).toBe(454);
    expect(separationPx(laptop, 0)).toBe(0);
    expect(Number.isInteger(separationPx(phone, 3.3, 3))).toBe(true);
  });
  it("limits the demand to 40% of the panel width", () => {
    /* a 720 px panel is 19.05 cm; 40% is 7.62 cm; at 60 cm that is 12.7, rounded down to 12.5 */
    expect(fusionLimit(laptop, 720)).toBe(12.5);
    expect(fusionLimit(phone, 330)).toBe(5);
    expect(separationCm(fusionLimit(laptop, 720), 60) * laptop.ppc).toBeLessThanOrEqual(0.4 * 720);
  });
  it("never goes past 30 however large the screen", () => {
    expect(fusionLimit({ ppc: 37.8, dist: 30 }, 4000)).toBe(FUSION_MAX);
  });
  it("moves at one prism dioptre a second and stops at the limit", () => {
    expect(demandOut(0, 12)).toBe(0);
    expect(demandOut(4.5, 12)).toBe(4.5);
    expect(demandOut(40, 12)).toBe(12);
    expect(demandOut(-1, 12)).toBe(0);
  });
  it("moves back at the same rate and stops at zero", () => {
    expect(demandBack(9, 0)).toBe(9);
    expect(demandBack(9, 3.5)).toBe(5.5);
    expect(demandBack(9, 20)).toBe(0);
    expect(demandBack(9, -2)).toBe(9);
  });
  it("records to the nearest half", () => {
    expect(recordDemand(8.26)).toBe(8.5);
    expect(recordDemand(8.24)).toBe(8);
  });
});

describe("fusion range: the stored results", () => {
  const tried = (b: number, r: number) => ({ break: b, recovery: r, atLimit: false });
  it("stores the median break and the median recovery", () => {
    const s = fusionSummary([tried(9, 6), tried(11, 4), tried(8, 5)], 12.5);
    expect(s.break).toEqual({ value: 9, note: "" });
    expect(s.recovery).toEqual({ value: 5, note: "" });
  });
  it("takes each median on its own, not from the same repeat", () => {
    const s = fusionSummary([tried(12, 2), tried(6, 5), tried(9, 8)], 12.5);
    expect(s.break.value).toBe(9);
    expect(s.recovery.value).toBe(5);
  });
  it("marks the floor when the screen ran out of room in most repeats", () => {
    const s = fusionSummary([limitTry(12.5), tried(10, 7), limitTry(12.5)], 12.5);
    expect(s.break).toEqual({ value: 12.5, note: "floor" });
    expect(s.recovery).toEqual({ value: 12.5, note: "floor" });
  });
  it("does not mark the floor for one repeat at the limit", () => {
    const s = fusionSummary([limitTry(12.5), tried(10, 7), tried(9, 6)], 12.5);
    expect(s.break).toEqual({ value: 10, note: "" });
    expect(s.recovery).toEqual({ value: 7, note: "" });
  });
  it("stores zero when the picture never joined again", () => {
    expect(fusionSummary([tried(6, 0), tried(7, 0), tried(5, 2)], 12.5).recovery).toEqual({ value: 0, note: "" });
  });
});

describe("near point", () => {
  it("stores the median of three tries", () => {
    expect(nearPoint([8, 12, 9])).toBe(9);
    expect(nearPoint([6.5, 6, 20])).toBe(6.5);
  });
});

describe("suppression check", () => {
  it("scores four dots 0, five dots 1, two or three dots 2", () => {
    expect([2, 3, 4, 5].map((d) => suppressionScore(d as 2 | 3 | 4 | 5))).toEqual([2, 2, 0, 1]);
  });
  it("names the lens of the eye whose picture was not seen", () => {
    /* two dots are the red one and the white one: only the red-lens eye saw anything */
    expect(unseenLens(2)).toBe("cyan");
    /* three dots are the two cyan ones and the white one: only the cyan-lens eye saw anything */
    expect(unseenLens(3)).toBe("red");
    expect(unseenLens(4)).toBeNull();
    expect(unseenLens(5)).toBeNull();
  });
});

describe("symptom survey", () => {
  it("adds fifteen answers", () => {
    expect(surveyTotal(Array(15).fill(0))).toBe(0);
    expect(surveyTotal(Array(15).fill(4))).toBe(SURVEY_TOP_SCORE);
    expect(SURVEY_TOP_SCORE).toBe(60);
    expect(surveyTotal([0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 0, 1, 2, 3, 4])).toBe(30);
  });
  it("refuses a survey that is not complete or not on the scale", () => {
    expect(surveyTotal(Array(14).fill(1))).toBeNull();
    expect(surveyTotal(Array(16).fill(1))).toBeNull();
    expect(surveyTotal([...Array(14).fill(1), 5])).toBeNull();
    expect(surveyTotal([...Array(14).fill(1), -1])).toBeNull();
    expect(surveyTotal([...Array(14).fill(1), 1.5])).toBeNull();
  });
});

describe("change rules", () => {
  /** A value as the database hands it back: a four-byte real. */
  const stored = (v: number) => Math.fround(v);

  it("alerts when letter size is worse by 0.2 logMAR or more", () => {
    expect(changedMoreThanUsual("acuity", 0.5, 0.7)).toBe(true);
    expect(changedMoreThanUsual("acuity", stored(0.5), stored(0.7))).toBe(true);
    expect(changedMoreThanUsual("acuity", 0.5, 0.6)).toBe(false);
    expect(changedMoreThanUsual("acuity", 0.7, 0.5)).toBe(false);
    expect(ALERT_ACUITY_LOGMAR).toBe(0.2);
  });
  it("alerts when faint letters are worse by 0.3 logCS or more", () => {
    expect(changedMoreThanUsual("contrast", 1.65, 1.35)).toBe(true);
    expect(changedMoreThanUsual("contrast", stored(1.65), stored(1.35))).toBe(true);
    expect(changedMoreThanUsual("contrast", 1.65, 1.5)).toBe(false);
    expect(changedMoreThanUsual("contrast", 1.35, 1.65)).toBe(false);
    expect(ALERT_CONTRAST_LOGCS).toBe(0.3);
  });
  it("alerts when depth is worse by two steps of the test", () => {
    const levels = depthLevels(laptop).map((px) => depthValue(laptop, px));
    expect(changedMoreThanUsual("stereo", levels[4], levels[2])).toBe(true);
    expect(changedMoreThanUsual("stereo", stored(levels[4]), stored(levels[2]))).toBe(true);
    expect(changedMoreThanUsual("stereo", levels[4], levels[3])).toBe(false);
    expect(changedMoreThanUsual("stereo", levels[2], levels[4])).toBe(false);
    expect(changedMoreThanUsual("stereo", 100, 390)).toBe(false);
    expect(ALERT_DEPTH_FACTOR).toBe(4);
  });
  it("treats any two steps on any screen as a factor of four", () => {
    for (const [s, dpr] of [[laptop, 1], [laptop, 2], [phone, 2], [phone, 3], [tv, 1]] as const) {
      const levels = depthLevels(s, dpr).map((px) => depthValue(s, px, dpr));
      for (let i = 2; i < levels.length; i++) expect(changedMoreThanUsual("stereo", levels[i], levels[i - 2])).toBe(true);
    }
  });
  it("alerts when the fusion break is lower by 5 or more", () => {
    expect(changedMoreThanUsual("fusion_break", 18, 13)).toBe(true);
    expect(changedMoreThanUsual("fusion_break", 18, 13.5)).toBe(false);
    expect(changedMoreThanUsual("fusion_break", 13, 18)).toBe(false);
    expect(ALERT_FUSION_BREAK).toBe(5);
  });
  it("alerts when the near point is farther by 4 cm or more", () => {
    expect(changedMoreThanUsual("near_point", 8, 12)).toBe(true);
    expect(changedMoreThanUsual("near_point", 8, 11.5)).toBe(false);
    expect(changedMoreThanUsual("near_point", 12, 8)).toBe(false);
    expect(ALERT_NEAR_POINT_CM).toBe(4);
  });
  it("alerts when the suppression score is higher than before", () => {
    expect(changedMoreThanUsual("suppression", 0, 1)).toBe(true);
    expect(changedMoreThanUsual("suppression", 1, 2)).toBe(true);
    expect(changedMoreThanUsual("suppression", 1, 1)).toBe(false);
    expect(changedMoreThanUsual("suppression", 2, 0)).toBe(false);
  });
  it("alerts when symptoms are higher by 10 or more", () => {
    expect(changedMoreThanUsual("symptoms", 12, 22)).toBe(true);
    expect(changedMoreThanUsual("symptoms", 12, 21)).toBe(false);
    expect(changedMoreThanUsual("symptoms", 30, 12)).toBe(false);
    expect(ALERT_SYMPTOM_POINTS).toBe(10);
  });
  it("has no rule for eye balance or fusion recovery", () => {
    expect(hasChangeRule("balance")).toBe(false);
    expect(hasChangeRule("fusion_recovery")).toBe(false);
    expect(changedMoreThanUsual("balance", 0, -1.3)).toBe(false);
    expect(changedMoreThanUsual("fusion_recovery", 14, 2)).toBe(false);
    for (const key of ["acuity", "contrast", "stereo", "fusion_break", "near_point", "suppression", "symptoms"]) expect(hasChangeRule(key)).toBe(true);
  });
  it("asks for an eye doctor soon only for a letter-size loss of 0.3 logMAR or more", () => {
    expect(needsDoctorSoon("acuity", 0.2, 0.5)).toBe(true);
    expect(needsDoctorSoon("acuity", stored(0.2), stored(0.5))).toBe(true);
    expect(needsDoctorSoon("acuity", 0.2, 0.4)).toBe(false);
    expect(needsDoctorSoon("acuity", 0.5, 0.2)).toBe(false);
    expect(needsDoctorSoon("contrast", 0, 1)).toBe(false);
    expect(URGENT_ACUITY_LOGMAR).toBe(0.3);
  });
  it("compares the latest result with the previous one and with the baseline", () => {
    expect(changeCheck("acuity", 0.4, 0.3, 0.2)).toEqual({ alert: true, urgent: false, against: ["baseline"] });
    expect(changeCheck("acuity", 0.4, 0.2, 0.4)).toEqual({ alert: true, urgent: false, against: ["previous"] });
    expect(changeCheck("acuity", 0.6, 0.3, 0.3)).toEqual({ alert: true, urgent: true, against: ["previous", "baseline"] });
    expect(changeCheck("acuity", 0.3, 0.3, 0.2)).toEqual({ alert: false, urgent: false, against: [] });
  });
  it("is urgent only for a drop since the last test, not for a slow slide from the baseline", () => {
    expect(changeCheck("acuity", 0.5, 0.4, 0.1).urgent).toBe(false);
    expect(changeCheck("acuity", 0.5, 0.4, 0.1).alert).toBe(true);
  });
  it("stays quiet for a first result and for an improvement", () => {
    expect(changeCheck("near_point", 9, null, null)).toEqual({ alert: false, urgent: false, against: [] });
    expect(changeCheck("near_point", 6, 12, 14)).toEqual({ alert: false, urgent: false, against: [] });
    expect(changeCheck("symptoms", 5, 30, 40).alert).toBe(false);
  });
});
