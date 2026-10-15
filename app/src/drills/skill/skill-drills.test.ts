/**
 * Plays the six skill drills: with random input at three screen sizes (nothing throws, every number is sane and
 * only the agreed keys are reported), then the way a member would (right answers reach a good measure, wrong
 * ones do not), then on a surface that records what was drawn, with letters about as wide as Verdana's, to
 * check what nobody can see from here: that words and shapes stay inside the frame and do not sit on each other.
 */
import { describe, expect, it, vi } from "vitest";
import { help, words } from "@/copy/drills-skill";
import { AUTO_KEYS } from "@/data/guides";
import { CONTRAST_BACKGROUND } from "@/engine";
import { H, W, makeKit, sizeKit, type GameDef, type GameProps, type Kit } from "@/games/kit";
import { SIM_PROPS, seeded, simulate } from "@/games/sim";
import { OTHER, rig } from "@/games/skills/test-rig";
import { blindSideSweeps } from "./blind-side-sweeps";
import { contrastAt, contrastLadder, greyOf, LAST as FAINTEST } from "./contrast-ladder";
import { crowdingDrill, gapAt, lastStep, lay as clusterLay } from "./crowding-drill";
import { drills } from "./index";
import { arcsecOf, lineUpDrill, pixel } from "./line-up-drill";
import { seeBothLights } from "./see-both-lights";
import { limits, nearer, lay as ringLay, stereogramPairs } from "./stereogram-pairs";

vi.setConfig({ testTimeout: 120_000 });

const SLUGS = ["contrast-ladder", "crowding-drill", "line-up-drill", "see-both-lights", "stereogram-pairs", "blind-side-sweeps"];
const WIDTHS = [360, 640, 1280], KIT_KEYS = ["hits", "misses", "level", "top"];
/** What a member would call a sensible number, by key. */
const SANE: Record<string, [number, number]> = {
  contrast_pct: [1, 60], gap_x: [0.2, 3], error_arcsec: [1, 20000], checks: [1, 10000], both_pct: [0, 100],
  cross_cm: [1.5, 12], relax_cm: [1.5, 5.5], found: [1, 10000], find_s_blind: [0.2, 120], find_s_seeing: [0.2, 120],
};

describe("every skill drill", () => {
  it("is registered under its exercise slug, with a line of help", () => {
    expect(Object.keys(drills).sort()).toEqual([...SLUGS].sort());
    for (const slug of SLUGS) expect(help[slug].length).toBeGreaterThan(40);
  });

  for (const slug of SLUGS) {
    it(`${slug}: two minutes of random input at three sizes: nothing throws, every number is sane, only its own keys`, () => {
      for (const width of WIDTHS) for (const seed of [3, 41]) for (const skill of [0.02, 0.3]) {
        const r = simulate(drills[slug], { seconds: 120, seed, skill, width });
        expect(r.frames).toBe(7200);
        for (const [key, v] of Object.entries(r.stats)) {
          expect(Number.isFinite(v), `${slug} ${key}`).toBe(true);
          if (KIT_KEYS.includes(key)) continue;
          expect(AUTO_KEYS[slug], `${slug} reported ${key}`).toContain(key);
          expect(v, `${slug} ${key} at ${width}`).toBeGreaterThanOrEqual(SANE[key][0]);
          expect(v, `${slug} ${key} at ${width}`).toBeLessThanOrEqual(SANE[key][1]);
        }
        /* Stronger-eye ink is dimmed for some members: only the drill done with the glasses may use it. */
        if (slug === "see-both-lights") { expect(r.inks.weak).toBeGreaterThan(0); expect(r.inks.strong).toBeGreaterThan(0); }
        else expect(r.inks.strong, `${slug} used stronger-eye ink`).toBe(0);
        expect(r.inks.both).toBeGreaterThan(0);
      }
    });
    it(`${slug}: a member who needs very large targets still gets a drill that runs`, () => {
      for (const width of WIDTHS) expect(() => simulate(drills[slug], { seconds: 30, seed: 5, skill: 0.3, width, props: { targetPx: 60, letterPx: 40 } })).not.toThrow();
    });
  }

  it("reports nothing before anything was measured", () => {
    for (const slug of SLUGS) {
      const r = simulate(drills[slug], { seconds: 20, seed: 1, skill: 0 });
      expect(Object.keys(r.stats).sort(), slug).toEqual([...KIT_KEYS].sort());
    }
  });
});

