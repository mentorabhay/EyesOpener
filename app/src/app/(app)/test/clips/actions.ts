// Eyes Opener: Saves one finished clip for the active profile. The browser sends the clip's code and what it measured; who may.
"use server";
import { revalidatePath } from "next/cache";
import { isSetKey } from "@/data/clips";
import { allowClipCamera, saveClip, type ClipSaved } from "@/lib/clips";
import { requireMember } from "@/lib/session";

/**
 * Saves one finished clip for the active profile. The browser sends the clip's code and what it measured; who may
 * run it, what the measurement means and what is stored are all decided on the server (src/lib/clips.ts).
 */
export async function saveClipRun(code: string, data: unknown, setKey: string | null): Promise<ClipSaved> {
  const m = await requireMember();
  const saved = await saveClip(m, code, data, setKey && isSetKey(setKey) ? setKey : null).catch((): ClipSaved => ({ ok: false, why: "failed" }));
  /* a clip can move the eye settings or the screen, and both are read in the app layout: every screen is drawn again */
  if (saved.ok) revalidatePath("/", "layout");
  return saved;
}

/** A guardian or co-guardian allows the camera for the active profile, on a clip's own page. */
export async function allowCamera(formData: FormData) {
  const m = await requireMember();
  if (formData.get("agree") !== "on") return;
  if (await allowClipCamera(m)) revalidatePath("/test/clips", "layout");
}
