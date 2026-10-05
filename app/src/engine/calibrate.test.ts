import { describe, it, expect } from "vitest";
import {
  CAL, CONTRAST_BACKGROUND, GAMMA_APART, INK_APART, LEAK_FAINT, LEAK_SUSPECT, MIN_CONTRAST, SRGB_INK_BALANCE, STARTING_CONTRAST, STRIPE_LIGHT, USUAL_GAMMA, USUAL_RIG,
  balanceContrasts, blankEye, channel, contrastField, contrastGrey, contrastLevels, derive, gammaFromMatches, gammaOfGrey, greyOfGamma, inkFromMatches, inkTimes,
  leakFor, leakFromMatches, lightOf, other, ownBalance, regammaBalance, standardMeasured, strongInk, weakInk,
  type Derived, type Eye, type Measured,
} from "./index";

const steps = (from: number, to: number, by: number) => Array.from({ length: Math.round((to - from) / by) + 1 }, (_, i) => Math.round((from + i * by) * 1000) / 1000);

describe("gamma from a grey match", () => {
  it("reads the usual screen as 2.2", () => {
    expect(gammaOfGrey(186)).toBeCloseTo(2.2, 1);
    expect(Math.round(greyOfGamma(USUAL_GAMMA))).toBe(186);
    expect(STRIPE_LIGHT).toBe(0.5);
  });
  it("goes from gamma to grey and back", () => {
    for (const g of steps(CAL.gamma[0], CAL.gamma[1], 0.05)) expect(gammaOfGrey(greyOfGamma(g))).toBeCloseTo(g, 10);
  });
  it("agrees with the engine's own channel value for half light", () => {
    for (let grey = CAL.grey[0]; grey <= CAL.grey[1]; grey++) expect(channel(STRIPE_LIGHT, gammaOfGrey(grey))).toBe(grey);
  });
  it("gives a higher gamma for a brighter matching grey", () => {
    for (let grey = CAL.grey[0]; grey < CAL.grey[1]; grey++) expect(gammaOfGrey(grey + 1)).toBeGreaterThan(gammaOfGrey(grey));
  });
  it("takes the middle of two matches that agree", () => {
    const r = gammaFromMatches([184, 189]);
    expect(r).toEqual({ ok: true, value: 2.22, spread: 0.19 });
    expect(gammaFromMatches([186, 186])).toEqual({ ok: true, value: 2.2, spread: 0 });
  });
  it("refuses two matches that are too far apart", () => {
    expect(gammaFromMatches([176, 196])).toEqual({ ok: false, why: "apart" });
    const a = 180, b = 186;
    expect(Math.abs(gammaOfGrey(a) - gammaOfGrey(b))).toBeLessThan(GAMMA_APART);
    expect(gammaFromMatches([a, b]).ok).toBe(true);
  });
  it("refuses a reading no real screen gives, such as blurred lines", () => {
    /* lines blurred to one grey show a quarter of the light, which matches a grey near 128: a gamma of 1 */
    expect(gammaFromMatches([128, 130])).toEqual({ ok: false, why: "range" });
    expect(gammaFromMatches([230, 231])).toEqual({ ok: false, why: "range" });
    expect(gammaFromMatches([100, 186])).toEqual({ ok: false, why: "range" });
    expect(gammaFromMatches([186.5, 186])).toEqual({ ok: false, why: "range" });
    expect(gammaFromMatches([NaN, 186])).toEqual({ ok: false, why: "range" });
  });
  it("never returns a gamma outside the limits", () => {
    for (let a = CAL.grey[0]; a <= CAL.grey[1]; a += 3) for (let b = CAL.grey[0]; b <= CAL.grey[1]; b += 3) {
      const r = gammaFromMatches([a, b]);
      if (!r.ok) continue;
      expect(r.value).toBeGreaterThanOrEqual(CAL.gamma[0]);
      expect(r.value).toBeLessThanOrEqual(CAL.gamma[1]);
      expect(r.spread).toBeLessThanOrEqual(GAMMA_APART);
    }
  });
});

