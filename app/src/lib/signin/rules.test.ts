/**
 * The rules of sign-in that need no database and no network: the settings, the session, child mode, the limits,
 * who a sign-in is, and where it lands.
 */
import { encodeBundle } from "@/lib/cookie-jar";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { isDemoPerson } from "../auth";
import { GATE_COOKIE, gateMark } from "../gate";
import { signToken } from "../token";
import { cleanNext, landing, looksLikeCode, tidyEmail } from "./flow";
import { loginGate, mayResume, readHoldCookie, type Hold } from "./hold";
import { hashedKey, LIMITS, networkAddress, roomFor, tidyAddress } from "./limit";
import { decide, nameFromEmail, type PersonRow } from "./people";
import { endedEverywhere, newSession, readSession, SESSION_MS, tooOldForRole, TRUSTED_HOURS } from "./session-rules";
import { GOOGLE, settingsProblems, signInSettings, standInEndpoints } from "./settings";

const SECRET = "a-secret-for-tests-only";
const UUID = "3f0c7c0e-2a55-4d0b-9f0e-0c8a7e3b1a11";

describe("settings", () => {
  const full = { FIREBASE_PROJECT_ID: "iopener-prod", FIREBASE_API_KEY: "k".repeat(39), GOOGLE_CLIENT_ID: "1047474235144-abc123def.apps.googleusercontent.com", SITE_URL: "https://iopener.example/" };

  it("is not set up while the project id or the API key is missing or misshapen", () => {
    expect(signInSettings({})).toBeNull();
    expect(signInSettings({ ...full, FIREBASE_API_KEY: "" })).toBeNull();
    expect(signInSettings({ ...full, FIREBASE_PROJECT_ID: undefined })).toBeNull();
    expect(signInSettings({ ...full, FIREBASE_PROJECT_ID: "Not A Project" })).toBeNull();
    expect(signInSettings({ ...full, FIREBASE_API_KEY: "has spaces in it, so it is not a key" })).toBeNull();
    expect(signInSettings({ ...full, FIREBASE_API_KEY: "key&injected=1aaaaaaaaaaaaaaaaaaaa" })).toBeNull();
  });
  it("talks to Google, and only to Google, when it is set up", () => {
    const s = signInSettings(full)!;
    expect(s).toMatchObject({ projectId: "iopener-prod", siteUrl: "https://iopener.example", standIn: false, proxyHops: 0 });
    expect(s.endpoints).toEqual(GOOGLE);
    expect(GOOGLE.toolkit).toBe("https://identitytoolkit.googleapis.com/v1");
    expect(GOOGLE.keys).toBe("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com");
  });
  it("offers only the email link when there is no Google client id, or it is not one", () => {
    expect(signInSettings({ ...full, GOOGLE_CLIENT_ID: "" })!.googleClientId).toBeNull();
    expect(signInSettings({ ...full, GOOGLE_CLIENT_ID: "not-a-client-id" })!.googleClientId).toBeNull();
    expect(signInSettings(full)!.googleClientId).toBe(full.GOOGLE_CLIENT_ID);
  });
  it("uses a stand-in only outside production and only on this machine", () => {
    const local = "http://127.0.0.1:9911";
    expect(standInEndpoints({ SIGNIN_STAND_IN: local, NODE_ENV: "development" })?.toolkit).toBe(`${local}/v1`);
    expect(standInEndpoints({ SIGNIN_STAND_IN: `${local}/`, NODE_ENV: "test" })?.keys).toBe(`${local}/keys`);
    expect(standInEndpoints({ SIGNIN_STAND_IN: local, NODE_ENV: "production" })).toBeNull();
    for (const elsewhere of ["https://127.0.0.1:9911", "http://evil.example:9911", "http://127.0.0.1.evil.example:9911", "http://127.0.0.1:9911@evil.example", "http://127.0.0.1:9911/path", "http://10.0.0.5:9911", ""]) {
      expect(standInEndpoints({ SIGNIN_STAND_IN: elsewhere, NODE_ENV: "development" }), elsewhere).toBeNull();
    }
    expect(signInSettings({ ...full, SIGNIN_STAND_IN: local, NODE_ENV: "production" })!.endpoints).toEqual(GOOGLE);
    expect(signInSettings({ ...full, SIGNIN_STAND_IN: local, NODE_ENV: "development" })!.standIn).toBe(true);
  });
  it("reads how many servers stand in front of the app, and falls back to none", () => {
    expect(signInSettings({ ...full, SIGNIN_PROXY_HOPS: "1" })!.proxyHops).toBe(1);
    for (const bad of ["-1", "x", "99", "1.5"]) expect(signInSettings({ ...full, SIGNIN_PROXY_HOPS: bad })!.proxyHops, bad).toBe(bad === "1.5" ? 1 : 0);
  });
  it("says what is wrong with half-made settings, without repeating a value", () => {
    expect(settingsProblems({})).toEqual([]);
    expect(settingsProblems(full)).toEqual([]);
    const half = settingsProblems({ FIREBASE_PROJECT_ID: "iopener-prod", GOOGLE_CLIENT_ID: "wrong", NODE_ENV: "production", SITE_URL: "http://iopener.example" });
    expect(half).toHaveLength(3);
    expect(half.join(" ")).not.toContain("wrong");
    expect(settingsProblems({ ...full, SIGNIN_STAND_IN: "http://127.0.0.1:9911", NODE_ENV: "production" }).join(" ")).toContain("SIGNIN_STAND_IN is ignored");
  });
});