/* ───────────── played the way a member would ───────────── */

describe("contrast ladder", () => {
  const answer = (g: ReturnType<typeof rig<ReturnType<typeof contrastLadder.init>>>, right: boolean) => {
    g.step(70);
    g.step(1, { press: (g.s.lean < 0) === right ? "left" : "right" });
  };
  it("starts at 60%, steps down by a quarter after two right and up after one wrong", () => {
    const g = rig(contrastLadder);
    expect(contrastAt(0)).toBeCloseTo(0.6);
    answer(g, true);
    expect(g.s.step).toBe(0);
    expect(g.k.stats.contrast_pct).toBeUndefined();
    answer(g, true);
    expect(g.s.step).toBe(1);
    expect(contrastAt(1)).toBeCloseTo(0.45);
    expect(g.k.stats.contrast_pct).toBe(60);
    answer(g, false);
    expect(g.s.step).toBe(0);
    expect(g.k.stats.contrast_pct).toBe(60);
  });
  it("a member who answers right reaches the 1% floor and stays there; taps on the two halves work too", () => {
    const g = rig(contrastLadder);
    for (let n = 0; n < 2 * FAINTEST + 6; n++) answer(g, true);
    expect(g.s.step).toBe(FAINTEST);
    expect(contrastAt(g.s.step)).toBe(0.01);
    expect(g.k.stats.contrast_pct).toBe(1);
    const t = rig(contrastLadder);
    for (let n = 0; n < 8; n++) { t.step(70); t.step(1, { tap: [t.s.lean < 0 ? 90 : W - 90, 200] }); }
    expect(t.k.stats.contrast_pct).toBeLessThan(30);
  });
  it("a member who answers wrong reports nothing, and one who guesses stays near the top", () => {
    const g = rig(contrastLadder);
    for (let n = 0; n < 40; n++) answer(g, false);
    expect(g.s.step).toBe(0);
    expect(g.k.stats.contrast_pct).toBeUndefined();
    expect(g.k.score).toBe(0);
  });
  it("ignores an answer while a new patch is still easing in, and never shows two patches inside 0.9 s", () => {
    const g = rig(contrastLadder);
    g.step(70);
    g.step(1, { press: g.s.lean < 0 ? "left" : "right" });
    const at = g.k.t;
    for (let f = 0; f < 60 && g.s.done; f++) g.step(1, { press: "left" });
    expect(g.k.t - at).toBeGreaterThanOrEqual(0.5 - 1e-9);
    const score = g.k.score, born = g.s.born;
    g.step(10, { press: g.s.lean < 0 ? "left" : "right" });
    expect(g.k.score).toBe(score);
    expect(g.s.born).toBe(born);
  });
  it("draws stripes whose light averages to the field's", () => {
    expect(greyOf(0.5)).toBe(CONTRAST_BACKGROUND);
    const light = (v: number) => (v / 255) ** 2.2;
    for (const c of [0.6, 0.25, 0.05]) {
      const mean = (light(greyOf(0.5 * (1 + c))) + light(greyOf(0.5 * (1 - c)))) / 2;
      expect(mean).toBeCloseTo(0.5, 2);
      expect(greyOf(0.5 * (1 + c))).toBeGreaterThan(greyOf(0.5 * (1 - c)));
    }
    /* At the floor an 8-bit screen still shows a step either side of the field. */
    expect(greyOf(0.5 * 1.01)).toBeGreaterThan(greyOf(0.5 * 0.99));
  });
});

