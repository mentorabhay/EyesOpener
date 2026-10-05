/**
 * The rules of the screen calibration, with no database in them, so they can be tested.
 * The browser sends only what was matched (grey values, channel values, balance settings). Every stored value is
 * worked out here with the engine, and a match the engine does not accept changes nothing.
 * The maths and its limits: src/engine/calibrate.ts. The database side: src/lib/screen.ts.
 */
import { z } from "zod";
import {
  CAL, USUAL_GAMMA, gammaFromMatches, inkFromMatches, leakFor, leakFromMatches, regammaBalance,
  type Leak, type LeakEffect, type LensMatch, type Pair,
} from "@/engine";
import type { MemberAction } from "./roles";

/**
 * May this person measure the household's screen? Measuring changes how every profile's scenes are drawn, so it is
 * a guardian's or co-guardian's job. A cheer seat may only look, and so may anyone while the device is in child mode.
 */
export const mayCalibrate = (member: { can: (action: MemberAction) => boolean }) => member.can("manage_family");

export const STEPS = ["gamma", "leak", "ink"] as const;
export type Step = (typeof STEPS)[number];
export const stepSchema = z.enum(STEPS);

const whole = ([lo, hi]: readonly [number, number]) => z.number().int().min(lo).max(hi);
const within = ([lo, hi]: readonly [number, number]) => z.number().min(lo).max(hi);
const lens = z.union([z.literal("unseen"), z.tuple([whole(CAL.level), whole(CAL.level)])]);

/** What one finished step sends. Two matches each, made from opposite sides. */
export const stepInput = z.discriminatedUnion("step", [
  z.object({ step: z.literal("gamma"), greys: z.tuple([whole(CAL.grey), whole(CAL.grey)]) }),
  z.object({ step: z.literal("leak"), red: lens, cyan: lens }),
  z.object({ step: z.literal("ink"), xs: z.tuple([within(CAL.inkSet), within(CAL.inkSet)]), turned: z.boolean() }),
]);
export type StepInput = z.infer<typeof stepInput>;

/** What the matches were, kept on the screen's row so that a value can be worked out again and a staff note can cite it. */
const rawSchema = z.object({
  /** The two grey values, and the gamma that was in use before this measurement. */
  gamma: z.object({ greys: z.tuple([z.number(), z.number()]), was: z.number() }).optional().catch(undefined),
  leak: z.object({ red: lens, cyan: lens }).optional().catch(undefined),
  /** The two balance settings, whether the glasses were turned round for the second, and the gamma they were drawn with. */
  ink: z.object({ xs: z.tuple([z.number(), z.number()]), turned: z.boolean(), gamma: z.number() }).optional().catch(undefined),
  /** Pixels per centimetre of the screen when a colour step was last saved. */
  ppc: z.number().optional().catch(undefined),
});
export type ColourRaw = z.infer<typeof rawSchema>;
export const rawOf = (value: unknown): ColourRaw => rawSchema.catch({}).parse(value ?? {});

/** The columns of a screen's row that calibration reads and writes. */
export interface ScreenRow {
  pxPerCm: number;
  gamma: number;
  gammaAt: Date | null;
  channelLeak: number;
  leakRedLens: number | null;
  leakCyanLens: number | null;
  leakAt: Date | null;
  inkBalance: number | null;
  inkBalanceAt: Date | null;
  colourRaw: unknown;
}
export type ScreenChange = Partial<Omit<ScreenRow, "pxPerCm">>;

export type Resolved =
  | { ok: true; set: ScreenChange }
  /** `lens` names the lens whose two matches were refused, in the leak step. */
  | { ok: false; why: "apart" | "range"; lens?: "red" | "cyan" };

const round2 = (v: number) => Math.round(v * 100) / 100;
const clamp = (v: number, [lo, hi]: readonly [number, number]) => Math.max(lo, Math.min(hi, v));

/**
 * The leak and the ink balance worked out again for a gamma that has just changed. The channel values that were
 * matched stay as they were; the light they stand for moves with gamma. A value that no longer adds up is left alone.
 */
function rework(raw: ColourRaw, gamma: number): ScreenChange {
  const out: ScreenChange = {};
  if (raw.leak) {
    const red = leakFromMatches(raw.leak.red as LensMatch, gamma), cyan = leakFromMatches(raw.leak.cyan as LensMatch, gamma);
    if (red.ok && cyan.ok) Object.assign(out, { leakRedLens: red.value, leakCyanLens: cyan.value, channelLeak: Math.max(red.value, cyan.value) });
  }
  if (raw.ink) {
    const ink = inkFromMatches(raw.ink.xs as Pair);
    if (ink.ok) out.inkBalance = round2(clamp(regammaBalance(ink.value, raw.ink.gamma, gamma), CAL.ink));
  }
  return out;
}

