/**
 * Runs before every page request. Three jobs. The first two read one cookie each and do no database work.
 *
 * Every cookie is an entry of the one cookie `__session` (src/lib/cookie-jar.ts), which a front door passes on.
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
import { requestJar } from "@/lib/cookie-jar";
import { GATE_COOKIE, gateMark, isOpenPath, siteLock } from "@/lib/gate";
import { isSealedPath } from "@/lib/roles";
import { verifyToken } from "@/lib/token";

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  const jar = requestJar(req);
  const lock = siteLock();
  if (lock && !isOpenPath(path) && verifyToken<{ gate: string }>(jar.get(GATE_COOKIE)?.value)?.gate !== gateMark(lock)) {
    return moveTo(req, path === "/" ? "/gate" : `/gate?next=${encodeURIComponent(path + req.nextUrl.search)}`);
  }

  if (!isSealedPath(path) || !verifyToken(jar.get("io_child")?.value)) return passOn(req, await choiceOf(req));
  return moveTo(req, "/today");
}

/**
 * A move to a path of this site, on the address the browser used. Next.js wants a full address here, and the one
 * this server is reached at is not the browser's when a front door (Firebase Hosting) is in front: Hosting names the
 * browser's address in `x-forwarded-host`. Only the one sending a request can set that header on it, and the move is
 * never kept by a cache, so it can send nobody but the sender elsewhere.
 */
export function moveTo(req: NextRequest, path: string): NextResponse {
  const fwd = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = fwd && /^[a-z0-9.-]+(:\d{1,5})?$/i.test(fwd) ? fwd : null;
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() === "http" ? "http" : "https";
  const res = NextResponse.redirect(new URL(path, host ? `${proto}://${host}` : req.nextUrl.origin), 307);
  res.headers.set("cache-control", "no-store");
  return res;
}