describe("the usual gamma leaves every colour as it was", () => {
  it("draws the same inks and greys with no gamma, with 2.2 and with the usual value", () => {
    for (const c of steps(0, 1, 0.05)) {
      expect(channel(c, USUAL_GAMMA)).toBe(channel(c));
      expect(strongInk(c, USUAL_GAMMA)).toBe(strongInk(c));
      expect(weakInk(c, USUAL_GAMMA)).toBe(weakInk(c));
    }
    for (const cs of steps(0, 1.65, 0.15)) expect(contrastGrey(cs, USUAL_GAMMA)).toBe(contrastGrey(cs));
    expect(USUAL_RIG).toEqual({ gamma: 2.2, leak: null, ink: null });
  });
  it("draws a dim ink brighter on a screen with a higher gamma, and full ink the same", () => {
    for (const c of [0.05, 0.15, 0.4, 0.8]) expect(channel(c, 2.6)).toBeGreaterThan(channel(c, 2.2));
    for (const g of [1.6, 2.2, 3]) { expect(channel(1, g)).toBe(255); expect(channel(0, g)).toBe(0); }
  });
});

describe("the faint-letter check-up on a measured screen", () => {
  it("keeps the usual background on the usual screen", () => {
    expect(contrastField()).toBe(CONTRAST_BACKGROUND);
    expect(contrastField(USUAL_GAMMA)).toBe(CONTRAST_BACKGROUND);
  });
  it("never draws a letter lighter than its background, whatever the gamma", () => {
    for (const g of steps(CAL.gamma[0], CAL.gamma[1], 0.1)) {
      let last = -1;
      for (const cs of contrastLevels()) {
        const letter = contrastGrey(cs, g);
        expect(letter).toBeLessThanOrEqual(contrastField(g));
        expect(letter).toBeGreaterThanOrEqual(last);
        last = letter;
      }
    }
  });
  it("shows the contrast it names, in real light", () => {
    for (const g of [1.8, 2.2, 2.6]) for (const cs of [0.3, 0.6, 0.9]) {
      const field = lightOf(contrastField(g), g), letter = lightOf(contrastGrey(cs, g), g);
      expect((field - letter) / field).toBeCloseTo(Math.pow(10, -cs), 1);
    }
  });
  it("would turn the faintest letters lighter than a fixed background on a steeper screen", () => {
    /* why the background follows gamma: this is what a fixed 186 did at gamma 2.4 */
    expect(contrastGrey(1.65, 2.4)).toBeGreaterThan(CONTRAST_BACKGROUND);
  });
});

describe("light of a channel value", () => {
  it("is the way back from channel()", () => {
    for (const g of [1.6, 1.8, 2.2, 2.4, 3]) for (const c of steps(0.05, 1, 0.05)) expect(lightOf(channel(c, g), g)).toBeCloseTo(c, 1);
    expect(lightOf(0)).toBe(0); expect(lightOf(255)).toBe(1);
    expect(lightOf(-20)).toBe(0); expect(lightOf(400)).toBe(1);
  });
  it("rises with the value and falls with gamma", () => {
    for (let v = 0; v < 255; v++) expect(lightOf(v + 1)).toBeGreaterThan(lightOf(v));
    expect(lightOf(90, 2.6)).toBeLessThan(lightOf(90, 2.2));
  });
});

