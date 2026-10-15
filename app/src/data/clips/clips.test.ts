import { describe, expect, it } from "vitest";
import { PATTERNS } from "@/clips/patterns";
import { stepsOf } from "@/clips/steps";
import { clips as copy, meaningOf, reading, usedFor } from "@/copy/clips";
import { clips, tests } from "@/data";
import { CLIPS, CLIP_DEFS, CLIP_TESTS, LOOKS, OFFERED, SETS, TEMPLATES, UNITS, clipDef, clipTest, type OfferedClip } from "./index";
import { CHECKUP_CLIPS, YOUNG_BALANCE } from "./sets";

const offered = (code: string) => clipDef(code) as OfferedClip;

describe("the clip definitions", () => {
  it("has exactly one definition for every one of the 100 catalogue codes, and no other", () => {
    expect(clips).toHaveLength(100);
    expect(CLIP_DEFS.map((d) => d.code).sort()).toEqual(clips.map((c) => c.code).sort());
    expect(new Set(CLIP_DEFS.map((d) => d.code)).size).toBe(100);
    expect(CLIPS).toHaveLength(100);
    expect(clips.filter((c) => c.code.startsWith("C"))).toHaveLength(30);
    expect(clips.filter((c) => c.code.startsWith("M"))).toHaveLength(70);
  });

  it("plays every offered clip with a template that exists", () => {
    for (const d of OFFERED) expect(TEMPLATES, d.code).toContain(d.play.template);
    /* and every template plays at least one clip: none is dead */
    for (const t of TEMPLATES) expect(OFFERED.some((d) => d.play.template === t), t).toBe(true);
  });

  it("stores every result under a known key with a known unit", () => {
    for (const d of OFFERED) {
      if (d.store.to !== "result") continue;
      expect(d.store.keys.length, d.code).toBeGreaterThan(0);
      for (const key of d.store.keys) {
        const t = clipTest(key);
        expect(t, `${d.code} stores under ${key}`).toBeDefined();
        expect(UNITS, `${d.code} ${key}`).toContain(t!.unit);
        expect(t!.range[0], key).toBeLessThan(t!.range[1]);
      }
    }
  });

  it("keeps the nine check-ups' own keys and units, so one quantity has one history", () => {
    for (const t of tests) expect(clipTest(t.key)).toMatchObject({ unit: t.unit, perEye: t.perEye, checkup: true });
    expect(CLIP_TESTS.filter((t) => t.checkup)).toHaveLength(tests.length);
    expect(new Set(CLIP_TESTS.map((t) => t.key)).size).toBe(CLIP_TESTS.length);
    /* a clip played by a check-up's own part stores under that check-up's key */
    expect(offered("M04").store).toEqual({ to: "result", keys: ["acuity"] });
    expect(offered("M18").store).toEqual({ to: "result", keys: ["balance"] });
    expect(offered("M20").store).toEqual({ to: "result", keys: ["suppression"] });
    expect(offered("M28").store).toEqual({ to: "result", keys: ["stereo"] });
    expect(offered("M37").store).toEqual({ to: "result", keys: ["fusion_break", "fusion_recovery"] });
    expect(offered("M47").store).toEqual({ to: "result", keys: ["near_point"] });
    expect(offered("M64").store).toEqual({ to: "result", keys: ["symptoms"] });
    /* another speed or another direction is another quantity */
    expect(offered("M36").store).toEqual({ to: "result", keys: ["fusion_break_slow", "fusion_recovery_slow"] });
    expect(offered("M34").store).toEqual({ to: "result", keys: ["diverge_break", "diverge_recovery"] });
  });

  it("tests one eye at a time only under a key that is kept for each eye", () => {
    for (const d of OFFERED) {
      if (d.store.to !== "result" || !("eye" in d.play)) continue;
      const oneEye = d.play.eye !== "both";
      for (const key of d.store.keys) expect(clipTest(key)!.perEye, `${d.code} ${key}`).toBe(oneEye);
    }
  });

  it("gives a plain reason for every clip that is not offered, and offers the rest", () => {
    const withheld = CLIP_DEFS.filter((d) => !d.offered);
    expect(withheld.map((d) => d.code)).toEqual(["C26", "M55", "M69"]);
    for (const d of withheld) expect(!d.offered && d.why.length, d.code).toBeGreaterThan(80);
    expect(OFFERED).toHaveLength(97);
  });

  it("says how each clip is done and where it comes from", () => {
    for (const d of CLIP_DEFS) {
      expect(d.basis.length, d.code).toBeGreaterThan(30);
      for (const s of d.sources) { expect(s.url, d.code).toMatch(/^https?:\/\/\S+$/); expect(s.label.length, d.code).toBeGreaterThan(20); }
    }
    /* a measurement of the eyes always names the published work it is modelled on */
    for (const d of OFFERED) if (d.code.startsWith("M")) expect(d.sources.length, d.code).toBeGreaterThan(0);
  });

  it("needs the glasses for every clip that shows each eye its own picture, and a measured screen for anything drawn to size", () => {
    for (const d of OFFERED) {
      const p = d.play;
      const twoEye = p.template === "split" || p.template === "hold" || p.template === "align" || p.template === "count"
        || (p.template === "pick" && p.kind !== "wobble") || (p.template === "spots" && p.kind === "map") || (p.template === "choose" && ["dots", "pairs", "animals"].includes(p.kind));
      if (twoEye) expect(d.gear, d.code).toContain("glasses");
      if (["choose", "pick", "spots", "split", "hold", "align", "grid", "count", "find"].includes(p.template)) expect(d.screen, d.code).toBe(true);
      if (d.store.to === "screen") expect(d.who, d.code).toBe("guardian");
      if (d.place === "far") expect(d.gear, d.code).toContain("keys");
    }
    /* a camera reading of habits is for a grown-up's profile only */
    expect(offered("M67").who).toBe("adult");
    expect(offered("M68").who).toBe("adult");
  });

  it("turns the eyes out before in, and never faster than 2 prism dioptres a second", () => {
    for (const d of OFFERED) if (d.play.template === "split") expect(d.play.rate, d.code).toBeLessThanOrEqual(2);
  });
});

