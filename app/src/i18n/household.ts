/**
 * The household's language and the browser's language, kept the same. Server only.
 *
 * A household's language is stored on the account (`account.locale`): a guardian chooses it once, for everyone and
 * for every device. A browser's language is a cookie, because the language of a request has to be known before
 * anyone is looked up in the database. The two meet here:
 *   - when a member's page is about to be drawn in a language other than their household's (a new device, a
 *     sign-in, a change made on another device), the browser is sent through /lang/sync, which sets the cookie and
 *     sends it straight back. The page is then loaded afresh, whole, in the right language.
 *   - choosing a language (src/i18n/actions.ts) writes both at once.
 */
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { secureCookies, signToken } from "@/lib/token";
import { draftsAllowed, DRAFTS_COOKIE, householdLang, LANG_COOKIE, PASS_COOKIE, PATH_HEADER, statusOfLang, SYNCED_COOKIE } from "./decide";
import type { Lang } from "./languages";
import { langCookieOptions } from "./request";
import { current } from "./runtime";
import { langStatuses } from "./status";

const HALF_DAY = 12 * 60 * 60;

/** Writes the browser's language. For a language in review, also the signed note that lets a staff member read it. */
export async function writeLangCookies(lang: Lang, staff: boolean): Promise<void> {
  const jar = await cookies();
  jar.set(LANG_COOKIE, lang, langCookieOptions());
  if (staff && statusOfLang(await langStatuses(), lang) === "review") {
    jar.set(PASS_COOKIE, signToken({ lang, exp: Date.now() + HALF_DAY * 1000 }), { path: "/", sameSite: "lax", maxAge: HALF_DAY, secure: secureCookies(), httpOnly: true });
  } else jar.delete(PASS_COOKIE);
}

/**
 * Called for every member's page. When the page is about to be drawn in a language other than the household's,
 * the browser is sent to pick the right one up. Does nothing for an action in flight (it is never interrupted),
 * for anything that is not a page, right after a pick-up, and while the development switch for drafts is on.
 */
export async function keepHouseholdLanguage(locale: string, staff: boolean): Promise<void> {
  const [h, jar] = await Promise.all([headers(), cookies()]);
  if (h.get("next-action")) return;
  const page = h.get("rsc") !== null || (h.get("accept") ?? "").includes("text/html");
  const path = h.get(PATH_HEADER);
  if (!page || !path || path.startsWith("/lang/")) return;
  if (jar.get(SYNCED_COOKIE)) return;
  if (draftsAllowed(process.env.NODE_ENV === "production", jar.get(DRAFTS_COOKIE)?.value)) return;
  const want = householdLang(locale, await langStatuses(), staff);
  if (want === current().lang) return;
  redirect(`/lang/sync?next=${encodeURIComponent(path)}`);
}
