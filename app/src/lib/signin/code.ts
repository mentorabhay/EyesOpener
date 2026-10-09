/**
 * Six-digit sign-in codes sent by email (Ved, 10 October 2026). Server only.
 *
 * A code is drawn from a secure random source, sent once (mail.ts), and kept only as a keyed hash beside a keyed hash
 * of the address (limit.ts `hashedKey`), so the table holds neither. Asking again replaces the code before it: only
 * the newest works. A code works once, for ten minutes, and the fifth wrong try ends it. How often codes may be asked
 * for, and tries made, is counted by limit.ts exactly as for links.
 */
import crypto from "node:crypto";
import { and, desc, eq, isNull, lt } from "drizzle-orm";
import { db, schema } from "@/db";
import { sessionSecret } from "../token";
import { CODE_MINUTES, MAX_TRIES } from "./code-rules";
import { hashedKey } from "./limit";

export { CODE_MINUTES, MAX_TRIES, tidyCode } from "./code-rules";
const KEEP_MS = 86_400_000;

/** Six digits, every one equally likely. */
export const makeCode = (): string => crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");

export const codeHash = (emailKey: string, code: string, secret = sessionSecret()) =>
  crypto.createHmac("sha256", secret).update(`code:${emailKey}:${code}`).digest("base64url");

/** Makes a new code for an address, ending any before it, and returns it to be sent. */
export async function issueCode(email: string, now = new Date()): Promise<string> {
  const code = makeCode(), emailKey = hashedKey("email", email);
  await db.transaction(async (tx) => {
    await tx.update(schema.signinCode).set({ usedAt: now }).where(and(eq(schema.signinCode.emailKey, emailKey), isNull(schema.signinCode.usedAt)));
    await tx.insert(schema.signinCode).values({ emailKey, codeHash: codeHash(emailKey, code), expiresAt: new Date(now.getTime() + CODE_MINUTES * 60_000), createdAt: now });
  });
  return code;
}

export type Checked = "ok" | "wrong" | "expired" | "none";

/**
 * Checks a typed code against the newest code of the address. A right code is used up at once; a wrong one counts a
 * try, and the fifth ends it. Comparison takes the same time whatever the code.
 */
export async function checkCode(email: string, typed: string, now = new Date()): Promise<Checked> {
  const emailKey = hashedKey("email", email);
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(schema.signinCode).where(eq(schema.signinCode.emailKey, emailKey))
      .orderBy(desc(schema.signinCode.createdAt)).limit(1).for("update");
    if (!row || row.usedAt) return "none";
    if (row.expiresAt <= now) return "expired";
    const want = Buffer.from(row.codeHash), got = Buffer.from(codeHash(emailKey, typed));
    if (want.length === got.length && crypto.timingSafeEqual(want, got)) {
      await tx.update(schema.signinCode).set({ usedAt: now }).where(eq(schema.signinCode.id, row.id));
      return "ok";
    }
    const tries = row.tries + 1;
    await tx.update(schema.signinCode).set({ tries, ...(tries >= MAX_TRIES ? { usedAt: now } : {}) }).where(eq(schema.signinCode.id, row.id));
    return "wrong";
  });
}

/** Removes codes older than a day. The daily sign-in tidy-up calls it. */
export async function forgetOldCodes(now = new Date()): Promise<number> {
  return (await db.delete(schema.signinCode).where(lt(schema.signinCode.createdAt, new Date(now.getTime() - KEEP_MS)))).rowCount ?? 0;
}
