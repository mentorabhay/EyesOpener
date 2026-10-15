"use server";
import { and, desc, eq } from "drizzle-orm";
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
  const mine = and(eq(schema.profile.id, m.profile.id), eq(schema.profile.accountId, m.account.id));
  if (ink !== m.profile.weakInk) {
    await db.update(schema.profile).set({ weakInk: ink, weakInkAt: new Date() }).where(mine);
    /* with no screen or no letter results there is nothing to derive yet: the choice is used when the eye check is done */
    await recomputeFromResults({ ...m, profile: { ...m.profile, weakInk: ink } }, "lens_choice");
  } else if (!m.profile.weakInkAt) {
    /* Kept as it is: the choice is confirmed for setup (src/lib/setup-rules.ts). Nothing changed, so the latest balance
       check-up still holds: the choice is dated no later than it. */
    const t = schema.testResult;
    const [bal] = await db.select({ at: t.takenAt }).from(t).where(and(eq(t.profileId, m.profile.id), eq(t.testKey, "balance"))).orderBy(desc(t.takenAt)).limit(1);
    await db.update(schema.profile).set({ weakInkAt: bal?.at ?? new Date() }).where(mine);
  }
  revalidatePath("/", "layout");
  redirect(ink !== m.profile.weakInk ? "/settings/lens?saved=1" : "/settings/lens?kept=1");
}
