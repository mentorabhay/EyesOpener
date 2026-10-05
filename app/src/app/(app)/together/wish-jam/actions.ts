"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/together/StateForm";
import { wishJam as t } from "@/copy/wish-jam";
import { requireMember } from "@/lib/session";
import { makeWish, offerName, withdrawWish } from "@/lib/wish-jam-data";

/**
 * Wish Jam, the family's side: write a wish, take it back, name the built game.
 * Each action reads the member again. Ids from the form are only ever matched against the member's own household,
 * and what was typed passes the no-names rules and the hazard screen before anything is stored.
 */
const text = (v: FormDataEntryValue | null, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const refresh = () => { revalidatePath("/together/wish-jam"); revalidatePath("/wish-jam"); revalidatePath("/admin", "layout"); };

export async function makeWishAction(_: FormState, form: FormData): Promise<FormState> {
  const m = await requireMember();
  const id = z.guid().safeParse(form.get("profile"));
  if (!id.success) return { ok: false, message: t.refused.not_found };
  const done = await makeWish(m, {
    profileId: id.data, loves: form.get("loves"), play: form.get("play"), game: form.get("game"),
    line: text(form.get("line"), 400), showFirstName: form.get("showFirstName") === "on",
  });
  if (!done.ok) {
    if (done.why === "text") return { ok: false, message: t.problems[done.problem] };
    if (done.why === "hazard") return { ok: false, message: t.form.blocked, reasons: done.reasons };
    return { ok: false, message: t.refused[done.why] };
  }
  refresh();
  return { ok: true, message: t.form.saved };
}

export async function withdrawWishAction(_: FormState, form: FormData): Promise<FormState> {
  const m = await requireMember();
  const id = z.guid().safeParse(form.get("id"));
  if (!id.success) return { ok: false, message: t.refused.not_found };
  const done = await withdrawWish(m, id.data);
  if (!done.ok) return { ok: false, message: t.refused[done.why] };
  refresh();
  return { ok: true, message: t.own.back.saved };
}

export async function offerNameAction(_: FormState, form: FormData): Promise<FormState> {
  const m = await requireMember();
  const id = z.guid().safeParse(form.get("id"));
  if (!id.success) return { ok: false, message: t.refused.not_found };
  const done = await offerName(m, id.data, text(form.get("name"), 80));
  if (!done.ok) {
    if (done.why === "text") return { ok: false, message: t.problems[done.problem] };
    if (done.why === "hazard") return { ok: false, message: t.name.blocked, reasons: done.reasons };
    return { ok: false, message: t.refused[done.why] };
  }
  refresh();
  return { ok: true, message: t.name.saved };
}
