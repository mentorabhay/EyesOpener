// Eyes Opener: Marks a counsellor as checked, which opens the counsellor portal to them. .
"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifyCounsellor, withdrawCounsellor } from "@/lib/admin";
import { audit, requireStaff } from "@/lib/auth";

/** Marks a counsellor as checked, which opens the counsellor portal to them. */
export async function verify(formData: FormData) {
  const viewer = await requireStaff("counsellors");
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const row = await verifyCounsellor(id.data);
  if (row) await audit(viewer, "admin.counsellors.verify", row.id, { name: row.name });
  revalidatePath("/admin", "layout");
}

/** Takes the check away and ends that counsellor's active and pending links. */
export async function withdraw(formData: FormData) {
  const viewer = await requireStaff("counsellors");
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const row = await withdrawCounsellor(id.data);
  if (row) await audit(viewer, "admin.counsellors.withdraw", row.id, { name: row.name, linksEnded: row.linksEnded });
  revalidatePath("/admin", "layout");
}
