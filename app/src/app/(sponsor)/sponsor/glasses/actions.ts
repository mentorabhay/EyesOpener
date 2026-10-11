// Eyes Opener: Core system module providing logic and utilities for actions.
"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sponsor as t } from "@/copy/sponsor";
import { requireSponsor } from "@/lib/auth";
import { registerPair, type FormState } from "@/lib/sponsor";

const Register = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,8}$/) });

export async function register(_: FormState, formData: FormData): Promise<FormState> {
  const { viewer, sponsor } = await requireSponsor("edit_groups");
  const input = Register.safeParse(Object.fromEntries(formData));
  if (!input.success) return { ok: false, message: t.glasses.register.result.invalid };
  const result = await registerPair(viewer, sponsor, input.data.code);
  revalidatePath("/sponsor", "layout");
  return { ok: result === "done", message: t.glasses.register.result[result] };
}
