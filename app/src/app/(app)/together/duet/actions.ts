"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/together/StateForm";
import { duet as t } from "@/copy/duet";
import { endDuet, startDuet } from "@/lib/duet-data";
import { requireMember } from "@/lib/session";

const Key = z.string().regex(/^(profile|person):[0-9a-f-]{36}$/i);

/** Starts a duet for two people of the household. Only a guardian or co-guardian, and never a device in child mode. */
export async function startDuetAction(_: FormState, form: FormData): Promise<FormState> {
  const m = await requireMember();
  if (!m.can("manage_family")) return { ok: false, message: t.start.refused.not_allowed };
  const a = Key.safeParse(form.get("a")), b = Key.safeParse(form.get("b"));
  if (!a.success || !b.success) return { ok: false, message: t.start.refused.unknown };
  const done = await startDuet(m, a.data, b.data);
  if (!done.ok) return { ok: false, message: t.start.refused[done.why] };
  revalidatePath("/together/duet");
  return { ok: true, message: t.start.started(done.a, done.b) };
}

/** Ends a duet of the household. The id from the form is only ever used together with the household's own id. */
export async function endDuetAction(_: FormState, form: FormData): Promise<FormState> {
  const m = await requireMember();
  if (!m.can("manage_family")) return { ok: false, message: t.start.refused.not_allowed };
  const id = z.guid().safeParse(form.get("id"));
  if (!id.success || !(await endDuet(m, id.data))) return { ok: false, message: t.end.gone };
  revalidatePath("/together/duet");
  return { ok: true, message: t.end.done };
}