describe("colour leak from two matches", () => {
  it("is nothing when the wrong ink cannot be seen", () => {
    expect(leakFromMatches("unseen")).toEqual({ ok: true, value: 0, spread: 0 });
  });
  it("reads a matched level as a share of the lens's own ink", () => {
    const r = leakFromMatches([88, 92]);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.value).toBeCloseTo(0.101, 3); expect(r.value).toBeGreaterThan(lightOf(88)); expect(r.value).toBeLessThan(lightOf(92)); }
  });
  it("accepts two faint matches that differ by a hair of light", () => {
    expect(leakFromMatches([10, 30]).ok).toBe(true);
  });
  it("refuses two matches that are too far apart", () => {
    expect(leakFromMatches([40, 120])).toEqual({ ok: false, why: "apart" });
  });
  it("refuses values the step cannot set", () => {
    expect(leakFromMatches([90, CAL.level[1] + 1])).toEqual({ ok: false, why: "range" });
    expect(leakFromMatches([-1, 20])).toEqual({ ok: false, why: "range" });
    expect(leakFromMatches([90.5, 90])).toEqual({ ok: false, why: "range" });
    expect(leakFromMatches([90, 90], 5)).toEqual({ ok: false, why: "range" });
  });
  it("is smaller for the same match on a screen with a higher gamma", () => {
    const low = leakFromMatches([90, 90], 2), high = leakFromMatches([90, 90], 2.6);
    expect(low.ok && high.ok && high.value < low.value).toBe(true);
  });
  it("stays inside the limits for every pair the step can set", () => {
    for (const g of [CAL.gamma[0], USUAL_GAMMA, CAL.gamma[1]]) for (let a = 0; a <= CAL.level[1]; a += 8) for (let b = 0; b <= CAL.level[1]; b += 8) {
      const r = leakFromMatches([a, b], g);
      if (r.ok) { expect(r.value).toBeGreaterThanOrEqual(CAL.leak[0]); expect(r.value).toBeLessThanOrEqual(CAL.leak[1]); }
    }
  });
});

describe("what a leak does to a member", () => {
  it("calls a leak nobody can see clean", () => {
    expect(leakFor({ red: 0.01, cyan: 0.015 }, 0.15).level).toBe("clean");
    expect(leakFor({ red: 0, cyan: 0 }, MIN_CONTRAST).level).toBe("clean");
  });
  it("calls a leak that can be seen a ghost", () => {
    const e = leakFor({ red: 0.12, cyan: 0.03 }, 0.15);
    expect(e.level).toBe("ghost");
    expect(e.inStrong).toBeCloseTo(0.8, 5);
    expect(e.inWeak).toBeCloseTo(0.0045, 5);
    expect(leakFor({ red: 0.005, cyan: LEAK_FAINT }, 1).level).toBe("ghost");
  });
  it("calls it high when the ghost is as bright as the stronger eye's own picture", () => {
    expect(leakFor({ red: 0.15, cyan: 0 }, 0.15).level).toBe("high");
    expect(leakFor({ red: 0.12, cyan: 0.03 }, 0.1).level).toBe("high");
    /* the same glasses are not "high" for a member whose two eyes are shown alike */
    expect(leakFor({ red: 0.2, cyan: 0.05 }, 1).level).toBe("ghost");
  });
  it("puts the published range for red-cyan glasses on LCD screens either side of the line at the starting level", () => {
    /* Woods and Harris 2010: 7.7% to 24.3% through the red lens */
    expect(leakFor({ red: 0.077, cyan: 0.002 }, STARTING_CONTRAST).level).toBe("ghost");
    expect(leakFor({ red: 0.243, cyan: 0.077 }, STARTING_CONTRAST).level).toBe("high");
    expect(LEAK_SUSPECT).toBeGreaterThan(0.268);
  });
  it("never gets better as a leak grows, and never worse as the member's contrast rises", () => {
    const rank = { clean: 0, ghost: 1, high: 2 };
    const leaks = steps(0, 0.6, 0.02), cons = steps(MIN_CONTRAST, 1, 0.05);
    for (const con of cons) for (const cyan of [0, 0.05]) for (let i = 1; i < leaks.length; i++)
      expect(rank[leakFor({ red: leaks[i], cyan }, con).level]).toBeGreaterThanOrEqual(rank[leakFor({ red: leaks[i - 1], cyan }, con).level]);
    for (const red of leaks) for (let i = 1; i < cons.length; i++)
      expect(rank[leakFor({ red, cyan: 0.03 }, cons[i]).level]).toBeLessThanOrEqual(rank[leakFor({ red, cyan: 0.03 }, cons[i - 1]).level]);
  });
  it("keeps the contrast inside the engine's limits", () => {
    expect(leakFor({ red: 0.04, cyan: 0 }, 0).inStrong).toBeCloseTo(0.04 / MIN_CONTRAST, 5);
    expect(leakFor({ red: 0.04, cyan: 0.5 }, 7).inWeak).toBeCloseTo(0.5, 5);
  });
});