describe("the session", () => {
  const now = 1_800_000_000_000;
  const cookie = (payload: object) => signToken(payload as { exp: number }, SECRET);

  it("names the person, when it began and how they signed in, and lasts 30 days", () => {
    const s = newSession(UUID, "signin", now);
    expect(s).toEqual({ userId: UUID, iat: now, via: "signin", exp: now + 30 * 86_400_000 });
    expect(readSession(cookie(s), false, SECRET, now + 1000)).toEqual(s);
    expect(readSession(cookie(s), false, SECRET, now + SESSION_MS)).toBeNull();
  });
  it("is nothing when the cookie is missing, forged or signed with another secret", () => {
    const good = cookie(newSession(UUID, "signin", now));
    expect(readSession(undefined, true, SECRET, now)).toBeNull();
    expect(readSession(good, true, "another-secret-entirely", now)).toBeNull();
    const forged = Buffer.from(JSON.stringify({ ...newSession("someone-else", "signin", now) })).toString("base64url") + "." + good.split(".")[1];
    expect(readSession(forged, true, SECRET, now)).toBeNull();
    expect(readSession(cookie({ exp: now + 1000 }), true, SECRET, now)).toBeNull();
    expect(readSession(cookie({ userId: 7, exp: now + 1000 }), true, SECRET, now)).toBeNull();
  });
  it("counts a demo session only while the demo sign-in is on", () => {
    const demo = cookie(newSession(UUID, "demo", now));
    expect(readSession(demo, true, SECRET, now)?.via).toBe("demo");
    expect(readSession(demo, false, SECRET, now)).toBeNull();
  });
  it("treats a cookie that does not say how the person signed in as a demo session, never as a real one", () => {
    const old = cookie({ userId: UUID, exp: now + SESSION_MS });
    expect(readSession(old, true, SECRET, now)).toMatchObject({ via: "demo", iat: now });
    expect(readSession(old, false, SECRET, now)).toBeNull();
    expect(readSession(cookie({ userId: UUID, via: "admin", iat: now, exp: now + 1000 }), false, SECRET, now)).toBeNull();
  });
  it("refuses a session that claims to begin in the future or to last longer than a session lasts", () => {
    expect(readSession(cookie({ userId: UUID, via: "signin", iat: now + 3_600_000, exp: now + 7_200_000 }), false, SECRET, now)).toBeNull();
    expect(readSession(cookie({ userId: UUID, via: "signin", iat: now, exp: now + SESSION_MS + 1 }), false, SECRET, now)).toBeNull();
  });
  it('ends with "sign out on every device": every session that began before that moment, and none that began after', () => {
    const before = { iat: now - 1 }, after = { iat: now + 1 };
    expect(endedEverywhere(before, new Date(now))).toBe(true);
    expect(endedEverywhere(after, new Date(now))).toBe(false);
    expect(endedEverywhere(before, null)).toBe(false);
  });
  it("asks a person who sees more than their own family to sign in again after a working day", () => {
    const begun = { iat: now };
    expect(tooOldForRole(begun, true, now + TRUSTED_HOURS * 3_600_000 - 1)).toBe(false);
    expect(tooOldForRole(begun, true, now + TRUSTED_HOURS * 3_600_000 + 1)).toBe(true);
    expect(tooOldForRole(begun, false, now + 29 * 86_400_000)).toBe(false);
  });
});

