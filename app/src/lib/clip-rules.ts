// Eyes Opener: The rules of the clips, with no database in them, so they can be tested.
/**
 * The rules of the clips, with no database in them, so they can be tested.
 *
 *  - `clipState`: may this clip run for this person on this screen, and if not, why.
 *  - `resolveClip`: what one finished clip stores. The browser sends only what it measured (answers, matches, dots
 *    on the screen, seconds); every stored value is worked out here, with the engine, from the member's own screen.
 *    A measurement that does not add up stores nothing.
 *  - `planSet`: which clips a set plays for this person on this screen.
 *
 * The database side is src/lib/clips.ts.
 */
import { z } from "zod";
import { LIMITS } from "@/components/measure/limits";
import {
  CATCHES, CATCH_LIMIT, LATE_FINE, LATE_NOTE, RULER_OFF, bandVerdict, canDrawStripes, ppcFromDiagonal, ppcFromRuler,
  prismOfDots, readingSpeed, restingPosition, standOf,
} from "@/clips/maths";
import { LOOKS, clipDef, clipTest, type ClipDef, type Eye, type OfferedClip, type SetKey, type Tone } from "@/data/clips";
import { CHECKUP_CLIPS, SETS, YOUNG_AGE, YOUNG_BALANCE, type SetStep } from "@/data/clips/sets";
import {
  CAL, DEPTH_MAX_REVERSALS, DEPTH_MAX_TRIALS, FUSION_REPEATS, NEAR_POINT_TRIES, SURVEY_QUESTIONS, depthValue, fusionSummary,
  leakFromMatches, median, nearPoint, other, pixelArcsec, suppressionScore, surveyTotal, unseenLens, type CheckNote, type LensMatch,
} from "@/engine";
import type { StepInput } from "./screen-rules";

/* ───────────── may it run ───────────── */

/**
 * Why a clip cannot run now. "camera" is the one a guardian can lift on the clip's own page, by allowing the camera.
 */
export type Blocked = "withheld" | "seat" | "under_age" | "guardian" | "adult" | "no_screen" | "need_near" | "need_far" | "camera";

export interface ClipPerson {
  /** From `testBlock`: a cheer seat may not run a test, and there are no screen check-ups under age 4. */
  block: "seat" | "under_age" | null;
  /** A guardian or co-guardian, not in child mode: may change the household's screen. */
  guardian: boolean;
  /** The active profile is a grown-up's. */
  adult: boolean;
  /** A guardian has allowed the camera for the active profile. */
  cameraAllowed: boolean;
  /** The viewing distance of the household's screen in centimetres, or null when no screen is measured. */
  dist: number | null;
}

export function clipState(def: ClipDef, p: ClipPerson): Blocked | null {
  if (!def.offered) return "withheld";
  if (p.block) return p.block;
  if (def.who === "guardian" && !p.guardian) return "guardian";
  if (def.who === "adult" && !p.adult) return "adult";
  if (p.dist === null) { if (def.screen || def.place !== "any") return "no_screen"; }
  else {
    const stand = standOf(p.dist);
    if (def.place === "near" && stand !== "near") return "need_near";
    if (def.place === "far" && stand !== "far") return "need_far";
  }
  if (def.gear.includes("camera") && !p.cameraAllowed) return "camera";
  return null;
}

/* ───────────── what the browser sends ───────────── */

const within = ([lo, hi]: readonly [number, number]) => z.number().min(lo).max(hi);
const whole = ([lo, hi]: readonly [number, number]) => z.number().int().min(lo).max(hi);
const note = z.enum(["", "floor", "worse"]);
const lens = z.union([z.literal("unseen"), z.tuple([whole(CAL.level), whole(CAL.level)])]);
const demand = within(LIMITS.fusion);
const dots = z.number().int().min(-2000).max(2000);
const seconds = z.number().min(0).max(3600);
const stair = { px: whole(LIMITS.offsetPx), dpr: within(LIMITS.dpr), note, trials: whole([1, DEPTH_MAX_TRIALS]), reversals: whole([0, DEPTH_MAX_REVERSALS]) };

