// Eyes Opener: Runs before every page request. Three jobs. The first two read one cookie each and do no database work.
/**
 * Runs before every page request. Three jobs. The first two read one cookie each and do no database work.
 *
 * Every cookie is an entry of the one cookie `__session` (src/lib/cookie-jar.ts), which a front door passes on.
 *
 * 1. The site lock. When SITE_LOCK holds an access phrase, a browser without the gate cookie is sent to /gate.
 * 2. Child mode containment. While a device is in child mode, the grown-up screens are sealed and the child is
 *    sent to child mode's own home, /kids, as is a child who opens Today. A grown-up leaves child mode from the Family screen with the exit PIN.
 * 3. The language. Every request that goes on to be drawn carries the language it is drawn in, decided here once
 *    (src/i18n/decide.ts). A request for English reads nothing; a request for another language reads which
 *    languages staff have switched on, kept in memory for half a minute.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { choiceOf, passOn } from "@/i18n/request";
import { requestJar } from "@/lib/cookie-jar";
import { GATE_COOKIE, gatePassed, isOpenPath, lockScope, siteLock } from "@/lib/gate";
import { childMove } from "@/lib/roles";
import { verifyToken } from "@/lib/token";

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  /* The built files hold nothing private and the gate page needs them. The matcher below keeps the proxy away from
     them; this says so again, so that losing the matcher (as happened once, 10 October 2026) cannot lock them. */
  if (isBuiltFile(path)) return NextResponse.next();

  const jar = requestJar(req);
  const lock = siteLock();
  /* with the lock on the demo people only (SITE_LOCK_SCOPE=demo), every page is open: the demo checks it itself */
  if (lock && lockScope() === "all" && !isOpenPath(path) && !gatePassed(jar.get(GATE_COOKIE)?.value, lock)) {
    return moveTo(req, path === "/" ? "/gate" : `/gate?next=${encodeURIComponent(path + req.nextUrl.search)}`);
  }

  const instead = childMove(path);
  if (!instead || !verifyToken(jar.get("io_child")?.value)) return passOn(req, await choiceOf(req));
  return moveTo(req, instead);
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

/* the brand pictures: the tab icon, the home-screen icons, the picture shown with a shared link, and the mark */
const BRAND_FILES = new Set(["/favicon.ico", "/icon.png", "/apple-icon.png", "/opengraph-image.png"]);
export const isBuiltFile = (path: string) => path.startsWith("/_next/static/") || path.startsWith("/brand/") || BRAND_FILES.has(path);

/* Every page. Built files and images are left alone: they hold nothing private and are needed by the gate page itself. */
export const config = {
  /* the built files and the brand pictures never pass the lock: the lock page shows the mark too */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|opengraph-image.png|brand/).*)"],
};