describe("ink balance from two matches", () => {
  it("takes the middle of two matches", () => {
    expect(inkFromMatches([0.5, 0.6])).toEqual({ ok: true, value: 0.55, spread: 0.1 });
  });
  it("cancels the grown-up's own eye difference when the glasses are turned round", () => {
    const ink = 0.5, own = 0.08;
    const r = inkFromMatches([ink + own, ink - own]);
    expect(r.ok && r.value).toBe(0.5);
  });
  it("refuses matches that are too far apart or off the scale", () => {
    expect(inkFromMatches([0.2, 0.2 + INK_APART + 0.05])).toEqual({ ok: false, why: "apart" });
    expect(inkFromMatches([1.3, 1.2])).toEqual({ ok: false, why: "range" });
    expect(inkFromMatches([1.1, 1.15])).toEqual({ ok: false, why: "range" });
    expect(inkFromMatches([NaN, 0])).toEqual({ ok: false, why: "range" });
  });
  it("says how many times brighter the cyan ink looks", () => {
    expect(inkTimes(0)).toBe(1);
    expect(inkTimes(SRGB_INK_BALANCE)).toBeCloseTo(0.7874 / 0.2126, 5);
    expect(inkTimes(-0.3)).toBeLessThan(1);
  });
  it("is drawn with the same contrasts as the balance check-up", () => {
    expect(balanceContrasts(0.5).cyan).toBeCloseTo(Math.pow(10, -0.5), 10);
    expect(balanceContrasts(0.5).red).toBe(1);
  });
  it("restates a balance value for a new gamma without moving what was on the screen", () => {
    expect(regammaBalance(0.4, 2.2, 2.2)).toBe(0.4);
    for (const x of [-0.9, -0.5, -0.2]) for (const [from, to] of [[2.2, 2.6], [2.2, 1.8], [2.4, 2]]) {
      const drawn = channel(Math.pow(10, x), from);
      expect(Math.abs(channel(Math.pow(10, regammaBalance(x, from, to)), to) - drawn)).toBeLessThanOrEqual(1);
    }
  });
});

/** The rule as it stood before calibration existed, kept here to prove that nothing moves until an ink balance is measured. */
function before(m: Measured): Pick<Derived, "weak" | "cyanEye" | "con" | "conSource"> {
  const gap = m.eyes.L.va - m.eyes.R.va;
  let weak: Eye | null = Math.abs(gap) >= 0.195 ? (gap > 0 ? "L" : "R") : null;
  let con = 1;
  let conSource: Derived["conSource"] = "equal";
  if (m.bal) {
    const x = m.bal.x;
    if (Math.abs(x) < 0.1) { con = 1; conSource = "balance_equal"; }
    else { weak = x < 0 ? m.bal.cyanEye : other(m.bal.cyanEye); con = Math.max(0.05, Math.pow(10, -Math.abs(x))); conSource = "balance"; }
  } else if (weak) { con = 0.15; conSource = "starting_level"; }
  if (!m.tested) conSource = "default";
  return { weak, cyanEye: weak ?? m.bal?.cyanEye ?? "L", con, conSource };
}

const person = (leftVa: number, rightVa: number, bal: Measured["bal"], inkBalance?: number | null): Measured => ({
  ...standardMeasured(), tested: true, eyes: { L: { ...blankEye(), va: leftVa }, R: { ...blankEye(), va: rightVa } }, bal, inkBalance,
});
const pick = ({ weak, cyanEye, con, conSource }: Derived) => ({ weak, cyanEye, con, conSource });

