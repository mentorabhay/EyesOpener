/**
 * Signed cookies for the demo sign-in and for child mode.
 * payload (base64url JSON) + "." + HMAC-SHA256. Pure sign and verify, so they are unit-tested.
 */
import crypto from "node:crypto";

/** Fails closed in production: there is no built-in secret outside development. */
export function sessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is not set.");
  return "dev-only-secret-change-me";
}

const mac = (data: string, secret: string) => crypto.createHmac("sha256", secret).update(data).digest("base64url");

export function signToken<T extends object>(payload: T & { exp: number }, secret = sessionSecret()): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${mac(body, secret)}`;
}

export function verifyToken<T extends object>(token: string | undefined | null, secret = sessionSecret(), now = Date.now()): (T & { exp: number }) | null {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot), sig = token.slice(dot + 1), want = mac(body, secret);
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T & { exp: number };
    return typeof p.exp === "number" && p.exp > now ? p : null;
  } catch { return null; }
}

/** PIN hashing for the child-mode exit PIN. */
export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16);
  return `${salt.toString("base64url")}.${crypto.scryptSync(pin, salt, 32).toString("base64url")}`;
}

export function checkPin(pin: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(".");
  if (!salt || !hash) return false;
  const got = crypto.scryptSync(pin, Buffer.from(salt, "base64url"), 32);
  const want = Buffer.from(hash, "base64url");
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}
