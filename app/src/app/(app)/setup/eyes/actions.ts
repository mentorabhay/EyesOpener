"use server";
import { revalidatePath } from "next/cache";
import { onboarding as o } from "@/copy/onboarding";
import type { Derived } from "@/engine";
import { saveMeasured } from "@/lib/eye-profile";
import { requireMember } from "@/lib/session";

/** Saves a finished onboarding for the active profile. The input is checked, and the settings derived, in saveMeasured. */
export async function finishOnboarding(input: unknown): Promise<{ settings: Derived } | { error: string }> {
  const m = await requireMember();
  if (!m.can("test")) return { error: o.blocked.seat };
  const settings = await saveMeasured(m, input);
  if (!settings) return { error: o.done.saveError };
  /* the red ink and the app text size are set in the app layout, so every screen is redrawn */
  revalidatePath("/", "layout");
  return { settings };
}
