/**
 * DEVELOPMENT ONLY: shows machine-draft translations that no person has checked.
 *
 *   /lang/dev-drafts?lang=hi            this browser reads the app in Hindi, drafts included
 *   /lang/dev-drafts?lang=hi&next=/today
 *   /lang/dev-drafts?off                back to normal
 *
 * It is for a developer looking at how a language sits on the page before a reviewer has read it. In production
 * this address answers "not found", and the cookie it sets is ignored everywhere (src/i18n/decide.ts), so a draft
 * can never reach a family.
 */
import { NextResponse } from "next/server";
import { DRAFTS_COOKIE, draftsAllowed, LANG_COOKIE } from "@/i18n/decide";
import { isLang, SOURCE } from "@/i18n/languages";
import { langCookieOptions } from "@/i18n/request";
import { safeNext } from "@/lib/gate";

export async function GET(req: Request) {
  if (!draftsAllowed(process.env.NODE_ENV === "production", "on")) return new Response("Not found", { status: 404 });
  const url = new URL(req.url), lang = url.searchParams.get("lang");
  /* by path alone: see /lang/sync */
  const res = new NextResponse(null, { status: 303, headers: { location: safeNext(url.searchParams.get("next")) } });
  if (url.searchParams.has("off") || !isLang(lang) || lang === SOURCE) {
    res.cookies.delete(DRAFTS_COOKIE);
    res.cookies.set(LANG_COOKIE, SOURCE, langCookieOptions());
  } else {
    res.cookies.set(DRAFTS_COOKIE, "on", { ...langCookieOptions(), maxAge: 60 * 60 * 12 });
    res.cookies.set(LANG_COOKIE, lang, langCookieOptions());
  }
  res.headers.set("cache-control", "no-store");
  return res;
}
