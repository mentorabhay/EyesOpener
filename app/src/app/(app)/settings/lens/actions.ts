"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { recomputeFromResults } from "@/lib/eye-profile";
import { requireMember } from "@/lib/session";

/**
 * Saves which ink the active profile's weaker eye sees, then derives its eye settings again with the choice, so the
 * cyan lens moves to the other eye and the dimmed ink changes at once. A guardian or co-guardian chooses, and not in
 * child mode (the same as measuring the screen). Nothing else is read from the form.
 */
export async function chooseInk(formData: FormData) {
  const m = await requireMember();
  const ink = formData.get("ink");
  if (!m.can("manage_family") || (ink !== "cyan" && ink !== "red")) redirect("/settings/lens");
  if (ink !== m.profile.weakInk) {
    await db.update(schema.profile).set({ weakInk: ink, weakInkAt: new Date() })
      .where(and(eq(schema.profile.id, m.profile.id), eq(schema.profile.accountId, m.account.id)));
    /* with no screen or no letter results there is nothing to derive yet: the choice is used when the eye check is done */
    await recomputeFromResults({ ...m, profile: { ...m.profile, weakInk: ink } }, "lens_choice");
  }
  revalidatePath("/", "layout");
  redirect("/settings/lens?saved=1");
}
