import { describe, it, expect } from "vitest";
import { USUAL_GAMMA, channel, lightOf } from "@/engine";
import { memberCan, type MemberAction, type Seat } from "./roles";
import { GAMMA_MOVED, clearStep, mayCalibrate, profileEffect, rawOf, resolveStep, screenFacts, stepInput, type ScreenChange, type ScreenRow, type StepInput } from "./screen-rules";

const blank: ScreenRow = {
  pxPerCm: 37.8, gamma: USUAL_GAMMA, gammaAt: null, channelLeak: 0, leakRedLens: null, leakCyanLens: null, leakAt: null,
  inkBalance: null, inkBalanceAt: null, colourRaw: {}, cyanGreen: null, cyanGreenAt: null, redTop: null, redTopAt: null,
};
const day = (n: number) => new Date(Date.UTC(2026, 9, n));
/** The row after a change is saved, read back the way the database returns it (JSON keeps no `undefined`). */
const after = (row: ScreenRow, set: ScreenChange): ScreenRow => ({ ...row, ...set, colourRaw: JSON.parse(JSON.stringify(set.colourRaw ?? row.colourRaw)) });
const save = (row: ScreenRow, input: StepInput, at = day(5)) => {
  const r = resolveStep(input, row, at);
  if (!r.ok) throw new Error(`refused: ${r.why}`);
  return after(row, r.set);
};
const as = (seat: Seat | null, childMode = false) => ({ can: (action: MemberAction) => memberCan(seat, action, childMode) });

describe("who may measure the screen", () => {
  it("lets a guardian and a co-guardian", () => {
    expect(mayCalibrate(as("guardian"))).toBe(true);
    expect(mayCalibrate(as("co_guardian"))).toBe(true);
  });
  it("refuses a cheer seat, child mode and a person with no seat", () => {
    expect(mayCalibrate(as("circle"))).toBe(false);
    expect(mayCalibrate(as("guardian", true))).toBe(false);
    expect(mayCalibrate(as(null))).toBe(false);
  });
});

describe("what the browser may send", () => {
  it("takes two whole matches for each step", () => {
    expect(stepInput.safeParse({ step: "gamma", greys: [184, 189] }).success).toBe(true);
    expect(stepInput.safeParse({ step: "leak", red: [88, 92], cyan: "unseen" }).success).toBe(true);
    expect(stepInput.safeParse({ step: "ink", xs: [0.52, 0.46], turned: true }).success).toBe(true);
  });
  it("refuses a value worked out in the browser, a made-up step and anything off the scale", () => {
    for (const bad of [
      { step: "gamma", gamma: 2.4 },
      { step: "gamma", greys: [184.5, 189] },
      { step: "gamma", greys: [20, 189] },
      { step: "gamma", greys: [184] },
      { step: "leak", red: [88, 92] },
      { step: "leak", red: [88, 300], cyan: "unseen" },
      { step: "leak", red: 0.1, cyan: 0.02 },
      { step: "ink", xs: [0.5, 2], turned: true },
      { step: "ink", xs: [0.5, 0.5] },
      { step: "size", ppc: 40 },
      null, "gamma",
    ]) expect(stepInput.safeParse(bad).success).toBe(false);
  });
});

