// Eyes Opener: Eyes Opener's own session, and when it stops counting. Pure rules, unit-tested; auth.ts applies them on every request.
/**
 * Eyes Opener's own session, and when it stops counting. Pure rules, unit-tested; auth.ts applies them on every request.
 *
 * After Firebase has vouched for a person, the server gives the browser one signed cookie that names the `app_user`
 * and says when the session began. Nothing of Firebase's is kept in the browser. Roles are never in the cookie:
 * they are read from the database on every request.
 *
 * A session stops counting when any of these is true:
 *   1. its 30 days are up (SESSION_DAYS);
 *   2. the person pressed "Sign out on every device": the session began before `app_user.sessions_valid_after`;
 *   3. the person can see more than their own family (staff, a counsellor, a sponsor's team) and the session is
 *      older than a working day (TRUSTED_HOURS). The role is read fresh each time, so this holds from the moment
 *      a role is given;
 *   4. the person's row is gone;
 *   5. it is a demo session and the demo sign-in has been switched off.
 * Signing out on one device simply removes that device's cookie.
 */
import { secureCookies, signToken, verifyToken } from "../token";
import { SESSION_DAYS, TRUSTED_HOURS } from "./lengths";

export { SESSION_DAYS, TRUSTED_HOURS };

export const USER_COOKIE = "io_user";
/** The active family profile. It belongs to whoever was signed in, so a new sign-in clears it. */
export const PROFILE_COOKIE = "io_profile";
export const SESSION_MS = SESSION_DAYS * 86_400_000;

export interface Session {
  userId: string;
  /** When the session began, in milliseconds since 1970. */
  iat: number;
  /** signin: Firebase vouched for the person. demo: someone picked a seeded person on the demo page. */
  via: "signin" | "demo";
  exp: number;
}

/** What goes into the cookie for a session that begins now. */
export const newSession = (userId: string, via: Session["via"], now = Date.now()): Session => ({ userId, iat: now, via, exp: now + SESSION_MS });

/** Reads the cookie. Null when it is missing, forged or past its time, or when it is a demo session and the demo is off. */
export function readSession(raw: string | undefined | null, demoOn: boolean, secret?: string, now = Date.now()): Session | null {
  const t = verifyToken<{ userId?: unknown; iat?: unknown; via?: unknown }>(raw, secret, now);
  if (!t || typeof t.userId !== "string" || !t.userId) return null;
  const via = t.via === "signin" ? "signin" : "demo";
  if (via === "demo" && !demoOn) return null;
  /* A cookie from before sessions carried a start time: it began 30 days before it ends. */
  const iat = typeof t.iat === "number" && Number.isFinite(t.iat) ? t.iat : t.exp - SESSION_MS;
  /* A session cannot begin in the future, nor last longer than a session lasts. */
  if (iat > now + 60_000 || t.exp - iat > SESSION_MS) return null;
  return { userId: t.userId, iat, via, exp: t.exp };
}

/** "Sign out on every device" ends every session that began before that moment. */
export const endedEverywhere = (s: Pick<Session, "iat">, validAfter: Date | null | undefined): boolean => !!validAfter && s.iat < validAfter.getTime();

/** A person who can see more than their own family signs in again after a working day. */
export const tooOldForRole = (s: Pick<Session, "iat">, trusted: boolean, now = Date.now()): boolean => trusted && now - s.iat > TRUSTED_HOURS * 3_600_000;

/** The cookie for a session that begins now: scripts cannot read it, other sites' background requests do not carry it, and it travels only over https when the site is https. */
export function sessionCookie(userId: string, via: Session["via"], now = Date.now()) {
  return {
    name: USER_COOKIE,
    value: signToken(newSession(userId, via, now)),
    options: { path: "/", httpOnly: true, sameSite: "lax" as const, secure: secureCookies(), maxAge: SESSION_MS / 1000 },
  };
}