/** The size of each survey: questions, each answered 0 (never) to 4 (always). */
export const SURVEY_SIZE = { near_work: SURVEY_QUESTIONS, screen: 10, dry: 6 } as const;
const answers = (n: number) => z.array(whole(LIMITS.answer)).length(n);
/** Places a spots clip tests: the field of one eye, and the map of the weaker eye. */
export const SPOT_RINGS = { field: 3, map: 2 } as const;

/** The shape of the data for each way a template is set. The key is "template" or "template.kind". */
const SHAPES = {
  look: z.object({ answers: z.array(whole([0, 9])).min(1).max(4) }),
  count: z.object({ dots: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(5)]), bottom: z.enum(["red", "cyan", "mix"]).nullable() }).refine((d) => (d.dots === 4) === (d.bottom !== null)),
  "match.gamma": z.object({ greys: z.tuple([whole(CAL.grey), whole(CAL.grey)]) }),
  "match.leak_cyan": z.object({ match: lens }),
  "match.leak_red": z.object({ match: lens }),
  "match.leak_both": z.object({ red: lens, cyan: lens }),
  "match.ink": z.object({ xs: z.tuple([within(CAL.inkSet), within(CAL.inkSet)]), turned: z.boolean() }),
  "measure.card": z.object({ ppc: within(LIMITS.ppc) }),
  "measure.ruler": z.object({ inches: within([5, 120]), widthPx: whole([200, 20000]), heightPx: whole([200, 20000]), shownCm: within([5, 60]), measuredCm: within([2, 120]) }),
  "measure.seat": z.object({ cm: whole(LIMITS.dist) }),
  "measure.near_point": z.object({ tries: z.array(within(LIMITS.near)).length(NEAR_POINT_TRIES) }),
  "camera.scale": z.object({ atCm: within([30, 120]), readCm: within([10, 300]) }),
  "camera.distance": z.object({ cm: within([10, 400]), pictures: whole([1, 100000]) }),
  "camera.working": z.object({ cm: within([10, 400]), seconds }),
  "camera.blinks": z.object({ blinks: whole([0, 500]), seconds }),
  "auto.frames": z.object({ fps: within([1, 500]), late: within([0, 1]), frames: whole([60, 100000]) }),
  "auto.depth_step": z.object({ dpr: within(LIMITS.dpr) }),
  "choose.letter": z.object({ value: within(LIMITS.va), note }),
  "choose.crowded": z.object({ value: within(LIMITS.va), note }),
  "choose.shapes": z.object({ value: within(LIMITS.va), note }),
  "choose.faint": z.object({ value: within(LIMITS.va), note }),
  "choose.stripes": z.object({ value: within(LIMITS.cs), note, dpr: within(LIMITS.dpr) }),
  "choose.dots": z.object({ x: within(LIMITS.bal) }),
  "choose.pairs": z.object({ x: within(LIMITS.bal) }),
  "choose.animals": z.object({ x: within(LIMITS.bal) }),
  spots: z.object({ seen: z.array(z.boolean()).min(8).max(24), falseYes: whole([0, CATCHES]), radiusDeg: within([1, 10]) }),
  "pick.rings": z.object(stair),
  "pick.hidden": z.object(stair),
  "pick.wobble": z.object({ percent: within([0.05, 20]), note }),
  "split.range": z.object({ limit: demand, rate: within([0.1, 2]), tries: z.array(z.object({ break: demand, recovery: demand, atLimit: z.boolean() })).length(FUSION_REPEATS) })
    .refine((d) => d.tries.every((t) => t.break <= d.limit + 0.05 && t.recovery <= t.break + 0.05)),
  "split.recover": z.object({ times: z.array(within([0, 30]).nullable()).length(FUSION_REPEATS) }),
  "hold.hold": z.object({ held: within([0, 120]), demand }),
  "hold.adapt": z.object({ before: z.array(dots).length(3), after: z.array(dots).length(3), dpr: within(LIMITS.dpr), held: within([0, 120]), demand }),
  "hold.flips": z.object({ cycles: within([0, 60]).nullable(), turnIn: demand, turnOut: demand }),
  align: z.object({ offsets: z.array(dots).length(3), dpr: within(LIMITS.dpr) }),
  grid: z.object({ cells: z.array(whole([0, 399])).max(400) }).refine((d) => new Set(d.cells).size === d.cells.length),
  "find.search": z.object({ found: whole([0, 1000]), blind: within([0, 60]).nullable(), seeing: within([0, 60]).nullable() }),
  "find.track": z.object({ on: within([0, 100]), seconds }),
  read: z.object({ words: whole([1, 2000]), seconds }),
  "survey.near_work": z.object({ answers: answers(SURVEY_SIZE.near_work) }),
  "survey.screen": z.object({ answers: answers(SURVEY_SIZE.screen) }),
  "survey.dry": z.object({ answers: answers(SURVEY_SIZE.dry) }),
} as const;
export type ShapeKey = keyof typeof SHAPES;
export type ClipData<K extends ShapeKey = ShapeKey> = z.infer<(typeof SHAPES)[K]>;

