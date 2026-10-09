/**
 * Every cookie the app keeps, carried in one cookie named `__session` (tracker K10, 10 October 2026).
 *
 * Firebase Hosting, the front door planned for the app, passes on to the server only a cookie of that name and drops
 * every other one. So the app's own cookies (the sign-in, the site lock, child mode, the chosen profile, the language
 * and the rest) are entries inside `__session`, each under the name it had as a cookie of its own (`io_user` and so
 * on). Code reads and writes them as before, through `jar()` in place of Next's `cookies()`, and through `requestJar`
 * and `responseJar` in the proxy and in route handlers.
 *
 * - `__session` is one httpOnly, sameSite=lax cookie, secure on an https site. Its value is base64url JSON of
 *   `{ name: [value, expires-at-ms?] }`. Entries that must not be forged are signed tokens already (token.ts); the
 *   bundle adds no trust of its own.
 * - An entry written with `maxAge` keeps its own end time; the bundle lives as long as its longest entry. An entry
 *   written without one lives as long as the bundle.
 * - An entry written with `httpOnly: false` (only the language, which the page's own script compares, and the
 *   developer's drafts switch) is also written as a plain cookie of its name, for the page to read. The server never
 *   relies on that copy: behind Hosting it never arrives.
 * - A cookie of the old kind, sent by a browser that has not been answered since the change, is still read when the
 *   bundle has no entry of that name, and is removed when that entry is next written or deleted.
 * - The phone and TV apps keep `__session` like any other cookie and send it back.
 */
import { cookies } from "next/headers";
import { secureCookies } from "./token";

export const SESSION_COOKIE = "__session";

/** What a cookie store gives when read: Next's request cookies, `cookies()`, or a test's stand-in. */
export interface CookieReader { get(name: string): { value: string } | undefined }
/** What a cookie store takes when written: Next's response cookies, `cookies()`, or a test's stand-in. */
export interface CookieWriter {
  set(name: string, value: string, options?: Record<string, unknown>): unknown;
  delete(name: string): unknown;
}
export interface EntryOptions { maxAge?: number; httpOnly?: boolean; [k: string]: unknown }
/** The same shape as Next's cookie store, so code that took `cookies()` takes this. */
export interface Jar {
  get(name: string): { name: string; value: string } | undefined;
  has(name: string): boolean;
  set(name: string, value: string, options?: EntryOptions): Jar;
  delete(name: string): Jar;
}

type Bundle = Record<string, [string] | [string, number]>;
/** A browser holds at most about 4 KB in one cookie; the bundle stays well under it, and a larger one is never written. */
export const MAX_BUNDLE = 3800;

export function readBundle(raw: string | undefined, now = Date.now()): Bundle {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Bundle = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(v) || typeof v[0] !== "string") continue;
      if (v.length > 1) {
        if (typeof v[1] !== "number" || v[1] <= now) continue;
        out[k] = [v[0], v[1]];
      } else out[k] = [v[0]];
    }
    return out;
  } catch { return {}; }
}

export const encodeBundle = (b: Bundle): string => Buffer.from(JSON.stringify(b)).toString("base64url");

/** Seconds the bundle cookie should live: its longest entry, or the browser session when no entry has an end. */
export function bundleAge(b: Bundle, now = Date.now()): number | undefined {
  const ends = Object.values(b).map((e) => e[1]).filter((x): x is number => typeof x === "number");
  if (!ends.length || ends.length < Object.keys(b).length) return undefined;
  return Math.max(1, Math.ceil((Math.max(...ends) - now) / 1000));
}

const plainOptions = (o: EntryOptions) => ({ ...o, httpOnly: false, path: (o.path as string | undefined) ?? "/" });

/**
 * A jar over a cookie store. `read` is where the request's cookies are read, `write` where the answer's are written
 * (the same object for `cookies()`). The bundle is read once and kept here, so several writes in one request add up.
 */
export function makeJar(read: CookieReader, write: CookieWriter | null, now: () => number = Date.now): Jar {
  let bundle: Bundle | null = null;
  const current = () => (bundle ??= readBundle(read.get(SESSION_COOKIE)?.value, now()));
  const legacy = (name: string) => (name === SESSION_COOKIE ? undefined : read.get(name)?.value);
  const save = () => {
    if (!write) throw new Error("This cookie store cannot be written here.");
    const b = current();
    if (!Object.keys(b).length) { write.delete(SESSION_COOKIE); return; }
    const value = encodeBundle(b);
    if (value.length > MAX_BUNDLE) throw new Error("The session cookie would be too large.");
    const maxAge = bundleAge(b, now());
    write.set(SESSION_COOKIE, value, { path: "/", httpOnly: true, sameSite: "lax", secure: secureCookies(), ...(maxAge ? { maxAge } : {}) });
  };
  const jar: Jar = {
    get(name) {
      const e = current()[name];
      if (e) return { name, value: e[0] };
      const old = legacy(name);
      return old === undefined ? undefined : { name, value: old };
    },
    has(name) { return jar.get(name) !== undefined; },
    set(name, value, options = {}) {
      const b = current();
      b[name] = typeof options.maxAge === "number" ? (options.maxAge > 0 ? [value, now() + options.maxAge * 1000] : [value, 0]) : [value];
      if (b[name][1] === 0) delete b[name];
      save();
      if (options.httpOnly === false) {
        if (b[name]) write!.set(name, value, plainOptions(options));
        else write!.delete(name);
      } else if (legacy(name) !== undefined) write!.delete(name);
      return jar;
    },
    delete(name) {
      const b = current();
      const had = name in b;
      delete b[name];
      if (had) save();
      if (legacy(name) !== undefined) write!.delete(name);
      return jar;
    },
  };
  return jar;
}

/** The request's cookies, for the proxy: reading only. */
export const requestJar = (req: { cookies: CookieReader }): Jar => makeJar(req.cookies, null);

/** A jar that reads the request and writes the answer, for the proxy and route handlers that build their own answer. */
export const responseJar = (req: { cookies: CookieReader }, res: { cookies: CookieWriter }): Jar => makeJar(req.cookies, res.cookies);

/**
 * The jar for Server Components, Server Functions and route handlers: Next's `cookies()`, carried in `__session`.
 * In a Server Component it may only be read, as with `cookies()`.
 */
export async function jar(): Promise<Jar> {
  const store = await cookies();
  return makeJar(store, store);
}
