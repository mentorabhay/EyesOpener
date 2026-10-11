// Eyes Opener: Unit and regression test suite verifying lens-choice functionality.
import { describe, expect, it } from "vitest";
import { derive, standardMeasured, type Measured } from "@/engine";
import { cyanEyeFor, suggestInk, upsideDown } from "./lens-choice";

describe("the lens choice", () => {
  it("suggests the swap when the red lens leaks clearly more than the cyan lens", () => {
    expect(suggestInk({ red: 0.15, cyan: 0.01 })).toEqual({ ink: "red", why: "red_leaks_more" });
    expect(suggestInk({ red: 0.01, cyan: 0.06 })).toEqual({ ink: "cyan", why: "cyan_leaks_more" });
    expect(suggestInk({ red: 0.03, cyan: 0.02 })).toEqual({ ink: "cyan", why: "close" });
  });
  it("keeps the usual way when the leak is not measured, or was matched before the inks were tuned", () => {
    expect(suggestInk(null).why).toBe("not_measured");
    expect(suggestInk({ red: 0.2, cyan: 0, stale: true })).toEqual({ ink: "cyan", why: "stale" });
  });
  it("puts the cyan lens over the eye that sees cyan, and says when the glasses go upside down", () => {
    expect(cyanEyeFor("L", "cyan")).toBe("L");
    expect(cyanEyeFor("L", "red")).toBe("R");
    expect(upsideDown("L")).toBe(true);
    expect(upsideDown("R")).toBe(false);
  });
});

describe("the eye settings with the inks swapped", () => {
  /* a left eye two lines worse, and a balance check-up that dimmed the red ink to 10^-0.8 with the cyan lens on the left */
  const m: Measured = { ...standardMeasured(), tested: true, eyes: { L: { va: 0.5, cs: 1.4, q: [false, false, false, false], note: "" }, R: { va: 0, cs: 1.65, q: [false, false, false, false], note: "" } }, bal: { x: -0.8, cyanEye: "L" } };
  it("moves the cyan lens to the stronger eye and keeps the weaker eye", () => {
    const usual = derive(m), swapped = derive({ ...m, weakInk: "red" });
    expect([usual.weak, usual.cyanEye, usual.weakInk]).toEqual(["L", "L", "cyan"]);
    expect([swapped.weak, swapped.cyanEye, swapped.weakInk]).toEqual(["L", "R", "red"]);
  });
  it("gives the same contrast both ways while the ink balance is not measured", () => {
    expect(derive({ ...m, weakInk: "red" }).con).toBeCloseTo(derive(m).con);
  });
  it("dims the stronger eye's cyan further when the cyan ink is the brighter one on this screen", () => {
    /* ink 0.3: cyan looks twice as bright as red through the glasses */
    const usual = derive({ ...m, bal: { x: -0.5, cyanEye: "L" }, inkBalance: 0.3 });
    const swapped = derive({ ...m, bal: { x: -0.5, cyanEye: "L" }, inkBalance: 0.3, weakInk: "red" });
    expect(usual.con).toBeCloseTo(Math.pow(10, 0.3 - 0.8));
    expect(swapped.con).toBeCloseTo(Math.pow(10, -0.3 - 0.8));
  });
  it("changes nothing for a person whose eyes tested equal", () => {
    const equal: Measured = { ...m, eyes: { L: m.eyes.R, R: m.eyes.R }, bal: { x: 0, cyanEye: "L" } };
    expect(derive({ ...equal, weakInk: "red" }).con).toBe(1);
    expect(derive({ ...equal, weakInk: "red" }).weak).toBeNull();
  });
});
