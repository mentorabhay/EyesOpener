// Eyes Opener: Owners only: add a person who already signs in to Eyes Opener. .
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sponsor as t } from "@/copy/sponsor";
import { requireSponsor } from "@/lib/auth";
import { addToTeam, changeTeam, type FormState } from "@/lib/sponsor";

const Add = z.object({ email: z.string().trim().max(200).pipe(z.email()), role: z.enum(["owner", "editor"]) });

/** Owners only: add a person who already signs in to Eyes Opener. */
export async function add(_: FormState, formData: FormData): Promise<FormState> {
  const { viewer, sponsor } = await requireSponsor("manage_team");
  const input = Add.safeParse(Object.fromEntries(formData));
  if (!input.success) return { ok: false, message: t.team.add.result.invalid };
  const result = await addToTeam(viewer, sponsor, input.data.email, input.data.role);
  revalidatePath("/sponsor/team");
  return { ok: result === "done", message: t.team.add.result[result] };
}

const Change = z.object({ userId: z.uuid(), to: z.enum(["owner", "editor", "remove"]) });

/** Owners only: change a role or remove a person. The last owner cannot be removed or made an editor. */
export async function change(_: FormState, formData: FormData): Promise<FormState> {
  const { viewer, sponsor } = await requireSponsor("manage_team");
  const input = Change.safeParse(Object.fromEntries(formData));
  if (!input.success) return { ok: false, message: t.team.result.not_found };
  const { userId, to } = input.data;
  const result = await changeTeam(viewer, sponsor, userId, to === "remove" ? null : to);
  revalidatePath("/sponsor", "layout");
  /* An owner who gave up their own place no longer has this room. */
  if (result === "done" && userId === viewer.user.id && to !== "owner") redirect(to === "remove" ? "/login" : "/sponsor");
  return { ok: result === "done", message: t.team.result[result] };
}
