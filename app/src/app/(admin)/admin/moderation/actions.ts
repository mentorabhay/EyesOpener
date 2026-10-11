// Eyes Opener: Approves one open item: the idea or note it points at becomes visible to members. .
"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { assistCopy } from "@/copy/assist";
import { decideModeration } from "@/lib/admin";
import { assist } from "@/lib/assist/extra";
import { audit, requireStaff } from "@/lib/auth";
import type { Answer } from "../answer-form";

async function decide(formData: FormData, decision: "approved" | "removed") {
  const viewer = await requireStaff("moderation");
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const done = await decideModeration(id.data, decision, viewer.user.id);
  if (done) {
    await audit(viewer, decision === "approved" ? "admin.moderation.approve" : "admin.moderation.remove", done.item.id, { kind: done.item.kind, refId: done.item.refId, name: done.name });
  }
  /* An edition with an assistant keeps its search by meaning in step with what is published. */
  if (done && assist.available) after(() => assist.ideasChanged().catch(() => undefined));
  revalidatePath("/admin", "layout");
  revalidatePath("/together", "layout");
}

/** Approves one open item: the idea or note it points at becomes visible to members. */
export async function approve(formData: FormData) { await decide(formData, "approved"); }

/** Removes one open item: the idea or note it points at is blocked. */
export async function remove(formData: FormData) { await decide(formData, "removed"); }

/** How many notes one press may ask for. Each note is one small AI call. */
const NOTES_AT_ONCE = 10;

/**
 * Asks the assistant for a reviewer's note on open items that have none. A note is something to read:
 * it approves nothing and removes nothing. In an edition with no assistant this does nothing.
 */
export async function writeNotes(): Promise<Answer> {
  const viewer = await requireStaff("moderation");
  if (!assist.available) return null;
  const done = await assist.noteOpenItems(NOTES_AT_ONCE);
  await audit(viewer, "admin.moderation.notes", undefined, { written: done.written, left: done.left, closed: done.closed ?? null });
  revalidatePath("/admin/moderation");
  if (done.written === 0) return { ok: false, message: done.closed && done.closed !== "none" ? assistCopy.closed[done.closed] : assistCopy.review.wroteNone };
  return { ok: true, message: assistCopy.review.wrote(done.written, done.left) };
}
