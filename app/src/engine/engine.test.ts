// Eyes Opener: Unit and regression test suite verifying engine functionality.
import { describe, it, expect } from "vitest";
import {
  derive, standardMeasured, blankEye, snellen, acuityText, type Measured,
  channel, strongInk, videoMatrix,
  acuityLevels, acuityOf, contrastLevels, contrastGrey, startStaircase, answerStaircase,
  startBalance, answerBalance, balanceContrasts, balanceCyanEye,
  canStart, MAX_DAILY_MINUTES, ringFor, ringShare, isStopSymptom,
} from "./index";

const aarav: Measured = {
  tested: true, ppc: 37.8, dist: 60,
  eyes: { L: { va: 0.5, cs: 1.35, q: [true, true, false, false], note: "" }, R: { va: 0, cs: 1.65, q: [true, false, false, false], note: "" } },
  bal: { x: -0.82, cyanEye: "L" },
};

describe("derive", () => {
  it("gives equal contrast and standard sizes before onboarding", () => {
    const d = derive(standardMeasured());
    expect(d.weak).toBeNull(); expect(d.con).toBe(1); expect(d.conSource).toBe("default"); expect(d.opens).toBe("eye_fitness");
  });
  it("finds the weaker eye and the balance contrast", () => {
    const d = derive(aarav);
    expect(d.weak).toBe("L"); expect(d.cyanEye).toBe("L");
    expect(d.con).toBeCloseTo(0.151, 3);
    expect(d.letterCm * 10).toBeCloseTo(6.9, 1);
    expect(d.targetCm * 10).toBeCloseTo(8.3, 1);
    expect(d.appPx).toBe(16); expect(d.opens).toBe("lazy_eye"); expect(d.flags.lazyBefore).toBe(true);
  });
  it("uses the starting level when the balance test was skipped", () => {
    const d = derive({ ...aarav, bal: null });
    expect(d.con).toBe(0.15); expect(d.conSource).toBe("starting_level");
  });
  it("lets the balance test overrule the letter test", () => {
    const d = derive({ ...aarav, bal: { x: 0.4, cyanEye: "L" } });
    expect(d.weak).toBe("R"); expect(d.con).toBeCloseTo(0.398, 3);
  });
  it("does not enlarge text when the result is the screen's limit", () => {
    const m = standardMeasured(); m.tested = true;
    m.eyes.L = { ...blankEye(), va: 0.18, note: "floor" }; m.eyes.R = { ...blankEye(), va: 0.18, note: "floor" };
    expect(derive(m).appPx).toBe(16);
  });
  it("puts a sudden change ahead of everything else", () => {
    const m = { ...aarav, eyes: { ...aarav.eyes, R: { ...aarav.eyes.R, q: [false, false, true, true] as [boolean, boolean, boolean, boolean] } } };
    expect(derive(m).opens).toBe("doctor_first");
  });
  it("raises faint text when neither eye reads low contrast", () => {
    const m = standardMeasured(); m.eyes.L.cs = 1.2; m.eyes.R.cs = 1.2;
    expect(derive(m).faint).toBe(true);
  });
  it("writes acuity as 6/x", () => {
    expect(snellen(0)).toBe("6/6"); expect(snellen(0.3)).toBe("6/12"); expect(snellen(0.5)).toBe("6/19");
    expect(acuityText({ ...blankEye(), va: 0.2, note: "floor" })).toBe("6/9.5 or better");
  });
});

describe("colour", () => {
  it("sets contrast in real light", () => {
    expect(channel(1)).toBe(255); expect(channel(0.15)).toBe(108); expect(channel(0.5)).toBe(186);
    expect(strongInk(0.15)).toBe("rgb(108 0 0)");
  });
  it("keeps the weaker eye's channels at full brightness in the video matrix", () => {
    const m = videoMatrix(0.15);
    expect(m.length).toBe(20);
    expect(m[5] + m[6] + m[7]).toBeCloseTo(1, 5);
    expect(m[0] + m[1] + m[2]).toBeCloseTo(0.15, 5);
    expect(m[4]).toBeCloseTo(0.425, 5);
  });
});