describe("look and answer", () => {
  const scenes = OFFERED.flatMap((d) => (d.play.template === "look" ? [[d.code, d.play.scene] as const] : []));

  it("has a picture, steps, questions and advice for every scene", () => {
    expect(scenes.length).toBe(18);
    for (const [code, scene] of scenes) {
      const look = LOOKS[scene];
      expect(look, `${code} ${scene}`).toBeDefined();
      expect(PATTERNS[scene], `${code} ${scene}`).toBeTypeOf("function");
      expect(look.steps.length, scene).toBeGreaterThan(0);
      expect(look.questions.length, scene).toBeGreaterThan(0);
      for (const q of look.questions) expect(q.options.length, scene).toBeGreaterThanOrEqual(2);
      /* every way it can come out has a line to show */
      const tones = new Set(look.questions.flatMap((q) => q.options.map((o) => o.tone)));
      if (tones.has("pass")) expect(look.advice.pass.length, scene).toBeGreaterThan(10);
      if (tones.has("fail")) expect(look.advice.fail.length, scene).toBeGreaterThan(10);
      if (tones.has("note")) expect(look.advice.note?.length ?? 0, scene).toBeGreaterThan(10);
    }
    expect(Object.keys(LOOKS).sort()).toEqual(scenes.map(([, s]) => s).sort());
  });

  it("never draws a picture that flashes: only two scenes move at all", () => {
    /* a still picture gives the same result whatever the time is */
    const calls = (scene: string, t: number) => {
      const seen: string[] = [];
      const g = new Proxy({}, { get: (_, key) => (key === "measureText" ? () => ({ width: 10 }) : (...a: unknown[]) => { seen.push(`${String(key)}:${a.map((x) => (typeof x === "number" ? Math.round(x) : "")).join(",")}`); }), set: () => true }) as unknown as CanvasRenderingContext2D;
      PATTERNS[scene](g, 800, 400, { k: 1, gamma: 2.2, t });
      return seen.join("|");
    };
    for (const scene of Object.keys(PATTERNS)) {
      const moves = calls(scene, 0.1) !== calls(scene, 1.3);
      expect(moves, scene).toBe(scene === "smoothing" || scene === "sync");
    }
  });
});

