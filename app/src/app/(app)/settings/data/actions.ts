// Eyes Opener: The data section of Settings. Each action checks `m.can("data")` again on the server, inside the helper it calls:.
"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { askForCopy, askForDeletion, cancelDeletion } from "@/lib/data/requests";
import { requireMember } from "@/lib/session";

/*
 * The data section of Settings. Each action checks `m.can("data")` again on the server, inside the helper it calls:
 * only a guardian or co-guardian may ask or cancel, never a cheer seat, and never while the device is in child mode.
 * A refusal changes nothing; the page shows the state as it is.
 */

/** Makes a copy ready to download. */
export async function askCopy() {
  await askForCopy(await requireMember());
  revalidatePath("/settings");
}

/** Sets the whole household to be deleted when the waiting time is over. */
export async function askAll() {
  await askForDeletion(await requireMember(), { scope: "household" });
  revalidatePath("/settings");
}

/** Sets one profile to be deleted when the waiting time is over. The helper checks that the profile is in this household. */
export async function askOne(formData: FormData) {
  const m = await requireMember();
  const profileId = z.uuid().safeParse(formData.get("profileId"));
  if (!profileId.success) return;
  await askForDeletion(m, { scope: "profile", profileId: profileId.data });
  revalidatePath("/settings");
}

/** Cancels a deletion that has not happened yet. */
export async function cancel(formData: FormData) {
  const m = await requireMember();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  await cancelDeletion(m, id.data);
  revalidatePath("/settings");
}