describe("crowding drill", () => {
  const answer = (g: ReturnType<typeof rig<ReturnType<typeof crowdingDrill.init>>>, right: boolean) => {
    g.step(60);
    g.step(1, { press: right ? g.s.way : OTHER[g.s.way] });
  };
  it("starts at 3 letter widths, closes by a fifth after two right and opens after one wrong", () => {
    const g = rig(crowdingDrill), wide = clusterLay(g.k).widest;
    expect(wide).toBe(3);
    expect(gapAt(wide, 0)).toBe(3);
    answer(g, true);
    expect(g.k.stats.gap_x).toBeUndefined();
    answer(g, true);
    expect(g.s.step).toBe(1);
    expect(gapAt(wide, 1)).toBeCloseTo(2.4);
    expect(g.k.stats.gap_x).toBe(3);
    answer(g, false);
    expect(g.s.step).toBe(0);
    answer(g, false);
    expect(g.s.step).toBe(0);
    expect(gapAt(wide, -3)).toBe(3);
  });
  it("a member who answers right reaches the 0.2 floor; one who answers wrong reports nothing", () => {
    for (const width of WIDTHS) {
      const g = rig(crowdingDrill, {}, width), last = lastStep(clusterLay(g.k).widest);
      for (let n = 0; n < 2 * last + 6; n++) answer(g, true);
      expect(g.s.step).toBe(last);
      expect(g.k.stats.gap_x).toBe(0.2);
    }
    const w = rig(crowdingDrill);
    for (let n = 0; n < 40; n++) answer(w, false);
    expect(w.k.stats.gap_x).toBeUndefined();
  });
  it("keeps the letters at the member's own letter height on a small screen, and starts closer in instead", () => {
    const phone = rig(crowdingDrill, {}, 360), L = clusterLay(phone.k);
    expect(L.size).toBeGreaterThanOrEqual(phone.k.letter * 0.95);
    expect(L.widest).toBeGreaterThanOrEqual(1 - 1e-9);
    expect(L.widest).toBeLessThan(3);
    const wide = rig(crowdingDrill, {}, 1280), B = clusterLay(wide.k);
    expect(B.size).toBeCloseTo(1.5 * wide.k.letter);
    expect(B.widest).toBe(3);
  });
  it("takes a tap on the side the arms point to", () => {
    const g = rig(crowdingDrill);
    const at: Record<string, [number, number]> = { left: [40, H / 2], right: [W - 40, H / 2], up: [W / 2, 70], down: [W / 2, H - 20] };
    for (let n = 0; n < 6; n++) { g.step(60); g.step(1, { tap: at[g.s.way] }); }
    expect(g.k.score).toBe(6);
  });
  it("keeps the whole cluster under the score line and above the words at every size", () => {
    for (const width of WIDTHS) for (const targetPx of [18, 60]) {
      const g = rig(crowdingDrill, { targetPx }, width), L = clusterLay(g.k), reach = L.size * (1.5 + L.widest);
      expect(L.cy - reach).toBeGreaterThanOrEqual(30 + g.k.letter);
      expect(L.cy + reach).toBeLessThanOrEqual(L.f.top);
      expect(L.cx - reach).toBeGreaterThanOrEqual(14);
    }
  });
});

describe("line-up drill", () => {
  type Rig = ReturnType<typeof rig<ReturnType<typeof lineUpDrill.init>>>;
  /** Nudges the lower line a pixel at a time until no further nudge would help, then presses OK. */
  const lineUp = (g: Rig) => {
    g.step(40);
    for (let n = 0; n < 400 && Math.abs(g.s.off) > pixel(g.k) / 2; n++) g.step(1, { press: g.s.off > 0 ? "left" : "right" });
    g.step(1, { action: true });
    g.step(70);
  };
  it("a member who lines the pairs up gets an average miss at the limit of the screen", () => {
    for (const width of WIDTHS) {
      const g = rig(lineUpDrill, {}, width);
      lineUp(g); lineUp(g);
      expect(g.k.stats.error_arcsec).toBeUndefined();
      lineUp(g);
      expect(g.s.trials).toBe(3);
      expect(g.k.stats.error_arcsec).toBeGreaterThanOrEqual(Math.floor(g.k.pxArcsec / 2));
      expect(g.k.stats.error_arcsec).toBeLessThanOrEqual(Math.ceil(g.k.pxArcsec));
    }
  });
  it("a member who presses OK without lining up gets a large miss", () => {
    const g = rig(lineUpDrill);
    for (let n = 0; n < 5; n++) { g.step(40); g.step(1, { action: true }); g.step(70); }
    expect(g.s.trials).toBe(5);
    expect(g.k.stats.error_arcsec).toBeGreaterThan(arcsecOf(g.k, 0.02 * W) - 1);
    expect(g.k.stats.error_arcsec).toBeGreaterThan(20 * g.k.pxArcsec);
  });
  it("works out the miss as an angle: 1 cm at 50 cm is 4125 seconds of arc, and never finer than half a pixel", () => {
    const g = rig(lineUpDrill);
    expect(arcsecOf(g.k, g.k.perCm)).toBeCloseTo(4125, -1);
    g.s.off = 0;
    g.step(40);
    g.step(1, { action: true });
    expect(g.s.done?.miss).toBeCloseTo(g.k.pxArcsec / 2);
    expect(g.s.done?.floored).toBe(true);
  });
  it("averages the last eight pairs only", () => {
    const g = rig(lineUpDrill);
    for (let n = 0; n < 8; n++) { g.step(40); g.step(1, { action: true }); g.step(70); }
    const careless = g.k.stats.error_arcsec;
    for (let n = 0; n < 8; n++) lineUp(g);
    expect(g.s.misses.length).toBe(8);
    expect(g.k.stats.error_arcsec).toBeLessThan(careless / 10);
  });
  it("moves by touch: a tap is one pixel, a held finger slides, and a tap on the OK spot confirms", () => {
    const g = rig(lineUpDrill);
    g.step(40);
    const start = g.s.off;
    g.step(1, { tap: [W - 60, 150] });
    expect(g.s.off - start).toBeCloseTo(pixel(g.k));
    g.step(1, { tap: [60, 150] });
    expect(g.s.off).toBeCloseTo(start);
    g.step(90, { down: [60, 150] });
    expect(g.s.off).toBeLessThan(start - 5);
    const held = g.s.off;
    g.step(5);
    expect(g.s.off).toBe(held);
    g.step(1, { tap: [W / 2, 266] });
    expect(g.s.trials).toBe(1);
    expect(g.s.off).toBe(held);
  });
  it("ignores a second OK straight after a new pair", () => {
    const g = rig(lineUpDrill);
    g.step(40);
    g.step(1, { action: true });
    for (let f = 0; f < 80; f++) g.step(1, { action: true });
    expect(g.s.trials).toBe(1);
  });
});

