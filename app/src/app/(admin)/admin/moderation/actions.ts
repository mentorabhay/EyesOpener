"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { decideModeration } from "@/lib/admin";
import { audit, requireStaff } from "@/lib/auth";

async function decide(formData: FormData, decision: "approved" | "removed") {
  const viewer = await requireStaff("moderation");
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const done = await decideModeration(id.data, decision, viewer.user.id);
  if (done) {
    await audit(viewer, decision === "approved" ? "admin.moderation.approve" : "admin.moderation.remove", done.item.id, { kind: done.item.kind, refId: done.item.refId, name: done.name });
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/together", "layout");
}

/** Approves one open item: the idea or note it points at becomes visible to members. */
export async function approve(formData: FormData) { await decide(formData, "approved"); }

/** Removes one open item: the idea or note it points at is blocked. */
export async function remove(formData: FormData) { await decide(formData, "removed"); }
