/**
 * Sign-in from end to end, against a real database and a stand-in for Firebase that is started inside the test.
 *
 * The server actions of the sign-in pages are called exactly as the pages call them. Only three things are stood
 * in for: the browser's cookies and the request's headers (plain maps), and a move to another page (caught and
 * read). Everything else is the real code: the Identity Toolkit calls go over HTTP to the stand-in, every ID token
 * is checked against the stand-in's published keys, and people, households, counts and queues are real rows.
 *
 * It makes its own people and households, under an address no other row can have, and removes them at the end.
 * It needs a database with the current tables. Where none answers (the checks on GitHub have none), it is skipped.
 */
import crypto from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  try { process.loadEnvFile(".env.local"); } catch { /* no file: the default address is used */ }
  class Moved extends Error { constructor(public to: string, public how?: string) { super(`moved to ${to}`); } }
  return { jar: new Map<string, string>(), headers: new Map<string, string>(), Moved };
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (h.jar.has(name) ? { name, value: h.jar.get(name)! } : undefined),
    set: (name: string, value: string) => { h.jar.set(name, value); },
    delete: (name: string) => { h.jar.delete(name); },
  }),
  headers: async () => ({ get: (name: string) => h.headers.get(name.toLowerCase()) ?? null }),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string, how?: string) => { throw new h.Moved(to, how); },
  notFound: () => { throw new Error("not found"); },
  RedirectType: { replace: "replace", push: "push" },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

import { and, eq, inArray, like, or, sql } from "drizzle-orm";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { joinHousehold } from "@/app/(auth)/join/actions";
import JoinPage from "@/app/(auth)/join/page";
import FinishPage from "@/app/(auth)/login/finish/page";
import LoginPage from "@/app/(auth)/login/page";
import WelcomePage from "@/app/(auth)/login/welcome/page";
import { signin as words } from "@/copy/signin";
import { askForLink, finishLink, googleSignIn, signOutEverywhere, signOutHere, startFamilySpace, type SignInAnswer } from "@/app/(auth)/login/actions";
import { db, schema as s } from "@/db";
import { demoSignIn } from "../actions";
import { CHILD_COOKIE, getViewer, signInAs, USER_COOKIE } from "../auth";
import { eraseHousehold } from "../data/erase";
import { signInTidy } from "../jobs/sign-in";
import { getMember } from "../session";
import { signToken } from "../token";
import { PENDING_COOKIE, readPending } from "./flow";
import { holdOf, loginGate } from "./hold";
import { forgetOldAsks, hashedKey, LIMITS } from "./limit";
import { queueRemoval, REMOVAL_NOTES, removeQueued } from "./removal";
import { sessionCookie, TRUSTED_HOURS } from "./session-rules";
import { startStandIn, type StandIn } from "./stand-in";

const up = await db.execute(sql`select sessions_valid_after from app_user limit 0`).then(() => db.execute(sql`select 1 from signin_ask limit 0`)).then(() => db.execute(sql`select 1 from signin_removal limit 0`)).then(() => true, () => false);
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

/* Words no other row in the database can hold. */
const x = crypto.randomBytes(5).toString("hex");
const DOMAIN = `s${x}.example`;
const at = (who: string) => `${who}@${DOMAIN}`;
const usedNets: string[] = [], usedEmails: string[] = [];
let netCount = 0;
/** A network address nobody else in the test has used. */
const freshNet = () => { const ip = `198.18.${crypto.randomInt(0, 255)}.${++netCount}`; usedNets.push(ip); h.headers.set("x-forwarded-for", ip); return ip; };

type Outcome<T> = { to: string; how?: string; answer?: undefined } | { answer: T; to?: undefined };
/** Runs an action, and says where it moved the browser to or what it answered. */
async function run<T>(action: () => Promise<T>): Promise<Outcome<T>> {
  try { return { answer: await action() }; } catch (e) { if (e instanceof h.Moved) return { to: e.to, how: e.how }; throw e; }
}
const form = (fields: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(fields)) f.set(k, v); return f; };
const person = async (email: string) => (await db.select().from(s.appUser).where(eq(sql`lower(${s.appUser.email})`, email.toLowerCase())))[0];
const people = async (email: string) => (await db.select().from(s.appUser).where(eq(sql`lower(${s.appUser.email})`, email.toLowerCase()))).length;

