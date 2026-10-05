/**
 * Runs before every page request. Three jobs. The first two read one cookie each and do no database work.
 *
 * 1. The site lock. When SITE_LOCK holds an access phrase, a browser without the gate cookie is sent to /gate.
 * 2. Child mode containment. While a device is in child mode, the grown-up screens are sealed and the child is
 *    sent back to Today. A grown-up leaves child mode from the Family screen with the exit PIN.
 * 3. The language. Every request that goes on to be drawn carries the language it is drawn in, decided here once
 *    (src/i18n/decide.ts). A request for English reads nothing; a request for another language reads which
 *    languages staff have switched on, kept in memory for half a minute.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { choiceOf, passOn } from "@/i18n/request";
import { GATE_COOKIE, gateMark, isOpenPath, siteLock } from "@/lib/gate";
import { isSealedPath } from "@/lib/roles";
import { verifyToken } from "@/lib/token";

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  const lock = siteLock();
  if (lock && !isOpenPath(path) && verifyToken<{ gate: string }>(req.cookies.get(GATE_COOKIE)?.value)?.gate !== gateMark(lock)) {
    const url = req.nextUrl.clone();
    url.pathname = "/gate";
    url.search = path === "/" ? "" : `?next=${encodeURIComponent(path + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  if (!isSealedPath(path) || !verifyToken(req.cookies.get("io_child")?.value)) return passOn(req, await choiceOf(req));
  const url = req.nextUrl.clone();
  url.pathname = "/today";
  url.search = "";
  return NextResponse.redirect(url);
}

/* Every page. Built files and images are left alone: they hold nothing private and are needed by the gate page itself. */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