/** The key of a clip's data shape. */
export function shapeKey(def: OfferedClip): ShapeKey {
  const p = def.play;
  const full = p.template === "split" ? `split.${p.mode}` : "kind" in p ? `${p.template}.${p.kind}` : p.template;
  return (full in SHAPES ? full : p.template) as ShapeKey;
}

/* ───────────── what a finished clip stores ───────────── */

export type Outcome = "saved" | "pass" | "note" | "fail" | "na";
/** One row for `test_result`. */
export interface ClipRow { testKey: string; eye: Eye | null; value: number; note: CheckNote; raw: Record<string, unknown> }
/** A change to the household's screen that is not one of the three colour checks. */
export interface ScreenSet { pxPerCm?: number; distanceCm?: number }

export interface Resolved {
  ok: true;
  outcome: Outcome;
  rows: ClipRow[];
  /** A colour check to save through the screen colours rules (src/lib/screen.ts). */
  step?: StepInput;
  screen?: ScreenSet;
  /** What the run record keeps beside its outcome: plain numbers and short words by key. Never a picture. */
  detail: Record<string, unknown>;
  /** A word the result screen reads to pick its sentence, where the outcome alone does not say enough. */
  say?: string;
}
export type Refused = { ok: false; why: "invalid" | "no_screen" | "range" | "apart" | "unsure" | "too_few" | "too_fast" | "cannot_draw" };

export interface ResolveCtx {
  screen: { ppc: number; dist: number; gamma: number } | null;
  /** The eye the cyan lens sits over for this member. */
  cyanEye: Eye;
  /** The matches of each lens that this screen already has: on its own row, or from the other single-lens clip. */
  lensMatches: { red?: LensMatch; cyan?: LensMatch };
}

const sum = (list: readonly number[]) => list.reduce((a, v) => a + v, 0);
/** A lens's matches in the shape the screen colours rules take. */
const plain = (m: LensMatch): [number, number] | "unseen" => (m === "unseen" ? m : [m[0], m[1]]);
const r1 = (v: number) => Math.round(v * 10) / 10;
const worst = (tones: readonly Tone[]): Outcome =>
  (tones.includes("fail") ? "fail" : tones.every((t) => t === "na") ? "na" : tones.includes("note") ? "note" : "pass");

