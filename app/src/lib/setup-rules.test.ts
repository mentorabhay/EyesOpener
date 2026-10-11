// Eyes Opener: Unit and regression test suite verifying setup-rules functionality.
import { describe, expect, it } from "vitest";
import { screenFacts, type ScreenRow } from "./screen-rules";
import { atLimit, isReady, minutesLeft, missing, nextStep, progress, setupSteps, type SetupInput } from "./setup-rules";

const at = (iso: string) => new Date(iso);
const row = (over: Partial<ScreenRow> = {}): ScreenRow => ({
  pxPerCm: 37.8, gamma: 2.2, gammaAt: null, channelLeak: 0, leakRedLens: null, leakCyanLens: null, leakAt: null,
  inkBalance: null, inkBalanceAt: null, colourRaw: {}, cyanGreen: null, cyanBlue: null, cyanGreenAt: null, redTop: null, redTopAt: null, ...over,
});
/* tuned on 2 October, leak matched with that mix on 3 October */
const tuned = row({
  cyanGreen: 0.9, cyanBlue: 0.3, cyanGreenAt: at("2026-10-02T10:00:00Z"),
  leakRedLens: 0.04, leakCyanLens: 0.01, leakAt: at("2026-10-03T10:00:00Z"), colourRaw: { leak: { red: "unseen", cyan: "unseen", green: 0.9, blue: 0.3 } },
});
const done: SetupInput = {
  screen: { pxPerCm: 37.8, facts: screenFacts(tuned) }, answered: true,
  eye: { weakEye: "left", strongContrast: 0.3 }, lensAt: at("2026-10-04T10:00:00Z"), balanceAt: at("2026-10-04T10:00:00Z"),
};
const state = (i: SetupInput) => Object.fromEntries(setupSteps(i).map((s) => [s.key, s.state]));

describe("setup", () => {
  it("is ready when every required step is done, whatever the recommended ones", () => {
    const steps = setupSteps(done);
    expect(state(done)).toMatchObject({ size: "done", gamma: "todo", tune: "done", leak: "done", ink: "todo", safety: "done", eyes: "done", lens: "done", balance: "done" });
    expect(isReady(steps)).toBe(true);
    expect(progress(steps)).toEqual({ done: 7, of: 7 });
    expect(nextStep(steps)).toBeNull();
  });
  it("starts with nothing done, and sends the person to the screen's size first", () => {
    const none: SetupInput = { screen: null, answered: false, eye: null, lensAt: null, balanceAt: null };
    const steps = setupSteps(none);
    expect(isReady(steps)).toBe(false);
    expect(progress(steps).done).toBe(0);
    expect(nextStep(steps)?.key).toBe("size");
    expect(minutesLeft(steps)).toBe(10);
  });
  it("tunes the glasses and checks the leak before the person's own steps", () => {
    const steps = setupSteps({ ...done, screen: { pxPerCm: 37.8, facts: screenFacts(row()) }, answered: false, eye: null, lensAt: null, balanceAt: null });
    expect(missing(steps).map((s) => s.key)).toEqual(["tune", "leak", "safety", "eyes", "lens", "balance"]);
    expect(nextStep(steps)?.key).toBe("tune");
    expect(isReady(steps, "screen")).toBe(false);
  });
  it("asks for the leak check again when it was matched before the inks were tuned", () => {
    const stale = row({ ...tuned, colourRaw: { leak: { red: "unseen", cyan: "unseen", green: 1, blue: 1 } } });
    const s = setupSteps({ ...done, screen: { pxPerCm: 37.8, facts: screenFacts(stale) } }).find((x) => x.key === "leak")!;
    expect([s.state, s.why]).toEqual(["again", "stale_tune"]);
  });
  it("needs no lens choice when no eye is weaker, but needs one confirmed when one is", () => {
    expect(state({ ...done, eye: { weakEye: null, strongContrast: 1 }, lensAt: null }).lens).toBe("skip");
    expect(state({ ...done, lensAt: null }).lens).toBe("todo");
  });
  it("asks for the balance check-up again after the lens choice changed, and says why", () => {
    const s = setupSteps({ ...done, lensAt: at("2026-10-05T10:00:00Z") }).find((x) => x.key === "balance")!;
    expect([s.state, s.why]).toEqual(["again", "lens_changed"]);
    expect(isReady(setupSteps({ ...done, lensAt: at("2026-10-05T10:00:00Z") }))).toBe(false);
  });
  it("asks for the balance check-up again after the inks were tuned since", () => {
    const later = row({ ...tuned, cyanGreenAt: at("2026-10-06T10:00:00Z"), colourRaw: { leak: { red: "unseen", cyan: "unseen", green: 0.9, blue: 0.3 } } });
    const s = setupSteps({ ...done, screen: { pxPerCm: 37.8, facts: screenFacts(later) } }).find((x) => x.key === "balance")!;
    expect([s.state, s.why]).toEqual(["again", "screen_changed"]);
  });
  it("warns about a size at either end of the slider without holding anyone", () => {
    expect(atLimit(75)).toBe(true);
    expect(atLimit(4)).toBe(true);
    /* a large TV showing a web page can have about 10 pixels a centimetre: not the slider's end any more */
    expect(atLimit(10)).toBe(false);
    expect(atLimit(37.8)).toBe(false);
    const steps = setupSteps({ ...done, screen: { pxPerCm: 75, facts: screenFacts({ ...tuned, pxPerCm: 75 }) } });
    expect(steps.find((x) => x.key === "size")).toMatchObject({ state: "done", why: "at_limit" });
    expect(isReady(steps)).toBe(true);
  });
});
