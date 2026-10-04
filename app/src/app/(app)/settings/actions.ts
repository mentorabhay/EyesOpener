"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/together/StateForm";
import { settings as t } from "@/copy/settings";
import { leaveProgramme, requestCounsellor, requestData, startProgramme } from "@/lib/family";
import { requireMember } from "@/lib/session";

export async function start(formData: FormData) {
  const m = await requireMember();
  const input = z.object({ profileId: z.uuid(), slug: z.string().max(40) }).safeParse(Object.fromEntries(formData));
  if (!m.can("manage_family") || !input.success) return;
  await startProgramme(m, input.data.profileId, input.data.slug);
  revalidatePath("/", "layout");
}

export async function leave(formData: FormData) {
  const m = await requireMember();
  const profileId = z.uuid().safeParse(formData.get("profileId"));
  if (!m.can("manage_family") || !profileId.success) return;
  await leaveProgramme(m, profileId.data);
  revalidatePath("/", "layout");
}

export async function askCounsellor(_: FormState, formData: FormData): Promise<FormState> {
  const m = await requireMember();
  if (!m.can("manage_family")) return { ok: false, message: t.guardianOnly };
  const input = z.object({ profileId: z.uuid(), email: z.string().trim().max(200).pipe(z.email()) }).safeParse(Object.fromEntries(formData));
  if (!input.success) return { ok: false, message: t.counsellor.invalid };
  const result = await requestCounsellor(m, input.data.profileId, input.data.email);
  revalidatePath("/settings");
  return { ok: result === "done", message: t.counsellor.result[result] };
}

export async function askForData(formData: FormData) {
  const m = await requireMember();
  const kind = z.enum(["export", "delete"]).safeParse(formData.get("kind"));
  if (!m.can("data") || !kind.success) return;
  await requestData(m, kind.data);
  revalidatePath("/settings");
}
