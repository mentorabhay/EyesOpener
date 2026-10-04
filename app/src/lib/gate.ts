/**
 * The site lock. When SITE_LOCK holds an access phrase, every page asks for it once per browser.
 * It is for a site that is deployed but not open yet (a staging copy, the days before launch).
 * With SITE_LOCK unset the lock does not exist. Pure functions, unit-tested.
 */
import crypto from "node:crypto";

export const GATE_COOKIE = "io_gate";
export const GATE_DAYS = 30;

/** The access phrase, or null when the site is open. */
export const siteLock = (env: string | undefined = process.env.SITE_LOCK): string | null => (env && env.trim().length >= 8 ? env.trim() : null);

/** What the cookie carries instead of the phrase. Changing the phrase makes every old cookie useless. */
export const gateMark = (phrase: string) => crypto.createHash("sha256").update(`io-gate:${phrase}`).digest("hex").slice(0, 24);

/** Compares in constant time, so the answer does not leak through how long it took. */
export function phraseMatches(given: string, phrase: string): boolean {
  const a = crypto.createHash("sha256").update(given.trim()).digest(), b = crypto.createHash("sha256").update(phrase).digest();
  return crypto.timingSafeEqual(a, b);
}

/** Paths that stay open while the site is locked: the gate itself, the health check and the robots file. */
export const isOpenPath = (path: string) => path === "/gate" || path === "/healthz" || path === "/robots.txt";

/** Where to go after the gate. Only a path on this site is accepted; anything else becomes the home page. */
export const safeNext = (next: string | null | undefined): string =>
  next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") && !next.startsWith("/gate") ? next : "/";
