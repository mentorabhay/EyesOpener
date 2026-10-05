import { describe, expect, it } from "vitest";
import { CLIP_DEFS, OFFERED, clipDef, clipTest, type OfferedClip } from "@/data/clips";
import { clipState, lookOutcome, planSet, resolveClip, shapeKey, type ClipPerson, type ResolveCtx, type Resolved, type SetPerson } from "./clip-rules";

const def = (code: string) => clipDef(code) as OfferedClip;
const guardian: ClipPerson = { block: null, guardian: true, adult: true, cameraAllowed: true, dist: 60 };
const screen = { ppc: 37.8, dist: 60, gamma: 2.2 };
const ctx: ResolveCtx = { screen, cyanEye: "L", lensMatches: {} };
const ok = (code: string, data: unknown, with_: Partial<ResolveCtx> = {}) => {
  const r = resolveClip(def(code), data, { ...ctx, ...with_ });
  if (!r.ok) throw new Error(`${code} refused: ${r.why}`);
  return r as Resolved;
};
const why = (code: string, data: unknown, with_: Partial<ResolveCtx> = {}) => {
  const r = resolveClip(def(code), data, { ...ctx, ...with_ });
  return r.ok ? "accepted" : r.why;
};

describe("who may run a clip, and where", () => {
  it("offers nothing that is written down as not offered", () => {
    for (const d of CLIP_DEFS.filter((x) => !x.offered)) expect(clipState(d, guardian)).toBe("withheld");
  });

  it("keeps a cheer seat and a child under 4 out of every clip", () => {
    for (const d of OFFERED) {
      expect(clipState(d, { ...guardian, block: "seat" }), d.code).toBe("seat");
      expect(clipState(d, { ...guardian, block: "under_age" }), d.code).toBe("under_age");
    }
  });

  it("lets only a guardian change the household's screen", () => {
    const child = { ...guardian, guardian: false };
    for (const code of ["C01", "C02", "C03", "C08", "C09", "C14", "C16", "C18"]) {
      expect(clipState(def(code), child), code).toBe("guardian");
    }
    expect(clipState(def("C01"), guardian)).toBeNull();
    expect(clipState(def("C06"), child)).toBeNull();
    expect(clipState(def("M04"), child)).toBeNull();
  });

  it("needs a measured screen for anything drawn to size, and never guesses a distance", () => {
    const none = { ...guardian, dist: null };
    for (const code of ["C01", "C28", "M04", "M11", "M20", "M28", "M37", "M51", "M56", "M60", "M70"]) expect(clipState(def(code), none), code).toBe("no_screen");
    /* done away from the screen, or with no drawing at true size */
    for (const code of ["C06", "C21", "M24", "M47", "M63", "M64", "M65", "M66"]) expect(clipState(def(code), none), code).toBeNull();
  });

  it("runs a near clip only within arm's reach and a far clip only across the room", () => {
    const at = (dist: number) => ({ ...guardian, dist });
    expect(clipState(def("M04"), at(60))).toBeNull();
    expect(clipState(def("M04"), at(100))).toBeNull();
    expect(clipState(def("M04"), at(150))).toBe("need_near");
    expect(clipState(def("M04"), at(250))).toBe("need_near");
    expect(clipState(def("M01"), at(60))).toBe("need_far");
    expect(clipState(def("M01"), at(150))).toBe("need_far");
    expect(clipState(def("M01"), at(200))).toBeNull();
    expect(clipState(def("M43"), at(250))).toBeNull();
    expect(clipState(def("M37"), at(250))).toBe("need_near");
    /* a clip that names no distance runs wherever the screen stands */
    for (const dist of [40, 150, 300]) expect(clipState(def("M28"), at(dist))).toBeNull();
  });

  it("needs a guardian's consent for the camera, and reads habits only for a grown-up's profile", () => {
    for (const code of ["C04", "C05", "M67", "M68"]) expect(clipState(def(code), { ...guardian, cameraAllowed: false }), code).toBe("camera");
    const child = { ...guardian, adult: false, guardian: false };
    expect(clipState(def("M67"), child)).toBe("adult");
    expect(clipState(def("M68"), child)).toBe("adult");
    expect(clipState(def("C05"), child)).toBeNull();
    expect(clipState(def("M67"), guardian)).toBeNull();
  });
});