describe("words", () => {
  it("has a plain line for every code, and steps for every clip that needs them", () => {
    for (const c of clips) expect(copy.what(c.code).length, c.code).toBeGreaterThan(15);
    for (const d of OFFERED) {
      const steps = stepsOf(d);
      const own = d.play.template === "look" || d.play.template === "survey" || (d.play.template === "measure" && d.play.kind === "near_point");
      if (!own) expect(steps.length, d.code).toBeGreaterThanOrEqual(2);
      expect(usedFor(d.store, d.code).length, d.code).toBeGreaterThan(20);
    }
  });

  it("reads every stored key in words with its unit, and says how to read it", () => {
    for (const t of CLIP_TESTS) {
      for (const v of [t.range[0], (t.range[0] + t.range[1]) / 2, t.range[1]]) {
        const s = reading(t.key, t.unit, v, "");
        expect(s.length, t.key).toBeGreaterThan(1);
        expect(s, t.key).not.toMatch(/NaN|undefined/);
      }
      if (!t.checkup) expect(meaningOf(t.key, t.unit).length, t.key).toBeGreaterThan(10);
    }
    expect(reading("alignment_h", "prism_dioptre", -2, "")).toBe("2 prism dioptres, turned out");
    expect(reading("alignment_h", "prism_dioptre", 1.5, "")).toBe("1.5 prism dioptres, turned in");
    expect(reading("alignment_v", "prism_dioptre", 1, "")).toBe("1 prism dioptres, right eye higher");
    expect(reading("diverge_break", "prism_dioptre", 6.5, "floor")).toBe("6.5 prism dioptres or more");
    expect(reading("stereo_hidden", "arcsec", 91, "floor")).toBe("91 arc seconds or finer");
    expect(reading("grid_marks", "count", 0, "")).toBe("No squares marked");
    expect(reading("acuity_crowded", "logMAR", 0.2, "")).toBe("6/9.5");
  });

  it("uses no word a diagnosis would", () => {
    const all = JSON.stringify([copy.says, copy.refused, copy.blocked, copy.grid, Object.values(LOOKS), CLIP_DEFS.map((d) => [d.basis, d.offered ? "" : d.why]), clips.map((c) => copy.what(c.code))], (_, v: unknown) => (typeof v === "function" ? "" : v));
    expect(all).not.toMatch(/\bcure[sd]?\b|\bdiagnos(ed|es)\b|you have (a|an) |\bguarantee/i);
  });
});

describe("sets", () => {
  it("plays only clips that are offered", () => {
    const codes = [...Object.values(SETS).flatMap((s) => s.steps), ...Object.values(CHECKUP_CLIPS).flat(), YOUNG_BALANCE].flatMap((s) => (typeof s === "string" ? [s] : [s.near, s.far]));
    for (const code of codes) expect(clipDef(code)?.offered, code).toBe(true);
  });

  it("plays each check-up by a clip that stores under that check-up's key", () => {
    for (const [test, steps] of Object.entries(CHECKUP_CLIPS)) {
      for (const s of steps) for (const code of typeof s === "string" ? [s] : [s.near, s.far]) {
        const store = offered(code).store;
        expect(store.to === "result" && store.keys[0], `${test} by ${code}`).toBe(test);
      }
    }
    expect(offered(YOUNG_BALANCE).store).toEqual({ to: "result", keys: ["balance"] });
  });

  it("sets the screen's size and seat before anything drawn to size, and the tone curve before the colour matches", () => {
    const order = SETS.screen.steps.map((s) => (typeof s === "string" ? s : s.near));
    expect(order.indexOf("C01")).toBe(0);
    expect(order.indexOf("C03")).toBe(1);
    for (const later of ["C08", "C09", "C16", "C19"]) expect(order.indexOf("C18"), later).toBeLessThan(order.indexOf(later));
    expect(order).not.toContain("C14");
    expect(order).not.toContain("C26");
  });
});