/** The outcome of a "look and answer" clip from the answers given, or null when an answer is not one of the options. */
export function lookOutcome(scene: string, given: readonly number[]): Outcome | null {
  const look = LOOKS[scene];
  if (!look || given.length !== look.questions.length) return null;
  const tones = look.questions.map((q, i) => q.options[given[i]]?.tone);
  return tones.some((t) => !t) ? null : worst(tones as Tone[]);
}

/**
 * What one finished clip stores. `data` is whatever the browser sent; it is checked against the clip's shape first.
 */
export function resolveClip(def: OfferedClip, data: unknown, ctx: ResolveCtx): Resolved | Refused {
  const key = shapeKey(def), parsed = SHAPES[key].safeParse(data);
  if (!parsed.success) return { ok: false, why: "invalid" };
  if (def.screen && !ctx.screen) return { ok: false, why: "no_screen" };
  const s = ctx.screen, play = def.play, keys = def.store.to === "result" ? def.store.keys : [];
  const eye: Eye | null = "eye" in play && play.eye !== "both" ? play.eye : null;
  const base = { clip: def.code, ...(s && def.screen ? { dist: s.dist } : {}) };
  const row = (testKey: string, value: number, n: CheckNote = "", raw: Record<string, unknown> = {}, e: Eye | null = eye): ClipRow => ({ testKey, eye: e, value, note: n, raw: { ...base, ...raw } });
  const saved = (rows: ClipRow[], detail: Record<string, unknown> = {}, say?: string): Resolved => {
    /* nothing outside the range of its own key is ever stored */
    for (const r of rows) { const t = clipTest(r.testKey); if (!t || !Number.isFinite(r.value) || r.value < t.range[0] || r.value > t.range[1]) return { ok: true, outcome: "note", rows: [], detail: { ...detail, outOfRange: r.testKey }, say: "out_of_range" }; }
    return { ok: true, outcome: "saved", rows, detail, say };
  };
  const noted = (outcome: Outcome, detail: Record<string, unknown>, say?: string): Resolved => ({ ok: true, outcome, rows: [], detail, say });
  const d = parsed.data as never;

  switch (key) {
    case "look": {
      const { answers: given } = d as ClipData<"look">, scene = (play as { scene: string }).scene;
      const outcome = lookOutcome(scene, given);
      return outcome ? noted(outcome, { scene, answers: given }) : { ok: false, why: "invalid" };
    }
    case "count": {
      const v = d as ClipData<"count">, unseen = unseenLens(v.dots);
      return saved([row("suppression", suppressionScore(v.dots), "", { dots: v.dots, bottom: v.bottom, cyanEye: ctx.cyanEye, ...(unseen && { unseenLens: unseen, unseenEye: unseen === "cyan" ? ctx.cyanEye : other(ctx.cyanEye) }) })]);
    }

    case "match.gamma": return { ok: true, outcome: "saved", rows: [], step: { step: "gamma", greys: (d as ClipData<"match.gamma">).greys }, detail: {} };
    case "match.ink": { const v = d as ClipData<"match.ink">; return { ok: true, outcome: "saved", rows: [], step: { step: "ink", xs: v.xs, turned: v.turned }, detail: {} }; }
    case "match.leak_both": { const v = d as ClipData<"match.leak_both">; return { ok: true, outcome: "saved", rows: [], step: { step: "leak", red: v.red, cyan: v.cyan }, detail: {} }; }
    case "match.leak_red":
    case "match.leak_cyan": {
      const mine = key === "match.leak_red" ? "red" : "cyan", match = (d as ClipData<"match.leak_red">).match as LensMatch;
      const one = leakFromMatches(match, s!.gamma);
      if (!one.ok) return { ok: false, why: one.why };
      const both = { ...ctx.lensMatches, [mine]: match };
      /* a screen's leak is stored for both lenses together: with one lens matched, the match is kept and the other lens is asked for */
      if (!both.red || !both.cyan) return noted("note", { lens: mine, match, leak: one.value }, "other_lens");
      return { ok: true, outcome: "saved", rows: [], step: { step: "leak", red: plain(both.red), cyan: plain(both.cyan) }, detail: { lens: mine, match, leak: one.value } };
    }

    case "measure.card": return { ok: true, outcome: "saved", rows: [], screen: { pxPerCm: r1((d as ClipData<"measure.card">).ppc) }, detail: {} };
    case "measure.ruler": {
      const v = d as ClipData<"measure.ruler">, first = ppcFromDiagonal(v.inches, v.widthPx, v.heightPx), ppc = ppcFromRuler(first, v.shownCm, v.measuredCm);
      if (Math.abs(v.measuredCm / v.shownCm - 1) > RULER_OFF || ppc < LIMITS.ppc[0] || ppc > LIMITS.ppc[1]) return { ok: false, why: "range" };
      return { ok: true, outcome: "saved", rows: [], screen: { pxPerCm: r1(ppc) }, detail: { inches: v.inches, shownCm: v.shownCm, measuredCm: v.measuredCm } };
    }
    case "measure.seat": return { ok: true, outcome: "saved", rows: [], screen: { distanceCm: (d as ClipData<"measure.seat">).cm }, detail: {} };
    case "measure.near_point": { const { tries } = d as ClipData<"measure.near_point">; return saved([row("near_point", nearPoint(tries), "", { tries })]); }

    case "camera.scale": { const v = d as ClipData<"camera.scale">; return noted("pass", { atCm: v.atCm, readCm: r1(v.readCm) }); }
    case "camera.distance": {
      const cm = Math.round((d as ClipData<"camera.distance">).cm);
      if (cm < LIMITS.dist[0] || cm > LIMITS.dist[1]) return { ok: false, why: "range" };
      return { ok: true, outcome: "saved", rows: [], screen: { distanceCm: cm }, detail: { byCamera: true } };
    }
    case "camera.working": {
      const v = d as ClipData<"camera.working">;
      if (v.seconds < 20) return { ok: false, why: "too_few" };
      return saved([row("working_distance", Math.round(v.cm), "", { seconds: Math.round(v.seconds) })]);
    }
    case "camera.blinks": {
      const v = d as ClipData<"camera.blinks">;
      /* a rate from under half a minute of watching is not a rate */
      if (v.seconds < 30) return { ok: false, why: "too_few" };
      return saved([row("blink_rate", r1((v.blinks * 60) / v.seconds), "", { blinks: v.blinks, seconds: Math.round(v.seconds) })]);
    }

    case "auto.frames": { const v = d as ClipData<"auto.frames">; return noted(v.late <= LATE_FINE ? "pass" : v.late <= LATE_NOTE ? "note" : "fail", { fps: v.fps, late: v.late, frames: v.frames }); }
    case "auto.depth_step": { const v = d as ClipData<"auto.depth_step">; return noted("note", { arcsec: r1(pixelArcsec(s!, v.dpr)), dpr: v.dpr }); }

    case "choose.letter": case "choose.crowded": case "choose.shapes": case "choose.faint": {
      const v = d as ClipData<"choose.letter">;
      return saved([row(keys[0], v.value, v.note)]);
    }
    case "choose.stripes": {
      const v = d as ClipData<"choose.stripes">, cpd = (play as { cpd?: number }).cpd ?? 0;
      if (!canDrawStripes(s!, v.dpr, cpd)) return { ok: false, why: "cannot_draw" };
      return saved([row(keys[0], v.value, v.note, { cpd })]);
    }
    case "choose.dots": case "choose.pairs": case "choose.animals":
      return saved([row(keys[0], (d as ClipData<"choose.dots">).x, "", { cyanEye: ctx.cyanEye }, null)]);

    case "spots": {
      const v = d as ClipData<"spots">, kind = (play as { kind: "field" | "map" }).kind;
      if (v.seen.length !== SPOT_RINGS[kind] * 8) return { ok: false, why: "invalid" };
      if (v.falseYes >= CATCH_LIMIT) return { ok: false, why: "unsure" };
      const missed = v.seen.flatMap((seen, i) => (seen ? [] : [i]));
      return saved([row(keys[0], missed.length, "", { missed, falseYes: v.falseYes, catches: CATCHES, radiusDeg: v.radiusDeg, cyanEye: ctx.cyanEye })]);
    }

    case "pick.rings": case "pick.hidden": {
      const v = d as ClipData<"pick.rings">, p = play as Extract<OfferedClip["play"], { template: "pick" }>;
      if (v.note === "floor" && v.px !== 1 && !p.band) return { ok: false, why: "invalid" };
      const value = depthValue(s!, v.px, v.dpr);
      const raw = { px: v.px, dpr: v.dpr, pixelArcsec: r1(pixelArcsec(s!, v.dpr)), trials: v.trials, reversals: v.reversals, cyanEye: ctx.cyanEye };
      if (p.band) {
        const verdict = bandVerdict(v.note, v.px, p.band[0] >= 1600);
        if (verdict !== "kept") return noted("note", { ...raw, arcsec: value, band: p.band }, verdict);
        return saved([row(keys[0], value, v.note === "floor" ? "floor" : v.note, { ...raw, band: p.band })]);
      }
      return saved([row(keys[0], value, v.note, raw)]);
    }
    case "pick.wobble": { const v = d as ClipData<"pick.wobble">; return saved([row(keys[0], v.percent, v.note)]); }

    case "split.range": {
      const v = d as ClipData<"split.range">, p = play as Extract<OfferedClip["play"], { template: "split" }>;
      const tries = v.tries.map((t) => ({ ...t, break: Math.min(t.break, v.limit), recovery: Math.min(t.recovery, t.break, v.limit) }));
      const f = fusionSummary(tries, v.limit), raw = { tries, limit: v.limit, rate: v.rate, way: p.way, cyanEye: ctx.cyanEye };
      return saved([row(keys[0], f.break.value, f.break.note, raw), row(keys[1], f.recovery.value, f.recovery.note, raw)]);
    }
    case "split.recover": {
      const times = (d as ClipData<"split.recover">).times.filter((t): t is number => t !== null);
      if (!times.length) return noted("note", {}, "never_split");
      return saved([row(keys[0], r1(median(times)), "", { times })]);
    }

    case "hold.hold": {
      const v = d as ClipData<"hold.hold">, full = (play as { seconds: number }).seconds;
      return saved([row(keys[0], Math.min(full, Math.floor(v.held)), v.held >= full ? "floor" : "", { demand: v.demand })]);
    }
    case "hold.adapt": {
      const v = d as ClipData<"hold.adapt">;
      const before = restingPosition(v.before, s!, v.dpr, "prism_dioptre"), after = restingPosition(v.after, s!, v.dpr, "prism_dioptre");
      return saved([row(keys[0], r1(after - before), "", { before, after, demand: v.demand, held: Math.floor(v.held) })]);
    }
    case "hold.flips": {
      const v = d as ClipData<"hold.flips">;
      if (v.cycles === null) return { ok: false, why: "too_few" };
      return saved([row(keys[0], v.cycles, "", { turnIn: v.turnIn, turnOut: v.turnOut })]);
    }

    case "align": {
      const v = d as ClipData<"align">, lock = (play as { lock: boolean }).lock;
      const value = restingPosition(v.offsets, s!, v.dpr, lock ? "arcmin" : "prism_dioptre");
      /* the screen cannot show a gap under one dot: say how large one dot is */
      return saved([row(keys[0], value, "", { offsets: v.offsets, dpr: v.dpr, onePd: r1(prismOfDots(1, s!, v.dpr) * 10) / 10, cyanEye: ctx.cyanEye })]);
    }
    case "grid": { const { cells } = d as ClipData<"grid">; return saved([row(keys[0], cells.length, "", { cells: [...cells].sort((a, b) => a - b) })]); }

    case "find.search": {
      const v = d as ClipData<"find.search">;
      const rows = [v.blind !== null ? row(keys[0], v.blind, "", { found: v.found }) : null, v.seeing !== null ? row(keys[1], v.seeing, "", { found: v.found }) : null].filter((x): x is ClipRow => !!x);
      return rows.length ? saved(rows) : { ok: false, why: "too_few" };
    }
    case "find.track": {
      const v = d as ClipData<"find.track">;
      if (v.seconds < 20) return { ok: false, why: "too_few" };
      return saved([row(keys[0], Math.round(v.on), "", { seconds: Math.round(v.seconds) })]);
    }
    case "read": {
      const v = d as ClipData<"read">, wpm = readingSpeed(v.words, v.seconds);
      return wpm === null ? { ok: false, why: "too_fast" } : saved([row(keys[0], wpm, "", { words: v.words, seconds: Math.round(v.seconds) })]);
    }
    case "survey.near_work": {
      const given = (d as ClipData<"survey.near_work">).answers, total = surveyTotal(given);
      return total === null ? { ok: false, why: "invalid" } : saved([row(keys[0], total, "", { answers: given })]);
    }
    case "survey.screen": case "survey.dry": { const given = (d as ClipData<"survey.screen">).answers; return saved([row(keys[0], sum(given), "", { answers: given })]); }
  }
}