describe.skipIf(!up)("signing in, against the database and a stand-in for Firebase", () => {
  let standIn: StandIn;
  const saved = { ...process.env };

  /** A new browser: no cookies, a network address of its own. */
  const newBrowser = () => { h.jar.clear(); freshNet(); };
  const google = (email: string, more: { name?: string; emailVerified?: boolean } = {}, next: string | null = null) => {
    if (!usedEmails.includes(email.toLowerCase())) usedEmails.push(email.toLowerCase());
    return run(() => googleSignIn(standIn.googleCredential({ email, ...more }), next));
  };
  const ask = (email: string, next = "") => { if (!usedEmails.includes(email.toLowerCase())) usedEmails.push(email.toLowerCase()); return run(() => askForLink(null, form({ email, next }))); };
  const finish = (code: string, email = "", next = "") => run(() => finishLink(null, form({ code, email, next })));
  const lastMail = () => standIn.mail[standIn.mail.length - 1];
  const refusal = (o: Outcome<SignInAnswer>) => (o.answer && !o.answer.ok ? o.answer.why : o.to ? `moved to ${o.to}` : "accepted");
  /** A household with one guardian and one child, made directly: a family that already uses IOpener. */
  async function family(name: string, guardianEmail: string, more: Partial<typeof s.account.$inferInsert> = {}) {
    const [account] = await db.insert(s.account).values({ displayName: `zz-signin-${x} ${name}`, ...more }).returning();
    const [guardian] = await db.insert(s.appUser).values({ email: guardianEmail, displayName: `Guardian ${name}`, accountId: account.id, seat: "guardian" }).returning();
    const [child] = await db.insert(s.profile).values({ accountId: account.id, displayName: `Child ${name}`, kind: "child", birthYear: 2019 }).returning();
    usedEmails.push(guardianEmail.toLowerCase());
    return { account, guardian, child };
  }
  const childMode = (accountId: string, profileId: string) => h.jar.set(CHILD_COOKIE, signToken({ profileId, accountId, exp: Date.now() + 3_600_000 }));

  beforeAll(async () => {
    standIn = await startStandIn();
    Object.assign(process.env, standIn.env(), { SITE_URL: "http://localhost:3000", DEMO_LOGIN: "off", ADMIN_EMAILS: at("owner") });
    delete process.env.SITE_LOCK;
  });
  beforeEach(() => { newBrowser(); process.env.DEMO_LOGIN = "off"; Object.assign(standIn.knobs, { sendError: null, metadata: true, mayDelete: true, claims: null, answerFor: null }); });
  afterAll(async () => {
    await standIn?.close();
    for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
    Object.assign(process.env, saved);
    const mine = await db.select({ id: s.appUser.id, accountId: s.appUser.accountId, uid: s.appUser.firebaseUid }).from(s.appUser).where(like(s.appUser.email, `%@${DOMAIN}`));
    const accounts = [...new Set(mine.map((m) => m.accountId).filter((a): a is string => !!a))];
    await db.delete(s.account).where(or(like(s.account.displayName, `zz-signin-${x}%`), accounts.length ? inArray(s.account.id, accounts) : sql`false`, mine.length ? inArray(s.account.previewFor, mine.map((m) => m.id)) : sql`false`));
    await db.delete(s.appUser).where(like(s.appUser.email, `%@${DOMAIN}`));
    await db.delete(s.signinRemoval).where(like(s.signinRemoval.uid, "uid-%"));
    const keys = [...usedEmails.map((e) => hashedKey("email", e)), ...usedNets.flatMap((n) => [hashedKey("net", n), hashedKey("try", n)]), hashedKey("email", `old-${x}`)];
    if (keys.length) await db.delete(s.signinAsk).where(inArray(s.signinAsk.key, keys));
  });

  /* ───────────── the pages ───────────── */

  describe("what the sign-in pages show", () => {
    /** Draws a page as the server would, or says where it sent the browser. */
    const draw = async (page: () => Promise<ReactElement>) => { const out = await run(page); return out.to ? `moved to ${out.to}` : renderToStaticMarkup(out.answer!).replace(/&#x27;/g, "'"); };
    const login = (q: Record<string, string> = {}) => draw(() => LoginPage({ searchParams: Promise.resolve(q) }));
    const finishPage = (q: Record<string, string>) => draw(() => FinishPage({ searchParams: Promise.resolve(q) }));
    const without = async <T,>(keys: string[], fn: () => Promise<T>) => {
      const kept = keys.map((k) => [k, process.env[k]] as const);
      for (const k of keys) delete process.env[k];
      try { return await fn(); } finally { for (const [k, v] of kept) if (v !== undefined) process.env[k] = v; }
    };

    it("with nothing set up and the demo off: one plain line, and nothing to press", async () => {
      const html = await without(["FIREBASE_PROJECT_ID", "FIREBASE_API_KEY", "GOOGLE_CLIENT_ID"], () => login());
      expect(html).toContain(words.notSetUp);
      expect(html).not.toContain("<form");
      expect(html).not.toContain("<input");
      expect(html).not.toContain("iopener.test");
    });

    it("with nothing set up and the demo on: the seeded people, and no sign-in form", async () => {
      process.env.DEMO_LOGIN = "on";
      const html = await without(["FIREBASE_PROJECT_ID", "FIREBASE_API_KEY", "GOOGLE_CLIENT_ID"], () => login());
      expect(html).toContain("Demo sign-in");
      expect(html).not.toContain("signin-email");
      expect(html).not.toContain(words.notSetUp);
    });

    it("set up, with the demo off: the Google button's place, the email form, and the line that children do not sign in", async () => {
      const html = await login({ next: "/train/games" });
      expect(html).toContain(words.google.title);
      expect(html).toContain('id="signin-email"');
      expect(html).toContain('name="next" value="/train/games"');
      expect(html).toContain(words.children);
      expect(html).toContain('href="/join"');
      expect(html).not.toContain("Demo sign-in");
      expect(html).not.toContain("iopener.test");
      /* The web API key stays on the server. */
      expect(html).not.toContain(standIn.apiKey);
    });

    it("offers only the email link when there is no Google client id", async () => {
      const html = await without(["GOOGLE_CLIENT_ID"], () => login());
      expect(html).not.toContain(words.google.title);
      expect(html).toContain('id="signin-email"');
    });

    it("never carries a place to go next that is on another site", async () => {
      for (const evil of ["https://evil.example", "//evil.example", "/\tevil"]) expect(await login({ next: evil })).toContain('name="next" value=""');
    });

    it("with the demo on beside real sign-in, lists seeded people only: never someone who signed in for real, never someone ops entered", async () => {
      await google(at("Private.Person"), { name: `Private Person ${x}` });
      await db.insert(s.appUser).values({ email: at("ops-entered"), displayName: `Ops Entered ${x}`, staffRole: "ops" });
      newBrowser();
      process.env.DEMO_LOGIN = "on";
      const html = await login();
      expect(html).toContain("Demo sign-in");
      expect(html).toContain('id="signin-email"');
      expect(html).not.toContain(`Private Person ${x}`);
      expect(html).not.toContain(`Ops Entered ${x}`);
      expect(html).not.toContain(DOMAIN);
    });

    it("shows a person who is signed in who they are, the way to their pages, and both ways to sign out", async () => {
      await family("Shown", at("shown"));
      await google(at("shown"));
      const html = await login();
      expect(html).toContain(words.me.title);
      expect(html).toContain(at("shown"));
      expect(html).toContain('href="/today"');
      expect(html).toContain(words.me.out);
      expect(html).toContain(words.me.everywhere);
      expect(html).not.toContain("signin-email");
      await run(() => signOutHere());
      expect(await login({ done: "out" })).toContain(words.done.out);
      /* Only the two known words are ever shown: nothing typed into the address reaches the page. */
      for (const made of ["<b>alert-me</b>", "constructor", "toString", "__proto__"]) {
        const shown = await login({ done: made });
        expect(shown).not.toContain("alert-me");
        expect(shown).not.toContain('data-b="ok"');
        expect(shown).not.toContain(words.done.out);
      }
    });

    it("in child mode sends a child to Today while the app can open, and opens for a grown-up when nobody is signed in", async () => {
      const { account, child } = await family("Paged", at("paged"));
      childMode(account.id, child.id);
      const open = await login();
      expect(open).toContain(words.held);
      expect(open).toContain('id="signin-email"');
      expect(open).not.toContain('href="/join"');
      expect(await finishPage({ mode: "signIn", oobCode: "abcdefgh12345678" })).toContain(words.held);
      await google(at("paged"));
      expect(await login()).toBe("moved to /today");
      expect(await finishPage({ mode: "signIn", oobCode: "abcdefgh12345678" })).toBe("moved to /today");
    });

    it("on the page a link returns to: finishes for the device that asked, asks for the address anywhere else, and says when a link is not whole", async () => {
      await ask(at("returning"));
      const { code } = lastMail();
      const same = await finishPage({ mode: "signIn", oobCode: code, apiKey: "k", lang: "en" });
      expect(same).toContain(words.finish.known(at("returning")));
      expect(same).not.toContain('id="finish-email"');
      expect(same).toContain(`name="code" value="${code}"`);
      newBrowser();
      const other = await finishPage({ mode: "signIn", oobCode: code });
      expect(other).toContain('id="finish-email"');
      expect(other).not.toContain(at("returning"));
      for (const broken of [{}, { mode: "signIn" }, { oobCode: code }, { mode: "resetPassword", oobCode: code }, { mode: "signIn", oobCode: "no" }]) {
        const html = await finishPage(broken as Record<string, string>);
        expect(html).toContain(words.refused.bad_link);
        expect(html).not.toContain("<form");
      }
      expect(await without(["FIREBASE_API_KEY"], () => finishPage({ mode: "signIn", oobCode: code }))).toContain(words.notSetUp);
    });

    it("shows the welcome page only to a person who signed in and belongs nowhere yet", async () => {
      const welcome = () => draw(() => WelcomePage());
      expect(await welcome()).toBe("moved to /login");
      await google(at("newcomer"), { name: "New Comer" });
      const html = await welcome();
      expect(html).toContain(words.welcome.title("New Comer"));
      expect(html).toContain(words.welcome.start.submit);
      expect(html).toContain('href="/join"');
      await run(() => startFamilySpace());
      expect(await welcome()).toBe("moved to /today");
      /* The demo people are shared: a demo session never starts a family space. */
      newBrowser();
      process.env.DEMO_LOGIN = "on";
      expect(await welcome()).toBe("moved to /login");
      expect(await run(() => startFamilySpace())).toMatchObject({ to: "/login" });
    });

    it("sends someone who opens the Join page signed out to sign in first, and back to it with the code", async () => {
      const join = (q: Record<string, string>) => draw(() => JoinPage({ searchParams: Promise.resolve(q) }));
      expect(await join({ code: "abcd-2345" })).toBe(`moved to /login?next=${encodeURIComponent("/join?code=ABCD2345")}`);
      expect(await join({})).toBe(`moved to /login?next=${encodeURIComponent("/join")}`);
      expect(await join({ code: "x&next=//evil.example" })).toBe(`moved to /login?next=${encodeURIComponent("/join?code=XNEXTEVILEXAMPLE")}`);
      await google(at("joiner"));
      const html = await join({ code: "abcd2345" });
      expect(html).toContain('value="ABCD2345"');
      expect(html).toContain('href="/login/welcome"');
    });
  });

  /* ───────────── Google ───────────── */

  describe("with Google", () => {
    it("makes a new person for an address IOpener does not know, with no household yet, and sends them to the welcome page", async () => {
      const out = await google(at("Maya"), { name: "Maya Rao" });
      expect(out).toMatchObject({ to: "/login/welcome", how: "replace" });
      const me = await person(at("maya"));
      expect(me).toMatchObject({ email: at("maya"), displayName: "Maya Rao", accountId: null, seat: null, staffRole: null });
      expect(me.firebaseUid).toBe([...standIn.users.values()].find((u) => u.email === at("maya"))!.uid);
      const viewer = await getViewer();
      expect(viewer).toMatchObject({ real: true, home: "/login", seat: null, staff: null });
      expect(viewer!.user.id).toBe(me.id);
    });

    it("starts a family space when they choose to: a household, the person as its guardian, one adult profile, then onboarding", async () => {
      await google(at("nora"), { name: "Nora Khan" });
      expect(await run(() => startFamilySpace())).toMatchObject({ to: "/onboarding" });
      const me = await person(at("nora"));
      expect(me.seat).toBe("guardian");
      const [account] = await db.select().from(s.account).where(eq(s.account.id, me.accountId!));
      expect(account).toMatchObject({ displayName: "Nora's family", isDemo: false, previewFor: null });
      const profiles = await db.select().from(s.profile).where(eq(s.profile.accountId, account.id));
      expect(profiles).toHaveLength(1);
      expect(profiles[0]).toMatchObject({ displayName: "Nora Khan", kind: "adult" });
      const m = await getMember();
      expect(m).toMatchObject({ seat: "guardian", childMode: false, tester: false });
      /* Pressing it twice makes nothing more. */
      expect(await run(() => startFamilySpace())).toMatchObject({ to: "/today" });
      expect(await db.select().from(s.profile).where(eq(s.profile.accountId, account.id))).toHaveLength(1);
    });

    it("signs the same person in again as the same person, and takes them where they were going", async () => {
      const { guardian } = await family("Again", at("again"));
      expect(await google(at("again"))).toMatchObject({ to: "/today" });
      newBrowser();
      expect(await google(at("again"), {}, "/train/games")).toMatchObject({ to: "/train/games" });
      expect(await people(at("again"))).toBe(1);
      expect((await getViewer())!.user.id).toBe(guardian.id);
    });

    it("never goes to another site afterwards, whatever the page was told", async () => {
      await family("Next", at("next"));
      for (const evil of ["https://evil.example/", "//evil.example", "/\\evil.example", "/\t/evil.example", "/login/finish", "/gate"]) {
        newBrowser();
        expect(await google(at("next"), {}, evil), evil).toMatchObject({ to: "/today" });
      }
    });

    it("turns away something that is not a Google credential for this site, without asking Google anything", async () => {
      const before = standIn.calls.length;
      const forOther = standIn.googleCredential({ email: at("x") }, { aud: "someone-else.apps.googleusercontent.com" });
      for (const bad of ["", "rubbish", "a.b.c", forOther, "x".repeat(5000)]) expect(refusal(await run(() => googleSignIn(bad, null)))).toBe("google_refused");
      expect(standIn.calls.length).toBe(before);
      expect(h.jar.has(USER_COOKIE)).toBe(false);
    });

    it("refuses a credential Google would not stand behind (one that is past its time)", async () => {
      const old = standIn.googleCredential({ email: at("late") }, { expired: true });
      expect(refusal(await run(() => googleSignIn(old, null)))).toBe("google_refused");
      expect(await people(at("late"))).toBe(0);
      expect(h.jar.has(USER_COOKIE)).toBe(false);
    });

    it("refuses an account whose address Google has not verified, and makes nobody", async () => {
      expect(refusal(await google(at("unproven"), { emailVerified: false }))).toBe("email_unverified");
      expect(await people(at("unproven"))).toBe(0);
      expect(h.jar.has(USER_COOKIE)).toBe(false);
      expect(await getViewer()).toBeNull();
    });

    it("checks the ID token it is given, even though it came from Firebase's own address", async () => {
      const wrong: [Record<string, unknown>, string][] = [
        [{ aud: "another-project" }, "another project"],
        [{ iss: "https://securetoken.google.com/another-project" }, "another issuer"],
        [{ exp: Math.floor(Date.now() / 1000) - 5 }, "past its time"],
        [{ auth_time: Math.floor(Date.now() / 1000) - 3600 }, "an old sign-in"],
        [{ sub: "" }, "no subject"],
        [{ firebase: { sign_in_provider: "password" } }, "another way of signing in than the one just used"],
        [{ firebase: { sign_in_provider: "anonymous" } }, "a way of signing in IOpener does not offer"],
      ];
      for (const [claims, name] of wrong) {
        newBrowser();
        standIn.knobs.claims = claims;
        expect(refusal(await google(at("checked"))), name).toBe("not_confirmed");
        expect(h.jar.has(USER_COOKIE), name).toBe(false);
      }
      expect(await people(at("checked"))).toBe(0);
    });

    it("says so when the sign-in service cannot be reached", async () => {
      const real = process.env.SIGNIN_STAND_IN;
      process.env.SIGNIN_STAND_IN = "http://127.0.0.1:9";
      try { expect(refusal(await google(at("offline")))).toBe("unavailable"); } finally { process.env.SIGNIN_STAND_IN = real; }
      expect(await people(at("offline"))).toBe(0);
    });

    it("is not offered, and does nothing, when sign-in is not set up", async () => {
      const key = process.env.FIREBASE_API_KEY;
      delete process.env.FIREBASE_API_KEY;
      try {
        expect(refusal(await google(at("nosetup")))).toBe("not_set_up");
        expect(refusal(await ask(at("nosetup")))).toBe("not_set_up");
        expect(refusal(await finish("abcdefgh12345678", at("nosetup")))).toBe("not_set_up");
      } finally { process.env.FIREBASE_API_KEY = key; }
      expect(await people(at("nosetup"))).toBe(0);
    });
  });

  /* ───────────── the email link ───────────── */

  describe("with an email link", () => {
    it("emails a link that comes back to this site, and signs the person in when they open it on the same device", async () => {
      const asked = await ask(at("Lila"));
      expect(asked.answer).toEqual({ ok: true, sentTo: at("lila") });
      const mail = lastMail();
      expect(mail.to).toBe(at("lila"));
      expect(mail.continueUrl).toBe("http://localhost:3000/login/finish");
      expect(readPending({ get: (n) => (h.jar.has(n) ? { value: h.jar.get(n)! } : undefined), set: () => 0, delete: () => 0 })).toEqual({ email: at("lila"), next: null });
      /* The device remembers the address: nothing is typed. */
      expect(await finish(mail.code)).toMatchObject({ to: "/login/welcome", how: "replace" });
      expect(h.jar.has(PENDING_COOKIE)).toBe(false);
      expect((await getViewer())!.user.email).toBe(at("lila"));
      expect((await person(at("lila"))).displayName).toBe("lila");
    });

    it("works once: the same link a second time signs nobody in", async () => {
      await ask(at("once"));
      const { code } = lastMail();
      await finish(code);
      newBrowser();
      expect(refusal(await finish(code, at("once")))).toBe("link_expired");
      expect(h.jar.has(USER_COOKIE)).toBe(false);
    });

    it("on another device asks for the address again, and a link alone signs nobody in", async () => {
      await ask(at("phone"));
      const { code } = lastMail();
      newBrowser();
      expect(refusal(await finish(code))).toBe("need_address");
      expect(refusal(await finish(code, "not an address"))).toBe("need_address");
      expect(refusal(await finish(code, at("someone-else")))).toBe("wrong_address");
      expect(h.jar.has(USER_COOKIE)).toBe(false);
      expect(await people(at("phone"))).toBe(0);
      expect(await finish(code, ` ${at("PHONE")} `)).toMatchObject({ to: "/login/welcome" });
    });

    it("says in plain words that a link is too old, and that a link is broken", async () => {
      await ask(at("slow"));
      const { code } = lastMail();
      standIn.expire(code);
      const old = await finish(code);
      expect(old.answer).toMatchObject({ ok: false, why: "link_expired", message: expect.stringContaining("Ask for a new one") });
      const broken = await finish("not a code");
      expect(broken.answer).toMatchObject({ ok: false, why: "bad_link" });
      expect(h.jar.has(USER_COOKIE)).toBe(false);
    });

    it("forgets a remembered address that the link was not for, and asks", async () => {
      await ask(at("first"));
      const first = lastMail().code;
      await ask(at("second"));
      /* The device now remembers the second address; the first link is opened. */
      expect(refusal(await finish(first))).toBe("need_address");
      expect(h.jar.has(PENDING_COOKIE)).toBe(false);
      expect(await finish(first, at("first"))).toMatchObject({ to: "/login/welcome" });
    });

    it("goes back to where the person was heading, carried on the device and not in the link", async () => {
      await family("Heading", at("heading"));
      await ask(at("heading"), "/together/league");
      expect(lastMail().continueUrl).toBe("http://localhost:3000/login/finish?next=%2Ftogether%2Fleague");
      /* Whatever the address of the page says, the device's own memory wins. */
      expect(await finish(lastMail().code, "", "/settings")).toMatchObject({ to: "/together/league" });
      await ask(at("heading"), "https://evil.example");
      expect(lastMail().continueUrl).toBe("http://localhost:3000/login/finish");
    });

    it("refuses a token that is for another address than the one the link was sent to", async () => {
      await ask(at("mine"));
      standIn.knobs.answerFor = at("victim");
      expect(refusal(await finish(lastMail().code))).toBe("not_confirmed");
      expect(await people(at("victim"))).toBe(0);
      expect(h.jar.has(USER_COOKIE)).toBe(false);
    });

    it("never says whether an address has an account", async () => {
      await family("Known", at("known"));
      const known = await ask(at("known"));
      newBrowser();
      const unknown = await ask(at("nobody-at-all"));
      expect(known.answer).toEqual({ ok: true, sentTo: at("known") });
      expect(unknown.answer).toEqual({ ok: true, sentTo: at("nobody-at-all") });
      /* Whatever Firebase says about one address is answered the same way. */
      for (const word of ["USER_DISABLED", "EMAIL_NOT_FOUND", "ADMIN_ONLY_OPERATION"]) {
        newBrowser();
        standIn.knobs.sendError = word;
        expect((await ask(at("known"))).answer, word).toEqual({ ok: true, sentTo: at("known") });
      }
    });

    it("says the email could not be sent when the service is the reason, and what is wrong with a mistyped address", async () => {
      for (const word of ["QUOTA_EXCEEDED", "OPERATION_NOT_ALLOWED", "UNAUTHORIZED_DOMAIN", "SOMETHING_NEW"]) {
        newBrowser();
        standIn.knobs.sendError = word;
        expect(refusal(await ask(at("quota"))), word).toBe("not_sent");
        expect(h.jar.has(PENDING_COOKIE)).toBe(false);
      }
      standIn.knobs.sendError = null;
      const before = standIn.calls.length;
      for (const bad of ["", "asha", "asha@", "a b@family.example"]) expect(refusal(await run(() => askForLink(null, form({ email: bad }))))).toBe("bad_address");
      expect(standIn.calls.length).toBe(before);
    });
  });

  /* ───────────── one person, however they sign in ───────────── */

  describe("who a sign-in is", () => {
    it("is one person whether they come by Google first and a link later, or the other way round", async () => {
      await google(at("both"), { name: "Both Ways" });
      const first = await person(at("both"));
      newBrowser();
      await ask(at("both"));
      await finish(lastMail().code);
      expect(await people(at("both"))).toBe(1);
      expect((await getViewer())!.user.id).toBe(first.id);

      await ask(at("other-way"));
      await finish(lastMail().code);
      const linkFirst = await person(at("other-way"));
      newBrowser();
      await google(at("other-way"), { name: "Other Way" });
      expect(await people(at("other-way"))).toBe(1);
      expect((await getViewer())!.user.id).toBe(linkFirst.id);
    });

    it("ties a person ops entered by email to their sign-in the first time they come, and takes them to their own area", async () => {
      const [staff] = await db.insert(s.appUser).values({ email: at("Meera.Ops"), displayName: "Meera", staffRole: "ops" }).returning();
      usedEmails.push(at("meera.ops"));
      expect(staff.firebaseUid).toBeNull();
      expect(await google(at("meera.ops"))).toMatchObject({ to: "/admin" });
      const after = await person(at("meera.ops"));
      expect(after.id).toBe(staff.id);
      expect(after.firebaseUid).toMatch(/^uid-/);
      expect(after.email).toBe(at("Meera.Ops"));
      expect(await people(at("meera.ops"))).toBe(1);
      expect((await getViewer())).toMatchObject({ staff: "ops", real: true });
    });

    it("never ties a person to a sign-in whose address was not verified", async () => {
      const [counsellor] = await db.insert(s.appUser).values({ email: at("dr.unproven"), displayName: "Dr Unproven", isCounsellor: true, counsellorVerifiedAt: new Date() }).returning();
      usedEmails.push(at("dr.unproven"));
      expect(refusal(await google(at("dr.unproven"), { emailVerified: false }))).toBe("email_unverified");
      expect((await person(at("dr.unproven"))).firebaseUid).toBeNull();
      expect(await getViewer()).toBeNull();
      /* The same address, verified, is the counsellor. */
      newBrowser();
      await ask(at("dr.unproven"));
      expect(await finish(lastMail().code)).toMatchObject({ to: "/counsellor" });
      expect((await getViewer())!.user.id).toBe(counsellor.id);
    });

    it("makes the owner a super admin by their verified address, with no row made beforehand", async () => {
      expect(await google(at("owner"))).toMatchObject({ to: "/admin" });
      expect((await getViewer())).toMatchObject({ staff: "super_admin", real: true });
      expect((await person(at("owner"))).staffRole).toBeNull();
    });

    it("never hands a person who is tied to one Firebase account to another account with the same address", async () => {
      const { guardian } = await family("Tied", at("tied"));
      await db.update(s.appUser).set({ firebaseUid: `uid-earlier-${x}` }).where(eq(s.appUser.id, guardian.id));
      const out = await google(at("tied"));
      expect(out.answer).toMatchObject({ ok: false, why: "other_sign_in" });
      expect((await person(at("tied"))).firebaseUid).toBe(`uid-earlier-${x}`);
      expect(h.jar.has(USER_COOKIE)).toBe(false);
      expect(await people(at("tied"))).toBe(1);
    });

    it("follows an address that changed at the provider", async () => {
      await google(at("before"));
      const me = await person(at("before"));
      /* The person changes the address of their sign-in account, and proves the new one. */
      standIn.users.get(me.firebaseUid!)!.email = at("after");
      newBrowser();
      await google(at("after"));
      expect((await getViewer())!.user.id).toBe(me.id);
      expect(await people(at("before"))).toBe(0);
      expect((await person(at("after"))).id).toBe(me.id);
    });

    it("refuses when the changed address already belongs to another person here, and changes neither", async () => {
      await google(at("mover"));
      const mover = await person(at("mover"));
      const { guardian: taken } = await family("Taken", at("taken"));
      standIn.users.get(mover.firebaseUid!)!.email = at("taken");
      newBrowser();
      const out = await google(at("taken"));
      expect(out.answer).toMatchObject({ ok: false, why: "address_in_use" });
      expect(h.jar.has(USER_COOKIE)).toBe(false);
      expect((await person(at("mover"))).id).toBe(mover.id);
      expect(await person(at("taken"))).toMatchObject({ id: taken.id, firebaseUid: null });
    });

    it("refuses when two people have the address in different capitals", async () => {
      await db.insert(s.appUser).values([{ email: at("twin"), displayName: "Twin one" }, { email: at("Twin"), displayName: "Twin two" }]);
      usedEmails.push(at("twin"));
      expect(refusal(await google(at("twin")))).toBe("unclear");
      expect((await db.select().from(s.appUser).where(eq(sql`lower(${s.appUser.email})`, at("twin")))).every((r) => r.firebaseUid === null)).toBe(true);
    });

    it("never ties a real sign-in to a person of a demo family", async () => {
      const { guardian, account } = await family("Demo", at("demo-guardian"), { isDemo: true });
      try {
        expect(refusal(await google(at("demo-guardian")))).toBe("demo");
        expect((await person(at("demo-guardian"))).firebaseUid).toBeNull();
        expect(h.jar.has(USER_COOKIE)).toBe(false);
      } finally {
        await db.delete(s.appUser).where(eq(s.appUser.id, guardian.id));
        await db.delete(s.account).where(eq(s.account.id, account.id));
      }
    });

    it("makes one person when the same new person signs in twice at the same moment", async () => {
      const credential = () => standIn.googleCredential({ email: at("double") });
      usedEmails.push(at("double"));
      await Promise.all([run(() => googleSignIn(credential(), null)), run(() => googleSignIn(credential(), null))]);
      expect(await people(at("double"))).toBe(1);
    });
  });

  /* ───────────── invites ───────────── */

  describe("joining a household with an invite code", () => {
    const invite = async (accountId: string, by: string, seat: "co_guardian" | "circle") => {
      const code = `ZZ${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
      await db.insert(s.invite).values({ accountId, seat, code, createdBy: by });
      return code;
    };

    it("takes a new person who came from the Join page straight back to it, and seats them in the household that invited them", async () => {
      const { account, guardian } = await family("Inviting", at("inviting"));
      const code = await invite(account.id, guardian.id, "circle");
      expect(await google(at("nani"), { name: "Nani" }, `/join?code=${code}`)).toMatchObject({ to: `/join?code=${code}` });
      /* Nothing was made for her: no household of her own stands in the way. */
      expect((await person(at("nani"))).accountId).toBeNull();
      expect(await run(() => joinHousehold(null, form({ code })))).toMatchObject({ to: "/circle" });
      expect(await person(at("nani"))).toMatchObject({ accountId: account.id, seat: "circle" });
      expect((await getViewer())).toMatchObject({ seat: "circle", home: "/circle" });
    });

    it("lets a person who signed in first, as the invite's words say, still join: the welcome page made nothing for them", async () => {
      const { account, guardian } = await family("Second", at("second-family"));
      const code = await invite(account.id, guardian.id, "co_guardian");
      expect(await google(at("raj"), { name: "Raj" })).toMatchObject({ to: "/login/welcome" });
      expect(await run(() => joinHousehold(null, form({ code: ` ${code.toLowerCase()} ` })))).toMatchObject({ to: "/today" });
      expect(await person(at("raj"))).toMatchObject({ accountId: account.id, seat: "co_guardian" });
      /* The code is used up. */
      newBrowser();
      await google(at("late-comer"));
      expect((await run(() => joinHousehold(null, form({ code })))).answer).toMatchObject({ ok: false });
    });
  });

  /* ───────────── limits ───────────── */

  describe("how often a link can be asked for", () => {
    const rowsFor = async (kind: "email" | "net" | "try", value: string) => (await db.select().from(s.signinAsk).where(and(eq(s.signinAsk.kind, kind), eq(s.signinAsk.key, hashedKey(kind, value))))).length;

    it("stops emailing one address after three asks, from whatever network, and answers exactly as before", async () => {
      const answers = [];
      for (let i = 0; i < 5; i++) { newBrowser(); answers.push((await ask(at("flooded"))).answer); }
      expect(new Set(answers.map((a) => JSON.stringify(a))).size).toBe(1);
      expect(answers[0]).toEqual({ ok: true, sentTo: at("flooded") });
      expect(standIn.mail.filter((m) => m.to === at("flooded"))).toHaveLength(LIMITS.email[0].max);
      expect(await rowsFor("email", at("flooded"))).toBe(LIMITS.email[0].max);
      /* The device that asked last still remembers the address, so a link that did arrive can be finished on it. */
      expect(h.jar.has(PENDING_COOKIE)).toBe(true);
      expect(await finish(standIn.mail.filter((m) => m.to === at("flooded"))[0].code)).toMatchObject({ to: "/login/welcome" });
    });

    it("tells one network to wait after twelve asks, for whatever addresses, and sends nothing more", async () => {
      const net = freshNet();
      for (let i = 0; i < LIMITS.net[0].max; i++) expect((await ask(at(`many-${i}`))).answer).toMatchObject({ ok: true });
      const sent = standIn.mail.length;
      const over = await ask(at("one-too-many"));
      expect(over.answer).toMatchObject({ ok: false, why: "slow_down", message: expect.stringMatching(/Wait about \d+ minutes?/) });
      expect(standIn.mail.length).toBe(sent);
      expect(await rowsFor("net", net)).toBe(LIMITS.net[0].max);
      expect(await rowsFor("email", at("one-too-many"))).toBe(0);
      /* Another network is not held back by this one. */
      freshNet();
      expect((await ask(at("elsewhere"))).answer).toMatchObject({ ok: true });
    });

    it("limits tries to finish a sign-in from one network, so codes and credentials cannot be guessed at speed", async () => {
      freshNet();
      for (let i = 0; i < LIMITS.try[0].max; i++) expect(refusal(await finish(`guess-${i}-abcdefgh`, at("guessed")))).toBe("link_expired");
      const calls = standIn.calls.length;
      expect(refusal(await finish("guess-last-abcdefgh", at("guessed")))).toBe("slow_down");
      expect(refusal(await google(at("guessed")))).toBe("slow_down");
      expect(standIn.calls.length).toBe(calls);
    });

    it("keeps no address in the table, and forgets a count after a day", async () => {
      const mine = await db.select().from(s.signinAsk).where(inArray(s.signinAsk.key, usedEmails.map((e) => hashedKey("email", e))));
      expect(mine.length).toBeGreaterThan(0);
      expect(JSON.stringify(mine)).not.toContain(DOMAIN);
      const key = hashedKey("email", `old-${x}`);
      await db.insert(s.signinAsk).values([{ kind: "email", key, at: new Date(Date.now() - 25 * 3_600_000) }, { kind: "email", key, at: new Date(Date.now() - 23 * 3_600_000) }]);
      expect(await forgetOldAsks()).toBeGreaterThanOrEqual(1);
      expect(await db.select().from(s.signinAsk).where(eq(s.signinAsk.key, key))).toHaveLength(1);
    });
  });

  /* ───────────── child mode ───────────── */

  describe("child mode", () => {
    const gate = async () => { const hold = await holdOf(h.jar.get(CHILD_COOKIE)); return loginGate(hold.state, hold.state === "live" && !!(await getMember())?.childMode); };

    it("lets a device in child mode whose grown-up session has ended reach sign-in, and signing in does not end child mode", async () => {
      const { account, guardian, child } = await family("Held", at("held"));
      childMode(account.id, child.id);
      /* Nobody is signed in: the app cannot open, so the sign-in page does. */
      expect(await getMember()).toBeNull();
      expect(await gate()).toBe("sign_in_held");
      expect(await google(at("held"), {}, "/family")).toMatchObject({ to: "/today" });
      expect(h.jar.has(CHILD_COOKIE)).toBe(true);
      const m = await getMember();
      expect(m).toMatchObject({ childMode: true });
      expect(m!.profile.id).toBe(child.id);
      expect(m!.user.id).toBe(guardian.id);
      expect(m!.can("manage_family")).toBe(false);
      /* Now the app opens for the signed-in grown-up, and the child is kept away from the sign-in page again. */
      expect(await gate()).toBe("to_today");
    });

    it("does the same by email link", async () => {
      const { account, child } = await family("Held link", at("held-link"));
      childMode(account.id, child.id);
      await ask(at("held-link"));
      expect(await finish(lastMail().code)).toMatchObject({ to: "/today" });
      expect(h.jar.has(CHILD_COOKIE)).toBe(true);
      expect((await getMember())!.childMode).toBe(true);
    });

    it("lets nobody but a person of the child's household sign in on that device, and makes nobody new", async () => {
      const { account, child } = await family("Guarded", at("guarded"));
      await family("Neighbour", at("neighbour"));
      childMode(account.id, child.id);
      expect(refusal(await google(at("a-stranger")))).toBe("child_mode");
      expect(await people(at("a-stranger"))).toBe(0);
      expect(refusal(await google(at("neighbour")))).toBe("child_mode");
      await ask(at("a-stranger"));
      expect(refusal(await finish(lastMail().code))).toBe("child_mode");
      expect(await people(at("a-stranger"))).toBe(0);
      expect(h.jar.has(USER_COOKIE)).toBe(false);
      expect(h.jar.has(CHILD_COOKIE)).toBe(true);
      expect(await gate()).toBe("sign_in_held");
    });

    it("lets a staff member back into child mode in their own test household", async () => {
      const [staff] = await db.insert(s.appUser).values({ email: at("tester"), displayName: "Tester", staffRole: "content" }).returning();
      const [test] = await db.insert(s.account).values({ displayName: `zz-signin-${x} test household`, previewFor: staff.id }).returning();
      const [child] = await db.insert(s.profile).values({ accountId: test.id, displayName: "Test child", kind: "child", birthYear: 2019 }).returning();
      childMode(test.id, child.id);
      expect(await google(at("tester"))).toMatchObject({ to: "/today" });
      expect((await getMember())).toMatchObject({ childMode: true, tester: true });
    });

    it("refuses to sign out on a device in child mode: a grown-up leaves child mode with the PIN first", async () => {
      const { account, child } = await family("Staying", at("staying"));
      await google(at("staying"));
      childMode(account.id, child.id);
      expect(await run(() => signOutHere())).toMatchObject({ to: "/today" });
      expect(await run(() => signOutEverywhere())).toMatchObject({ to: "/today" });
      expect(h.jar.has(USER_COOKIE)).toBe(true);
      expect(h.jar.has(CHILD_COOKIE)).toBe(true);
      expect((await person(at("staying"))).sessionsValidAfter).toBeNull();
    });

    it("stays on when the grown-up's sessions are ended from another device: the child's device then asks for sign-in, still in child mode", async () => {
      const { account, child, guardian } = await family("Remote", at("remote"));
      await google(at("remote"));
      childMode(account.id, child.id);
      const childDevice = new Map(h.jar);
      /* On the grown-up's phone: sign out on every device. */
      newBrowser();
      await google(at("remote"));
      expect(await run(() => signOutEverywhere())).toMatchObject({ to: "/login?done=everywhere" });
      /* Back on the child's device. */
      h.jar.clear(); for (const [k, v] of childDevice) h.jar.set(k, v);
      expect(await getViewer()).toBeNull();
      expect(await gate()).toBe("sign_in_held");
      expect(await google(at("remote"))).toMatchObject({ to: "/today" });
      expect((await getMember())).toMatchObject({ childMode: true });
      expect((await getMember())!.user.id).toBe(guardian.id);
    });

    it("drops a child-mode cookie whose household no longer exists at the next sign-in, because no PIN could ever end it", async () => {
      childMode(crypto.randomUUID(), crypto.randomUUID());
      expect(await gate()).toBe("open");
      expect(await google(at("after-reset"))).toMatchObject({ to: "/login/welcome" });
      expect(h.jar.has(CHILD_COOKIE)).toBe(false);
    });

    it("signing out never touches child mode", async () => {
      await google(at("leaver"));
      /* A cookie for a household that is gone: nothing holds the device, so signing out is allowed, and the cookie is left for the PIN or the clock. */
      childMode(crypto.randomUUID(), crypto.randomUUID());
      expect(await run(() => signOutHere())).toMatchObject({ to: "/login?done=out" });
      expect(h.jar.has(USER_COOKIE)).toBe(false);
      expect(h.jar.has(CHILD_COOKIE)).toBe(true);
    });
  });

  /* ───────────── the demo sign-in ───────────── */

  describe("the demo sign-in", () => {
    const demoFamily = async () => {
      const [row] = await db.select({ account: s.account, guardian: s.appUser }).from(s.appUser).innerJoin(s.account, eq(s.account.id, s.appUser.accountId))
        .where(and(eq(s.account.isDemo, true), eq(s.appUser.seat, "guardian"))).limit(1);
      const [child] = row ? await db.select().from(s.profile).where(and(eq(s.profile.accountId, row.account.id), eq(s.profile.kind, "child"))).limit(1) : [];
      const [staff] = await db.select().from(s.appUser).where(and(eq(s.appUser.staffRole, "super_admin"), like(s.appUser.email, "%.test"))).limit(1);
      return row && child && staff ? { ...row, child, staff } : null;
    };

    it("does not end child mode: it keeps the cookie, and lets in only a person of the child's household", async () => {
      const demo = await demoFamily();
      if (!demo) return; /* a database with no demo family: nothing to try */
      process.env.DEMO_LOGIN = "on";
      childMode(demo.account.id, demo.child.id);
      expect(await signInAs(demo.guardian.id)).toBe(demo.guardian.id);
      expect(h.jar.has(CHILD_COOKIE)).toBe(true);
      expect((await getMember())).toMatchObject({ childMode: true });
      /* Before, picking any person removed the child-mode cookie. Now the pick is refused, and says why. */
      expect(await signInAs(demo.staff.id)).toBeNull();
      expect(await run(() => demoSignIn(form({ userId: demo.staff.id })))).toMatchObject({ to: "/login?why=child_mode" });
      expect(h.jar.has(CHILD_COOKIE)).toBe(true);
      expect((await getViewer())!.user.id).toBe(demo.guardian.id);
    });

    it("becomes any seeded person on a device that is not in child mode", async () => {
      const demo = await demoFamily();
      if (!demo) return;
      process.env.DEMO_LOGIN = "on";
      expect(await run(() => demoSignIn(form({ userId: demo.staff.id })))).toMatchObject({ to: "/admin" });
      expect((await getViewer())).toMatchObject({ real: false, staff: "super_admin" });
    });

    it("never becomes a person who is not seeded, and nobody at all when the demo is off", async () => {
      await google(at("real-person"));
      const real = await person(at("real-person"));
      const [unlinked] = await db.insert(s.appUser).values({ email: at("entered-by-ops"), displayName: "Entered by ops", staffRole: "ops" }).returning();
      newBrowser();
      process.env.DEMO_LOGIN = "on";
      expect(await signInAs(real.id)).toBeNull();
      expect(await signInAs(unlinked.id)).toBeNull();
      expect(await signInAs("not-an-id")).toBeNull();
      expect(h.jar.has(USER_COOKIE)).toBe(false);
      const demo = await demoFamily();
      if (!demo) return;
      process.env.DEMO_LOGIN = "off";
      expect(await signInAs(demo.guardian.id)).toBeNull();
      /* A demo session made while the demo was on stops counting when it is switched off. */
      const c = sessionCookie(demo.guardian.id, "demo");
      h.jar.set(c.name, c.value);
      expect(await getViewer()).toBeNull();
      process.env.DEMO_LOGIN = "on";
      expect((await getViewer())!.user.id).toBe(demo.guardian.id);
    });
  });

  /* ───────────── sessions ───────────── */

  describe("sessions", () => {
    it("signs out on one device by removing its cookie, and leaves other devices signed in", async () => {
      await family("Two devices", at("two-devices"));
      await google(at("two-devices"));
      const laptop = new Map(h.jar);
      newBrowser();
      await google(at("two-devices"));
      expect(await run(() => signOutHere())).toMatchObject({ to: "/login?done=out" });
      expect(await getViewer()).toBeNull();
      h.jar.clear(); for (const [k, v] of laptop) h.jar.set(k, v);
      expect((await getViewer())!.user.email).toBe(at("two-devices"));
    });

    it("signs out on every device: sessions that began before stop counting, and a new sign-in works at once", async () => {
      await family("Everywhere", at("everywhere"));
      await google(at("everywhere"));
      const laptop = new Map(h.jar);
      newBrowser();
      await google(at("everywhere"));
      await new Promise((r) => setTimeout(r, 15));
      expect(await run(() => signOutEverywhere())).toMatchObject({ to: "/login?done=everywhere" });
      h.jar.clear(); for (const [k, v] of laptop) h.jar.set(k, v);
      expect(await getViewer()).toBeNull();
      expect(await getMember()).toBeNull();
      await new Promise((r) => setTimeout(r, 15));
      expect(await google(at("everywhere"))).toMatchObject({ to: "/today" });
      expect((await getViewer())!.user.email).toBe(at("everywhere"));
    });

    it("asks staff to sign in again after a working day, and a family not for a month", async () => {
      const [staff] = await db.insert(s.appUser).values({ email: at("day-staff"), displayName: "Day staff", staffRole: "ops" }).returning();
      const { guardian } = await family("Month", at("month"));
      const hours = (n: number) => Date.now() - n * 3_600_000;
      const wear = (userId: string, began: number) => { const c = sessionCookie(userId, "signin", began); h.jar.set(c.name, c.value); };
      wear(staff.id, hours(TRUSTED_HOURS - 1)); expect((await getViewer())?.user.id).toBe(staff.id);
      wear(staff.id, hours(TRUSTED_HOURS + 1)); expect(await getViewer()).toBeNull();
      wear(guardian.id, hours(24 * 29)); expect((await getViewer())?.user.id).toBe(guardian.id);
      wear(guardian.id, hours(24 * 31)); expect(await getViewer()).toBeNull();
      /* The role is read on every request: the day a guardian is made staff, an old session stops counting. */
      wear(guardian.id, hours(24 * 5));
      await db.update(s.appUser).set({ staffRole: "content" }).where(eq(s.appUser.id, guardian.id));
      expect(await getViewer()).toBeNull();
    });

    it("signs nobody in with a cookie that names a person who was deleted, or that was not signed by this server", async () => {
      await google(at("deleted-soon"));
      const me = await person(at("deleted-soon"));
      await db.delete(s.appUser).where(eq(s.appUser.id, me.id));
      expect(await getViewer()).toBeNull();
      h.jar.set(USER_COOKIE, signToken({ userId: me.id, iat: Date.now(), via: "signin", exp: Date.now() + 60_000 }, "another-secret-entirely"));
      expect(await getViewer()).toBeNull();
    });
  });

  /* ───────────── deleting a person ───────────── */

  describe("removing a deleted person from the sign-in service", () => {
    const queued = async (uid: string) => (await db.select().from(s.signinRemoval).where(eq(s.signinRemoval.uid, uid)))[0];
    /** A household whose guardian signed in for real, so there is an account at the sign-in service to remove. */
    async function signedInFamily(name: string) {
      const f = await family(name, at(name.toLowerCase()));
      newBrowser();
      await google(at(name.toLowerCase()));
      return { ...f, uid: (await person(at(name.toLowerCase()))).firebaseUid! };
    }

    it("queues the account inside the deletion, and removes it from the sign-in service in the same run", async () => {
      const { account, uid } = await signedInFamily("Leaving");
      expect(standIn.users.has(uid)).toBe(true);
      const erased = await db.transaction((tx) => eraseHousehold(tx, account.id));
      expect(erased).toMatchObject({ ok: true, people: 1 });
      expect(await people(at("leaving"))).toBe(0);
      expect(await queued(uid)).toMatchObject({ uid, tries: 0 });
      const out = await removeQueued(new Date(), undefined, 0);
      expect(out).toEqual({ removed: 1, left: 0, note: "" });
      expect(standIn.users.has(uid)).toBe(false);
      expect(await queued(uid)).toBeUndefined();
      /* Running it again finds nothing to do. */
      expect(await removeQueued(new Date(), undefined, 0)).toEqual({ removed: 0, left: 0, note: "" });
    });

    it("queues nothing when the deletion is rolled back", async () => {
      const { account, uid } = await signedInFamily("Rolled");
      await expect(db.transaction(async (tx) => { await eraseHousehold(tx, account.id); throw new Error("something else failed"); })).rejects.toThrow("something else failed");
      expect(await queued(uid)).toBeUndefined();
      expect(await people(at("rolled"))).toBe(1);
      expect(standIn.users.has(uid)).toBe(true);
    });

    it("does nothing where the server does not run as a Google service account, and says so in the job's result", async () => {
      const { account, uid } = await signedInFamily("Local");
      await db.transaction((tx) => eraseHousehold(tx, account.id));
      standIn.knobs.metadata = false;
      const out = await removeQueued(new Date(), undefined, 0);
      expect(out).toEqual({ removed: 0, left: 1, note: REMOVAL_NOTES.noIdentity });
      expect(standIn.users.has(uid)).toBe(true);
      const job = await signInTidy.run(new Date());
      expect(job).toMatchObject({ ok: true, note: REMOVAL_NOTES.noIdentity, counts: { signInsRemoved: 0, signInsLeft: 1 } });
      /* On Google Cloud the next run removes it. */
      standIn.knobs.metadata = true;
      expect(await signInTidy.run(new Date())).toMatchObject({ ok: true, note: "done", counts: { signInsRemoved: 1, signInsLeft: 0 } });
      expect(standIn.users.has(uid)).toBe(false);
    });

    it("leaves the account queued and reports a problem when the service account may not delete", async () => {
      const { account, uid } = await signedInFamily("Denied");
      await db.transaction((tx) => eraseHousehold(tx, account.id));
      standIn.knobs.mayDelete = false;
      expect(await removeQueued(new Date(), undefined, 0)).toEqual({ removed: 0, left: 1, note: REMOVAL_NOTES.notAllowed });
      expect(await queued(uid)).toMatchObject({ tries: 1 });
      expect(await signInTidy.run(new Date())).toMatchObject({ ok: false, note: REMOVAL_NOTES.notAllowed });
      standIn.knobs.mayDelete = true;
      expect(await removeQueued(new Date(), undefined, 0)).toEqual({ removed: 1, left: 0, note: "" });
    });

    it("counts an account that is already gone from the sign-in service as removed", async () => {
      const { account, uid } = await signedInFamily("Gone");
      await db.transaction((tx) => eraseHousehold(tx, account.id));
      standIn.users.delete(uid);
      expect(await removeQueued(new Date(), undefined, 0)).toEqual({ removed: 1, left: 0, note: "" });
    });

    it("keeps the sign-in account of a person who keeps their sign-in: staff, a counsellor, a sponsor's person", async () => {
      const { account, guardian, uid } = await signedInFamily("Keeper");
      await db.update(s.appUser).set({ staffRole: "ops" }).where(eq(s.appUser.id, guardian.id));
      const erased = await db.transaction((tx) => eraseHousehold(tx, account.id));
      expect(erased).toMatchObject({ ok: true, people: 0, peopleKept: 1 });
      expect(await queued(uid)).toBeUndefined();
      expect(await person(at("keeper"))).toMatchObject({ accountId: null, seat: null, firebaseUid: uid });
      expect(standIn.users.has(uid)).toBe(true);
    });

    it("keeps the account of someone who signed in again before the removal ran: they are a person here once more", async () => {
      const { account, uid } = await signedInFamily("Back");
      await db.transaction((tx) => eraseHousehold(tx, account.id));
      newBrowser();
      expect(await google(at("back"))).toMatchObject({ to: "/login/welcome" });
      expect((await person(at("back"))).firebaseUid).toBe(uid);
      expect(await removeQueued(new Date(), undefined, 0)).toEqual({ removed: 0, left: 0, note: "" });
      expect(standIn.users.has(uid)).toBe(true);
      expect(await queued(uid)).toBeUndefined();
    });

    it("queues nothing when sign-in is not set up: there is no sign-in service to remove anyone from", async () => {
      const { guardian } = await signedInFamily("Unset");
      expect(await db.transaction((tx) => queueRemoval(tx, [guardian.id], null))).toBe(0);
      expect(await db.transaction((tx) => queueRemoval(tx, [], undefined))).toBe(0);
      expect(await removeQueued(new Date(), null, 0)).toMatchObject({ removed: 0 });
    });
  });
});