describe("saving a step", () => {
  it("stores gamma from the two grey matches and when it was measured", () => {
    const r = resolveStep({ step: "gamma", greys: [190, 194] }, blank, day(5));
    expect(r).toMatchObject({ ok: true, set: { gamma: 2.45, gammaAt: day(5), colourRaw: { gamma: { greys: [190, 194], was: 2.2 }, ppc: 37.8 } } });
  });
  it("changes nothing when the two matches disagree or no screen could give them", () => {
    expect(resolveStep({ step: "gamma", greys: [176, 196] }, blank, day(5))).toEqual({ ok: false, why: "apart" });
    expect(resolveStep({ step: "gamma", greys: [128, 130] }, blank, day(5))).toEqual({ ok: false, why: "range" });
    expect(resolveStep({ step: "ink", xs: [0.1, 0.6], turned: true }, blank, day(5))).toEqual({ ok: false, why: "apart" });
  });
  it("stores both lenses' leak with the screen's own gamma, and the larger one in the old column", () => {
    const row = save(blank, { step: "leak", red: [88, 92], cyan: [40, 44] });
    expect(row.leakRedLens).toBeCloseTo(lightOf(90), 3);
    expect(row.leakCyanLens).toBeCloseTo(lightOf(42), 3);
    expect(row.channelLeak).toBe(row.leakRedLens);
    expect(row.leakAt).toEqual(day(5));
    const steep = save({ ...blank, gamma: 2.6 }, { step: "leak", red: [88, 92], cyan: "unseen" });
    expect(steep.leakRedLens).toBeCloseTo(lightOf(90, 2.6), 3);
    expect(steep.leakCyanLens).toBe(0);
  });
  it("names the lens whose matches were refused and stores neither", () => {
    expect(resolveStep({ step: "leak", red: [88, 92], cyan: [20, 150] }, blank, day(5))).toEqual({ ok: false, why: "apart", lens: "cyan" });
    expect(resolveStep({ step: "leak", red: [20, 150], cyan: "unseen" }, blank, day(5))).toEqual({ ok: false, why: "apart", lens: "red" });
  });
  it("stores the ink balance with the gamma it was drawn with and whether the glasses were turned", () => {
    const row = save({ ...blank, gamma: 2.4 }, { step: "ink", xs: [0.58, 0.42], turned: true });
    expect(row.inkBalance).toBe(0.5);
    expect(rawOf(row.colourRaw).ink).toEqual({ xs: [0.58, 0.42], turned: true, gamma: 2.4, green: 1 });
  });
  it("keeps the other steps when one is saved", () => {
    let row = save(blank, { step: "leak", red: [88, 92], cyan: "unseen" }, day(3));
    row = save(row, { step: "ink", xs: [0.5, 0.5], turned: false }, day(4));
    expect(row.leakRedLens).not.toBeNull();
    expect(rawOf(row.colourRaw).leak).toEqual({ red: [88, 92], cyan: "unseen", green: 1 });
    expect(screenFacts(row).measured).toBe(2);
  });
});

describe("measuring gamma after the others", () => {
  const first = save(save(blank, { step: "leak", red: [88, 92], cyan: [40, 44] }, day(3)), { step: "ink", xs: [0.5, 0.5], turned: true }, day(3));
  const later = save(first, { step: "gamma", greys: [196, 196] }, day(5));

  it("works the leak out again from the same matched values", () => {
    expect(later.gamma).toBeCloseTo(2.63, 2);
    expect(later.leakRedLens).toBeCloseTo(lightOf(90, later.gamma), 3);
    expect(later.leakRedLens!).toBeLessThan(first.leakRedLens!);
    expect(later.channelLeak).toBe(later.leakRedLens);
    expect(later.leakAt).toEqual(day(3));
  });
  it("restates the ink balance so that the squares that were matched stay matched", () => {
    const drawn = channel(Math.pow(10, -first.inkBalance!), first.gamma);
    expect(Math.abs(channel(Math.pow(10, -later.inkBalance!), later.gamma) - drawn)).toBeLessThanOrEqual(2);
    expect(later.inkBalance!).toBeGreaterThan(first.inkBalance!);
  });
  it("goes back to the first values when gamma is put back to the usual one", () => {
    const back = after(later, clearStep("gamma", later));
    expect(back.gamma).toBe(USUAL_GAMMA);
    expect(back.gammaAt).toBeNull();
    expect(back.leakRedLens).toBe(first.leakRedLens);
    expect(back.leakCyanLens).toBe(first.leakCyanLens);
    expect(back.inkBalance).toBe(first.inkBalance);
    expect(rawOf(back.colourRaw).gamma).toBeUndefined();
  });
});