/** The changes one finished step makes to the screen's row, or why it makes none. */
export function resolveStep(input: StepInput, row: ScreenRow, now: Date): Resolved {
  const raw = { ...rawOf(row.colourRaw), ppc: row.pxPerCm };
  switch (input.step) {
    case "gamma": {
      const g = gammaFromMatches(input.greys);
      if (!g.ok) return g;
      const next = { ...raw, gamma: { greys: input.greys, was: row.gamma } };
      return { ok: true, set: { gamma: g.value, gammaAt: now, colourRaw: next, ...rework(next, g.value) } };
    }
    case "leak": {
      const red = leakFromMatches(input.red, row.gamma), cyan = leakFromMatches(input.cyan, row.gamma);
      if (!red.ok) return { ...red, lens: "red" };
      if (!cyan.ok) return { ...cyan, lens: "cyan" };
      return {
        ok: true,
        set: {
          leakRedLens: red.value, leakCyanLens: cyan.value, channelLeak: Math.max(red.value, cyan.value), leakAt: now,
          colourRaw: { ...raw, leak: { red: input.red, cyan: input.cyan } },
        },
      };
    }
    case "ink": {
      const ink = inkFromMatches(input.xs);
      if (!ink.ok) return ink;
      return { ok: true, set: { inkBalance: ink.value, inkBalanceAt: now, colourRaw: { ...raw, ink: { xs: input.xs, turned: input.turned, gamma: row.gamma } } } };
    }
  }
}

/** The changes that put one step back to "not measured": the usual value, with nothing made up in its place. */
export function clearStep(step: Step, row: ScreenRow): ScreenChange {
  const raw = rawOf(row.colourRaw);
  switch (step) {
    case "gamma": {
      const next = { ...raw, gamma: undefined };
      return { gamma: USUAL_GAMMA, gammaAt: null, colourRaw: next, ...rework(next, USUAL_GAMMA) };
    }
    case "leak":
      return { leakRedLens: null, leakCyanLens: null, channelLeak: 0, leakAt: null, colourRaw: { ...raw, leak: undefined } };
    case "ink":
      return { inkBalance: null, inkBalanceAt: null, colourRaw: { ...raw, ink: undefined } };
  }
}

/** A screen's size measured again and found this much different means it is most likely another screen. */
export const MOVED_SHARE = 0.03;
/** A gamma that moved by less than this does not call for a new balance check-up. */
export const GAMMA_MOVED = 0.1;

/** What is known about a screen's colours. Null, or a null time, means "not measured: the usual value is in use". */
export interface ScreenFacts {
  gamma: { value: number; at: Date | null; /** How far the measurement moved gamma from what was in use before. */ movedBy: number };
  leak: (Leak & { at: Date }) | null;
  ink: { value: number; at: Date; /** False when the glasses could not be turned round for the second match. */ turned: boolean } | null;
  /** How many of the three are measured. */
  measured: number;
  /** True when the size of the screen was measured again since, and came out different: the colours belong to another screen. */
  moved: boolean;
}

export function screenFacts(row: ScreenRow): ScreenFacts {
  const raw = rawOf(row.colourRaw);
  const gammaAt = row.gammaAt;
  const leak = row.leakAt && row.leakRedLens !== null && row.leakCyanLens !== null ? { red: row.leakRedLens, cyan: row.leakCyanLens, at: row.leakAt } : null;
  const ink = row.inkBalanceAt && row.inkBalance !== null ? { value: row.inkBalance, at: row.inkBalanceAt, turned: raw.ink?.turned ?? false } : null;
  const measured = (gammaAt ? 1 : 0) + (leak ? 1 : 0) + (ink ? 1 : 0);
  return {
    gamma: { value: row.gamma, at: gammaAt, movedBy: gammaAt && raw.gamma ? Math.abs(row.gamma - raw.gamma.was) : 0 },
    leak, ink, measured,
    moved: measured > 0 && raw.ppc !== undefined && Math.abs(row.pxPerCm - raw.ppc) / raw.ppc > MOVED_SHARE,
  };
}

/** What the screen's colours mean for one profile of the household. */
export interface ProfileEffect {
  /** The stronger eye's contrast from the profile's eye settings; null when the profile has none yet. */
  contrast: number | null;
  /** What the leak does to this profile; null when the leak is not measured or the profile has no eye settings. */
  leak: LeakEffect | null;
  /** True when the profile's contrast came from a balance check-up taken before the gamma or the ink balance was measured. */
  balanceAgain: boolean;
}

export function profileEffect(facts: ScreenFacts, eye: { strongContrast: number } | null, balanceAt: Date | null): ProfileEffect {
  const after = (at: Date | null | undefined) => !!at && !!balanceAt && at.getTime() > balanceAt.getTime();
  return {
    contrast: eye?.strongContrast ?? null,
    leak: eye && facts.leak ? leakFor(facts.leak, eye.strongContrast) : null,
    balanceAgain: after(facts.ink?.at) || (after(facts.gamma.at) && facts.gamma.movedBy >= GAMMA_MOVED),
  };
}
