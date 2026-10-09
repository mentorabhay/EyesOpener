"use server";
/**
 * Choosing a language: the card in Settings and the menu on the public site both send this.
 *
 * Who is asking decides what changes:
 *   - a guardian or co-guardian: the household's language (the account) and this browser's cookie
 *   - a cheer seat, or a device in child mode: nothing. The household's language is a guardian's choice.
 *   - anyone with no household (a visitor, a counsellor, a sponsor, staff with no test household): this browser only
 * Only a language that is offered to this person can be chosen: one staff switched on, or for staff one in review.
 */
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { languages as t } from "@/copy/languages";
import { db, schema } from "@/db";
import { getViewer } from "@/lib/auth";
import { getMember } from "@/lib/session";
import { draftsAllowed, DRAFTS_COOKIE, offeredLangs } from "./decide";
import { writeLangCookies } from "./household";
import { isLang, LANGUAGE, LANGS } from "./languages";
import { current, setRequestChoice } from "./runtime";
import { langStatuses } from "./status";
import { jar as cookieJar } from "@/lib/cookie-jar";

export type LanguageAnswer = { ok: boolean; message: string; reload?: boolean } | null;

export async function chooseLanguage(_prev: LanguageAnswer, form: FormData): Promise<LanguageAnswer> {
  const lang = form.get("lang");
  if (!isLang(lang)) return { ok: false, message: t.choose.notOffered };
  const [viewer, member, statuses, jar] = await Promise.all([getViewer(), getMember(), langStatuses(true), cookieJar()]);
  const staff = !!viewer?.staff;
  /* the development switch for drafts opens every language to the developer's own browser, and nothing else */
  const preview = draftsAllowed(process.env.NODE_ENV === "production", jar.get(DRAFTS_COOKIE)?.value);
  const offered = preview ? [...LANGS] : offeredLangs(statuses, staff);
  if (!offered.includes(lang)) return { ok: false, message: t.choose.notOffered };
  if (member) {
    if (!member.can("manage_family")) return { ok: false, message: t.choose.notAllowed };
    if (member.account.locale !== lang) await db.update(schema.account).set({ locale: lang }).where(eq(schema.account.id, member.account.id));
  }
  await writeLangCookies(lang, staff);
  /* the answer below, and anything else this request draws, is already in the new language */
  setRequestChoice({ lang, drafts: preview && current().drafts });
  revalidatePath("/", "layout");
  return { ok: true, message: t.choose.saved(LANGUAGE[lang].own), reload: true };
}
