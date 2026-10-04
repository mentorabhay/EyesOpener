"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { LIMITS } from "@/components/measure/limits";
import { test as c } from "@/copy/test";
import {
  DEPTH_MAX_REVERSALS, DEPTH_MAX_TRIALS, FUSION_REPEATS, NEAR_POINT_TRIES, SURVEY_QUESTIONS,
  depthValue, fusionSummary, nearPoint, other, pixelArcsec, suppressionScore, surveyTotal, unseenLens,
} from "@/engine";
import { eyeOf, eyeSchema, noteSchema, recomputeFromResults, saveResults, within, type NewResult } from "@/lib/eye-profile";
import { requireMember, type Member } from "@/lib/session";
import { needsScreen } from "../../results";

const perEye = <K extends "acuity" | "contrast">(key: K, limits: readonly [number, number]) => {
  const one = z.object({ value: within(limits), note: noteSchema });
  return z.object({ key: z.literal(key), L: one, R: one });
};
const demand = within(LIMITS.fusion);
const checkup = z.discriminatedUnion("key", [
  perEye("acuity", LIMITS.va),
  perEye("contrast", LIMITS.cs),
  z.object({ key: z.literal("balance"), x: within(LIMITS.bal), cyanEye: eyeSchema }),
  /* depth: the browser sends the offset in device pixels; the angle is worked out here from the stored screen */
  z.object({
    key: z.literal("stereo"), px: within(LIMITS.offsetPx).int(), dpr: within(LIMITS.dpr), note: noteSchema,
    trials: z.number().int().min(1).max(DEPTH_MAX_TRIALS), reversals: z.number().int().min(0).max(DEPTH_MAX_REVERSALS),
  }).refine((d) => d.note !== "floor" || d.px === 1),
  /* fusion range: three repeats; the medians are taken here */
  z.object({
    key: z.literal("fusion_break"), limit: demand,
    tries: z.array(z.object({ break: demand, recovery: demand, atLimit: z.boolean() })).length(FUSION_REPEATS),
  }).refine((d) => d.tries.every((t) => t.break <= d.limit && t.recovery <= t.break && (!t.atLimit || t.break === d.limit))),
  z.object({ key: z.literal("near_point"), tries: z.array(within(LIMITS.near)).length(NEAR_POINT_TRIES) }),
  z.object({ key: z.literal("suppression"), dots: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(5)]), bottom: z.enum(["red", "cyan", "mix"]).nullable() })
    .refine((d) => (d.dots === 4) === (d.bottom !== null)),
  z.object({ key: z.literal("symptoms"), answers: z.array(within(LIMITS.answer).int()).length(SURVEY_QUESTIONS) }),
]);
export type Checkup = z.infer<typeof checkup>;

/** The rows one check-up stores. Every stored value is worked out here, from what the browser measured. Null when it does not add up. */
function rowsOf(d: Checkup, m: Member): NewResult[] | null {
  /* the cyan lens sits over this eye: the weaker eye, or the left eye until a weaker eye is known */
  const cyanEye = m.eye ? eyeOf(m.eye.cyanEye) : "L";
  switch (d.key) {
    case "acuity":
    case "contrast":
      return (["L", "R"] as const).map((eye) => ({ testKey: d.key, eye, value: d[eye].value, note: d[eye].note }));
    case "balance":
      return [{ testKey: d.key, eye: null, value: d.x, raw: { cyanEye: d.cyanEye } }];
    case "stereo": {
      if (!m.device) return null;
      const screen = { ppc: m.device.pxPerCm, dist: m.device.distanceCm }, value = depthValue(screen, d.px, d.dpr);
      if (value < LIMITS.stereo[0] || value > LIMITS.stereo[1]) return null;
      const raw = { px: d.px, dpr: d.dpr, pixelArcsec: Math.round(pixelArcsec(screen, d.dpr) * 10) / 10, trials: d.trials, reversals: d.reversals, cyanEye };
      return [{ testKey: d.key, eye: null, value, note: d.note, raw }];
    }
    case "fusion_break": {
      const s = fusionSummary(d.tries, d.limit), raw = { tries: d.tries, limit: d.limit, cyanEye };
      return [
        { testKey: "fusion_break", eye: null, value: s.break.value, note: s.break.note, raw },
        { testKey: "fusion_recovery", eye: null, value: s.recovery.value, note: s.recovery.note, raw },
      ];
    }
    case "near_point":
      return [{ testKey: d.key, eye: null, value: nearPoint(d.tries), raw: { tries: d.tries } }];
    case "suppression": {
      const lens = unseenLens(d.dots);
      const unseen = lens && { unseenLens: lens, unseenEye: lens === "cyan" ? cyanEye : other(cyanEye) };
      return [{ testKey: d.key, eye: null, value: suppressionScore(d.dots), raw: { dots: d.dots, bottom: d.bottom, cyanEye, ...unseen } }];
    }
    case "symptoms": {
      const total = surveyTotal(d.answers);
      return total === null ? null : [{ testKey: d.key, eye: null, value: total, raw: { answers: d.answers } }];
    }
  }
}

/** Saves one check-up for the active profile, moves the eye settings to match and goes back to the test's history. */
export async function saveCheckup(input: Checkup): Promise<{ error: string }> {
  const m = await requireMember();
  if (!m.can("test")) return { error: c.blocked.seat };
  const parsed = checkup.safeParse(input);
  if (!parsed.success) return { error: c.run.saveError };
  const d = parsed.data, rows = rowsOf(d, m);
  if (!rows || !(await saveResults(m, rows, { onScreen: needsScreen(d.key) }))) return { error: c.run.saveError };
  /* only the letter tests and the balance test move the eye settings */
  if (d.key === "acuity" || d.key === "contrast" || d.key === "balance") await recomputeFromResults(m);
  /* the red ink and the app text size are set in the app layout, so every screen is redrawn */
  revalidatePath("/", "layout");
  redirect(`/test/${d.key}`);
}
