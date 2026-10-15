"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { screensAdmin as t } from "@/copy/screens-admin";
import { mixKeepsEnough, parseCyanCode, USUAL_GAMMA } from "@/engine";
import { audit, requireStaff } from "@/lib/auth";
import { GATE_KEY, PRESETS_KEY, writeSetupSetting } from "@/lib/setup-settings";
import type { Answer } from "../answer-form";

/** Turns the setup hold on or off. Super admin only: ops may look at the room, not change it. */
export async function setGate(formData: FormData) {
  const viewer = await requireStaff("screens");
  if (viewer.staff !== "super_admin") return;
  const on = z.enum(["on", "off"]).safeParse(formData.get("gate"));
  if (!on.success) return;
  await writeSetupSetting(GATE_KEY, on.data === "on");
  await audit(viewer, on.data === "on" ? "admin.screens.gate_on" : "admin.screens.gate_off", GATE_KEY, { value: on.data === "on" });
  revalidatePath("/", "layout");
}

/** Sets the mixer's two starting points from cyan codes. Each must leave the weaker eye at least half its light. */
export async function setPresets(_: Answer, formData: FormData): Promise<Answer> {
  const viewer = await requireStaff("screens");
  if (viewer.staff !== "super_admin") return { ok: false, message: t.superOnly };
  const read = (name: string) => {
    const c = parseCyanCode(String(formData.get(name) ?? ""), USUAL_GAMMA);
    return c.ok && mixKeepsEnough(c.green, c.blue) ? { green: Math.round(c.green * 1000) / 1000, blue: Math.round(c.blue * 1000) / 1000 } : null;
  };
  const lessBlue = read("lessBlue"), lessGreen = read("lessGreen");
  if (!lessBlue || !lessGreen) return { ok: false, message: t.presets.invalid };
  await writeSetupSetting(PRESETS_KEY, { lessBlue, lessGreen });
  await audit(viewer, "admin.screens.presets", PRESETS_KEY, { lessBlue, lessGreen });
  revalidatePath("/", "layout");
  return { ok: true, message: t.presets.saved };
}
