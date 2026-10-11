// Eyes Opener: Core system module providing logic and utilities for actions.
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/together/StateForm";
import { settings } from "@/copy/settings";
import { addProfile, childBirthYears } from "@/lib/family";
import { requireMember } from "@/lib/session";

const errors = settings.newProfile.errors;
const name = z.string().trim().min(1).max(40);

export async function createProfile(_: FormState, formData: FormData): Promise<FormState> {
  const m = await requireMember();
  const years = childBirthYears();
  const input = z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("adult"), name }),
    z.object({ kind: z.literal("child"), name, birthYear: z.coerce.number().int().min(years.min).max(years.max), consent: z.literal("on") }),
  ]).safeParse(Object.fromEntries(formData));
  if (!input.success) {
    const field = String(input.error.issues[0].path[0]);
    return { ok: false, message: field in errors ? errors[field as keyof typeof errors] : errors.kind };
  }
  /* Adding a child also records this guardian's consent, so it needs both permissions. */
  if (!m.can("manage_family") || (input.data.kind === "child" && !m.can("consent"))) return { ok: false, message: settings.guardianOnly };
  await addProfile(m, input.data);
  revalidatePath("/settings");
  redirect("/settings");
}
