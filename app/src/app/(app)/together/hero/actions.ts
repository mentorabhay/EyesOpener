"use server";
import { revalidatePath } from "next/cache";
import { hero as t } from "@/copy/hero";
import { HERO_KEEP } from "@/lib/hero-rules";
import { allowCamera, dropHero, keepHero, pickHero, stopCamera } from "@/lib/hero";
import { requireMember } from "@/lib/session";

export type HeroAnswer = { ok: boolean; message: string };

const PAGE = "/together/hero";

/**
 * Keeps the shape the device traced. Only the shape and how it was made arrive here: the photo, the camera
 * picture and the drawing on the screen never leave the device.
 */
export async function keep(sprite: unknown, via: unknown): Promise<HeroAnswer> {
  const m = await requireMember();
  const r = await keepHero(m, { sprite, via });
  if (!r.ok) {
    const b = t.blocked;
    return { ok: false, message: r.why === "consent" ? b.consent(m.profile.displayName) : r.why === "full" ? b.full(HERO_KEEP) : b[r.why] };
  }
  revalidatePath(PAGE);
  return { ok: true, message: t.preview.kept };
}

/** Chooses which kept hero plays. An empty id means the game's own runner. */
export async function pick(form: FormData) {
  const m = await requireMember();
  const id = String(form.get("id") ?? "");
  await pickHero(m, id || null);
  revalidatePath(PAGE);
}

export async function drop(form: FormData) {
  const m = await requireMember();
  await dropHero(m, String(form.get("id") ?? ""));
  revalidatePath(PAGE);
}

export async function allow(_: HeroAnswer | null, form: FormData): Promise<HeroAnswer | null> {
  const m = await requireMember();
  if (form.get("agree") !== "on") return { ok: false, message: t.camera.notTicked };
  if (!(await allowCamera(m))) return { ok: false, message: t.camera.guardianOnly };
  revalidatePath(PAGE);
  return null;
}

export async function stop() {
  const m = await requireMember();
  await stopCamera(m);
  revalidatePath(PAGE);
}
