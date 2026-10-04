/**
 * Runs before every page request. Two jobs, both read one cookie and do no database work.
 *
 * 1. The site lock. When SITE_LOCK holds an access phrase, a browser without the gate cookie is sent to /gate.
 * 2. Child mode containment. While a device is in child mode, the grown-up screens are sealed and the child is
 *    sent back to Today. A grown-up leaves child mode from the Family screen with the exit PIN.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { GATE_COOKIE, gateMark, isOpenPath, siteLock } from "@/lib/gate";
import { isSealedPath } from "@/lib/roles";
import { verifyToken } from "@/lib/token";

export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  const lock = siteLock();
  if (lock && !isOpenPath(path) && verifyToken<{ gate: string }>(req.cookies.get(GATE_COOKIE)?.value)?.gate !== gateMark(lock)) {
    const url = req.nextUrl.clone();
    url.pathname = "/gate";
    url.search = path === "/" ? "" : `?next=${encodeURIComponent(path + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  if (!isSealedPath(path)) return NextResponse.next();
  if (!verifyToken(req.cookies.get("io_child")?.value)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/today";
  url.search = "";
  return NextResponse.redirect(url);
}

/* Every page. Built files and images are left alone: they hold nothing private and are needed by the gate page itself. */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
