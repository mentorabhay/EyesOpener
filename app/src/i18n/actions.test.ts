/**
 * Who may change which language, and what the three /lang addresses do.
 *
 * The rules: only a language that is offered to this person can be chosen (the value sent by the browser is
 * matched against the fixed list of eleven, then against what staff switched on). A guardian changes their own
 * household's language and nobody else's. A cheer seat and a device in child mode change nothing. A visitor
 * changes only their own browser. Machine drafts are shown through the development address only, and production
 * answers "not found" there and ignores the switch everywhere.
 *
 * The database, the sign-in and the browser's cookies are stood in for; everything else is the real code.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  jar: new Map<string, string>(), options: new Map<string, Record<string, unknown>>(), headers: new Map<string, string>(),
  statuses: {} as Record<string, string>, viewer: null as unknown, member: null as unknown,
  updates: [] as { set: Record<string, unknown>; where: unknown }[],
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (h.jar.has(name) ? { name, value: h.jar.get(name)! } : undefined),
    set: (name: string, value: string, options: Record<string, unknown> = {}) => { h.jar.set(name, value); h.options.set(name, options); },
    delete: (name: string) => { h.jar.delete(name); },
  }),
  headers: async () => ({ get: (name: string) => h.headers.get(name.toLowerCase()) ?? null }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("next/navigation", () => ({ redirect: (to: string) => { throw new Error(`moved to ${to}`); } }));
vi.mock("drizzle-orm", () => ({ eq: (column: unknown, value: unknown) => ({ column, value }) }));
vi.mock("@/db", () => ({
  db: { update: (table: unknown) => ({ set: (set: Record<string, unknown>) => ({ where: async (where: unknown) => { h.updates.push({ set, where: { table, ...(where as object) } }); } }) }) },
  schema: { account: { id: "account.id", _: "account" } },
}));
vi.mock("@/lib/auth", () => ({ getViewer: async () => h.viewer }));
vi.mock("@/lib/session", () => ({ getMember: async () => h.member }));
vi.mock("./status", () => ({ langStatuses: async () => h.statuses }));

import { memberCan, type MemberAction, type Seat } from "@/lib/roles";
import { signToken, verifyToken } from "@/lib/token";
import { GET as devDrafts } from "@/app/lang/dev-drafts/route";
import { GET as sync } from "@/app/lang/sync/route";
import { GET as wordsRoute } from "@/app/lang/words/[lang]/[version]/route";
import { chooseLanguage } from "./actions";
import { DRAFTS_COOKIE, LANG_COOKIE, PASS_COOKIE, PATH_HEADER, SYNCED_COOKIE } from "./decide";
import { keepHouseholdLanguage } from "./household";
import { mark } from "./mark";
import { readTranslationsFrom } from "./runtime";

const member = (seat: Seat, o: { childMode?: boolean; locale?: string; staff?: string | null; account?: string } = {}) => ({
  account: { id: o.account ?? "household-1", locale: o.locale ?? "en" }, viewer: { staff: o.staff ?? null },
  can: (a: MemberAction) => memberCan(seat, a, !!o.childMode),
});
const pick = (lang: unknown) => { const f = new FormData(); if (lang !== undefined) f.set("lang", lang as string); return chooseLanguage(null, f); };

let dir = "";
beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), "io-lang-actions-"));
  mkdirSync(path.join(dir, "hi", "copy"), { recursive: true });
  writeFileSync(path.join(dir, "hi", "copy", "common.json"), JSON.stringify({ lang: "hi", file: "copy/common", entries: {
    "common.a": { source: mark("A"), text: "reviewed-word", status: "reviewed" },
    "common.b": { source: mark("B"), text: "draft-word", status: "machine" },
  } }));
  readTranslationsFrom(dir);
});
afterAll(() => { readTranslationsFrom(undefined); rmSync(dir, { recursive: true, force: true }); });
beforeEach(() => {
  h.jar.clear(); h.options.clear(); h.headers.clear(); h.updates.length = 0; h.statuses = {}; h.viewer = null; h.member = null;
  vi.unstubAllEnvs(); vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("SESSION_SECRET", "a-secret-for-this-test-only-0123456789"); vi.stubEnv("SHOW_DRAFT_TRANSLATIONS", "");
});

describe("choosing a language", () => {
  it("refuses anything that is not one of the eleven languages, whatever is sent", async () => {
    h.statuses = { hi: "on" };
    for (const sent of [undefined, "", "fr", "hi-IN", "HI", "hi;drafts", "../../etc/passwd", "<script>alert(1)</script>", "__proto__", "constructor", "hi\u0000", " hi"]) {
      expect(await pick(sent), String(sent)).toMatchObject({ ok: false });
    }
    expect(h.jar.size).toBe(0);
    expect(h.updates).toEqual([]);
  });
  it("refuses a language that staff have not switched on, and one that is only in review", async () => {
    h.member = member("guardian");
    h.statuses = { ur: "review" };
    expect(await pick("hi")).toMatchObject({ ok: false });
    expect(await pick("ur")).toMatchObject({ ok: false });
    expect(h.jar.has(LANG_COOKIE)).toBe(false);
    expect(h.updates).toEqual([]);
  });
  it("a guardian changes the language of their own household, and of this browser", async () => {
    h.statuses = { hi: "on" };
    for (const seat of ["guardian", "co_guardian"] as const) {
      h.updates.length = 0; h.jar.clear();
      h.member = member(seat, { account: `household-of-${seat}` });
      expect(await pick("hi")).toMatchObject({ ok: true, reload: true });
      /* one write, to the household the sign-in names: the form sends a language and nothing else */
      expect(h.updates).toEqual([{ set: { locale: "hi" }, where: { table: { id: "account.id", _: "account" }, column: "account.id", value: `household-of-${seat}` } }]);
      expect(h.jar.get(LANG_COOKIE)).toBe("hi");
      expect(h.jar.has(PASS_COOKIE)).toBe(false);
    }
  });
  it("writes nothing to the household when it already has that language", async () => {
    h.statuses = { hi: "on" };
    h.member = member("guardian", { locale: "hi" });
    expect(await pick("hi")).toMatchObject({ ok: true });
    expect(h.updates).toEqual([]);
    expect(h.jar.get(LANG_COOKIE)).toBe("hi");
  });
  it("a guardian can go back to English, which is always offered", async () => {
    h.member = member("guardian", { locale: "hi" });
    expect(await pick("en")).toMatchObject({ ok: true });
    expect(h.updates[0].set).toEqual({ locale: "en" });
    expect(h.jar.get(LANG_COOKIE)).toBe("en");
  });
  it("a cheer seat changes nothing: not the household, not the browser", async () => {
    h.statuses = { hi: "on" };
    h.member = member("circle");
    expect(await pick("hi")).toMatchObject({ ok: false });
    expect(h.updates).toEqual([]);
    expect(h.jar.has(LANG_COOKIE)).toBe(false);
  });
  it("a device in child mode changes nothing, whoever is signed in", async () => {
    h.statuses = { hi: "on" };
    h.member = member("guardian", { childMode: true });
    expect(await pick("hi")).toMatchObject({ ok: false });
    expect(h.updates).toEqual([]);
    expect(h.jar.has(LANG_COOKIE)).toBe(false);
  });
  it("a visitor with no household changes only their own browser", async () => {
    h.statuses = { hi: "on" };
    expect(await pick("hi")).toMatchObject({ ok: true, reload: true });
    expect(h.updates).toEqual([]);
    expect(h.jar.get(LANG_COOKIE)).toBe("hi");
    expect(h.options.get(LANG_COOKIE)).toMatchObject({ path: "/", sameSite: "lax" });
  });
  it("staff may read a language that is in review, with a signed pass for that language only", async () => {
    h.statuses = { ur: "review" };
    h.viewer = { staff: "content" };
    expect(await pick("ur")).toMatchObject({ ok: true });
    expect(h.jar.get(LANG_COOKIE)).toBe("ur");
    expect(verifyToken<{ lang: string }>(h.jar.get(PASS_COOKIE))?.lang).toBe("ur");
    expect(h.options.get(PASS_COOKIE)).toMatchObject({ httpOnly: true });
    /* and not one that is off */
    expect(await pick("ta")).toMatchObject({ ok: false });
  });
  it("the development switch opens every language in development and nothing in production", async () => {
    h.jar.set(DRAFTS_COOKIE, "on");
    expect(await pick("ta")).toMatchObject({ ok: false });
    vi.stubEnv("NODE_ENV", "development");
    expect(await pick("ta")).toMatchObject({ ok: true });
  });
});

