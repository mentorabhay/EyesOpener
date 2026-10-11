// Eyes Opener: Sign-in with a six-digit code by email, against a real database and the Firebase stand-in, with the email caught.
/**
 * Sign-in with a six-digit code by email, against a real database and the Firebase stand-in, with the email caught
 * instead of sent. Skipped where no database answers.
 */
import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => { try { process.loadEnvFile(".env.local"); } catch { /* no file: the default address is used */ } });

import { eq, inArray, like, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { makeJar } from "@/lib/cookie-jar";
import { verifyToken } from "../token";
import { CODE_MINUTES, MAX_TRIES } from "./code";
import { askCodeFlow, codeFlow, googleFlow, PENDING_COOKIE, usesCode, type Ctx } from "./flow";
import { hashedKey } from "./limit";
import type { MailSettings, Message } from "./mail";
import { USER_COOKIE } from "./session-rules";
import { startStandIn, type StandIn } from "./stand-in";

const up = await db.execute(sql`select 1 from signin_code limit 0`).then(() => true, () => false);
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const x = crypto.randomBytes(5).toString("hex");
const at = (who: string) => `${who}@c${x}.example`;
const MAIL: MailSettings = { from: "signin@iopener.example", password: "abcdefghijklmnop", host: "smtp.example", port: 465 };

describe.skipIf(!up)("signing in with a code by email", () => {
  let standIn: StandIn;
  const sent: Message[] = [];
  const nets: string[] = [], emails: string[] = [];
  /** A browser of its own: its cookies, a network address of its own, and a mailbox that catches every code. */
  function browser(o: { send?: Ctx["send"]; mail?: MailSettings | null; now?: Date } = {}) {
    const cookies = new Map<string, string>();
    const store = { get: (n: string) => (cookies.has(n) ? { value: cookies.get(n)! } : undefined), set: (n: string, v: string) => { cookies.set(n, v); }, delete: (n: string) => { cookies.delete(n); } };
    const net = `198.19.${crypto.randomInt(0, 255)}.${crypto.randomInt(1, 255)}`;
    nets.push(net);
    const ctx: Ctx = {
      jar: makeJar(store, store), settings: standIn.settings(), net, now: o.now, mail: o.mail === undefined ? MAIL : o.mail,
      send: o.send ?? (async (m) => { sent.push(m); return "sent"; }),
    };
    return { ctx, cookies, read: (n: string) => makeJar(store, null).get(n)?.value };
  }
  const codeIn = (m: Message) => m.subject.match(/\d{6}/)![0];
  const ask = async (b: ReturnType<typeof browser>, who: string) => { emails.push(at(who)); return askCodeFlow({ email: at(who), next: "" }, b.ctx); };

  beforeAll(async () => { standIn = await startStandIn(); });
  afterAll(async () => {
    await standIn?.close();
    await db.delete(s.appUser).where(like(s.appUser.email, `%@c${x}.example`));
    const keys = emails.map((e) => hashedKey("email", e));
    if (keys.length) {
      await db.delete(s.signinCode).where(inArray(s.signinCode.emailKey, keys));
      await db.delete(s.signinAsk).where(inArray(s.signinAsk.key, [...keys, ...nets.flatMap((n) => [hashedKey("net", n), hashedKey("try", n)])]));
    }
  });

  it("emails six digits, keeps neither the address nor the code, and remembers the address on this device", async () => {
    const b = browser();
    expect(await ask(b, "asha")).toEqual({ ok: true, email: at("asha") });
    const m = sent.at(-1)!;
    expect(m.to).toBe(at("asha"));
    expect(m.subject).toMatch(/^\d{6} is your IOpener sign-in code$/);
    expect(m.text).toContain(`${CODE_MINUTES} minutes`);
    const rows = await db.select().from(s.signinCode).where(eq(s.signinCode.emailKey, hashedKey("email", at("asha"))));
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain(at("asha"));
    expect(JSON.stringify(rows)).not.toContain(codeIn(m));
    expect(verifyToken<{ email: string }>(b.read(PENDING_COOKIE))?.email).toBe(at("asha"));
  });

  it("signs a new person in with the right code, makes their sign-in account, and the code works once", async () => {
    const b = browser();
    await ask(b, "bina");
    const code = codeIn(sent.at(-1)!);
    const r = await codeFlow({ code: `${code.slice(0, 3)} ${code.slice(3)}`, email: "", next: "" }, b.ctx);
    expect(r).toMatchObject({ ok: true, isNew: true });
    expect(b.read(USER_COOKIE)).toBeTruthy();
    const [p] = await db.select().from(s.appUser).where(eq(s.appUser.email, at("bina")));
    expect(p.firebaseUid).toBe([...standIn.users.values()].find((u) => u.email === at("bina"))?.uid);
    expect(await codeFlow({ code, email: at("bina"), next: "" }, browser().ctx)).toEqual({ ok: false, why: "code_expired" });
  });

  it("is the same person who signed in with Google before: one account for one address", async () => {
    const g = browser();
    const first = await googleFlow({ credential: standIn.googleCredential({ email: at("chandra") }), next: null }, g.ctx);
    expect(first.ok).toBe(true);
    const b = browser();
    await ask(b, "chandra");
    const again = await codeFlow({ code: codeIn(sent.at(-1)!), email: "", next: "" }, b.ctx);
    expect(again).toMatchObject({ ok: true, isNew: false });
    if (first.ok && again.ok) expect(again.userId).toBe(first.userId);
  });

  it("counts wrong tries and ends the code at the fifth; only the newest code works", async () => {
    const b = browser();
    await ask(b, "dev");
    const code = codeIn(sent.at(-1)!), wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < MAX_TRIES; i++) expect(await codeFlow({ code: wrong, email: "", next: "" }, b.ctx)).toEqual({ ok: false, why: "code_wrong" });
    expect(await codeFlow({ code, email: "", next: "" }, b.ctx)).toEqual({ ok: false, why: "code_expired" });
    await ask(b, "dev");
    const older = codeIn(sent.at(-1)!);
    await ask(b, "dev");
    const newer = codeIn(sent.at(-1)!);
    if (older !== newer) expect(await codeFlow({ code: older, email: "", next: "" }, b.ctx)).toEqual({ ok: false, why: "code_wrong" });
    expect((await codeFlow({ code: newer, email: "", next: "" }, b.ctx)).ok).toBe(true);
  });

  it("ends a code after ten minutes, and asks for the address on another device", async () => {
    const b = browser();
    await ask(b, "esha");
    const code = codeIn(sent.at(-1)!);
    expect(await codeFlow({ code, email: "", next: "" }, browser().ctx)).toEqual({ ok: false, why: "need_address" });
    const later = browser({ now: new Date(Date.now() + (CODE_MINUTES + 1) * 60_000) });
    expect(await codeFlow({ code, email: at("esha"), next: "" }, later.ctx)).toEqual({ ok: false, why: "code_expired" });
  });

  it("says not set up when IOpener sends no email, and gives the address its count back when sending fails", async () => {
    expect(usesCode({ mail: null })).toBe(false);
    expect(await askCodeFlow({ email: at("farah"), next: "" }, browser({ mail: null }).ctx)).toEqual({ ok: false, why: "not_set_up" });
    emails.push(at("farah"));
    const failing = browser({ send: async () => "refused" });
    expect(await askCodeFlow({ email: at("farah"), next: "" }, failing.ctx)).toEqual({ ok: false, why: "unavailable" });
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.signinAsk).where(eq(s.signinAsk.key, hashedKey("email", at("farah"))));
    expect(n).toBe(0);
  });
});
