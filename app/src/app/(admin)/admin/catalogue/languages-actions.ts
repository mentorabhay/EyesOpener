"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { LANG_STATUSES, statusOfLang } from "@/i18n/decide";
import { isHeld, LANGUAGE, TRANSLATED } from "@/i18n/languages";
import { progressOf, readManifest } from "@/i18n/progress";
import { langStatuses, setLangStatus } from "@/i18n/status";
import { audit, requireStaff } from "@/lib/auth";

const One = z.object({ lang: z.enum(TRANSLATED as [typeof TRANSLATED[number], ...typeof TRANSLATED[number][]]), status: z.enum(LANG_STATUSES) });

/**
 * Sets one language to off, in review or on. A super admin or content staff only; anyone else gets "not found".
 * A language cannot be switched on while no sentence of it has been checked by a person: families would be
 * offered a language and shown English. Nor while it is held back (Urdu, until its right-to-left layout is checked).
 */
export async function setLanguageStatus(formData: FormData) {
  const viewer = await requireStaff("catalogue");
  if (viewer.staff !== "super_admin" && viewer.staff !== "content") return;
  const parsed = One.safeParse({ lang: formData.get("lang"), status: formData.get("status") });
  if (!parsed.success) redirect("/admin/catalogue?languages=unknown#languages");
  const { lang, status } = parsed.data;
  const before = statusOfLang(await langStatuses(true), lang);
  if (before === status) return;
  if (status === "on") {
    if (isHeld(lang)) redirect("/admin/catalogue?languages=held#languages");
    const manifest = readManifest();
    if (!manifest || progressOf(lang, manifest).reviewed === 0) redirect("/admin/catalogue?languages=nothing#languages");
  }
  if (!(await setLangStatus(lang, status))) return;
  await audit(viewer, "admin.languages.status", lang, { name: LANGUAGE[lang].english, from: before, to: status });
  revalidatePath("/", "layout");
  redirect("/admin/catalogue#languages");
}
