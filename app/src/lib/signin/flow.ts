/**
 * Signing in, step by step. The server actions of the sign-in pages call these; each takes the browser's cookies as
 * a plain `Jar`, so the whole of it is tested against a stand-in for Firebase with no web server running.
 *
 *   googleFlow   the browser hands over a Google credential. The server swaps it at Firebase for an ID token.
 *   askFlow      the person types an address. The server asks Firebase to email a link, within the limits.
 *   linkFlow     the person comes back through the link. The server swaps its code, with the address, for an ID token.
 *
 * Every ID token is then checked in full (`verifyIdToken`), matched to a person (`personFor`), and only then does
 * the browser get IOpener's session cookie. A refusal at any step signs nobody in and makes nobody.
 *
 * The address a link was asked for is remembered on the device that asked, in a signed cookie scripts cannot read.
 * Coming back on that device needs no typing. On any other device the address has to be typed again: a link alone,
 * forwarded or read over a shoulder, signs nobody in.
 */
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { viewerOf } from "../auth";
import { safeNext } from "../gate";
import { signToken, secureCookies, verifyToken } from "../token";
import { HOLD_COOKIE, holdOf, mayResume } from "./hold";
import { keysAt, verifyIdToken, type Identity, type TokenRefusal } from "./idtoken";
import { giveBack, take } from "./limit";
import { personFor, type LinkRefusal } from "./people";
import { PROFILE_COOKIE, sessionCookie } from "./session-rules";
import type { SignInSettings } from "./settings";
import { exchangeGoogle, exchangeLink, sendLink } from "./toolkit";

export interface CookieOptions { path?: string; httpOnly?: boolean; sameSite?: "lax" | "strict" | "none"; secure?: boolean; maxAge?: number }
/** The browser's cookies, as much of them as sign-in needs. Next.js's cookie store fits. */
export interface Jar {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options?: CookieOptions): unknown;
  delete(name: string): unknown;
}

export interface Ctx {
  jar: Jar;
  settings: SignInSettings | null;
  /** The network address the request came from (`networkAddress` in limit.ts). */
  net: string;
  now?: Date;
}

/** The person signed in within this long of the server checking. The server checks at once, so this is generous. */
const RECENT_S = 5 * 60;

/* ───────────── where to go afterwards ───────────── */

/** A path on this site to go to after signing in, or null. Never another site, never back into sign-in itself. */
export function cleanNext(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw || raw.length > 512 || /[\u0000-\u0020\u007f]/.test(raw)) return null;
  return safeNext(raw) === raw && raw !== "/" && !/^\/login(\/|\?|$)/.test(raw) ? raw : null;
}

/**
 * Where a person lands after signing in.
 *  - On a device in child mode: Today. Child mode carries on.
 *  - Someone with no household and no other area: the Join page when that is where they were going, else the
 *    welcome page, where they start a family space or type an invite code.
 *  - Otherwise where they were going, or their own area.
 */
export function landing(o: { held: boolean; home: string; next: string | null }): string {
  if (o.held) return "/today";
  const nowhere = o.home === "/login";
  if (nowhere) return o.next && /^\/join(\?|$)/.test(o.next) ? o.next : "/login/welcome";
  return o.next ?? o.home;
}

/* ───────────── the address remembered on this device ───────────── */

export const PENDING_COOKIE = "io_signin";
const PENDING_MS = 6 * 3_600_000;

const cookieBase = () => ({ path: "/", httpOnly: true, sameSite: "lax" as const, secure: secureCookies() });

export function readPending(jar: Jar, now = Date.now()): { email: string; next: string | null } | null {
  const t = verifyToken<{ email?: unknown; next?: unknown }>(jar.get(PENDING_COOKIE)?.value, undefined, now);
  return t && typeof t.email === "string" && t.email ? { email: t.email, next: cleanNext(t.next) } : null;
}

const address = z.string().trim().toLowerCase().max(254).pipe(z.email());
export const tidyEmail = (raw: unknown): string | null => { const r = address.safeParse(raw); return r.success ? r.data : null; };

/* ───────────── asking for a link ───────────── */

export type Asked =
  | { ok: true; email: string }
  | { ok: false; why: "not_set_up" | "bad_address" | "unavailable" }
  | { ok: false; why: "slow_down"; waitMin: number };