describe("the development address for machine drafts", () => {
  const get = (query: string) => devDrafts(new Request(`http://localhost:3000/lang/dev-drafts${query}`));
  it("answers not found in production and sets nothing", async () => {
    for (const q of ["?lang=hi", "?lang=hi&next=/today", "?off", ""]) {
      const res = await get(q);
      expect(res.status, q).toBe(404);
      expect(res.headers.get("set-cookie"), q).toBeNull();
    }
    vi.stubEnv("SHOW_DRAFT_TRANSLATIONS", "on");
    expect((await get("?lang=hi")).status).toBe(404);
  });
  it("in development sets the language and the switch, and goes only to a page of this site", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const res = await get("?lang=hi&next=/today");
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/today");
    expect(res.headers.get("set-cookie")).toContain(`${DRAFTS_COOKIE}=on`);
    expect(res.headers.get("set-cookie")).toContain(`${LANG_COOKIE}=hi`);
    for (const next of ["//evil.example", "https://evil.example", "/\\evil.example", "/%09/evil.example".replace("%09", "\t")]) {
      expect((await get(`?lang=hi&next=${encodeURIComponent(next)}`)).headers.get("location"), next).toBe("/");
    }
    /* a language that is not one of the eleven switches drafts off and goes back to English */
    const odd = await get("?lang=xx");
    expect(odd.headers.get("set-cookie")).toContain(`${LANG_COOKIE}=en`);
    expect(odd.headers.get("set-cookie")).not.toContain(`${DRAFTS_COOKIE}=on`);
  });
});

