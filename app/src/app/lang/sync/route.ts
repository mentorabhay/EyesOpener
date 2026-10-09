/**
 * Sets the browser's language to its household's and sends the browser back where it was.
 * A member's page sends the browser here when the two differ (src/i18n/household.ts).
 *
 * The answer to a page-to-page move inside the app is deliberately not a move: it is a plain page, which makes
 * the browser load this address in full. The page the reader lands on is then loaded whole in the new language,
 * with its typeface and its own words, never patched into a page of the old one.
 */
import { NextResponse } from "next/server";
import { householdLang, SYNCED_COOKIE } from "@/i18n/decide";
import { writeLangCookies } from "@/i18n/household";
import { SOURCE } from "@/i18n/languages";
import { langStatuses } from "@/i18n/status";
import { safeNext } from "@/lib/gate";
import { getMember } from "@/lib/session";
import { jar as cookieJar } from "@/lib/cookie-jar";
import { secureCookies } from "@/lib/token";

export async function GET(req: Request) {
  const url = new URL(req.url), next = safeNext(url.searchParams.get("next"));
  if (req.headers.get("rsc") !== null) {
    return new Response("<!doctype html><meta charset=\"utf-8\"><title>IOpener</title>", { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
  }
  const m = await getMember();
  const want = m ? householdLang(m.account.locale, await langStatuses(true), !!m.viewer.staff) : SOURCE;
  if (m) await writeLangCookies(want, !!m.viewer.staff);
  /* Sent back by path alone. The address this server knows itself by is not always the one the browser used
     (behind a front door it never is), so a full address here could send the browser somewhere else. */
  /* for ten seconds the member's pages do not send the browser here again, whatever happens */
  (await cookieJar()).set(SYNCED_COOKIE, "1", { path: "/", maxAge: 10, sameSite: "lax", secure: secureCookies(), httpOnly: true });
  const res = new NextResponse(null, { status: 303, headers: { location: next } });
  res.headers.set("cache-control", "no-store");
  return res;
}