describe("putting a step back to not measured", () => {
  const full = save(save(save(blank, { step: "gamma", greys: [190, 194] }), { step: "leak", red: [88, 92], cyan: [40, 44] }), { step: "ink", xs: [0.5, 0.5], turned: true });
  it("clears the leak and nothing else", () => {
    const row = after(full, clearStep("leak", full));
    expect([row.leakRedLens, row.leakCyanLens, row.leakAt, row.channelLeak]).toEqual([null, null, null, 0]);
    expect(row.gamma).toBe(full.gamma); expect(row.inkBalance).toBe(full.inkBalance);
    expect(screenFacts(row).leak).toBeNull();
  });
  it("clears the ink balance and nothing else", () => {
    const row = after(full, clearStep("ink", full));
    expect([row.inkBalance, row.inkBalanceAt]).toEqual([null, null]);
    expect(row.leakRedLens).toBe(full.leakRedLens);
    expect(screenFacts(row).ink).toBeNull();
  });
  it("leaves a screen that was never measured exactly as it is", () => {
    for (const step of ["gamma", "leak", "ink"] as const) {
      const row = after(blank, clearStep(step, blank));
      expect(row).toEqual(blank);
    }
  });
});

describe("what is known about a screen", () => {
  it("says nothing is measured on a new screen", () => {
    expect(screenFacts(blank)).toEqual({ gamma: { value: 2.2, at: null, movedBy: 0 }, leak: null, ink: null, measured: 0, moved: false, tune: { green: 1, redTop: 1, greenAt: null, redTopAt: null } });
    expect(screenFacts({ ...blank, colourRaw: null })).toMatchObject({ measured: 0 });
    expect(screenFacts({ ...blank, colourRaw: "nonsense" })).toMatchObject({ measured: 0 });
  });
  it("reads back what was measured", () => {
    const row = save(save(blank, { step: "gamma", greys: [190, 194] }, day(2)), { step: "ink", xs: [0.5, 0.6], turned: false }, day(4));
    const f = screenFacts(row);
    expect(f.gamma.value).toBe(2.45); expect(f.gamma.at).toEqual(day(2)); expect(f.gamma.movedBy).toBeCloseTo(0.25, 2);
    expect(f.ink).toEqual({ value: 0.55, at: day(4), turned: false, stale: false });
    expect(f.leak).toBeNull(); expect(f.measured).toBe(2); expect(f.moved).toBe(false);
  });
  it("notices when the size of the screen has changed since", () => {
    const row = save(blank, { step: "leak", red: [88, 92], cyan: "unseen" });
    expect(screenFacts({ ...row, pxPerCm: 38.2 }).moved).toBe(false);
    expect(screenFacts({ ...row, pxPerCm: 15 }).moved).toBe(true);
    expect(screenFacts({ ...blank, pxPerCm: 15 }).moved).toBe(false);
  });
});

describe("what a screen means for one profile", () => {
  const measured = save(save(save(blank, { step: "gamma", greys: [190, 194] }, day(5)), { step: "leak", red: [100, 104], cyan: [40, 44] }, day(5)), { step: "ink", xs: [0.5, 0.5], turned: true }, day(6));
  const facts = screenFacts(measured);

  it("judges the leak against that profile's own contrast", () => {
    expect(facts.leak!.red).toBeGreaterThan(0.1);
    expect(profileEffect(facts, { strongContrast: 0.1 }, null).leak?.level).toBe("high");
    expect(profileEffect(facts, { strongContrast: 0.4 }, null).leak?.level).toBe("ghost");
    expect(profileEffect(facts, { strongContrast: 1 }, null).leak?.level).toBe("ghost");
  });
  it("says nothing about a profile with no eye settings, or a screen with no leak measured", () => {
    expect(profileEffect(facts, null, null)).toEqual({ contrast: null, leak: null, balanceAgain: false, capped: null });
    expect(profileEffect(screenFacts(blank), { strongContrast: 0.15 }, day(1))).toEqual({ contrast: 0.15, leak: null, balanceAgain: false, capped: null });
  });
  it("asks for the balance check-up again only when it is older than a measurement that moves it", () => {
    expect(profileEffect(facts, { strongContrast: 0.15 }, day(1)).balanceAgain).toBe(true);
    expect(profileEffect(facts, { strongContrast: 0.15 }, day(7)).balanceAgain).toBe(false);
    expect(profileEffect(facts, { strongContrast: 0.15 }, null).balanceAgain).toBe(false);
    /* a gamma that barely moved does not ask for it */
    const steady = screenFacts(save(blank, { step: "gamma", greys: [186, 187] }, day(5)));
    expect(steady.gamma.movedBy).toBeLessThan(GAMMA_MOVED);
    expect(profileEffect(steady, { strongContrast: 0.15 }, day(1)).balanceAgain).toBe(false);
    const moved = screenFacts(save(blank, { step: "gamma", greys: [190, 194] }, day(5)));
    expect(profileEffect(moved, { strongContrast: 0.15 }, day(1)).balanceAgain).toBe(true);
  });
});

