/**
 * Checks a Firebase ID token with node:crypto alone: no Firebase package.
 *
 * Every check Firebase's own page asks for ("Verify ID tokens using a third-party JWT library"):
 *   header   alg is RS256, and kid names one of Google's public keys for securetoken@system.gserviceaccount.com
 *   payload  aud is the project id; iss is https://securetoken.google.com/<project id>; sub is a non-empty string;
 *            exp is in the future; iat and auth_time are in the past
 *   and the signature is right for that key.
 * IOpener adds its own:
 *   - the token carries an email address and email_verified is exactly true. An address nobody proved they own
 *     never names a person here;
 *   - the sign-in was by Google or by email link, and not inside a Firebase tenant;
 *   - when the caller asks for it, the person signed in within the last few minutes.
 *
 * Nothing here trusts the token before the signature is checked, and the algorithm is fixed: a token that names
 * another algorithm ("none", HS256 and so on) is refused before any key is looked at.
 *
 * Clocks: Google's and this server's can differ by a moment, and a token is checked within a second of being made,
 * so a time "in the past" may be up to SKEW_S seconds ahead. "exp is in the future" gets no such allowance.
 */
import crypto from "node:crypto";

export type TokenRefusal =
  | "malformed" | "algorithm" | "key_id" | "keys_unavailable" | "signature"
  | "audience" | "issuer" | "subject" | "expired" | "not_yet_valid" | "auth_time" | "not_recent"
  | "no_email" | "email_unverified" | "provider";

/** Who a token that passed every check names. Made only by `verifyIdToken`, so the address in it is always a verified one. */
export interface Identity {
  uid: string;
  /** Lower case. Verified by the sign-in provider. */
  email: string;
  name: string | null;
  /** google.com, or password (the name Firebase gives the email link). */
  provider: string;
  /** Seconds since 1970. */
  authTime: number;
}

export type Verified = { ok: true; identity: Identity } | { ok: false; why: TokenRefusal };

export const SKEW_S = 60;
/** The ways of signing in that IOpener offers. A token from any other is refused, even when the project would issue it. */
export const PROVIDERS = ["google.com", "password", "emailLink"] as const;
const MAX_TOKEN = 8192;

/* ───────────── Google's public keys ───────────── */

export interface KeySource {
  /** The key with this id; null when there is no such key; "unavailable" when the keys could not be fetched. */
  get(kid: string, now: number): Promise<crypto.KeyObject | null | "unavailable">;
}

type Fetcher = (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; headers: { get(name: string): string | null }; json(): Promise<unknown> }>;

const MIN_KEEP_S = 60, MAX_KEEP_S = 86_400, NO_HEADER_KEEP_S = 3600;
/** A key id that is not in the list makes the list be fetched again (Google changes keys about once a day), but not more often than this. */
const REFETCH_FLOOR_MS = 60_000;

/** How long the answer may be kept, from its Cache-Control header. */
export function keepSeconds(cacheControl: string | null): number {
  const text = cacheControl ?? "";
  if (/no-store|no-cache/i.test(text)) return MIN_KEEP_S;
  const m = /(?:^|[,\s])max-age\s*=\s*(\d+)/i.exec(text);
  return m ? Math.min(MAX_KEEP_S, Math.max(MIN_KEEP_S, Number(m[1]))) : NO_HEADER_KEEP_S;
}

/** Turns one entry of Google's list (an X.509 certificate, as text) into a public key. Null unless it is an RSA key of 2048 bits or more. */
export function publicKeyFrom(pem: unknown): crypto.KeyObject | null {
  if (typeof pem !== "string" || !pem.includes("-----BEGIN")) return null;
  try {
    const key = crypto.createPublicKey(pem);
    return key.asymmetricKeyType === "rsa" && (key.asymmetricKeyDetails?.modulusLength ?? 0) >= 2048 ? key : null;
  } catch { return null; }
}

/**
 * Google's public keys, fetched from `url` and kept for as long as the answer's Cache-Control header allows.
 * When the time is up the list is fetched again; if that fails there are no keys, and every token is refused
 * until a fetch works. An unknown key id fetches the list again at once, so a change of keys is picked up.
 */
