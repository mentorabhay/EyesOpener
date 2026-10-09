/**
 * The site lock. When SITE_LOCK holds an access phrase, every page asks for it once per browser.
 * It is for a site that is deployed but not open yet (a staging copy, the days before launch).
 * With SITE_LOCK unset the lock does not exist. Pure functions, unit-tested.
 *
 * SITE_LOCK_SCOPE=demo (Ved, 10 October 2026: staging opens with the landing page first, and anyone may register)
 * keeps the phrase for the demo people only: every page is open, and the seeded demo people, who include a super
 * admin, can be seen and signed in as only in a browser that has typed the phrase.
 */
import crypto from "node:crypto";
import { verifyToken } from "./token";

export const GATE_COOKIE = "io_gate";
export const GATE_DAYS = 30;

/** The access phrase, or null when the site is open. */
export const siteLock = (env: string | undefined = process.env.SITE_LOCK): string | null => (env && env.trim().length >= 8 ? env.trim() : null);

/** "all": every page asks for the phrase. "demo": only the demo people do. */
export const lockScope = (env: string | undefined = process.env.SITE_LOCK_SCOPE): "all" | "demo" => (env?.trim() === "demo" ? "demo" : "all");

/** Whether a browser's gate entry opens the lock in force (always, when there is no lock). */
export const gatePassed = (cookie: string | undefined, lock: string | null = siteLock()): boolean =>
  !lock || verifyToken<{ gate: string }>(cookie)?.gate === gateMark(lock);

/** What the cookie carries instead of the phrase. Changing the phrase makes every old cookie useless. */
export const gateMark = (phrase: string) => crypto.createHash("sha256").update(`io-gate:${phrase}`).digest("hex").slice(0, 24);

/** Compares in constant time, so the answer does not leak through how long it took. */
export function phraseMatches(given: string, phrase: string): boolean {
  const a = crypto.createHash("sha256").update(given.trim()).digest(), b = crypto.createHash("sha256").update(phrase).digest();
  return crypto.timingSafeEqual(a, b);
}

/**
 * Paths that stay open while the site is locked: the gate itself, the health check, the robots file, the
 * address a scheduler calls (it has its own secret and answers "not found" without it), and the script that gives
 * a browser the words of its language.
 */
export const isOpenPath = (path: string) => path === "/gate" || path === "/health" || path === "/robots.txt" || path === "/api/jobs/daily" || path === "/api/jobs/weekly"
  /* the words of a language for the browser: the gate page itself is drawn with them, and they hold nothing private */
  || path.startsWith("/lang/words/");

/**
 * Where to go after the gate. Only a path on this site is accepted; anything else becomes the home page.
 * A tab or a line break inside the path is refused too: a browser drops them, which would turn "/<tab>/other.site"
 * into "//other.site", an address on another site.
 */
export const safeNext = (next: string | null | undefined): string =>
  next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") && !/[\u0000-\u0020\u007f]/.test(next) && !next.startsWith("/gate") ? next : "/";