describe("the demo sign-in and real people", () => {
  it("may become a seeded person only: someone in the demo family, or with an address no mailbox can have", () => {
    expect(isDemoPerson({ email: "priya@eyesopener.test", firebaseUid: null }, true)).toBe(true);
    expect(isDemoPerson({ email: "Admin@Eyes Opener.TEST", firebaseUid: null }, false)).toBe(true);
    expect(isDemoPerson({ email: "parent@family.example", firebaseUid: null }, false)).toBe(false);
    expect(isDemoPerson({ email: "staff@iopener.example", firebaseUid: null }, false)).toBe(false);
  });
  it("never becomes a person who has signed in for real", () => {
    expect(isDemoPerson({ email: "priya@eyesopener.test", firebaseUid: "uid-1" }, true)).toBe(false);
    expect(isDemoPerson({ email: "admin@eyesopener.test", firebaseUid: "uid-1" }, false)).toBe(false);
  });
});

describe("child mode and sign-in", () => {
  const live: Extract<Hold, { state: "live" }> = { state: "live", accountId: "household-a", previewFor: null };

  it("lets the sign-in page open on a device that nothing holds", () => {
    expect(loginGate("none", false)).toBe("open");
    expect(loginGate("dead", false)).toBe("open");
  });
  it("keeps a child away from the sign-in page while the app can open for the signed-in grown-up", () => {
    expect(loginGate("live", true)).toBe("to_today");
  });
  it("opens the sign-in page on a device in child mode when nobody is signed in: the way out of the loop", () => {
    expect(loginGate("live", false)).toBe("sign_in_held");
  });
  it("lets only a person of the child's household sign in on that device", () => {
    expect(mayResume(live, { id: "u1", accountId: "household-a" })).toBe(true);
    expect(mayResume(live, { id: "u2", accountId: "household-b" })).toBe(false);
    expect(mayResume(live, { id: "u3", accountId: null })).toBe(false);
  });
  it("lets a staff member back into child mode in their own test household, and no other staff member", () => {
    const test: Extract<Hold, { state: "live" }> = { state: "live", accountId: "test-household", previewFor: "staff-1" };
    expect(mayResume(test, { id: "staff-1", accountId: null })).toBe(true);
    expect(mayResume(test, { id: "staff-2", accountId: null })).toBe(false);
  });
  it("reads the child-mode cookie only when it is signed and in time", () => {
    const now = Date.now();
    const good = signToken({ profileId: "p1", accountId: "household-a", exp: now + 1000 }, SECRET);
    expect(readHoldCookie(good, SECRET, now)).toEqual({ accountId: "household-a" });
    expect(readHoldCookie(good, SECRET, now + 2000)).toBeNull();
    expect(readHoldCookie(good, "another-secret-entirely", now)).toBeNull();
    expect(readHoldCookie(signToken({ profileId: "p1", exp: now + 1000 }, SECRET), SECRET, now)).toBeNull();
    expect(readHoldCookie(undefined, SECRET, now)).toBeNull();
  });
});

