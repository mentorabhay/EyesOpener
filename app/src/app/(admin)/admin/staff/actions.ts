// Eyes Opener: Audits a change that went through and turns the outcome into one sentence. .
"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { admin } from "@/copy/admin";
import { setStaffRole, type StaffChange } from "@/lib/admin";
import { audit, requireStaff, type Viewer } from "@/lib/auth";
import type { Answer } from "../answer-form";

const t = admin.staff.result;
const ROLES = ["super_admin", "ops", "content"] as const;

/** Audits a change that went through and turns the outcome into one sentence. */
async function answer(viewer: Viewer, change: StaffChange): Promise<Answer> {
  if (!change.ok) return { ok: false, message: t[change.problem] };
  const action = change.to === null ? "admin.staff.remove" : change.from === null ? "admin.staff.give" : "admin.staff.change";
  await audit(viewer, action, change.id, { name: change.name, from: change.from, to: change.to });
  revalidatePath("/admin", "layout");
  return { ok: true, message: change.to === null ? t.removed(change.name) : t.given(change.name, admin.roles[change.to]) };
}

/** Gives a staff role to a person who already signs in, found by email. */
export async function giveRole(_: Answer, formData: FormData): Promise<Answer> {
  const viewer = await requireStaff("staff");
  const input = z.object({ email: z.string().trim().max(200).pipe(z.email()), role: z.enum(ROLES) }).safeParse(Object.fromEntries(formData));
  if (!input.success) return { ok: false, message: t.invalid };
  return answer(viewer, await setStaffRole(viewer.user.id, { email: input.data.email }, input.data.role));
}

/** Changes a person's staff role, or removes it when the role is "none". */
export async function changeRole(_: Answer, formData: FormData): Promise<Answer> {
  const viewer = await requireStaff("staff");
  const input = z.object({ id: z.uuid(), role: z.enum([...ROLES, "none"]) }).safeParse(Object.fromEntries(formData));
  if (!input.success) return { ok: false, message: t.invalid };
  return answer(viewer, await setStaffRole(viewer.user.id, { id: input.data.id }, input.data.role === "none" ? null : input.data.role));
}
