// Eyes Opener: Close a group to new families, or open it again. .
"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sponsor as t } from "@/copy/sponsor";
import { requireSponsor } from "@/lib/auth";
import { createGroup, setGroupOpen, type FormState } from "@/lib/sponsor";

const Create = z.object({ name: z.string().trim().min(2).max(60) });

export async function create(_: FormState, formData: FormData): Promise<FormState> {
  const { viewer, sponsor } = await requireSponsor("edit_groups");
  const input = Create.safeParse(Object.fromEntries(formData));
  if (!input.success) return { ok: false, message: t.groups.create.invalid };
  const group = await createGroup(viewer, sponsor, input.data.name);
  revalidatePath("/sponsor", "layout");
  return group ? { ok: true, message: t.groups.create.done(group.code) } : { ok: false, message: t.groups.create.failed };
}

const Open = z.object({ groupId: z.uuid(), to: z.enum(["open", "closed"]) });

/** Close a group to new families, or open it again. */
export async function setOpen(formData: FormData) {
  const { viewer, sponsor } = await requireSponsor("edit_groups");
  const input = Open.safeParse(Object.fromEntries(formData));
  if (!input.success) return;
  await setGroupOpen(viewer, sponsor, input.data.groupId, input.data.to === "open");
  revalidatePath("/sponsor/groups");
}