export function googleKeys(url: string, fetcher: Fetcher = fetch as unknown as Fetcher): KeySource {
  let keys = new Map<string, crypto.KeyObject>(), goodUntil = 0, lastFetch = -Infinity;
  let loading: Promise<boolean> | null = null;

  async function load(now: number): Promise<boolean> {
    lastFetch = now;
    try {
      const res = await fetcher(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`keys: ${res.status}`);
      const body = await res.json();
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("keys: not a list");
      const next = new Map<string, crypto.KeyObject>();
      for (const [kid, pem] of Object.entries(body)) { const key = publicKeyFrom(pem); if (kid && key) next.set(kid, key); }
      if (!next.size) throw new Error("keys: none usable");
      keys = next;
      goodUntil = now + keepSeconds(res.headers.get("cache-control")) * 1000;
      return true;
    } catch {
      /* Keys past their time are not used: no keys is safer than old keys. */
      if (now >= goodUntil) keys = new Map();
      return false;
    }
  }

  return {
    async get(kid, now) {
      const stale = now >= goodUntil;
      if (stale || (!keys.has(kid) && now - lastFetch >= REFETCH_FLOOR_MS)) {
        loading ??= load(now).finally(() => { loading = null; });
        if (!(await loading) && stale) return "unavailable";
      }
      return keys.get(kid) ?? null;
    },
  };
}

/** One key list per address for the life of the server process. */
const sources = ((globalThis as unknown as { __iopenerKeys?: Map<string, KeySource> }).__iopenerKeys ??= new Map());
export function keysAt(url: string): KeySource {
  let s = sources.get(url);
  if (!s) { s = googleKeys(url); sources.set(url, s); }
  return s;
}

/* ───────────── the token ───────────── */

const B64URL = /^[A-Za-z0-9_-]+$/;
function part(text: string): Record<string, unknown> | null {
  if (!B64URL.test(text)) return null;
  try {
    const v: unknown = JSON.parse(Buffer.from(text, "base64url").toString("utf8"));
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch { return null; }
}
const seconds = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

export interface VerifyOptions {
  projectId: string;
  keys: KeySource;
  /** Milliseconds since 1970. Tests pass their own. */
  now?: number;
  /** When set, the person must have signed in no longer ago than this many seconds. */
  recentS?: number;
}

export async function verifyIdToken(token: unknown, o: VerifyOptions): Promise<Verified> {
  const no = (why: TokenRefusal): Verified => ({ ok: false, why });
  if (typeof token !== "string" || !token || token.length > MAX_TOKEN) return no("malformed");
  const pieces = token.split(".");
  if (pieces.length !== 3) return no("malformed");
  const [h, p, sig] = pieces;
  const header = part(h), payload = part(p);
  if (!header || !payload) return no("malformed");

  /* The algorithm is fixed before anything else is read. */
  if (header.alg !== "RS256") return no("algorithm");
  if (!sig || !B64URL.test(sig)) return no("signature");
  if (typeof header.kid !== "string" || !header.kid) return no("key_id");

  const nowMs = o.now ?? Date.now();
  const key = await o.keys.get(header.kid, nowMs);
  if (key === "unavailable") return no("keys_unavailable");
  if (!key) return no("key_id");
  let good = false;
  try { good = crypto.verify("RSA-SHA256", Buffer.from(`${h}.${p}`), key, Buffer.from(sig, "base64url")); } catch { good = false; }
  if (!good) return no("signature");

  /* From here on the payload is known to be Google's. */
  const now = nowMs / 1000;
  if (!o.projectId || payload.aud !== o.projectId) return no("audience");
  if (payload.iss !== `https://securetoken.google.com/${o.projectId}`) return no("issuer");
  if (typeof payload.sub !== "string" || !payload.sub || payload.sub !== payload.sub.trim() || payload.sub.length > 128) return no("subject");
  const exp = seconds(payload.exp), iat = seconds(payload.iat), authTime = seconds(payload.auth_time);
  if (exp === null || exp <= now) return no("expired");
  if (iat === null || iat > now + SKEW_S) return no("not_yet_valid");
  if (payload.nbf !== undefined && (seconds(payload.nbf) === null || (payload.nbf as number) > now + SKEW_S)) return no("not_yet_valid");
  if (authTime === null || authTime > now + SKEW_S) return no("auth_time");
  if (o.recentS !== undefined && now - authTime > o.recentS) return no("not_recent");

  const firebase = payload.firebase && typeof payload.firebase === "object" ? (payload.firebase as Record<string, unknown>) : {};
  const provider = firebase.sign_in_provider;
  if (typeof provider !== "string" || !(PROVIDERS as readonly string[]).includes(provider) || firebase.tenant !== undefined) return no("provider");

  if (typeof payload.email !== "string") return no("no_email");
  const email = payload.email.trim().toLowerCase();
  if (email.length < 3 || email.length > 254 || !/^[^\s@]+@[^\s@]+$/.test(email)) return no("no_email");
  if (payload.email_verified !== true) return no("email_unverified");

  const name = typeof payload.name === "string" && payload.name.trim() ? payload.name.trim().slice(0, 80) : null;
  return { ok: true, identity: { uid: payload.sub, email, name, provider, authTime } };
}