describe("see both lights", () => {
  type Rig = ReturnType<typeof rig<ReturnType<typeof seeBothLights.init>>>;
  const play = (g: Rig, press: "left" | "right", seconds = 120) => {
    const waits: number[] = [];
    let last = 0;
    for (let f = 0; f < seconds * 60; f++) {
      const open = g.s.asked !== null;
      if (open && last >= 0) { waits.push(g.k.t - last); last = -1; }
      g.step(1, open ? { press } : {});
      if (open && g.s.asked === null) last = g.k.t;
    }
    return waits;
  };
  it("asks every 8 to 12 seconds; a member who sees two lights every time scores 100%", () => {
    const g = rig(seeBothLights), waits = play(g, "right");
    expect(g.k.stats.checks).toBeGreaterThanOrEqual(9);
    expect(g.k.stats.both_pct).toBe(100);
    expect(Math.min(...waits)).toBeGreaterThanOrEqual(8 - 0.02);
    expect(Math.max(...waits)).toBeLessThanOrEqual(12 + 0.02);
  });
  it("a member who sees one light every time scores 0%, and a mix gives the share", () => {
    const g = rig(seeBothLights);
    play(g, "left");
    expect(g.k.stats.both_pct).toBe(0);
    expect(g.k.stats.checks).toBeGreaterThanOrEqual(9);
    const m = rig(seeBothLights);
    play(m, "right", 45);
    const two = m.k.stats.checks;
    play(m, "left", 200);
    expect(m.k.stats.both_pct).toBe(Math.round((100 * two) / m.k.stats.checks));
    expect(m.k.stats.both_pct).toBeLessThan(40);
  });
  it("keeps the question until it is answered, and takes no answer when there is no question", () => {
    const g = rig(seeBothLights);
    g.step(60 * 5, { press: "right" });
    for (let f = 0; f < 60 * 3; f++) g.step(1, { press: "right" });
    expect(g.k.stats.checks).toBeUndefined();
    g.step(60 * 60);
    expect(g.s.asked).not.toBeNull();
    expect(g.k.stats.checks).toBeUndefined();
    g.step(1, { tap: [W - 80, 200] });
    expect(g.k.stats.checks).toBe(1);
    expect(g.k.stats.both_pct).toBe(100);
  });
});