describe("tuning the inks for the glasses", () => {
  const leakMatch: StepInput = { step: "leak", red: [120, 130], cyan: "unseen" };
  it("stores both settings, each with the time it last changed", () => {
    const row = save(blank, { step: "tune", green: 0.6, redTop: 0.5 }, day(6));
    expect([row.cyanGreen, row.redTop]).toEqual([0.6, 0.5]);
    expect([row.cyanGreenAt, row.redTopAt]).toEqual([day(6), day(6)]);
    const again = save(row, { step: "tune", green: 0.6, redTop: 0.4 }, day(8));
    expect(again.cyanGreenAt).toEqual(day(6));
    expect(again.redTopAt).toEqual(day(8));
  });
  it("refuses settings off the scale", () => {
    expect(stepInput.safeParse({ step: "tune", green: 0.1, redTop: 1 }).success).toBe(false);
    expect(stepInput.safeParse({ step: "tune", green: 1, redTop: 0.05 }).success).toBe(false);
    expect(stepInput.safeParse({ step: "tune", green: 1, redTop: 1.2 }).success).toBe(false);
  });
  it("marks the leak and the ink balance to be matched again when the green share changes, not when the ceiling does", () => {
    const measured = save(save(blank, leakMatch, day(3)), { step: "ink", xs: [0.4, 0.5], turned: true }, day(3));
    expect(screenFacts(measured).leak?.stale).toBe(false);
    const ceiling = save(measured, { step: "tune", green: 1, redTop: 0.5 }, day(4));
    expect(screenFacts(ceiling).leak?.stale).toBe(false);
    expect(screenFacts(ceiling).ink?.stale).toBe(false);
    const tuned = save(ceiling, { step: "tune", green: 0.6, redTop: 0.5 }, day(5));
    expect(screenFacts(tuned).leak?.stale).toBe(true);
    expect(screenFacts(tuned).ink?.stale).toBe(true);
    const again = save(tuned, leakMatch, day(6));
    expect(screenFacts(again).leak?.stale).toBe(false);
  });
  it("asks for the balance check-up again after the cyan ink changed, and names whom the ceiling lowers", () => {
    const tuned = screenFacts(save(blank, { step: "tune", green: 0.6, redTop: 0.4 }, day(5)));
    expect(profileEffect(tuned, { strongContrast: 0.3 }, day(4)).balanceAgain).toBe(true);
    expect(profileEffect(tuned, { strongContrast: 0.3 }, day(6)).balanceAgain).toBe(false);
    expect(profileEffect(tuned, { strongContrast: 0.3 }, day(6)).capped).toBeNull();
    expect(profileEffect(tuned, { strongContrast: 0.8 }, day(6)).capped).toBe(0.4);
    const ceilingOnly = screenFacts(save(blank, { step: "tune", green: 1, redTop: 0.4 }, day(5)));
    expect(profileEffect(ceilingOnly, { strongContrast: 0.3 }, day(4)).balanceAgain).toBe(false);
  });
  it("puts the inks back as usual", () => {
    const tuned = save(blank, { step: "tune", green: 0.6, redTop: 0.4 }, day(5));
    expect(after(tuned, clearStep("tune", tuned))).toEqual(blank);
  });
});
