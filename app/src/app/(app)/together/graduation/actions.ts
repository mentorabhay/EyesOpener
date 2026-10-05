"use server";
import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/together/StateForm";
import { graduation as t } from "@/copy/graduation";
import { askForWelcome, leaveWelcome, sendThanks, stopAsking, takeBackWelcome } from "@/lib/graduation-data";
import { requireMember } from "@/lib/session";

const PAGE = "/together/graduation";
/** A form sends the key of a line from a fixed list and nothing else. Anything longer is not a key. */
const key = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.slice(0, 40) : "");

/** A guardian leaves a welcome for the active profile's finished course. */
export async function leaveWelcomeAction(_: FormState, form: FormData): Promise<FormState> {
  const m = await requireMember();
  const done = await leaveWelcome(m, key(form.get("line")));
  if (!done.ok) return { ok: false, message: t.refused[done.why] };
  revalidatePath(PAGE);
  return { ok: true, message: done.met ? t.keeper.leftAndRead : t.keeper.left };
}

/** A guardian takes back a welcome no family has received. */
export async function takeBackAction(_: FormState, form: FormData): Promise<FormState> {
  void form;
  const m = await requireMember();
  const done = await takeBackWelcome(m);
  if (!done.ok) return { ok: false, message: t.refused[done.why] };
  revalidatePath(PAGE);
  return { ok: true, message: t.keeper.takeBack.done };
}

/** A guardian of a family new to a course asks for a welcome. */
export async function askAction(_: FormState, form: FormData): Promise<FormState> {
  void form;
  const m = await requireMember();
  const done = await askForWelcome(m);
  if (!done.ok) return { ok: false, message: t.refused[done.why] };
  revalidatePath(PAGE);
  return { ok: true, message: done.met ? t.welcome.askedAndGot : t.welcome.asked };
}

/** A guardian stops waiting for a welcome that has not come. */
export async function stopAskingAction(_: FormState, form: FormData): Promise<FormState> {
  void form;
  const m = await requireMember();
  const done = await stopAsking(m);
  if (!done.ok) return { ok: false, message: t.refused[done.why] };
  revalidatePath(PAGE);
  return { ok: true, message: t.welcome.stop.done };
}

/** A guardian of the new family sends one thank-you line back. */
export async function thanksAction(_: FormState, form: FormData): Promise<FormState> {
  const m = await requireMember();
  const done = await sendThanks(m, key(form.get("line")));
  if (!done.ok) return { ok: false, message: t.refused[done.why] };
  revalidatePath(PAGE);
  return { ok: true, message: t.welcome.thanked };
}