describe("what the browser may send", () => {
  it("has a shape for every offered clip, and refuses anything else", () => {
    for (const d of OFFERED) {
      expect(shapeKey(d), d.code).toBeTruthy();
      for (const junk of [null, undefined, 3, "x", {}, { value: "1" }, { answers: "all" }, []]) {
        expect(resolveClip(d, junk, ctx).ok, `${d.code} accepted ${JSON.stringify(junk)}`).toBe(false);
      }
    }
  });

  it("stores nothing when there is no measured screen for a clip that needs one", () => {
    expect(why("M04", { value: 0.2, note: "" }, { screen: null })).toBe("no_screen");
    expect(why("M28", { px: 2, dpr: 1, note: "", trials: 8, reversals: 2 }, { screen: null })).toBe("no_screen");
    expect(ok("M64", { answers: Array(15).fill(1) }, { screen: null }).rows[0].value).toBe(15);
  });
});

describe("what a finished clip stores", () => {
  it("stores every row under a key the clip names, inside that key's range", () => {
    const samples: Record<string, unknown> = {
      M01: { value: 0.1, note: "" }, M06: { value: 0.3, note: "" }, M08: { value: 0.4, note: "floor" }, M10: { value: 0.5, note: "" },
      M11: { value: 1.2, note: "", dpr: 1 }, M17: { x: -0.4 }, M18: { x: -0.82 }, M19: { x: 0.1 },
      M20: { dots: 4, bottom: "mix" }, M22: { seen: Array(16).fill(true), falseYes: 0, radiusDeg: 8 }, M23: { value: 1.5, note: "", dpr: 1 },
      M28: { px: 2, dpr: 1, note: "", trials: 9, reversals: 3 }, M29: { px: 4, dpr: 1, note: "", trials: 9, reversals: 3 }, M30: { px: 1, dpr: 1, note: "floor", trials: 6, reversals: 0 },
      M32: { px: 8, dpr: 1, note: "", trials: 9, reversals: 3 },
      M34: { limit: 6.5, rate: 1, tries: [{ break: 6.5, recovery: 6.5, atLimit: true }, { break: 5, recovery: 3, atLimit: false }, { break: 6.5, recovery: 6.5, atLimit: true }] },
      M45: { cycles: 9.5, turnIn: 6, turnOut: 1.5 }, M47: { tries: [6, 7, 9] }, M48: { times: [2.2, null, 3.1] }, M49: { held: 41.7, demand: 6 },
      M50: { before: [38, 40, 36], after: [20, 18, 22], dpr: 1, held: 120, demand: 6 }, M51: { offsets: [38, 36, 41], dpr: 1 }, M53: { offsets: [-4, -6, -5], dpr: 1 }, M54: { offsets: [2, 1, 3], dpr: 1 },
      M56: { cells: [3, 44, 45] }, M58: { percent: 0.5, note: "" }, M60: { seen: [...Array(22).fill(true), false, false], falseYes: 1, radiusDeg: 9.5 },
      M62: { found: 14, blind: 2.4, seeing: 1.3 }, M63: { words: 110, seconds: 33 }, M64: { answers: Array(15).fill(2) }, M65: { answers: Array(10).fill(3) }, M66: { answers: Array(6).fill(4) },
      M67: { blinks: 14, seconds: 56 }, M68: { cm: 54.4, seconds: 60 }, M70: { on: 71.6, seconds: 60 },
    };
    for (const [code, data] of Object.entries(samples)) {
      const d = def(code), r = ok(code, data);
      expect(r.outcome, code).toBe("saved");
      expect(r.rows.length, code).toBeGreaterThan(0);
      const keys = d.store.to === "result" ? d.store.keys : [];
      for (const row of r.rows) {
        expect(keys, `${code} stored ${row.testKey}`).toContain(row.testKey);
        const t = clipTest(row.testKey)!;
        expect(row.value, `${code} ${row.testKey}`).toBeGreaterThanOrEqual(t.range[0]);
        expect(row.value, `${code} ${row.testKey}`).toBeLessThanOrEqual(t.range[1]);
        expect(row.raw.clip).toBe(code);
        /* a one-eye clip names its eye; a two-eye clip never does */
        expect(row.eye, code).toBe("eye" in d.play && d.play.eye !== "both" ? d.play.eye : null);
      }
    }
  });

  it("works every value out on the server, from what was measured", () => {
    /* the middle try, not the mean */
    expect(ok("M47", { tries: [6, 7, 12] }).rows[0].value).toBe(7);
    /* depth: dots to arc seconds through the member's own screen (one dot is 91 arc seconds here) */
    expect(ok("M28", { px: 2, dpr: 1, note: "", trials: 9, reversals: 3 }).rows[0].value).toBeCloseTo(181.9, 0);
    /* fusion range: the medians, and "floor" when the median sits at the screen's limit */
    const f = ok("M34", { limit: 6.5, rate: 1, tries: [{ break: 6.5, recovery: 6.5, atLimit: true }, { break: 5, recovery: 3, atLimit: false }, { break: 6.5, recovery: 6.5, atLimit: true }] });
    expect(f.rows.map((r) => [r.testKey, r.value, r.note])).toEqual([["diverge_break", 6.5, "floor"], ["diverge_recovery", 6.5, "floor"]]);
    expect(f.rows[0].raw).toMatchObject({ way: "out", rate: 1, limit: 6.5 });
    /* resting position: 38 dots to the right is 1 cm, 1.7 prism dioptres turned out */
    expect(ok("M51", { offsets: [38, 36, 41], dpr: 1 }).rows[0].value).toBeCloseTo(-1.7, 1);
    expect(ok("M53", { offsets: [-4, -6, -5], dpr: 1 }).rows[0].value).toBeCloseTo(0.2, 1);
    /* the shift after a hold: from 1.7 out to 0.9 out is 0.8 toward turning in */
    expect(ok("M50", { before: [38, 40, 36], after: [20, 18, 22], dpr: 1, held: 120, demand: 6 }).rows[0].value).toBeCloseTo(0.8, 1);
    expect(ok("M63", { words: 110, seconds: 33 }).rows[0].value).toBe(200);
    expect(ok("M67", { blinks: 14, seconds: 56 }).rows[0].value).toBe(15);
    expect(ok("M60", { seen: [...Array(22).fill(true), false, false], falseYes: 1, radiusDeg: 9.5 }).rows[0]).toMatchObject({ value: 2, raw: { missed: [22, 23], falseYes: 1 } });
    expect(ok("M56", { cells: [45, 3, 44] }).rows[0]).toMatchObject({ value: 3, eye: "R", raw: { cells: [3, 44, 45] } });
    expect(ok("M49", { held: 60, demand: 6 }).rows[0]).toMatchObject({ value: 60, note: "floor" });
    expect(ok("M49", { held: 41.7, demand: 6 }).rows[0]).toMatchObject({ value: 41, note: "" });
  });

  it("reads the four-dot check exactly as the suppression check-up does", () => {
    expect(ok("M20", { dots: 4, bottom: "red" }).rows[0]).toMatchObject({ testKey: "suppression", value: 0 });
    expect(ok("M20", { dots: 5, bottom: null }).rows[0].value).toBe(1);
    /* two dots: the eye behind the cyan lens was not seen; here that is the left eye */
    expect(ok("M20", { dots: 2, bottom: null }).rows[0]).toMatchObject({ value: 2, raw: { unseenLens: "cyan", unseenEye: "L" } });
    expect(ok("M20", { dots: 3, bottom: null }, { cyanEye: "R" }).rows[0].raw).toMatchObject({ unseenLens: "red", unseenEye: "L" });
    expect(why("M20", { dots: 4, bottom: null })).toBe("invalid");
    expect(why("M20", { dots: 3, bottom: "red" })).toBe("invalid");
  });

  it("keeps a banded depth result only when the finest step read lies inside the band", () => {
    const stair = { dpr: 1, trials: 9, reversals: 3 };
    expect(ok("M25", { px: 8, note: "", ...stair }).rows[0]).toMatchObject({ testKey: "stereo", note: "" });
    expect(ok("M25", { px: 4, note: "floor", ...stair })).toMatchObject({ outcome: "note", rows: [], say: "finer" });
    expect(ok("M25", { px: 35, note: "worse", ...stair }).rows[0]).toMatchObject({ testKey: "stereo", note: "worse" });
    expect(ok("M26", { px: 4, note: "worse", ...stair })).toMatchObject({ outcome: "note", rows: [], say: "coarser" });
    expect(ok("M26", { px: 1, note: "floor", ...stair }).rows[0]).toMatchObject({ testKey: "stereo", note: "floor" });
    expect(ok("M27", { px: 1, note: "floor", ...stair }).rows[0].note).toBe("floor");
    /* the whole test, like the check-up: "floor" only ever means one dot */
    expect(why("M28", { px: 4, note: "floor", ...stair })).toBe("invalid");
  });

  it("refuses what cannot be true", () => {
    /* stripes too fine for this screen from this seat */
    expect(why("M15", { value: 1.2, note: "", dpr: 1 })).toBe("cannot_draw");
    expect(ok("M15", { value: 1.2, note: "", dpr: 2 }).rows[0].testKey).toBe("stripes_fine");
    /* "yes" twice with nothing shown */
    expect(why("M60", { seen: Array(24).fill(true), falseYes: 2, radiusDeg: 9 })).toBe("unsure");
    expect(why("M22", { seen: Array(24).fill(true), falseYes: 0, radiusDeg: 9 })).toBe("invalid");
    /* a passage "read" faster than anyone reads */
    expect(why("M63", { words: 110, seconds: 4 })).toBe("too_fast");
    expect(why("M67", { blinks: 4, seconds: 12 })).toBe("too_few");
    expect(why("M45", { cycles: null, turnIn: 0, turnOut: 0 })).toBe("too_few");
    expect(why("M62", { found: 2, blind: null, seeing: null })).toBe("too_few");
    /* a recovery beyond its own break, a break beyond the screen's limit */
    const tries = (b: number, r: number) => Array(3).fill({ break: b, recovery: r, atLimit: false });
    expect(why("M37", { limit: 20, rate: 1, tries: tries(8, 12) })).toBe("invalid");
    expect(why("M37", { limit: 6, rate: 1, tries: tries(9, 2) })).toBe("invalid");
    expect(why("M37", { limit: 20, rate: 3, tries: tries(8, 4) })).toBe("invalid");
    expect(why("M56", { cells: [3, 3] })).toBe("invalid");
    expect(why("M64", { answers: Array(15).fill(5) })).toBe("invalid");
    expect(why("M65", { answers: Array(15).fill(1) })).toBe("invalid");
    expect(ok("M48", { times: [null, null, null] })).toMatchObject({ outcome: "note", rows: [], say: "never_split" });
  });

  it("sets the screen's size and distance only inside what a real screen gives", () => {
    expect(ok("C01", { ppc: 41.26 })).toMatchObject({ screen: { pxPerCm: 41.3 }, rows: [] });
    expect(why("C01", { ppc: 400 })).toBe("invalid");
    /* a 43-inch TV shown at 1920 page dots; the 20 cm ruler measures 20 cm */
    expect(ok("C02", { inches: 43, widthPx: 1920, heightPx: 1080, shownCm: 20, measuredCm: 20 }).screen?.pxPerCm).toBeCloseTo(20.2, 1);
    expect(ok("C02", { inches: 43, widthPx: 1920, heightPx: 1080, shownCm: 20, measuredCm: 25 }).screen?.pxPerCm).toBeCloseTo(16.1, 1);
    expect(why("C02", { inches: 43, widthPx: 1920, heightPx: 1080, shownCm: 20, measuredCm: 45 })).toBe("range");
    expect(why("C02", { inches: 100, widthPx: 800, heightPx: 600, shownCm: 20, measuredCm: 20 })).toBe("range");
    expect(ok("C03", { cm: 240 }).screen).toEqual({ distanceCm: 240 });
    expect(why("C03", { cm: 20 })).toBe("invalid");
    expect(why("C03", { cm: 62.5 })).toBe("invalid");
    expect(ok("C04", { cm: 41.6, pictures: 60 }).screen).toEqual({ distanceCm: 42 });
    expect(why("C04", { cm: 18, pictures: 60 })).toBe("range");
  });

  it("hands the colour checks to the screen colours rules, both lenses together", () => {
    expect(ok("C18", { greys: [182, 190] }).step).toEqual({ step: "gamma", greys: [182, 190] });
    expect(ok("C16", { xs: [0.3, 0.36], turned: true }).step).toEqual({ step: "ink", xs: [0.3, 0.36], turned: true });
    expect(ok("C14", { red: [80, 84], cyan: "unseen" }).step).toEqual({ step: "leak", red: [80, 84], cyan: "unseen" });
    /* one lens alone is kept as a note until the other is matched */
    const half = ok("C09", { match: [80, 84] });
    expect(half).toMatchObject({ outcome: "note", say: "other_lens", detail: { lens: "red", match: [80, 84] } });
    expect(half.step).toBeUndefined();
    expect(half.detail.leak).toBeGreaterThan(0.05);
    /* with the other lens on record, both are saved */
    expect(ok("C09", { match: [80, 84] }, { lensMatches: { cyan: [20, 24] } }).step).toEqual({ step: "leak", red: [80, 84], cyan: [20, 24] });
    expect(ok("C08", { match: "unseen" }, { lensMatches: { red: [80, 84], cyan: [20, 24] } }).step).toEqual({ step: "leak", red: [80, 84], cyan: "unseen" });
    /* two matches of one lens that disagree are not one reading */
    expect(why("C09", { match: [20, 160] })).toBe("apart");
  });

  it("judges a look-and-answer clip by its worst answer", () => {
    expect(lookOutcome("edges", [0])).toBe("pass");
    expect(lookOutcome("edges", [1])).toBe("fail");
    expect(lookOutcome("black_steps", [1, 0])).toBe("pass");
    expect(lookOutcome("black_steps", [2, 0])).toBe("note");
    expect(lookOutcome("black_steps", [0, 1])).toBe("fail");
    expect(lookOutcome("picture_mode", [3, 0])).toBe("pass");
    expect(lookOutcome("smoothing", [4, 0])).toBe("pass");
    expect(lookOutcome("sighting", [1])).toBe("note");
    expect(lookOutcome("edges", [7])).toBeNull();
    expect(lookOutcome("edges", [0, 0])).toBeNull();
    expect(ok("C06", { answers: [1] })).toMatchObject({ outcome: "fail", rows: [], detail: { scene: "edges", answers: [1] } });
    expect(why("C17", { answers: [0] })).toBe("invalid");
  });

  it("reports the browser's own timing and the screen's finest depth step as notes", () => {
    expect(ok("C25", { fps: 60, late: 0.01, frames: 590 }).outcome).toBe("pass");
    expect(ok("C25", { fps: 60, late: 0.06, frames: 590 }).outcome).toBe("note");
    expect(ok("C25", { fps: 31, late: 0.3, frames: 300 }).outcome).toBe("fail");
    expect(ok("C28", { dpr: 1 }).detail.arcsec).toBeCloseTo(91, 0);
    expect(ok("C28", { dpr: 2 }).detail.arcsec).toBeCloseTo(45.5, 0);
    expect(ok("C05", { atCm: 55, readCm: 54.6 })).toMatchObject({ outcome: "pass", rows: [] });
  });
});

