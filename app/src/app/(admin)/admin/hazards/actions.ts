"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { admin } from "@/copy/admin";
import { addHazardRule, HAZARD_PATTERN_MAX, HAZARD_TEXT_MAX, hazardRules, matchHazards, setHazardRuleActive } from "@/lib/admin";
import { audit, requireStaff } from "@/lib/auth";
import type { Answer } from "../answer-form";

const t = admin.hazards;
const Rule = z.object({ pattern: z.string().trim().min(1).max(HAZARD_PATTERN_MAX), reason: z.string().trim().min(5).max(200) });

/** Adds a rule, switched on. The pattern must compile as a regular expression. */
export async function addRule(_: Answer, formData: FormData): Promise<Answer> {
  const viewer = await requireStaff("hazards");
  const input = Rule.safeParse(Object.fromEntries(formData));
  if (!input.success) return { ok: false, message: t.add.invalid };
  const rule = await addHazardRule(input.data.pattern, input.data.reason);
  if (rule === "broken") return { ok: false, message: t.add.broken };
  if (rule === "same") return { ok: false, message: t.add.same };
  await audit(viewer, "admin.hazards.add", rule.id, { pattern: rule.pattern, name: rule.reason });
  revalidatePath("/admin", "layout");
  return { ok: true, message: t.add.saved };
}

/** Switches one rule on or off. */
export async function switchRule(formData: FormData) {
  const viewer = await requireStaff("hazards");
  const input = z.object({ id: z.uuid(), active: z.enum(["on", "off"]) }).safeParse(Object.fromEntries(formData));
  if (!input.success) return;
  const rule = await setHazardRuleActive(input.data.id, input.data.active === "on");
  if (rule) await audit(viewer, rule.active ? "admin.hazards.on" : "admin.hazards.off", rule.id, { pattern: rule.pattern, name: rule.reason });
  revalidatePath("/admin", "layout");
}

export type TryState = { ok: boolean; message: string; text?: string; hits?: { id: string; pattern: string; reason: string; active: boolean; found: string }[] } | null;

/** Shows which rules match a sentence. Nothing is saved, so nothing is audited. */
export async function trySentence(_: TryState, formData: FormData): Promise<TryState> {
  await requireStaff("hazards");
  const text = z.string().trim().min(1).max(HAZARD_TEXT_MAX).safeParse(formData.get("text"));
  if (!text.success) return { ok: false, message: t.tryIt.invalid };
  const hits = matchHazards(text.data, await hazardRules());
  return { ok: true, text: text.data, hits, message: hits.length ? t.tryIt.hit(hits.length) : t.tryIt.clear };
}