describe("the proxy, child mode and the site lock", () => {
  const childCookie = () => signToken({ profileId: UUID, accountId: UUID, exp: Date.now() + 60_000 });
  const request = (path: string, cookies: Record<string, string> = {}) =>
    new NextRequest(`http://localhost:3000${path}`, { headers: { cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ") } });
  const run = async (path: string, cookies?: Record<string, string>) => {
    const { proxy } = await import("../../proxy");
    const res = await proxy(request(path, cookies));
    const to = res.headers.get("location");
    if (!to) return "through";
    return new URL(to).pathname + new URL(to).search;
  };

  it("with the lock on the demo only, opens every page without the phrase", async () => {
    process.env.SITE_LOCK = "a-test-phrase-1234";
    process.env.SITE_LOCK_SCOPE = "demo";
    try {
      expect(await run("/")).toBe("through");
      expect(await run("/login")).toBe("through");
      expect(await run("/today")).toBe("through");
    } finally { delete process.env.SITE_LOCK; delete process.env.SITE_LOCK_SCOPE; }
  });

  it("lets the built files through with the site lock on and no cookie at all, and nothing else", async () => {
    process.env.SITE_LOCK = "a-test-phrase-1234";
    try {
      expect(await run("/_next/static/chunks/abc123.js")).toBe("through");
      for (const p of ["/favicon.ico", "/icon.png", "/apple-icon.png", "/opengraph-image.png", "/brand/mark.png"]) expect(await run(p)).toBe("through");
      expect(await run("/static/a.js")).toBe("/gate?next=%2Fstatic%2Fa.js");
      expect(await run("/_next/staticx/a.js")).not.toBe("through");
      expect(await run("/brandx/a.png")).not.toBe("through");
      const { config } = await import("../../proxy");
      expect(config.matcher).toEqual(["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|opengraph-image.png|brand/).*)"]);
    } finally { delete process.env.SITE_LOCK; }
  });

  it("moves the browser on the address it used: behind Firebase Hosting, the front door's", async () => {
    const { proxy } = await import("../../proxy");
    const sealed = { cookie: `io_child=${childCookie()}` };
    const direct = await proxy(new NextRequest("http://localhost:3000/settings", { headers: sealed }));
    expect(direct.headers.get("location")).toBe("http://localhost:3000/kids");
    const hosted = await proxy(new NextRequest("http://localhost:3000/settings", { headers: { ...sealed, "x-forwarded-host": "iopener-staging.web.app", "x-forwarded-proto": "https" } }));
    expect(hosted.headers.get("location")).toBe("https://iopener-staging.web.app/kids");
    expect(hosted.headers.get("cache-control")).toBe("no-store");
    /* the same seal when child mode is an entry of __session, as every browser holds it after the change */
    const bundled = await proxy(new NextRequest("http://localhost:3000/settings", { headers: { cookie: `__session=${encodeBundle({ io_child: [childCookie()] })}` } }));
    expect(new URL(bundled.headers.get("location")!).pathname).toBe("/kids");
    const odd = await proxy(new NextRequest("http://localhost:3000/settings", { headers: { ...sealed, "x-forwarded-host": "evil.example/path" } }));
    expect(new URL(odd.headers.get("location")!).host).toBe("localhost:3000");
  });

  it("lets a device in child mode reach the sign-in pages, with nobody signed in: no loop between the child's home and sign-in", async () => {
    delete process.env.SITE_LOCK;
    for (const path of ["/login", "/login/finish?mode=signIn&oobCode=abcdefgh12345678", "/login/welcome", "/kids", "/kids/break", "/today/week"]) expect(await run(path, { io_child: childCookie() }), path).toBe("through");
    /* Today itself is the child's tiles in child mode */
    expect(await run("/today", { io_child: childCookie() })).toBe("/kids");
    expect(await run("/today")).toBe("through");
  });
  it("still seals the grown-up screens in child mode", async () => {
    delete process.env.SITE_LOCK;
    for (const path of ["/settings", "/family", "/admin", "/counsellor", "/sponsor", "/together/share"]) expect(await run(path, { io_child: childCookie() }), path).toBe("/kids");
  });
  it("with the site lock on, asks for the phrase first and comes back to the sign-in link with its code whole", async () => {
    process.env.SITE_LOCK = "open sesame 42";
    try {
      const link = "/login/finish?next=%2Fjoin%3Fcode%3DABCD2345&apiKey=k&oobCode=abc_DEF-123456789&mode=signIn&lang=en";
      const to = await run(link);
      expect(to.startsWith("/gate?next=")).toBe(true);
      expect(decodeURIComponent(to.slice("/gate?next=".length))).toBe(link);
      expect(await run("/login")).toBe("/gate?next=%2Flogin");
      /* Past the gate, the sign-in pages open as on an unlocked site. */
      const gate = signToken({ gate: gateMark("open sesame 42"), exp: Date.now() + 60_000 });
      expect(await run(link, { [GATE_COOKIE]: gate })).toBe("through");
      expect(await run("/login", { [GATE_COOKIE]: gate, io_child: childCookie() })).toBe("through");
    } finally { delete process.env.SITE_LOCK; }
  });
});

describe("how often a link may be asked for", () => {
  const now = 1_800_000_000_000, min = 60_000;

  it("allows three links to one address in fifteen minutes, then says how long to wait", () => {
    expect(roomFor("email", [], now)).toEqual({ ok: true });
    expect(roomFor("email", [now - 2 * min, now - min], now)).toEqual({ ok: true });
    expect(roomFor("email", [now - 10 * min, now - 2 * min, now - min], now)).toEqual({ ok: false, waitS: 5 * 60 });
    expect(roomFor("email", [now - 16 * min, now - 2 * min, now - min], now)).toEqual({ ok: true });
  });
  it("allows eight links to one address in a day", () => {
    const spread = Array.from({ length: 8 }, (_, i) => now - (i + 1) * 60 * min);
    expect(roomFor("email", spread.slice(0, 7), now)).toEqual({ ok: true });
    expect(roomFor("email", spread, now)).toEqual({ ok: false, waitS: 16 * 3600 });
  });
  it("gives a network address more room than one email address, because many homes share one", () => {
    expect(LIMITS.net[0].max).toBeGreaterThan(LIMITS.email[0].max);
    expect(roomFor("net", Array.from({ length: 11 }, (_, i) => now - i * 1000), now)).toEqual({ ok: true });
    expect(roomFor("net", Array.from({ length: 12 }, (_, i) => now - i * 1000), now).ok).toBe(false);
  });
  it("ignores what happened outside the window, and anything dated in the future", () => {
    expect(roomFor("email", [now - 25 * 3600_000, now - 26 * 3600_000, now + 5000, now + 6000, now + 7000], now)).toEqual({ ok: true });
  });
  it("stores a scrambled key, never the address: the same address gives the same key, another secret a different one", () => {
    const key = hashedKey("email", "parent@family.example", SECRET);
    expect(key).not.toContain("parent");
    expect(key).toBe(hashedKey("email", "parent@family.example", SECRET));
    expect(key).not.toBe(hashedKey("net", "parent@family.example", SECRET));
    expect(key).not.toBe(hashedKey("email", "parent@family.example", "another-secret-entirely"));
  });
});

describe("the network address a request came from", () => {
  it("takes the last entry when Cloud Run is reached directly: anything before it can be made up by the visitor", () => {
    expect(networkAddress("203.0.113.9", 0)).toBe("203.0.113.9");
    expect(networkAddress("1.1.1.1, 2.2.2.2, 203.0.113.9", 0)).toBe("203.0.113.9");
  });
  it("skips one server when Firebase Hosting stands in front", () => {
    expect(networkAddress("1.1.1.1, 203.0.113.9, 151.101.1.1", 1)).toBe("203.0.113.9");
  });
  it("answers unknown when the list is too short or the entry is not an address", () => {
    expect(networkAddress(null)).toBe("unknown");
    expect(networkAddress("", 0)).toBe("unknown");
    expect(networkAddress("203.0.113.9", 1)).toBe("unknown");
    expect(networkAddress("not-an-address", 0)).toBe("unknown");
    expect(networkAddress("999.1.1.1", 0)).toBe("unknown");
  });
  it("writes an address one way, and counts a whole IPv6 home network as one", () => {
    expect(tidyAddress(" 203.000.113.009 ")).toBe("203.0.113.9");
    expect(tidyAddress("::ffff:203.0.113.9")).toBe("203.0.113.9");
    expect(tidyAddress("2001:DB8:AB:CD:1:2:3:4")).toBe("2001:db8:ab:cd::/64");
    expect(tidyAddress("2001:db8:ab:cd:ffff:ffff:ffff:ffff")).toBe("2001:db8:ab:cd::/64");
    expect(tidyAddress("2001:db8::1")).toBe("2001:db8:0:0::/64");
    expect(tidyAddress("[2001:db8::1]")).toBe("2001:db8:0:0::/64");
    for (const bad of ["", "1.2.3", "1.2.3.4.5", "2001:db8:::1", "g001:db8::1", "1:2:3:4:5:6:7:8:9", "hello"]) expect(tidyAddress(bad), bad).toBeNull();
  });
});

describe("who a sign-in is", () => {
  const who = { uid: "uid-1", email: "asha@family.example", emailVerified: true };
  const row = (more: Partial<PersonRow> = {}): PersonRow => ({ id: "p1", email: "asha@family.example", firebaseUid: null, demo: false, ...more });

  it("is the person already tied to that Firebase account", () => {
    expect(decide(who, row({ firebaseUid: "uid-1" }), [row({ firebaseUid: "uid-1" })])).toEqual({ act: "sign_in", id: "p1" });
  });
  it("is one person whether they came by Google or by email link: the account is the same, so the person is", () => {
    const tied = row({ firebaseUid: "uid-1" });
    /* The first sign-in, by Google, tied the row. The second, by link, carries the same account id. */
    expect(decide(who, tied, [tied])).toEqual({ act: "sign_in", id: "p1" });
    expect(decide({ ...who, email: "ASHA@Family.Example" }, tied, [tied])).toEqual({ act: "sign_in", id: "p1" });
  });
  it("ties a person ops entered by email to their account at their first sign-in", () => {
    expect(decide(who, null, [row()])).toEqual({ act: "link", id: "p1" });
    expect(decide(who, null, [row({ email: "Asha@Family.Example" })])).toEqual({ act: "link", id: "p1" });
  });
  it("never lets an address that was not verified take a row, tied or not, or make a new person", () => {
    const unverified = { ...who, emailVerified: false };
    expect(decide(unverified, null, [row()])).toEqual({ act: "refuse", why: "unverified" });
    expect(decide(unverified, null, [])).toEqual({ act: "refuse", why: "unverified" });
    expect(decide(unverified, row({ firebaseUid: "uid-1" }), [])).toEqual({ act: "refuse", why: "unverified" });
    expect(decide({ ...who, emailVerified: "true" as unknown as boolean }, null, [row()])).toEqual({ act: "refuse", why: "unverified" });
  });
  it("never hands a person tied to one Firebase account to another account with the same address", () => {
    expect(decide({ ...who, uid: "uid-2" }, null, [row({ firebaseUid: "uid-1" })])).toEqual({ act: "refuse", why: "other_sign_in" });
  });
  it("makes a new person when nobody has the account or the address", () => {
    expect(decide(who, null, [])).toEqual({ act: "create" });
  });
  it("follows an address that changed at the provider, when nobody else here has the new one", () => {
    const tied = row({ email: "old@family.example", firebaseUid: "uid-1" });
    expect(decide(who, tied, [])).toEqual({ act: "sign_in", id: "p1", newEmail: "asha@family.example" });
  });
  it("refuses when the changed address already belongs to another person here: two rows are never merged by a guess", () => {
    const tied = row({ email: "old@family.example", firebaseUid: "uid-1" });
    expect(decide(who, tied, [row({ id: "p2" })])).toEqual({ act: "refuse", why: "address_in_use" });
    expect(decide(who, tied, [row({ id: "p2", firebaseUid: "uid-9" })])).toEqual({ act: "refuse", why: "address_in_use" });
  });
  it("refuses when two people have the address in different capitals", () => {
    expect(decide(who, null, [row(), row({ id: "p2", email: "Asha@Family.Example" })])).toEqual({ act: "refuse", why: "unclear" });
  });
  it("never ties a real sign-in to a person of the demo family", () => {
    expect(decide(who, null, [row({ demo: true })])).toEqual({ act: "refuse", why: "demo" });
  });
  it("names a person who came with no name after the first part of their address", () => {
    expect(nameFromEmail("asha.rao@family.example")).toBe("asha.rao");
  });
});

describe("where a person lands after signing in", () => {
  it("accepts only a path on this site as the place to go next", () => {
    expect(cleanNext("/join?code=ABCD2345")).toBe("/join?code=ABCD2345");
    expect(cleanNext("/today")).toBe("/today");
    for (const bad of [undefined, null, 7, "", "/", "today", "https://evil.example", "//evil.example", "/\\evil.example", "/\t/evil.example", "/\n/evil.example", "/ /evil.example", "/gate", "/login", "/login/finish?x=1", "/login?next=/today", `/${"a".repeat(600)}`]) {
      expect(cleanNext(bad), String(bad).slice(0, 40)).toBeNull();
    }
  });
  it("keeps a device in child mode on Today, whatever was asked for", () => {
    expect(landing({ held: true, home: "/today", next: "/family" })).toBe("/today");
    expect(landing({ held: true, home: "/admin", next: null })).toBe("/today");
  });
  it("sends a person with no household and no other area to the welcome page, or to Join when that is where they were going", () => {
    expect(landing({ held: false, home: "/login", next: null })).toBe("/login/welcome");
    expect(landing({ held: false, home: "/login", next: "/today" })).toBe("/login/welcome");
    expect(landing({ held: false, home: "/login", next: "/join?code=ABCD2345" })).toBe("/join?code=ABCD2345");
    expect(landing({ held: false, home: "/login", next: "/join" })).toBe("/join");
    expect(landing({ held: false, home: "/login", next: "/joinery" })).toBe("/login/welcome");
  });
  it("sends everyone else where they were going, or to their own area", () => {
    expect(landing({ held: false, home: "/today", next: null })).toBe("/today");
    expect(landing({ held: false, home: "/today", next: "/train/games" })).toBe("/train/games");
    expect(landing({ held: false, home: "/admin", next: null })).toBe("/admin");
  });
  it("tidies an address before it is used, and knows the shape of a link's code", () => {
    expect(tidyEmail("  Asha@Family.Example ")).toBe("asha@family.example");
    for (const bad of [null, "", "asha", "asha@", "@family.example", "a b@family.example", `${"a".repeat(250)}@family.example`]) expect(tidyEmail(bad), String(bad).slice(0, 20)).toBeNull();
    expect(looksLikeCode("abc_DEF-123456789")).toBe(true);
    for (const bad of [undefined, "", "short", "has space in it", "semi;colon_12345", "a".repeat(2000)]) expect(looksLikeCode(bad)).toBe(false);
  });
});