export async function askFlow(input: { email: unknown; next: unknown }, ctx: Ctx): Promise<Asked> {
  const s = ctx.settings, now = ctx.now ?? new Date();
  if (!s) return { ok: false, why: "not_set_up" };
  const email = tidyEmail(input.email);
  if (!email) return { ok: false, why: "bad_address" };
  const next = cleanNext(input.next);
  const remember = () => ctx.jar.set(PENDING_COOKIE, signToken({ email, next, exp: now.getTime() + PENDING_MS }), { ...cookieBase(), maxAge: PENDING_MS / 1000 });

  const room = await take([{ kind: "net", value: ctx.net }, { kind: "email", value: email }], now);
  if (!room.ok) {
    if (room.kind === "net") return { ok: false, why: "slow_down", waitMin: Math.max(1, Math.ceil(room.waitS / 60)) };
    /* Too many for this one address: no email goes out, and the answer is the same as when one does. The device
       still remembers the address, so a link that was sent earlier can be finished here. */
    remember();
    return { ok: true, email };
  }
  const continueUrl = `${s.siteUrl}/login/finish${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  const sent = await sendLink(s, email, continueUrl);
  if (sent !== "sent") {
    /* Nothing went out, so the address's count is given back. The network's count stays: it did ask. */
    await giveBack(room.counted.email);
    return { ok: false, why: sent };
  }
  remember();
  return { ok: true, email };
}

/* ───────────── finishing a sign-in ───────────── */

export type Refusal =
  | "not_set_up" | "slow_down" | "unavailable" | "not_confirmed" | "email_unverified"
  | "google_refused" | "other_method" | "disabled"
  | "bad_link" | "need_address" | "link_expired" | "wrong_address"
  | "child_mode" | LinkRefusal;

export type Entered =
  | { ok: true; userId: string; isNew: boolean; /** The device is in child mode and stays in it. */ held: boolean; next: string | null }
  | { ok: false; why: Refusal; waitMin?: number };

const fromToken = (why: TokenRefusal): Refusal => (why === "email_unverified" || why === "no_email" ? "email_unverified" : why === "keys_unavailable" ? "unavailable" : "not_confirmed");

async function tries(ctx: Ctx): Promise<Entered | null> {
  const room = await take([{ kind: "try", value: ctx.net }], ctx.now ?? new Date());
  return room.ok ? null : { ok: false, why: "slow_down", waitMin: Math.max(1, Math.ceil(room.waitS / 60)) };
}

/** Checks the ID token Firebase gave, finds the person, and signs them in on this browser. */
async function enter(idToken: string, expect: { providers: readonly string[]; email?: string }, next: string | null, ctx: Ctx): Promise<Entered> {
  const s = ctx.settings!;
  const v = await verifyIdToken(idToken, { projectId: s.projectId, keys: keysAt(s.endpoints.keys), now: ctx.now?.getTime(), recentS: RECENT_S });
  if (!v.ok) return { ok: false, why: fromToken(v.why) };
  const identity: Identity = v.identity;
  /* The token must be for the way of signing in that was just used, and for the address that was just used. */
  if (!expect.providers.includes(identity.provider) || (expect.email && identity.email !== expect.email)) return { ok: false, why: "not_confirmed" };

  const hold = await holdOf(ctx.jar.get(HOLD_COOKIE)?.value);
  const person = await personFor(identity, { create: hold.state !== "live" });
  if (!person.ok) return { ok: false, why: person.why === "not_known" ? "child_mode" : person.why };
  if (hold.state === "live" && !mayResume(hold, { id: person.userId, accountId: person.accountId })) return { ok: false, why: "child_mode" };

  const c = sessionCookie(person.userId, "signin", ctx.now?.getTime());
  ctx.jar.set(c.name, c.value, c.options);
  ctx.jar.delete(PROFILE_COOKIE);
  ctx.jar.delete(PENDING_COOKIE);
  /* A child-mode cookie whose household is gone holds nothing and could never be ended with a PIN. */
  if (hold.state === "dead") ctx.jar.delete(HOLD_COOKIE);
  return { ok: true, userId: person.userId, isNew: person.isNew, held: hold.state === "live", next };
}

const B64URL = /^[A-Za-z0-9_-]+$/;
/** Does this look like a Google credential made for this site? Read without trust, only to turn rubbish away before anything is asked of Google. */
function looksLikeOurs(credential: unknown, clientId: string): credential is string {
  if (typeof credential !== "string" || credential.length > 4096) return false;
  const parts = credential.split(".");
  if (parts.length !== 3 || !parts.every((p) => B64URL.test(p))) return false;
  try {
    const p = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as { aud?: unknown; iss?: unknown };
    return p.aud === clientId && (p.iss === "https://accounts.google.com" || p.iss === "accounts.google.com");
  } catch { return false; }
}

export async function googleFlow(input: { credential: unknown; next: unknown }, ctx: Ctx): Promise<Entered> {
  const s = ctx.settings;
  if (!s || !s.googleClientId) return { ok: false, why: "not_set_up" };
  if (!looksLikeOurs(input.credential, s.googleClientId)) return { ok: false, why: "google_refused" };
  const over = await tries(ctx);
  if (over) return over;
  const x = await exchangeGoogle(s, input.credential);
  if (!x.ok) return { ok: false, why: x.why === "refused" ? "google_refused" : x.why };
  return enter(x.idToken, { providers: ["google.com"] }, cleanNext(input.next), ctx);
}

const OOB_CODE = /^[A-Za-z0-9_-]{8,1024}$/;
export const looksLikeCode = (v: unknown): v is string => typeof v === "string" && OOB_CODE.test(v);

/**
 * Finishes an email link. The address comes from this device's own memory of asking; only when the device has none
 * (the link was opened somewhere else) is a typed address used.
 */
export async function linkFlow(input: { oobCode: unknown; email: unknown; next: unknown }, ctx: Ctx): Promise<Entered> {
  const s = ctx.settings;
  if (!s) return { ok: false, why: "not_set_up" };
  if (!looksLikeCode(input.oobCode)) return { ok: false, why: "bad_link" };
  const pending = readPending(ctx.jar, ctx.now?.getTime());
  const email = pending?.email ?? tidyEmail(input.email);
  if (!email) return { ok: false, why: "need_address" };
  const over = await tries(ctx);
  if (over) return over;
  const x = await exchangeLink(s, email, input.oobCode);
  if (!x.ok) {
    if (x.why === "expired") return { ok: false, why: "link_expired" };
    if (x.why === "wrong_address") {
      /* The link was not for the address this device remembers (an older request for another address): forget it and ask. */
      if (pending) ctx.jar.delete(PENDING_COOKIE);
      return { ok: false, why: pending ? "need_address" : "wrong_address" };
    }
    return { ok: false, why: x.why };
  }
  return enter(x.idToken, { providers: ["password", "emailLink"], email }, pending ? pending.next : cleanNext(input.next), ctx);
}

/** The person's own area, read from their roles. */
export async function homeOf(userId: string): Promise<string> {
  const [user] = await db.select().from(schema.appUser).where(eq(schema.appUser.id, userId)).limit(1);
  return user ? (await viewerOf(user, true)).home : "/login";
}