describe("acuity and contrast levels", () => {
  it("lists letter sizes largest first with whole-pixel strokes", () => {
    const lv = acuityLevels({ ppc: 37.8, dist: 60 }, 1);
    expect(lv[0].stroke).toBeGreaterThan(lv[lv.length - 1].stroke);
    expect(lv[lv.length - 1].stroke).toBe(1);
    expect(lv[lv.length - 1].logMar).toBeCloseTo(0.18, 2);
    expect(new Set(lv.map((l) => l.stroke)).size).toBe(lv.length);
  });
  it("reaches finer letters on a sharper screen", () => {
    expect(acuityOf({ ppc: 37.8, dist: 60 }, 1, 2)).toBeLessThan(0);
  });
  it("fades the letter toward the background", () => {
    const lv = contrastLevels();
    expect(lv[0]).toBe(0); expect(lv[11]).toBe(1.65);
    expect(contrastGrey(0)).toBe(0);
    expect(contrastGrey(1.65)).toBeLessThan(186); expect(contrastGrey(1.65)).toBeGreaterThan(180);
  });
});

/** An observer who reads every level up to `limit` and guesses wrong beyond it. */
function run(levels: number, limit: number) {
  let s = startStaircase(levels);
  while (s.result === null) s = answerStaircase(s, s.level <= limit);
  return s;
}

describe("staircase", () => {
  it("lands on the hardest level the observer can read", () => {
    for (const limit of [0, 3, 6, 9]) expect(run(10, limit).result).toBe(limit);
  });
  it("reports -1 when the easiest level is missed", () => { expect(run(10, -1).result).toBe(-1); });
  it("stops at the last level when everything is read", () => { expect(run(10, 99).result).toBe(9); });
  it("never runs past the trial limit", () => { expect(run(12, 5).trials).toBeLessThanOrEqual(18); });
});

describe("balance", () => {
  it("settles near the observer's balance point", () => {
    const point = -0.8; let b = startBalance();
    while (b.result === null) b = answerBalance(b, b.x > point ? "red" : "cyan");
    expect(b.result!).toBeLessThan(-0.6); expect(b.result!).toBeGreaterThan(-1);
  });
  it("stops where the member says the letters are equal", () => {
    let b = startBalance(); b = answerBalance(b, "red"); b = answerBalance(b, "equal");
    expect(b.result).toBe(-0.2);
  });
  it("dims only one ink at a time", () => {
    expect(balanceContrasts(-1)).toEqual({ red: 0.1, cyan: 1 });
    expect(balanceContrasts(0.3).red).toBe(1);
  });
  it("puts the cyan lens on the eye that read worse", () => {
    expect(balanceCyanEye(0.5, 0)).toBe("L"); expect(balanceCyanEye(0, 0.3)).toBe("R"); expect(balanceCyanEye(0.1, 0.1)).toBe("L");
  });
});

describe("dose", () => {
  const base = { kind: "game" as const, age: 6, minutesToday: 0, dailyMinutes: 60, stopFlag: false };
  it("allows the programme's minutes", () => { expect(canStart(base)).toEqual({ ok: true, minutes: 60, reason: null }); });
  it("ends when the programme's minutes are done", () => { expect(canStart({ ...base, minutesToday: 60 }).reason).toBe("programme_done"); });
  it("never passes the daily cap", () => {
    expect(canStart({ ...base, dailyMinutes: 500, minutesToday: 80 }).minutes).toBe(10);
    expect(canStart({ ...base, dailyMinutes: 0, minutesToday: MAX_DAILY_MINUTES }).reason).toBe("daily_cap");
  });
  it("blocks screens under four", () => { expect(canStart({ ...base, age: 3 }).reason).toBe("under_age"); });
  it("lets an under-four do an off-screen exercise", () => { expect(canStart({ ...base, age: 3, kind: "exercise" }).ok).toBe(true); });
  it("blocks training after a red flag but not tests", () => {
    expect(canStart({ ...base, stopFlag: true }).reason).toBe("doctor_first");
    expect(canStart({ ...base, stopFlag: true, kind: "test" }).ok).toBe(true);
  });
  it("keeps training closed without consent or without a counsellor's dose, but not tests", () => {
    expect(canStart({ ...base, consentMissing: true }).reason).toBe("needs_consent");
    expect(canStart({ ...base, awaitingCounsellor: true }).reason).toBe("awaiting_counsellor");
    expect(canStart({ ...base, consentMissing: true, awaitingCounsellor: true, kind: "test" }).ok).toBe(true);
  });
  it("maps sessions to rings", () => { expect(ringFor("outdoor")).toBe("light"); expect(ringFor("film")).toBe("train"); expect(ringShare(45, 60)).toBe(0.75); });
  it("knows the stop symptoms", () => { expect(isStopSymptom("double_vision")).toBe(true); expect(isStopSymptom("bored")).toBe(false); });
});
