"use server";
import { revalidatePath } from "next/cache";
import { markPlayed } from "@/lib/depth-day-data";
import { requireMember } from "@/lib/session";

/**
 * Records that the active profile's depth scene was played. It takes nothing from the browser: the profile is the
 * signed-in household's active one. Only someone who may train can set it; for anyone else it does nothing.
 */
export async function scenePlayed(): Promise<void> {
  const m = await requireMember();
  if (await markPlayed(m)) revalidatePath("/today");
}
