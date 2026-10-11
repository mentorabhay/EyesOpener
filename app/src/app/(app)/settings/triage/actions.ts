// Eyes Opener: Core system module providing logic and utilities for actions.
"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { saveTriage, TRIAGE_KEYS } from "@/lib/family";
import { requireMember } from "@/lib/session";

const Answers = z.record(z.enum(TRIAGE_KEYS), z.enum(["yes", "no"]).transform((v) => v === "yes"));

export async function answerTriage(formData: FormData) {
  const m = await requireMember();
  const profileId = z.uuid().safeParse(formData.get("profileId"));
  const answers = Answers.safeParse(Object.fromEntries(TRIAGE_KEYS.map((k) => [k, formData.get(k)])));
  if (!m.can("manage_family") || !profileId.success || !answers.success) return;
  await saveTriage(m, profileId.data, answers.data);
  revalidatePath("/settings/triage");
  revalidatePath("/settings");
}
