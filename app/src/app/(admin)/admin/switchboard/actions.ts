// Eyes Opener: Turns saver mode on or off. .
"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { admin, dollars } from "@/copy/admin";
import { CAP_KEY, CAP_MAX, CAP_MIN, SAVER_KEY, writeSetting } from "@/lib/admin";
import { audit, requireStaff } from "@/lib/auth";
import type { Answer } from "../answer-form";

const t = admin.switchboard;

/** Turns saver mode on or off. */
export async function setSaver(formData: FormData) {
  const viewer = await requireStaff("switchboard");
  const on = z.enum(["on", "off"]).safeParse(formData.get("saver"));
  if (!on.success) return;
  await writeSetting(SAVER_KEY, on.data === "on");
  await audit(viewer, on.data === "on" ? "admin.switchboard.saver_on" : "admin.switchboard.saver_off", SAVER_KEY, { value: on.data === "on" });
  revalidatePath("/admin", "layout");
}

/** Sets the most IOpener may spend on Gemini in one calendar month, in dollars. */
export async function setCap(_: Answer, formData: FormData): Promise<Answer> {
  const viewer = await requireStaff("switchboard");
  const cap = z.coerce.number().min(CAP_MIN).max(CAP_MAX).safeParse(formData.get("cap"));
  if (!cap.success) return { ok: false, message: t.cap.invalid };
  const value = Math.round(cap.data * 100) / 100;
  await writeSetting(CAP_KEY, value);
  await audit(viewer, "admin.switchboard.cap", CAP_KEY, { value, name: dollars(value) });
  revalidatePath("/admin", "layout");
  return { ok: true, message: t.cap.saved(dollars(value)) };
}
