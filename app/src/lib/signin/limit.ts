// Eyes Opener: How often a sign-in link may be asked for, and how often a sign-in may be tried.
/**
 * How often a sign-in link may be asked for, and how often a sign-in may be tried.
 *
 * The counts live in the database (`signin_ask`), because the server scales to zero and may run as two copies:
 * a count kept in memory would forget, and would be different on each copy.
 *
 * What is counted, each within a short time and within a day:
 *   email   links asked for one address, from anywhere
 *   net     links asked from one network address, for any address
 *   try     tries to finish a sign-in (a Google credential, or the code of a link) from one network address
 *
 * The table never holds an address. It holds a keyed hash (HMAC-SHA256 with the session secret), and rows are
 * removed after a day.
 *
 * What the person is told:
 *   - over the network limit: to wait, and for about how long. That is about their own asking.
 *   - over the limit for one address: nothing different. The page says "check your email" exactly as it does when
 *     a link is sent, so the form never tells anyone what has been asked for somebody else's address.
 */
import crypto from "node:crypto";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { sessionSecret } from "../token";

export type LimitKind = "email" | "net" | "try";
interface Window { withinS: number; max: number }

export const LIMITS: Record<LimitKind, readonly Window[]> = {
  email: [{ withinS: 15 * 60, max: 3 }, { withinS: 86_400, max: 8 }],
  /* Many homes and phones share one network address, so these are wider. */
  net: [{ withinS: 15 * 60, max: 12 }, { withinS: 86_400, max: 60 }],
  try: [{ withinS: 15 * 60, max: 20 }, { withinS: 86_400, max: 200 }],
};
const KEEP_S = 86_400;

/** Is one more allowed, given when the earlier ones happened (milliseconds)? If not, how many seconds until one is. */
export function roomFor(kind: LimitKind, earlier: readonly number[], now: number): { ok: true } | { ok: false; waitS: number } {
  let waitS = 0;
  for (const w of LIMITS[kind]) {
    const inside = earlier.filter((t) => t > now - w.withinS * 1000 && t <= now).sort((a, b) => a - b);
    if (inside.length < w.max) continue;
    /* One is allowed again when enough of the oldest have left the window. */
    const leaves = inside[inside.length - w.max] + w.withinS * 1000;
    waitS = Math.max(waitS, Math.ceil((leaves - now) / 1000));
  }
  return waitS > 0 ? { ok: false, waitS } : { ok: true };
}

/** What is stored in place of an address. Without the secret it cannot be matched to one. */
export const hashedKey = (kind: LimitKind, value: string, secret = sessionSecret()) =>
  crypto.createHmac("sha256", secret).update(`io-signin:${kind}:${value}`).digest("base64url");

const V4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
/** One network address in a fixed form. IPv6 is cut to its first half, because one home is given the whole second half. Null when it is not an address. */
export function tidyAddress(raw: string): string | null {
  let a = raw.trim().toLowerCase().replace(/^\[|\]$/g, "");
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(a);
  if (mapped) a = mapped[1];
  const v4 = V4.exec(a);
  if (v4) return v4.slice(1).every((n) => Number(n) <= 255) ? v4.slice(1).map(Number).join(".") : null;
  if (!/^[0-9a-f:]+$/.test(a) || !a.includes(":") || a.split("::").length > 2) return null;
  const [head, tail = ""] = a.split("::");
  const left = head ? head.split(":") : [], right = tail ? tail.split(":") : [];
  const groups = a.includes("::") ? [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill("0"), ...right] : left;
  if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  return groups.slice(0, 4).map((g) => parseInt(g, 16).toString(16)).join(":") + "::/64";
}

/**
 * The network address a request came from, out of the X-Forwarded-For list.
 *
 * Anyone can put anything at the front of that list; only what Google's own servers add at the end can be trusted.
 * `hops` says how many servers in front of the app add to it after the visitor's address:
 *   0  Cloud Run reached directly: the last entry is the visitor
 *   1  Firebase Hosting in front of Cloud Run: the last entry is Hosting, the one before it is the visitor
 * When the list is shorter than that, or the entry is not an address, the answer is "unknown": everyone without an
 * address then shares one count, which is the safe side.
 */
export function networkAddress(forwardedFor: string | null | undefined, hops = 0): string {
  const list = (forwardedFor ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const entry = list[list.length - 1 - hops];
  return (entry && tidyAddress(entry)) || "unknown";
}

export type Taken = { ok: true; /** The rows that were counted, by kind, so one can be given back. */ counted: Partial<Record<LimitKind, string>> } | { ok: false; kind: LimitKind; waitS: number };

/**
 * Counts one more of each kind, in the order given, unless one of them is over its limit. The first that is over
 * stops the rest and is the answer; nothing is counted for it or for those after it.
 * Two requests for the same key at the same moment are taken one after the other.
 */
export async function take(what: readonly { kind: LimitKind; value: string }[], now = new Date()): Promise<Taken> {
  return db.transaction(async (tx) => {
    await tx.delete(schema.signinAsk).where(lt(schema.signinAsk.at, new Date(now.getTime() - KEEP_S * 1000)));
    const counted: Partial<Record<LimitKind, string>> = {};
    for (const { kind, value } of what) {
      const key = hashedKey(kind, value);
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${kind}:${key}`}, 0))`);
      const rows = await tx.select({ at: schema.signinAsk.at }).from(schema.signinAsk)
        .where(and(eq(schema.signinAsk.kind, kind), eq(schema.signinAsk.key, key), gte(schema.signinAsk.at, new Date(now.getTime() - KEEP_S * 1000))));
      const room = roomFor(kind, rows.map((r) => r.at.getTime()), now.getTime());
      if (!room.ok) return { ok: false as const, kind, waitS: room.waitS };
      const [row] = await tx.insert(schema.signinAsk).values({ kind, key, at: now }).returning({ id: schema.signinAsk.id });
      counted[kind] = row.id;
    }
    return { ok: true as const, counted };
  });
}

/** Takes one count back: an email that was counted and then could not be sent does not use up the address's few links. */
export async function giveBack(rowId: string | undefined) {
  if (rowId) await db.delete(schema.signinAsk).where(eq(schema.signinAsk.id, rowId));
}

/** Removes counts older than a day. The daily job calls it, so the table empties even when nobody asks for a link. */
export async function forgetOldAsks(now = new Date()): Promise<number> {
  return (await db.delete(schema.signinAsk).where(lt(schema.signinAsk.at, new Date(now.getTime() - KEEP_S * 1000)))).rowCount ?? 0;
}
