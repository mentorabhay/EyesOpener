"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { JOB_NAME } from "@/lib/data/requests";
import { runJob } from "@/lib/jobs";

/**
 * Runs the daily data-requests job now, for a member of staff who may open this room.
 * `runJob` writes the run to the audit log under the staff member's name, with counts only.
 */
export async function runNow() {
  const viewer = await requireStaff("requests");
  await runJob(JOB_NAME, viewer.user.id);
  revalidatePath("/admin", "layout");
}