describe("stereogram pairs", () => {
  type Rig = ReturnType<typeof rig<ReturnType<typeof stereogramPairs.init>>>;
  /** Waits for the rings to settle, then answers. Returns the gap the answer was given at. */
  const answer = (g: Rig, how: "right" | "wrong" | "none") => {
    g.step(200);
    const near = nearer(g.s.mode, g.s.inward), at = g.s.shown;
    g.step(1, how === "none" ? { press: "down" } : { press: (how === "right") === near ? "left" : "right" });
    return at;
  };
  it("knows which way the dot floats: inward dots are nearer with relaxed eyes and farther with crossed eyes", () => {
    expect(nearer("relax", true)).toBe(true);
    expect(nearer("relax", false)).toBe(false);
    expect(nearer("cross", true)).toBe(false);
    expect(nearer("cross", false)).toBe(true);
  });
  it("starts at 2 cm, widens by 0.5 cm after a right answer, narrows after a wrong one, and changes the way every 6 answers", () => {
    const g = rig(stereogramPairs);
    expect(g.s.mode).toBe("cross");
    expect(answer(g, "right")).toBeCloseTo(2);
    expect(g.k.stats.cross_cm).toBe(2);
    expect(answer(g, "right")).toBeCloseTo(2.5);
    expect(answer(g, "wrong")).toBeCloseTo(3);
    expect(answer(g, "right")).toBeCloseTo(2.5);
    expect(g.k.stats.cross_cm).toBe(2.5);
    answer(g, "right");
    answer(g, "right");
    expect(g.k.stats.cross_cm).toBe(3.5);
    expect(answer(g, "right")).toBeCloseTo(2);
    expect(g.s.mode).toBe("relax");
    expect(g.k.stats.relax_cm).toBe(2);
    expect(g.s.gap.cross).toBeCloseTo(4);
  });
  it("a member who joins the rings reaches a wide gap each way; one who answers wrong or cannot join does not", () => {
    const g = rig(stereogramPairs);
    for (let n = 0; n < 60; n++) answer(g, "right");
    const lim = limits(g.k);
    expect(g.k.stats.cross_cm).toBeCloseTo(lim.cross, 1);
    expect(g.k.stats.cross_cm).toBeGreaterThanOrEqual(6);
    expect(g.k.stats.relax_cm).toBeCloseTo(lim.relax, 1);
    for (const how of ["wrong", "none"] as const) {
      const w = rig(stereogramPairs);
      for (let n = 0; n < 30; n++) answer(w, how);
      expect(w.k.stats.cross_cm).toBeUndefined();
      expect(w.k.stats.relax_cm).toBeUndefined();
      expect(w.s.gap.cross).toBeCloseTo(limits(w.k).floor);
      expect(w.k.score).toBe(0);
    }
  });
  it("never draws the relaxing gap past 5.5 cm, or past the kit's 4 cm limit for turning out, at any size or distance", () => {
    for (const width of [360, 640, 1280, 1920]) for (const distCm of [35, 50, 300]) {
      const g = rig(stereogramPairs, { distCm, ppc: distCm > 100 ? 12 : 40 }, width);
      let relax = 0, cross = 0;
      for (let n = 0; n < 72; n++) {
        answer(g, "right");
        for (let f = 0; f < 90; f++) {
          g.step(1);
          if (g.s.mode === "relax") relax = Math.max(relax, g.s.shown, g.s.gap.relax); else cross = Math.max(cross, g.s.shown);
        }
      }
      expect(relax).toBeLessThanOrEqual(5.5);
      expect(relax).toBeLessThanOrEqual((g.k.divMax * g.k.distCm) / 100 + 1e-9);
      expect(relax).toBeLessThanOrEqual(4 + 1e-9);
      expect(cross).toBeLessThanOrEqual(Math.min(12, (0.4 * W) / g.k.perCm) + 1e-9);
      expect(g.k.stats.relax_cm).toBeLessThanOrEqual(5.5);
      /* The two rings never touch and never leave the scene. */
      const lim = limits(g.k);
      expect(lim.floor * g.k.perCm).toBeGreaterThan(2 * ringLay(g.k).r);
      expect(lim.floor).toBeLessThanOrEqual(2);
      expect(lim.cross * g.k.perCm).toBeLessThanOrEqual(0.4 * W + 1e-9);
    }
  });
  it("slides the rings no faster than 2 prism dioptres a second while the way stays the same", () => {
    const g = rig(stereogramPairs);
    let last = g.s.shown, mode = g.s.mode, most = 0;
    for (let n = 0; n < 5; n++) {
      answer(g, "right");
      for (let f = 0; f < 120; f++) { g.step(1); if (g.s.mode === mode) most = Math.max(most, Math.abs(g.s.shown - last)); last = g.s.shown; mode = g.s.mode; }
    }
    expect(most).toBeGreaterThan(0);
    expect((most * 60 * 100) / g.k.distCm).toBeLessThanOrEqual(2 + 1e-6);
  });
  it("takes a tap on the Cannot join box as that, not as an answer", () => {
    const g = rig(stereogramPairs);
    g.step(200);
    g.step(1, { tap: [W / 2, H - 40] });
    expect(g.s.done).toEqual({ at: g.k.t, right: null });
    expect(g.k.stats.cross_cm).toBeUndefined();
  });
});

