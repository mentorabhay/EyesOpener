/**
 * The language of a request, worked out once by the proxy before anything is drawn. Server only.
 * See decide.ts for the rules and docs/LANGUAGES.md for the design.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requestJar, responseJar } from "@/lib/cookie-jar";
import { secureCookies, verifyToken } from "@/lib/token";
import { decide, draftsAllowed, DRAFTS_COOKIE, LANG_COOKIE, PASS_COOKIE, PATH_HEADER } from "./decide";
import { isLang, SOURCE } from "./languages";
import { LANG_HEADER, writeChoice, type Choice } from "./runtime";
import { langStatuses } from "./status";

const YEAR = 60 * 60 * 24 * 365;
export const langCookieOptions = () => ({ path: "/", sameSite: "lax" as const, maxAge: YEAR, secure: secureCookies(), httpOnly: false });

/** A request that asks for English costs nothing: the database is read only when another language is asked for. */
export async function choiceOf(req: NextRequest): Promise<Choice> {
  const jar = requestJar(req);
  const cookie = jar.get(LANG_COOKIE)?.value;
  if (!isLang(cookie) || cookie === SOURCE) return { lang: SOURCE, drafts: false };
  const production = process.env.NODE_ENV === "production", drafts = jar.get(DRAFTS_COOKIE)?.value;
  if (draftsAllowed(production, drafts)) return decide({ cookie, drafts, pass: null, statuses: {}, production });
  let pass: string | null = null;
  try { pass = verifyToken<{ lang: string }>(jar.get(PASS_COOKIE)?.value)?.lang ?? null; } catch { pass = null; }
  return decide({ cookie, drafts, pass, statuses: await langStatuses(), production });
}

/**
 * Lets the request through with its language written on it. The header is always set here, so one sent by a
 * browser is never believed. When the browser's cookie names a language it may not have (staff switched it off),
 * the cookie is put back to English, and the page notices and loads afresh (src/i18n/watch.tsx).
 */
export function passOn(req: NextRequest, choice: Choice, extra: Record<string, string> = {}): NextResponse {
  const headers = new Headers(req.headers);
  for (const [k, v] of Object.entries(extra)) headers.set(k, v);
  headers.set(LANG_HEADER, writeChoice(choice));
  headers.set(PATH_HEADER, req.nextUrl.pathname + req.nextUrl.search);
  const res = NextResponse.next({ request: { headers } });
  const jar = responseJar(req, res);
  const cookie = jar.get(LANG_COOKIE)?.value;
  if (cookie !== undefined && cookie !== choice.lang) jar.set(LANG_COOKIE, choice.lang, langCookieOptions());
  return res;
}
