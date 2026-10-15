/**
 * Child mode and sign-in.
 *
 * A device in child mode carries a signed cookie naming one child and that child's household. Only two things end
 * child mode: a grown-up typing the exit PIN, or the cookie's 12 hours running out. Signing in and signing out are
 * not among them, in the demo as much as anywhere else.
 *
 * So, while the cookie is good and its household still exists (the device is "held"):
 *   - a sign-in page can be reached only when the device has nobody it can show the app for. That is the one case
 *     where a grown-up has to sign in again, and the page lets them;
 *   - only a person of that household may sign in on the device. Anyone else is refused, and nobody new is made;
 *   - signing in leaves the cookie alone, so the grown-up lands back in child mode;
 *   - signing out is refused. A grown-up leaves child mode first.
 * A cookie whose household no longer exists holds nothing: no PIN could ever end it. It is removed at the next sign-in.
 */
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { verifyToken } from "../token";

/** The same name as CHILD_COOKIE in auth.ts, which imports this file. */
export const HOLD_COOKIE = "io_child";

export type Hold =
  | { state: "none" }
  /** The cookie is good but its household is gone. */
  | { state: "dead" }
  | { state: "live"; accountId: string; /** Set when the household is a staff member's own test household. */ previewFor: string | null };

export const readHoldCookie = (raw: string | undefined | null, secret?: string, now = Date.now()) => {
  const t = verifyToken<{ profileId?: unknown; accountId?: unknown }>(raw, secret, now);
  return t && typeof t.accountId === "string" && t.accountId ? { accountId: t.accountId } : null;
};

/** What holds this device, from the child-mode cookie and the database. */
export async function holdOf(raw: string | undefined | null): Promise<Hold> {
  const cookie = readHoldCookie(raw);
  if (!cookie) return { state: "none" };
  /* A cookie is signed, so its id is one this server wrote; the shape is still checked before it reaches a query. */
  if (!/^[0-9a-f-]{36}$/i.test(cookie.accountId)) return { state: "dead" };
  const [account] = await db.select({ id: schema.account.id, previewFor: schema.account.previewFor }).from(schema.account).where(eq(schema.account.id, cookie.accountId)).limit(1);
  return account ? { state: "live", accountId: account.id, previewFor: account.previewFor } : { state: "dead" };
}

/** May this person sign in on a device held for that household? Only its own people, and the staff member whose test household it is. */
export const mayResume = (hold: Extract<Hold, { state: "live" }>, user: { id: string; accountId: string | null }): boolean =>
  user.accountId === hold.accountId || (!!hold.previewFor && hold.previewFor === user.id);

/**
 * What the sign-in page does on a device, given what holds it and whether the member app can open for whoever is
 * signed in. "to_today" is the old sealing: a child cannot reach the page. "sign_in_held" is the way out of the
 * loop: nobody is signed in, so a grown-up of the family signs in and child mode carries on.
 */
export type LoginGate = "open" | "to_today" | "sign_in_held";
export const loginGate = (hold: Hold["state"], memberInChildMode: boolean): LoginGate =>
  hold !== "live" ? "open" : memberInChildMode ? "to_today" : "sign_in_held";