describe("blind-side sweeps", () => {
  type Rig = ReturnType<typeof rig<ReturnType<typeof blindSideSweeps.init>>>;
  const sideOf = (g: Rig) => (g.s.dot!.x < W / 2 ? "left" : "right") as "left" | "right";
  it("waits for the member to say which side is hard to see before it shows a dot", () => {
    const g = rig(blindSideSweeps);
    g.step(600);
    expect(g.s.side).toBe(0);
    expect(g.s.dot).toBeNull();
    g.step(1, { tap: [W - 100, 200] });
    expect(g.s.side).toBe(1);
  });
  it("a member who finds the dots is timed on each side; about 7 dots in 10 are on the hard side", () => {
    const g = rig(blindSideSweeps);
    g.step(1, { press: "left" });
    let hard = 0, n = 0;
    const gaps: number[] = [];
    let gone = -1;
    for (let f = 0; f < 60 * 600; f++) {
      const dot = g.s.dot;
      /* The scripted member needs a second to find a dot on the hard side and half a second on the other. */
      const ready = dot && g.k.t - dot.born >= (dot.x < W / 2 ? 1 : 0.5);
      g.step(1, ready ? { press: sideOf(g) } : {});
      if (dot && !g.s.dot) { n++; if (dot.x < W / 2) hard++; gone = g.k.t; }
      if (!dot && g.s.dot && gone >= 0) gaps.push(g.k.t - gone);
    }
    expect(n).toBeGreaterThan(150);
    expect(g.k.stats.found).toBe(n);
    expect(hard / n).toBeGreaterThan(0.6);
    expect(hard / n).toBeLessThan(0.8);
    expect(g.k.stats.find_s_blind).toBeCloseTo(1, 1);
    expect(g.k.stats.find_s_seeing).toBeCloseTo(0.5, 1);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(1 - 0.02);
    expect(Math.max(...gaps)).toBeLessThanOrEqual(2 + 0.02);
  });
  it("reports a side's average only after three finds on that side, and counts a tap on the dot as a find", () => {
    const g = rig(blindSideSweeps);
    g.step(1, { press: "right" });
    const seen = { blind: 0, seeing: 0 };
    for (let f = 0; f < 60 * 120 && seen.blind + seen.seeing < 12; f++) {
      const dot = g.s.dot;
      if (dot && g.k.t - dot.born >= 0.5) {
        const before = { blind: seen.blind, seeing: seen.seeing };
        g.step(1, { tap: [dot.x + 8, dot.y - 8] });
        seen[dot.x > W / 2 ? "blind" : "seeing"]++;
        if (before.blind < 3 && seen.blind < 3) expect(g.k.stats.find_s_blind).toBeUndefined();
        if (before.seeing < 3 && seen.seeing < 3) expect(g.k.stats.find_s_seeing).toBeUndefined();
      } else g.step(1);
    }
    expect(g.k.stats.found).toBe(12);
    expect(g.k.stats.find_s_blind).toBeGreaterThanOrEqual(0.5);
  });
  it("a wrong side or a tap elsewhere is quiet: nothing is found and the dot stays", () => {
    const g = rig(blindSideSweeps);
    g.step(1, { press: "left" });
    g.step(200);
    const dot = { ...g.s.dot! };
    for (let n = 0; n < 20; n++) { g.step(30); g.step(1, { press: OTHER[sideOf(g)] }); }
    g.step(1, { tap: [dot.x < W / 2 ? W - 60 : 60, 200] });
    expect(g.s.dot).toEqual(dot);
    expect(g.k.stats.found).toBeUndefined();
    expect(g.k.score).toBe(0);
  });
  it("places every dot clear of the edges, the score line, the words and the middle", () => {
    for (const width of WIDTHS) for (const targetPx of [18, 60]) {
      const g = rig(blindSideSweeps, { targetPx }, width);
      g.step(1, { press: "left" });
      for (let f = 0; f < 60 * 240; f++) {
        const dot = g.s.dot;
        g.step(1, dot && g.k.t - dot.born > 0.3 ? { press: sideOf(g) } : {});
        if (!dot) continue;
        const r = Math.min(12 * g.k.k, 30);
        expect(dot.x - r).toBeGreaterThanOrEqual(14);
        expect(dot.x + r).toBeLessThanOrEqual(W - 14);
        expect(dot.y - r).toBeGreaterThanOrEqual(30 + g.k.letter);
        expect(dot.y + r).toBeLessThanOrEqual(H - 14);
        expect(Math.abs(dot.x - W / 2)).toBeGreaterThan(r + 14);
      }
    }
  });
});

