"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/together/StateForm";
import { join as t } from "@/copy/family";
import { requireViewer } from "@/lib/auth";
import { acceptInvite } from "@/lib/family";

export async function joinHousehold(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer();
  const code = z.string().trim().min(1).max(20).safeParse(formData.get("code"));
  const seat = code.success ? await acceptInvite(viewer, code.data) : "invite_not_found";
  if (seat === "has_household" || seat === "invite_not_found") return { ok: false, message: t.result[seat] };
  revalidatePath("/", "layout");
  redirect(seat === "circle" ? "/circle" : "/today");
}
