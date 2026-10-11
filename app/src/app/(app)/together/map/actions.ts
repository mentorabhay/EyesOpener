// Eyes Opener: A guardian puts the household on the map. Only three digits are sent, and only three are kept. .
"use server";
import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/together/StateForm";
import { map as t } from "@/copy/map";
import { joinMap, leaveMap, setWelcome } from "@/lib/map-data";
import { requireMember } from "@/lib/session";

const text = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.slice(0, 40) : "");

/** A guardian puts the household on the map. Only three digits are sent, and only three are kept. */
export async function joinMapAction(_: FormState, form: FormData): Promise<FormState> {
  const m = await requireMember();
  const done = await joinMap(m, text(form.get("area")));
  if (!done.ok) return { ok: false, message: done.why === "format" || done.why === "army" || done.why === "unknown" ? t.join.problem[done.why] : t.refused[done.why] };
  revalidatePath("/together/map");
  return { ok: true, message: t.join.joined };
}

/** A guardian takes the household off the map. Nothing of it is kept. */
export async function leaveMapAction(_: FormState, form: FormData): Promise<FormState> {
  void form;
  const m = await requireMember();
  const done = await leaveMap(m);
  if (!done.ok) return { ok: false, message: t.refused[done.why] };
  revalidatePath("/together/map");
  return { ok: true, message: t.leave.done };
}

/** The lamp-lighter picks a welcome from the fixed list, or none. The form sends a key, never words. */
export async function setWelcomeAction(_: FormState, form: FormData): Promise<FormState> {
  const m = await requireMember();
  const done = await setWelcome(m, text(form.get("welcome")));
  if (!done.ok) return { ok: false, message: t.refused[done.why] };
  revalidatePath("/together/map");
  return { ok: true, message: done.line ? t.lamp.saved : t.lamp.cleared };
}