/* ───────────── what was drawn ───────────── */

interface Word { s: string; x0: number; x1: number; y0: number; y1: number; size: number }
interface Shot { words: Word[]; discs: [number, number, number][]; boxes: [number, number, number, number][]; arrows: number }

/**
 * A drawing surface that keeps what was drawn in the frame. Letters are taken as 0.7 of their height wide,
 * a little wider than Verdana Bold runs on average, so a line that fits here fits on a screen.
 */
function film<S>(def: GameDef<S>, width: number, over: Partial<GameProps> = {}) {
  const shot: Shot = { words: [], discs: [], boxes: [], arrows: 0 };
  let font = "", align = "left", nested = 0;
  const size = () => Number(/([\d.]+)px/.exec(font)?.[1] ?? 10);
  const wide = (s: string) => s.length * size() * 0.7;
  const own: Record<string | symbol, unknown> = {
    measureText: (s: string) => ({ width: wide(s) }),
    fillText: (s: string, x: number, y: number) => {
      const w = wide(s), x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
      shot.words.push({ s, x0, x1: x0 + w, y0: y - size() * 0.78, y1: y + size() * 0.22, size: size() });
    },
    save: () => { nested++; }, restore: () => { nested--; }, closePath: () => { shot.arrows++; },
    arc: (x: number, y: number, r: number) => { if (!nested) shot.discs.push([x, y, r]); },
    fillRect: (x: number, y: number, w: number, h: number) => { if (!nested) shot.boxes.push([x, y, w, h]); },
    createRadialGradient: () => ({ addColorStop: () => undefined }),
  };
  const surface = new Proxy(own, {
    get: (o, key) => (key in o ? o[key] : () => undefined),
    set: (o, key, v) => { if (key === "font") font = String(v); else if (key === "textAlign") align = String(v); else o[key] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  const p = { ...SIM_PROPS, ...over }, k = makeKit(p, () => surface, 1, seeded(23));
  sizeKit(k, p, def.target ?? 20, width, 2);
  const s = def.init(k), rand = seeded(width + 5);
  const snap = () => { shot.words = []; shot.discs = []; shot.boxes = []; shot.arrows = 0; def.draw(k, s); return shot; };
  /** One frame with random input, as the simulator gives it. */
  const step = (busy: number) => {
    k.dt = 1 / 60; k.t += k.dt;
    const i = k.input;
    i.tapped = i.action = false; i.pressed.clear(); i.dx = 0; i.down = false;
    if (rand() < busy) {
      i.x = rand() * W; i.y = rand() * H; i.tapped = rand() < 0.5; i.action = rand() < 0.2;
      if (rand() < 0.6) i.pressed.add((["left", "right", "up", "down"] as const)[Math.floor(rand() * 4)]);
    }
    def.update(k, s);
  };
  return { k, s, snap, step };
}

/** Everything drawn stays inside the frame and under the score line, and no two lines of words overlap. */
function tidy(k: Kit, shot: Shot, label: string) {
  for (const w of shot.words) {
    expect(w.x0, `${label}: "${w.s}" runs off the left`).toBeGreaterThanOrEqual(14);
    expect(w.x1, `${label}: "${w.s}" runs off the right`).toBeLessThanOrEqual(W - 14);
    expect(w.y1, `${label}: "${w.s}" runs off the bottom`).toBeLessThanOrEqual(H - 12);
    expect(w.y0, `${label}: "${w.s}" runs off the top`).toBeGreaterThanOrEqual(12);
    /* Words are never shrunk past reading: 9 scene units is 5 px on a 360 px phone, so ask for much more than that. */
    expect(w.size, `${label}: "${w.s}" is too small`).toBeGreaterThanOrEqual(Math.min(k.letter, 20) * 0.9);
  }
  shot.words.forEach((a, n) => shot.words.slice(n + 1).forEach((b) => {
    const apart = a.x1 <= b.x0 || b.x1 <= a.x0 || a.y1 <= b.y0 + 0.5 || b.y1 <= a.y0 + 0.5;
    expect(apart, `${label}: "${a.s}" sits on "${b.s}"`).toBe(true);
  }));
  const score = 30 + k.letter - 1;
  for (const [x, y, r] of shot.discs) {
    expect(x - r, `${label}: a round shape off the left`).toBeGreaterThanOrEqual(13);
    expect(x + r, `${label}: a round shape off the right`).toBeLessThanOrEqual(W - 13);
    expect(y - r, `${label}: a round shape over the score line`).toBeGreaterThanOrEqual(score);
    expect(y + r, `${label}: a round shape off the bottom`).toBeLessThanOrEqual(H - 13);
  }
  for (const [x, y, w, h] of shot.boxes) {
    expect(x, `${label}: a box off the left`).toBeGreaterThanOrEqual(13);
    expect(x + w, `${label}: a box off the right`).toBeLessThanOrEqual(W - 13);
    expect(y, `${label}: a box over the score line`).toBeGreaterThanOrEqual(score);
    expect(y + h, `${label}: a box off the bottom`).toBeLessThanOrEqual(H - 13);
  }
  /* No shape sits on a line of words (the score line is clear of shapes already). */
  for (const w of shot.words) {
    if (w.y1 < score) continue;
    for (const [x, y, r] of shot.discs) {
      const clear = x + r <= w.x0 || x - r >= w.x1 || y + r <= w.y0 || y - r >= w.y1;
      expect(clear, `${label}: a round shape sits on "${w.s}"`).toBe(true);
    }
  }
}

describe("what is drawn", () => {
  const sizes: [number, Partial<GameProps>][] = [[360, {}], [400, { letterPx: 16 }], [640, {}], [1280, {}], [360, { targetPx: 34 }], [640, { targetPx: 60, letterPx: 40 }], [1920, { ppc: 12, distCm: 300 }]];

  for (const slug of SLUGS) {
    it(`${slug}: the first frame and every later one keep words and shapes inside the frame and off each other`, () => {
      for (const [width, over] of sizes) {
        const f = film(drills[slug], width, over), label = `${slug} at ${width}`;
        const first = f.snap();
        tidy(f.k, first, `${label}, first frame`);
        /* The still picture explains the drill: its status line, at least one more line of words, and a picture. */
        expect(first.words.length, `${label}: words in the first frame`).toBeGreaterThanOrEqual(2);
        expect(first.discs.length + first.boxes.length + first.arrows, `${label}: a picture in the first frame`).toBeGreaterThan(0);
        for (let n = 0; n < 60 * 90; n++) { f.step(0.05); if (n % 7 === 0) tidy(f.k, f.snap(), `${label}, frame ${n}`); }
      }
    });
  }

  it("uses only words from the copy file, in plain letters", () => {
    const all = Object.values(words).flatMap((w) => Object.values(w));
    expect(all.length).toBeGreaterThan(30);
    /* No emoji, no symbols a TV font may lack. */
    for (const s of [...all, ...Object.values(help)]) expect(s, s).toMatch(/^[A-Za-z0-9 .,:?'-]+$/);
  });

  it("draws the stripes leaning the way the answer says", () => {
    const turns: number[] = [];
    const g = rig(contrastLadder), ctx = g.k.ctx("both") as unknown as { rotate: (a: number) => void };
    ctx.rotate = (a: number) => { turns.push(a); };
    g.step(1);
    /* A turn clockwise (above zero) tips the top of the stripes to the right. */
    expect(Math.sign(turns[turns.length - 1])).toBe(g.s.lean);
    expect(Math.abs(turns[turns.length - 1])).toBeCloseTo((20 * Math.PI) / 180);
  });
});