describe("the script of a language's words", () => {
  const get = (lang: string, query = "") => wordsRoute(new Request(`http://localhost:3000/lang/words/${lang}/v${query}`), { params: Promise.resolve({ lang, version: "v" }) });
  it("answers not found for English, for an unknown language and for a language that is off", async () => {
    for (const lang of ["en", "xx", "..", "hi"]) expect((await get(lang)).status, lang).toBe(404);
  });
  it("in production holds reviewed sentences only, even when drafts are asked for", async () => {
    h.statuses = { hi: "on" };
    for (const q of ["", "?drafts=1"]) {
      const res = await get("hi", q), body = await res.text();
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("javascript");
      expect(res.headers.get("x-robots-tag")).toBe("noindex");
      expect(body).toContain("reviewed-word");
      expect(body, q).not.toContain("draft-word");
    }
  });
  it("lets a browser keep the file for good only under the version it really is", async () => {
    h.statuses = { hi: "on" };
    const { clientWords } = await import("./client-words");
    const version = clientWords("hi", false).version;
    const right = await wordsRoute(new Request(`http://localhost:3000/lang/words/hi/${version}`), { params: Promise.resolve({ lang: "hi", version }) });
    expect(right.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    /* a page drawn by a newer server asks an older one for a version it does not have */
    const other = await get("hi");
    expect(other.status).toBe(200);
    expect(other.headers.get("cache-control")).toBe("no-store");
  });
  it("in development gives drafts when asked, and never lets a browser keep that file", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const res = await get("hi", "?drafts=1");
    expect(await res.text()).toContain("draft-word");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});

describe("keeping a browser on its household's language", () => {
  const page = (pathname: string) => { h.headers.set("accept", "text/html"); h.headers.set(PATH_HEADER.toLowerCase(), pathname); };
  it("sends a member's page to pick the language up when the two differ, and only then", async () => {
    h.statuses = { hi: "on" };
    page("/today?x=1");
    /* tests draw in English: a household in Hindi is sent to pick Hindi up */
    await expect(keepHouseholdLanguage("hi", false)).rejects.toThrow("moved to /lang/sync?next=%2Ftoday%3Fx%3D1");
    await expect(keepHouseholdLanguage("en", false)).resolves.toBeUndefined();
    /* a household whose language is switched off stays in English and is not sent anywhere */
    h.statuses = {};
    await expect(keepHouseholdLanguage("hi", false)).resolves.toBeUndefined();
  });
  it("never interrupts an action, a request that is not a page, or a browser that has just been sent", async () => {
    h.statuses = { hi: "on" };
    page("/today");
    h.headers.set("next-action", "abc");
    await expect(keepHouseholdLanguage("hi", false)).resolves.toBeUndefined();
    h.headers.delete("next-action"); h.headers.set("accept", "application/json");
    await expect(keepHouseholdLanguage("hi", false)).resolves.toBeUndefined();
    page("/today"); h.jar.set(SYNCED_COOKIE, "1");
    await expect(keepHouseholdLanguage("hi", false)).resolves.toBeUndefined();
    h.jar.clear(); page("/lang/sync?next=/today");
    await expect(keepHouseholdLanguage("hi", false)).resolves.toBeUndefined();
  });
  it("the pick-up address sets the household's language and goes back only to a page of this site", async () => {
    h.statuses = { hi: "on" };
    h.member = member("guardian", { locale: "hi" });
    const res = await sync(new Request("http://localhost:3000/lang/sync?next=/today"));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/today");
    expect(h.jar.get(LANG_COOKIE)).toBe("hi");
    expect(res.headers.get("set-cookie")).toContain(`${SYNCED_COOKIE}=1`);
    expect((await sync(new Request("http://localhost:3000/lang/sync?next=//evil.example"))).headers.get("location")).toBe("/");
    /* nobody signed in: nothing is set, and the browser is simply sent back */
    h.member = null; h.jar.clear();
    expect((await sync(new Request("http://localhost:3000/lang/sync?next=/"))).status).toBe(303);
    expect(h.jar.has(LANG_COOKIE)).toBe(false);
  });
  it("a staff pass is signed: a made-up one opens nothing", () => {
    expect(verifyToken("made.up")).toBeNull();
    expect(verifyToken<{ lang: string }>(signToken({ lang: "ur", exp: Date.now() + 1000 }))?.lang).toBe("ur");
  });
});
