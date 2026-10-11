// Eyes Opener: Open a training session for the active profile. Nothing a page shows changes until it is finished, so no path is revalidated. .
"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isStopSymptom, MAX_DAILY_MINUTES } from "@/engine";
import { requireMember } from "@/lib/session";
import { END_REASONS, finishSession, saveStopSymptom, startSession, TRAIN_KINDS, type FinishResult, type StartResult } from "@/lib/sessions";

const Start = z.object({ kind: z.enum(TRAIN_KINDS), itemSlug: z.string().min(1).max(80) });
const Finish = z.object({
  sessionId: z.uuid(),
  minutes: z.number().min(0).max(MAX_DAILY_MINUTES),
  score: z.number().int().min(0).max(1_000_000).optional(),
  /* Plain numbers by key. `cleanDetail` on the server keeps only what is well formed. */
  detail: z.record(z.string().max(24), z.number()).optional(),
  endReason: z.enum(END_REASONS),
});
const Symptom = z.object({ sessionId: z.uuid(), symptom: z.string() });

/** Open a training session for the active profile. Nothing a page shows changes until it is finished, so no path is revalidated. */
export async function startTrainSession(input: z.input<typeof Start>): Promise<StartResult> {
  const parsed = Start.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "unknown_item" };
  return startSession(await requireMember(), parsed.data);
}

/** Close a session and add its minutes to today's Train ring. */
export async function finishTrainSession(input: z.input<typeof Finish>): Promise<FinishResult> {
  const parsed = Finish.safeParse(input);
  if (!parsed.success) return { ok: false };
  const result = await finishSession(await requireMember(), parsed.data);
  if (result.ok) {
    revalidatePath("/train", "layout");
    revalidatePath("/today");
  }
  return result;
}

/** Save the symptom picked after a stop. No page shows it, so no path is revalidated. */
export async function reportStopSymptom(input: z.input<typeof Symptom>): Promise<void> {
  const parsed = Symptom.safeParse(input);
  if (!parsed.success || !isStopSymptom(parsed.data.symptom)) return;
  await saveStopSymptom(await requireMember(), parsed.data.sessionId, parsed.data.symptom);
}