describe("ink balance in the eye profile", () => {
  const xs = steps(-1.3, 1.3, 0.05);

  it("changes nothing until it is measured", () => {
    for (const none of [undefined, null, 0, NaN]) for (const [l, r] of [[0, 0], [0.5, 0], [0, 0.3]]) for (const cyanEye of ["L", "R"] as const) {
      for (const x of xs) {
        const m = person(l, r, { x, cyanEye }, none);
        expect(pick(derive(m))).toEqual(before(m));
      }
      const skipped = person(l, r, null, none);
      expect(pick(derive(skipped))).toEqual(before(skipped));
    }
    expect(pick(derive({ ...standardMeasured(), inkBalance: undefined }))).toEqual(before(standardMeasured()));
  });

  it("reads the member's own share the way ownBalance does", () => {
    expect(ownBalance(-0.82)).toBe(-0.82);
    expect(ownBalance(-0.82, null)).toBe(-0.82);
    expect(ownBalance(0.5, 0.5)).toBe(0);
    expect(ownBalance(0.2, 0.5)).toBeCloseTo(-0.3, 10);
    for (const ink of [-0.3, 0, 0.3, 0.57]) for (const x of xs) {
      const own = ownBalance(x, ink), d = derive(person(0, 0, { x, cyanEye: "L" }, ink));
      expect(d.weak).toBe(Math.abs(own) < 0.1 ? null : own < 0 ? "L" : "R");
    }
  });

  it("stops calling two equal eyes unequal on a screen whose cyan ink is the brighter one", () => {
    const raw = { x: 0.5, cyanEye: "L" } as const;
    expect(pick(derive(person(0, 0, raw)))).toMatchObject({ weak: "R", conSource: "balance" });
    expect(pick(derive(person(0, 0, raw, 0.5)))).toEqual({ weak: null, cyanEye: "L", con: 1, conSource: "balance_equal" });
  });

  it("leaves a clearly weaker eye behind the cyan lens exactly as it was", () => {
    const raw = { x: -0.82, cyanEye: "L" } as const;
    const plain = derive(person(0.5, 0, raw)), measured = derive(person(0.5, 0, raw, 0.5));
    expect(measured.weak).toBe("L");
    expect(measured.con).toBeCloseTo(plain.con, 10);
    expect(measured.con).toBeCloseTo(0.151, 3);
  });

  it("keeps a mildly weaker eye behind the cyan lens as the weaker one", () => {
    /* own share -0.3, inks +0.5: the check-up reads +0.2, which on its own points at the other eye */
    const raw = { x: 0.2, cyanEye: "L" } as const;
    expect(derive(person(0.2, 0, raw)).weak).toBe("R");
    const d = derive(person(0.2, 0, raw, 0.5));
    expect(d.weak).toBe("L"); expect(d.cyanEye).toBe("L"); expect(d.con).toBe(1);
  });

  it("sets the balance point for a weaker eye that was behind the red lens", () => {
    /* own share +0.6, inks +0.3: with the lenses the right way round the balance point is 10^(0.3 - 0.6) */
    const d = derive(person(0, 0, { x: 0.9, cyanEye: "L" }, 0.3));
    expect(d.weak).toBe("R"); expect(d.cyanEye).toBe("R");
    expect(d.con).toBeCloseTo(Math.pow(10, -0.3), 10);
  });

  it("keeps contrast between the floor and full, and never lets the stronger eye pull harder than the weaker", () => {
    for (const ink of steps(-1, 1, 0.1)) for (const cyanEye of ["L", "R"] as const) for (const x of xs) {
      const d = derive(person(0, 0, { x, cyanEye }, ink)), own = Math.abs(ownBalance(x, ink));
      expect(d.con).toBeGreaterThanOrEqual(MIN_CONTRAST);
      expect(d.con).toBeLessThanOrEqual(1);
      /* pull of the stronger eye's picture next to the weaker eye's: its contrast, its ink's brightness, its own advantage */
      if (d.weak && Math.pow(10, ink - own) >= MIN_CONTRAST) expect(d.con * Math.pow(10, own - ink)).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it("lowers contrast, or holds it, as the member's own difference grows", () => {
    for (const ink of [-0.4, 0, 0.3, 0.57]) {
      let last = 1;
      for (const own of steps(0.1, 1.3, 0.05)) {
        const d = derive(person(0, 0, { x: ink - own, cyanEye: "L" }, ink));
        expect(d.con).toBeLessThanOrEqual(last + 1e-12);
        last = d.con;
      }
    }
  });

  it("never raises the starting level to make up for a dim red ink", () => {
    for (const ink of [-0.5, 0.3, 0.57, 1]) {
      const d = derive(person(0.5, 0, null, ink));
      expect(d.con).toBe(STARTING_CONTRAST); expect(d.conSource).toBe("starting_level");
    }
  });
});
