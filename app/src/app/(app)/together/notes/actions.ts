"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/together/StateForm";
import { together } from "@/copy/together";
import { db, schema } from "@/db";
import { currentWeek, fieldProblems, ownNote, screenHazards } from "@/lib/community";
import { requireMember } from "@/lib/session";

const t = together.notes;
const Note = z.object({ body: z.string().trim().min(10).max(280), signature: z.string().trim().min(3).max(60) });

/** Leaves one note for the programme week the member has just reached. It waits for a person before anyone reads it. */
export async function leaveNote(_: FormState, form: FormData): Promise<FormState> {
  const m = await requireMember();
  if (!m.can("share")) return { ok: false, message: together.cannot.share };
  const week = currentWeek(m);
  if (!m.enrolment || week === null) return { ok: false, message: t.noProgramme };
  const parsed = Note.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: t.invalid, reasons: fieldProblems(parsed.error, t.errors) };
  if (await ownNote(m.profile.id, m.enrolment.programme, week)) return { ok: false, message: t.mineOther(week) };
  const reasons = await screenHazards(`${parsed.data.body}\n${parsed.data.signature}`);
  if (reasons.length) return { ok: false, message: t.blocked, reasons };

  await db.transaction(async (tx) => {
    const [note] = await tx.insert(schema.aheadNote)
      .values({ ...parsed.data, profileId: m.profile.id, programme: m.enrolment!.programme, week, status: "in_review" })
      .returning({ id: schema.aheadNote.id });
    await tx.insert(schema.moderationItem).values({ kind: "note", refId: note.id, reason: "New note for a programme week. Passed the hazard screen; needs a person's approval." });
  });
  revalidatePath("/together/notes");
  return { ok: true, message: t.saved };
}
