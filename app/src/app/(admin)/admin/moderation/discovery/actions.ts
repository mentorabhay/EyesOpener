"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { discovery } from "@/copy/discovery";
import { audit, requireStaff } from "@/lib/auth";
import { ANSWER_MIN_MEMBERS, LIMITS } from "@/lib/discovery";
import { addQuestion, answerQuestion, closeRound, openRound, retractAnswer, withdrawQuestion } from "@/lib/discovery-data";
import type { Answer } from "../../answer-form";

/**
 * Staff changes to the Discovery Board. The room is the moderation room: its gate runs in every action here,
 * and every change that is saved is written to the audit log. A count of votes may go into the log; a voter never does.
 */
const t = discovery.staff;
const words = (l: { min: number; max: number }) => z.string().trim().min(l.min).max(l.max);
const refresh = () => { revalidatePath("/admin", "layout"); revalidatePath("/together/discovery"); };

export async function openRoundAction(_: Answer, form: FormData): Promise<Answer> {
  const viewer = await requireStaff("moderation");
  const input = z.object({ title: words(LIMITS.title), closesOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse(Object.fromEntries(form));
  if (!input.success) return { ok: false, message: t.newRound.invalid };
  const round = await openRound(viewer.user.id, input.data.title, input.data.closesOn);
  if (typeof round === "string") return { ok: false, message: t.newRound[round] };
  await audit(viewer, "admin.discovery.round.open", round.id, { name: round.title, closesOn: round.closesOn });
  refresh();
  return { ok: true, message: t.newRound.saved };
}

export async function addQuestionAction(_: Answer, form: FormData): Promise<Answer> {
  const viewer = await requireStaff("moderation");
  const input = z.object({ roundId: z.guid(), question: words(LIMITS.question), why: words(LIMITS.why) }).safeParse(Object.fromEntries(form));
  if (!input.success) return { ok: false, message: t.add.invalid };
  const question = await addQuestion(viewer.user.id, input.data.roundId, input.data.question, input.data.why);
  if (typeof question === "string") return { ok: false, message: t.add[question] };
  await audit(viewer, "admin.discovery.question.add", question.id, { roundId: question.roundId, name: question.question });
  refresh();
  return { ok: true, message: t.add.saved };
}

export async function withdrawQuestionAction(form: FormData) {
  const viewer = await requireStaff("moderation");
  const id = z.guid().safeParse(form.get("id"));
  if (!id.success) return;
  const done = await withdrawQuestion(id.data);
  if (done) await audit(viewer, "admin.discovery.question.withdraw", done.question.id, { roundId: done.question.roundId, name: done.question.question, votesRemoved: done.votesRemoved });
  refresh();
}

export async function closeRoundAction(form: FormData) {
  const viewer = await requireStaff("moderation");
  const id = z.guid().safeParse(form.get("id"));
  if (!id.success) return;
  const round = await closeRound(id.data);
  if (round) await audit(viewer, "admin.discovery.round.close", round.id, { name: round.title });
  refresh();
}

export async function answerQuestionAction(_: Answer, form: FormData): Promise<Answer> {
  const viewer = await requireStaff("moderation");
  const input = z.object({ id: z.guid(), answer: words(LIMITS.answer), basis: words(LIMITS.basis), members: z.coerce.number().int().min(0).max(100_000_000) }).safeParse(Object.fromEntries(form));
  if (!input.success) return { ok: false, message: t.answer.invalid };
  const saved = await answerQuestion(viewer.user.id, input.data.id, input.data);
  if (typeof saved === "string") return { ok: false, message: saved === "too_few_members" ? t.answer.too_few_members(ANSWER_MIN_MEMBERS) : t.answer[saved] };
  await audit(viewer, "admin.discovery.answer.publish", saved.id, { roundId: saved.roundId, name: saved.question, members: saved.answerMembers });
  refresh();
  return { ok: true, message: t.answer.saved };
}

export async function retractAnswerAction(form: FormData) {
  const viewer = await requireStaff("moderation");
  const id = z.guid().safeParse(form.get("id"));
  if (!id.success) return;
  const saved = await retractAnswer(id.data);
  if (saved) await audit(viewer, "admin.discovery.answer.retract", saved.id, { roundId: saved.roundId, name: saved.question });
  refresh();
}
