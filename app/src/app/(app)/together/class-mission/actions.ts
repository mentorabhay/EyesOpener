"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/together/StateForm";
import { classMission as t } from "@/copy/class-mission";
import { giveMission, markMissionDone, takeBackMission } from "@/lib/class-mission-data";
import { requireMember } from "@/lib/session";

/**
 * Class Mission: a guardian gives a child the mission, marks the day it was run, or takes it back.
 * Each action reads the member again and hands only an id and a day to the rules, which look the id up among the
 * household's own. Nothing about a class can be sent: the forms have no field for it and nothing else is read.
 */
const Id = z.guid();

export async function giveMissionAction(_: FormState, form: FormData): Promise<FormState> {
  const m = await requireMember();
  const id = Id.safeParse(form.get("profile"));
  if (!id.success) return { ok: false, message: t.refused.not_found };
  const done = await giveMission(m, id.data);
  if (!done.ok) return { ok: false, message: t.refused[done.why] };
  revalidatePath("/together/class-mission");
  return { ok: true, message: t.child.given_ok(done.name) };
}

export async function takeBackMissionAction(_: FormState, form: FormData): Promise<FormState> {
  const m = await requireMember();
  const id = Id.safeParse(form.get("id"));
  if (!id.success) return { ok: false, message: t.refused.not_found };
  const done = await takeBackMission(m, id.data);
  if (!done.ok) return { ok: false, message: t.refused[done.why] };
  revalidatePath("/together/class-mission");
  return { ok: true, message: t.child.back.saved };
}

export async function markMissionDoneAction(_: FormState, form: FormData): Promise<FormState> {
  const m = await requireMember();
  const input = z.object({ id: Id, day: z.string().max(10) }).safeParse({ id: form.get("id"), day: form.get("day") });
  if (!input.success) return { ok: false, message: t.refused.bad_day };
  const done = await markMissionDone(m, input.data.id, input.data.day);
  if (!done.ok) return { ok: false, message: t.refused[done.why] };
  revalidatePath("/together/class-mission");
  return { ok: true, message: t.child.done.saved(done.name) };
}
