"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { finishDataRequest } from "@/lib/admin";
import { audit, requireStaff } from "@/lib/auth";

/** Records that a person handled the request by hand. It makes no file and deletes nothing. */
export async function markDone(formData: FormData) {
  const viewer = await requireStaff("requests");
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const row = await finishDataRequest(id.data, viewer.user.id);
  if (row) await audit(viewer, "admin.requests.done", row.id, { kind: row.kind, accountId: row.accountId, name: row.household });
  revalidatePath("/admin", "layout");
}