describe("sets", () => {
  const near: SetPerson = { ...guardian, age: 34, due: [] };
  const codes = (p: SetPerson, key: Parameters<typeof planSet>[0]) => planSet(key, p).items.map((i) => i.code);

  it("sets up a near screen with the card and a far screen with the ruler, and leaves TV checks to the TV", () => {
    const desk = codes(near, "screen"), tv = codes({ ...near, dist: 250 }, "screen");
    expect(desk.slice(0, 2)).toEqual(["C01", "C03"]);
    expect(tv.slice(0, 2)).toEqual(["C02", "C03"]);
    for (const code of ["C06", "C23", "C24"]) { expect(desk).not.toContain(code); expect(tv).toContain(code); }
    expect(tv).not.toContain("C04");
    expect(desk).toContain("C05");
    expect(desk).not.toContain("C14");
    expect(desk).not.toContain("C26");
  });

  it("never asks for the camera inside a set", () => {
    const noCamera = codes({ ...near, cameraAllowed: false }, "screen");
    expect(noCamera).not.toContain("C04");
    expect(noCamera).not.toContain("C05");
  });

  it("keeps a clip that needs a guardian in the list, with its reason", () => {
    const plan = planSet("screen", { ...near, guardian: false });
    expect(plan.items.find((i) => i.code === "C01")?.blocked).toBe("guardian");
    expect(plan.items.find((i) => i.code === "C13")?.blocked).toBeNull();
  });

  it("plays the weekly check from what is due, by the clip that stores under each check-up's key", () => {
    const lazy = planSet("weekly", { ...near, age: 12, due: ["acuity", "balance", "stereo", "suppression"] });
    expect(lazy.items.map((i) => i.code)).toEqual(["M05", "M04", "M18", "M28", "M20"]);
    expect(lazy.checkups).toEqual([]);
    /* a young child gets the animal shapes; a far screen gets the far clips */
    expect(codes({ ...near, age: 6, due: ["balance"] }, "weekly")).toEqual(["M19"]);
    expect(codes({ ...near, dist: 250, due: ["acuity", "fusion_break", "suppression"] }, "weekly")).toEqual(["M02", "M01", "M43", "M21"]);
    expect(codes({ ...near, due: ["near_point", "fusion_break", "symptoms"] }, "weekly")).toEqual(["M47", "M37", "M64"]);
    expect(planSet("weekly", near)).toEqual({ items: [], checkups: [] });
  });

  it("sends a due check-up with no clip of its own, or one this screen cannot play as a clip, to the check-up itself", () => {
    expect(planSet("weekly", { ...near, due: ["contrast", "symptoms"] })).toEqual({ items: [{ code: "M64", blocked: null }], checkups: ["contrast"] });
    const between = planSet("weekly", { ...near, dist: 150, due: ["acuity", "stereo"] });
    expect(between.items.map((i) => i.code)).toEqual(["M28"]);
    expect(between.checkups).toEqual(["acuity"]);
  });

  it("plays one of each main measurement before an eye-test visit", () => {
    expect(codes(near, "visit")).toEqual(["M05", "M04", "M18", "M20", "M28", "M37", "M47", "M56", "M57", "M64"]);
    expect(codes({ ...near, dist: 250 }, "visit")).toEqual(["M02", "M01", "M18", "M21", "M28", "M43", "M47", "M56", "M57", "M64"]);
    /* with no measured screen every clip that draws to size is listed with its reason, and the rest still run */
    const none = planSet("visit", { ...near, dist: null });
    expect(none.items.filter((i) => !i.blocked).map((i) => i.code)).toEqual(["M47", "M64"]);
    expect(none.items.find((i) => i.code === "M28")?.blocked).toBe("no_screen");
  });
});
