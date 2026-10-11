// Eyes Opener: What the proxy does with the language of a request: decides it once, writes it on the request, never believes.
/**
 * What the proxy does with the language of a request: decides it once, writes it on the request, never believes
 * a header a browser sent, and reads the database only when a language other than English is asked for.
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { signToken } from "@/lib/token";

const statuses = vi.hoisted(() => ({ map: {} as Record<string, string>, calls: 0 }));
vi.mock("./status", () => ({ langStatuses: async () => { statuses.calls++; return statuses.map; } }));

import { DRAFTS_COOKIE, LANG_COOKIE, PASS_COOKIE, PATH_HEADER } from "./decide";
import { choiceOf, passOn } from "./request";
import { LANG_HEADER } from "./runtime";

const request = (path: string, cookies: Record<string, string> = {}, headers: Record<string, string> = {}) =>
  new NextRequest(`http://localhost:3000${path}`, { headers: { ...headers, cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ") } });
/** What the page would be handed: Next.js carries overridden request headers in `x-middleware-request-*`. */
const handed = (res: Response, name: string) => res.headers.get(`x-middleware-request-${name}`);

beforeEach(() => { statuses.map = {}; statuses.calls = 0; vi.unstubAllEnvs(); vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("SESSION_SECRET", "a-secret-for-this-test-only-0123456789"); });

describe("the language of a request, at the proxy", () => {
  it("is English with no cookie, and the database is not read", async () => {
    expect(await choiceOf(request("/today"))).toEqual({ lang: "en", drafts: false });
    expect(await choiceOf(request("/today", { [LANG_COOKIE]: "en" }))).toEqual({ lang: "en", drafts: false });
    expect(await choiceOf(request("/today", { [LANG_COOKIE]: "klingon" }))).toEqual({ lang: "en", drafts: false });
    expect(statuses.calls).toBe(0);
  });
  it("is the cookie's language only when staff have switched it on", async () => {
    expect(await choiceOf(request("/today", { [LANG_COOKIE]: "hi" }))).toEqual({ lang: "en", drafts: false });
    statuses.map = { hi: "on" };
    expect(await choiceOf(request("/today", { [LANG_COOKIE]: "hi" }))).toEqual({ lang: "hi", drafts: false });
    expect(statuses.calls).toBe(2);
  });
  it("opens a language in review only with a good staff pass for that language", async () => {
    statuses.map = { ur: "review" };
    const pass = (lang: string) => signToken({ lang, exp: Date.now() + 60_000 });
    expect(await choiceOf(request("/today", { [LANG_COOKIE]: "ur" }))).toEqual({ lang: "en", drafts: false });
    expect(await choiceOf(request("/today", { [LANG_COOKIE]: "ur", [PASS_COOKIE]: pass("ur") }))).toEqual({ lang: "ur", drafts: false });
    expect(await choiceOf(request("/today", { [LANG_COOKIE]: "ur", [PASS_COOKIE]: pass("hi") }))).toEqual({ lang: "en", drafts: false });
    expect(await choiceOf(request("/today", { [LANG_COOKIE]: "ur", [PASS_COOKIE]: "forged.token" }))).toEqual({ lang: "en", drafts: false });
    expect(await choiceOf(request("/today", { [LANG_COOKIE]: "ur", [PASS_COOKIE]: signToken({ lang: "ur", exp: Date.now() - 1 }) }))).toEqual({ lang: "en", drafts: false });
  });
  it("refuses the drafts switch in production and honours it in development", async () => {
    expect(await choiceOf(request("/today", { [LANG_COOKIE]: "hi", [DRAFTS_COOKIE]: "on" }))).toEqual({ lang: "en", drafts: false });
    statuses.map = { hi: "on" };
    expect(await choiceOf(request("/today", { [LANG_COOKIE]: "hi", [DRAFTS_COOKIE]: "on" }))).toEqual({ lang: "hi", drafts: false });
    vi.stubEnv("NODE_ENV", "development");
    statuses.map = {};
    expect(await choiceOf(request("/today", { [LANG_COOKIE]: "hi", [DRAFTS_COOKIE]: "on" }))).toEqual({ lang: "hi", drafts: true });
    expect(await choiceOf(request("/today", { [LANG_COOKIE]: "hi" }))).toEqual({ lang: "en", drafts: false });
  });
});

describe("handing the request on", () => {
  it("writes the language and the page's address on the request", () => {
    const res = passOn(request("/today?x=1", { [LANG_COOKIE]: "hi" }), { lang: "hi", drafts: false });
    expect(handed(res, LANG_HEADER)).toBe("hi");
    expect(handed(res, PATH_HEADER)).toBe("/today?x=1");
    expect(passOn(request("/today"), { lang: "ur", drafts: true }).headers.get(`x-middleware-request-${LANG_HEADER}`)).toBe("ur;drafts");
  });
  it("never believes a language header a browser sent", () => {
    const res = passOn(request("/today", {}, { [LANG_HEADER]: "hi;drafts" }), { lang: "en", drafts: false });
    expect(handed(res, LANG_HEADER)).toBe("en");
  });
  it("puts the cookie back to English when it names a language the browser may not have", () => {
    const res = passOn(request("/today", { [LANG_COOKIE]: "hi" }), { lang: "en", drafts: false });
    expect(res.cookies.get(LANG_COOKIE)?.value).toBe("en");
    /* and leaves it alone when it is right, or absent */
    expect(passOn(request("/today", { [LANG_COOKIE]: "hi" }), { lang: "hi", drafts: false }).cookies.get(LANG_COOKIE)).toBeUndefined();
    expect(passOn(request("/today"), { lang: "en", drafts: false }).cookies.get(LANG_COOKIE)).toBeUndefined();
  });
});
