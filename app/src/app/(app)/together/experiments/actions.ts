"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/together/StateForm";
import { experiments as t } from "@/copy/experiments";
import { together } from "@/copy/together";
import { mayJoin } from "@/lib/community";
import { leaveExperiment, tieAfter, tieBefore } from "@/lib/experiment-data";
import { requireMember } from "@/lib/session";

const enrolment = (form: FormData) => z.guid().safeParse(form.get("enrolmentId"));
const refresh = () => { revalidatePath("/together/experiments"); revalidatePath("/together", "layout"); };

/** Adds the member's latest check-up to an experiment as the check-up before. The server picks the check-up. */
export async function addBefore(_: FormState, form: FormData): Promise<FormState> {
  const m = await requireMember();
  if (!m.can("share")) return { ok: false, message: together.cannot.share };
  const id = enrolment(form);
  if (!id.success) return { ok: false, message: t.leave.gone };
  /* a child's check-up joins a group result only while a parent's permission stands */
  if (!(await mayJoin(m))) return { ok: false, message: t.consentGone(m.profile.displayName) };
  const done = await tieBefore(m, id.data);
  refresh();
  if (done.ok) return { ok: true, message: t.before.added };
  return { ok: false, message: done.why === "gone" ? t.leave.gone : done.why === "closed" ? t.closed : t.before.refused };
}

/** Adds the first check-up taken in the window as the check-up after, and finishes the experiment for this profile. */
export async function addAfter(_: FormState, form: FormData): Promise<FormState> {
  const m = await requireMember();
  if (!m.can("share")) return { ok: false, message: together.cannot.share };
  const id = enrolment(form);
  if (!id.success) return { ok: false, message: t.leave.gone };
  if (!(await mayJoin(m))) return { ok: false, message: t.consentGone(m.profile.displayName) };
  const done = await tieAfter(m, id.data, form.get("anyway") === "yes");
  refresh();
  if (done.ok) return { ok: true, message: t.after.added };
  return { ok: false, message: done.why === "gone" ? t.leave.gone : done.why === "closed" ? t.closed : t.after.refused };
}

/** Leaves an experiment. Always allowed for a guardian, at every stage, with no reason asked. */
export async function leave(_: FormState, form: FormData): Promise<FormState> {
  const m = await requireMember();
  if (!m.can("share")) return { ok: false, message: together.cannot.share };
  const id = enrolment(form);
  const left = id.success && (await leaveExperiment(m, id.data));
  refresh();
  return left ? { ok: true, message: t.leave.done } : { ok: false, message: t.leave.gone };
}
