// Eyes Opener: Gives or changes the active profile's vote in the open round. The browser names a question and nothing else:.
"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/together/StateForm";
import { discovery as t } from "@/copy/discovery";
import { castVote } from "@/lib/discovery-data";
import { requireMember } from "@/lib/session";

/**
 * Gives or changes the active profile's vote in the open round. The browser names a question and nothing else:
 * the profile, the round and whether the vote may be given are all worked out on the server.
 */
export async function vote(_: FormState, form: FormData): Promise<FormState> {
  const m = await requireMember();
  if (!m.can("share")) return { ok: false, message: t.refused.not_allowed };
  const question = z.guid().safeParse(form.get("question"));
  if (!question.success) return { ok: false, message: t.open.pickFirst };
  const done = await castVote(m, question.data);
  if (!done.ok) return { ok: false, message: done.why === "needs_consent" ? t.refused.needs_consent(m.profile.displayName) : t.refused[done.why] };
  revalidatePath("/together/discovery");
  return { ok: true, message: done.changed ? t.open.changed : t.open.saved };
}
