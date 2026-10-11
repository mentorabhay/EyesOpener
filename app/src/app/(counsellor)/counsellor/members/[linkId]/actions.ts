// Eyes Opener: Save the dose of a level 2 programme. The rules are checked again in `setDose`. .
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { counsellor as t } from "@/copy/counsellor";
import { MAX_DAILY_MINUTES } from "@/engine";
import { requireCounsellor } from "@/lib/auth";
import { addNote, endLink, NOTE_MAX, setDose, type FormState } from "@/lib/counsellor";

const Dose = z.object({
  linkId: z.uuid(),
  enrolmentId: z.uuid(),
  dailyMinutes: z.coerce.number().int().min(1).max(MAX_DAILY_MINUTES),
  daysPerWeek: z.coerce.number().int().min(1).max(7),
});

/** Save the dose of a level 2 programme. The rules are checked again in `setDose`. */
export async function saveDose(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireCounsellor();
  const input = Dose.safeParse(Object.fromEntries(formData));
  if (!input.success) return { ok: false, message: t.member.dose.result.invalid };
  const { linkId, enrolmentId, dailyMinutes, daysPerWeek } = input.data;
  const result = await setDose(viewer, linkId, enrolmentId, dailyMinutes, daysPerWeek);
  revalidatePath(`/counsellor/members/${linkId}`);
  return { ok: result === "done", message: t.member.dose.result[result] };
}

const Note = z.object({ linkId: z.uuid(), body: z.string().trim().min(1).max(NOTE_MAX) });

export async function saveNote(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireCounsellor();
  const input = Note.safeParse(Object.fromEntries(formData));
  if (!input.success) return { ok: false, message: t.member.notes.result.invalid };
  const result = await addNote(viewer, input.data.linkId, input.data.body);
  revalidatePath(`/counsellor/members/${input.data.linkId}`);
  return { ok: result === "done", message: t.member.notes.result[result] };
}

/** End the link and go back to the list. */
export async function end(formData: FormData) {
  const viewer = await requireCounsellor();
  const linkId = z.uuid().safeParse(formData.get("linkId"));
  if (!linkId.success) return;
  await endLink(viewer, linkId.data);
  revalidatePath("/counsellor", "layout");
  redirect("/counsellor");
}