/* ───────────── sets ───────────── */

export interface SetItem { code: string; blocked: Blocked | null }
export interface SetPlan {
  items: SetItem[];
  /** Check-ups that are due and have no clip of their own: the set links to the check-up instead. */
  checkups: string[];
}

export interface SetPerson extends ClipPerson {
  age: number | null;
  /** For the weekly check: the keys of the check-ups that are due and not yet taken. */
  due: readonly string[];
}

const pickStep = (step: SetStep, far: boolean) => (typeof step === "string" ? step : far ? step.far : step.near);
/** Calibration clips that only make sense for a TV across the room, and for a screen within reach. */
const TV_ONLY = new Set(["C02", "C06", "C23", "C24"]), HAND_ONLY = new Set(["C01", "C04"]);

/**
 * The clips a set plays, in order. A clip that does not apply to this screen is left out. A clip that applies but
 * cannot run for this person now (it needs a guardian, say) stays in the list with its reason, so the member sees
 * what was skipped and why. Camera clips join only when the camera is already allowed: a set never asks for it.
 */
export function planSet(key: SetKey, p: SetPerson): SetPlan {
  const far = p.dist !== null && standOf(p.dist) === "far";
  const checkups: string[] = [];
  let codes: string[];
  if (key === "weekly") {
    codes = p.due.flatMap((test) => {
      const steps = CHECKUP_CLIPS[test];
      if (!steps) { checkups.push(test); return []; }
      if (test === "balance" && p.age !== null && p.age < YOUNG_AGE) return [YOUNG_BALANCE];
      return steps.map((s) => pickStep(s, far));
    });
  } else codes = SETS[key].steps.map((s) => pickStep(s, far));

  const items = codes.flatMap((code): SetItem[] => {
    const def = clipDef(code);
    if (!def?.offered) return [];
    if (key === "screen" && ((TV_ONLY.has(code) && !far) || (HAND_ONLY.has(code) && far))) return [];
    const blocked = clipState(def, p);
    if (blocked === "camera" || (def.gear.includes("camera") && blocked === "adult")) return [];
    /* a check-up that is due but cannot be played as a clip on this screen (it stands between near and far) is taken as a check-up */
    if (key === "weekly" && (blocked === "need_near" || blocked === "need_far")) { const test = def.store.to === "result" ? def.store.keys[0] : ""; if (test && !checkups.includes(test)) checkups.push(test); return []; }
    return [{ code, blocked }];
  });
  return { items, checkups };
}
