/**
 * The one place this package reaches inside Next.js, held to what it relies on.
 *
 * src/i18n/runtime.ts reads the request being served from Next.js's own store
 * (`next/dist/server/app-render/work-unit-async-storage.external`). That is not a public interface. This file
 * builds requests with Next.js's own factory and runs code inside them exactly as Next.js does, so that after an
 * upgrade of Next.js one of two things is true: these tests pass and the language of a request is still read
 * rightly, or they fail here, loudly, before anything is released. (What the app does if it ever runs with a
 * Next.js that broke this anyway is in next-broken.test.ts: it answers in English and says so.)
 *
 * It also proves the rule that matters most: two requests drawn at the same time, in different languages, never
 * see each other's language. Not in a page, not in the first picture of a browser component, not in an action.
 */
import "next/dist/server/node-environment-baseline";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequestStore } from "next/dist/server/async-storage/request-store";
import { workUnitAsyncStorage } from "next/dist/server/app-render/work-unit-async-storage.external";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { browserParts } from "./layer";
import type { Lang } from "./languages";
import { mark } from "./mark";
import { current, currentLang, drawAsBrowserParts, forgetFiles, inEnglish, LANG_HEADER, readChoice, readTranslationsFrom, requestChoiceWasSet, setRequestChoice, withLang } from "./runtime";
import { texts } from "./texts";

/** A request as Next.js makes one for a page, with the header the proxy writes. */
const requestIn = (header: string | null, extra: Record<string, string> = {}) => createRequestStore({
  phase: "render", headers: new Headers({ ...(header === null ? {} : { [LANG_HEADER]: header }), ...extra }), onUpdateCookies: undefined,
  url: { pathname: "/today", search: "" }, rootParams: {}, implicitTags: { tags: [], expirationsByCacheKind: new Map() },
  resumeDataCache: null, previewProps: undefined, isHmrRefresh: false, serverComponentsHmrCache: undefined, hmrRefreshHash: undefined, fallbackParams: null,
});
const serve = <T>(header: string | null, fn: () => T): T => workUnitAsyncStorage.run(requestIn(header), fn);
const pause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const tick = () => new Promise<void>((r) => setImmediate(r));

const words = texts("test/next", "words", () => ({
  title: "Today",
  dose: "Play for 20 minutes.",
  only: { server: "Drawn on the server only" },
  hello: (name: string) => `Hello ${name}`,
}));

let dir = "";
beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), "io-lang-next-"));
  const put = (lang: Lang, title: string, dose: string, server: string, hello: string) => {
    mkdirSync(path.join(dir, lang, "test"), { recursive: true });
    writeFileSync(path.join(dir, lang, "test", "next.json"), JSON.stringify({ lang, file: "test/next", entries: {
      "words.title": { source: mark("Today"), text: title, status: "reviewed" },
      "words.dose": { source: mark("Play for 20 minutes."), text: dose, status: "machine" },
      "words.only.server": { source: mark("Drawn on the server only"), text: server, status: "reviewed" },
      "words.hello(*)": { source: mark("Hello {name}"), text: hello, status: "reviewed", params: ["name"] },
    } }));
  };
  put("hi", "आज", "20 मिनट खेलें।", "केवल सर्वर पर", "नमस्ते {name}");
  put("ta", "இன்று", "20 நிமிடங்கள் விளையாடுங்கள்.", "சேவையகத்தில் மட்டும்", "வணக்கம் {name}");
  put("ur", "آج", "20 منٹ کھیلیں۔", "صرف سرور پر", "سلام {name}");
  /* the browser is given the title and the greeting, and not the sentence only the server draws */
  writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ made: "2026-10-05", units: 4, chars: 0,
    files: { "test/next": { "words.hello(*)": mark("Hello {name}") } }, client: { "test/next": ["words.title", "words.dose", "words.hello"] } }));
  readTranslationsFrom(dir);
});
afterAll(() => { drawAsBrowserParts(undefined); readTranslationsFrom(undefined); rmSync(dir, { recursive: true, force: true }); });

describe("Next.js still hands this package the request it is serving", () => {
  it("builds a request with a kind and headers this package can read", () => {
    const store = requestIn("hi");
    expect(store.type).toBe("request");
    expect(store.headers.get(LANG_HEADER)).toBe("hi");
  });
  it("reads the language of the request from inside it, and English outside any request", () => {
    expect(currentLang()).toBe("en");
    expect(serve("hi", () => current())).toEqual({ lang: "hi", drafts: false });
    expect(serve("ur;drafts", () => current())).toEqual({ lang: "ur", drafts: true });
    expect(serve(null, () => currentLang())).toBe("en");
    expect(serve("klingon", () => currentLang())).toBe("en");
    expect(currentLang()).toBe("en");
  });
  it("keeps the language through every kind of waiting a page does", async () => {
    const seen = await serve("hi", async () => {
      const out = [currentLang()];
      await Promise.resolve(); out.push(currentLang());
      await pause(2); out.push(currentLang());
      await tick(); out.push(currentLang());
      await new Promise<void>((r) => process.nextTick(r)); out.push(currentLang());
      out.push(...(await Promise.all([1, 2].map(async () => { await pause(1); return currentLang(); }))));
      return out;
    });
    expect(new Set(seen)).toEqual(new Set(["hi"]));
  });
  it("answers in English for anything that is not a request: a page built ahead of time, something kept for later", () => {
    for (const type of ["prerender", "prerender-ppr", "prerender-legacy", "prerender-client", "cache", "private-cache", "unstable-cache"]) {
      const store = { type, phase: "render", headers: new Headers({ [LANG_HEADER]: "hi" }) } as unknown as Parameters<typeof workUnitAsyncStorage.run>[0];
      expect(workUnitAsyncStorage.run(store, () => [currentLang(), words.title]), type).toEqual(["en", "Today"]);
    }
  });
});

describe("two requests at the same time", () => {
  /** One request: reads words many times, with a different rhythm of waiting each time, as a page in flight does. */
  const draw = (header: string, name: string, rhythm: number) => serve(header, async () => {
    const seen = new Set<string>();
    for (let i = 0; i < 24; i++) {
      seen.add(`${currentLang()}|${words.title}|${words.dose}|${words.hello(name)}`);
      if ((i + rhythm) % 3 === 0) await pause((i * rhythm) % 4); else if ((i + rhythm) % 3 === 1) await tick(); else await Promise.resolve();
    }
    return [...seen];
  });
  it("never see each other's language: thirty requests in four languages, started together", async () => {
    const want: Record<string, string> = {
      "en": "en|Today|Play for 20 minutes.|Hello Asha",
      "hi": "hi|आज|Play for 20 minutes.|नमस्ते Asha",
      "hi;drafts": "hi|आज|20 मिनट खेलें।|नमस्ते Asha",
      "ta": "ta|இன்று|Play for 20 minutes.|வணக்கம் Asha",
      "ur": "ur|آج|\u2066Play for 20 minutes.\u2069|سلام Asha",
    };
    const headers = Object.keys(want);
    const jobs = Array.from({ length: 30 }, (_, i) => headers[i % headers.length]);
    const out = await Promise.all(jobs.map((h, i) => draw(h, "Asha", i + 1)));
    out.forEach((seen, i) => expect(seen, `request ${i} in ${jobs[i]}`).toEqual([want[jobs[i]]]));
    expect(currentLang()).toBe("en");
  });
  it("a draft asked for by one request is never shown to another in the same language", async () => {
    const [plain, drafts, again] = await Promise.all([draw("hi", "A", 1), draw("hi;drafts", "A", 2), draw("hi", "A", 3)]);
    expect(plain).toEqual(["hi|आज|Play for 20 minutes.|नमस्ते A"]);
    expect(again).toEqual(plain);
    expect(drafts).toEqual(["hi|आज|20 मिनट खेलें।|नमस्ते A"]);
  });
  it("an action that changes the language changes it for its own request only", async () => {
    const action = serve("en", async () => {
      await pause(2);
      expect(requestChoiceWasSet()).toBe(false);
      setRequestChoice({ lang: "ta", drafts: false });
      await pause(4);
      return [currentLang(), words.title, requestChoiceWasSet()];
    });
    const other = serve("hi", async () => { const out: string[] = []; for (let i = 0; i < 8; i++) { out.push(words.title); await pause(1); } return [...new Set(out)]; });
    const third = serve("en", async () => { await pause(5); return [currentLang(), requestChoiceWasSet()]; });
    expect(await action).toEqual(["ta", "இன்று", true]);
    expect(await other).toEqual(["आज"]);
    expect(await third).toEqual(["en", false]);
  });
  it("English source text is put together in English even while a Hindi request is being drawn", async () => {
    const got = await serve("hi", async () => { await pause(1); return [inEnglish(() => words.title), words.title]; });
    expect(got).toEqual(["Today", "आज"]);
  });
  it("a language set by hand for a job is not changed by a request around it, and the other way round", async () => {
    const job = withLang({ lang: "ta", drafts: false }, async () => { await pause(2); return words.title; });
    const page = serve("hi", async () => { await pause(1); return words.title; });
    expect([await job, await page]).toEqual(["இன்று", "आज"]);
  });
});

describe("a header that asks for drafts", () => {
  it("is refused in production, whoever wrote it", () => {
    expect(readChoice("hi;drafts", true)).toEqual({ lang: "hi", drafts: false });
    expect(readChoice("hi;drafts", false)).toEqual({ lang: "hi", drafts: true });
    expect(readChoice("hi;drafts;x", true)).toEqual({ lang: "hi", drafts: false });
    expect(readChoice("<script>", true)).toEqual({ lang: "en", drafts: false });
    expect(readChoice("__proto__", false)).toEqual({ lang: "en", drafts: false });
  });
});

describe("the two builds of a page", () => {
  it("tells them apart by what React gives each: the build for server-only parts has no useEffect", () => {
    const require = createRequire(import.meta.url);
    /* the React that Next.js gives a page, in its two forms */
    expect(typeof (require("next/dist/compiled/react/react.react-server.js") as Record<string, unknown>).useEffect).toBe("undefined");
    expect(typeof (require("next/dist/compiled/react") as Record<string, unknown>).useEffect).toBe("function");
    const pkg = require("react/package.json") as { exports: Record<string, Record<string, string>> };
    expect(pkg.exports["."]["react-server"]).toBeTruthy();
    /* a test runs with the full React, as the browser's parts of a page do */
    expect(browserParts).toBe(true);
  });
  it("draws the browser's parts of a page only from the sentences the browser is given", () => {
    forgetFiles();
    drawAsBrowserParts(true);
    expect(serve("hi", () => [words.title, words.only.server, words.hello("Asha")])).toEqual(["आज", "Drawn on the server only", "नमस्ते Asha"]);
    /* the parts only the server draws use every sentence */
    drawAsBrowserParts(false);
    expect(serve("hi", () => [words.title, words.only.server])).toEqual(["आज", "केवल सर्वर पर"]);
    /* a job or a script that set the language by hand is not a page: it uses every sentence */
    drawAsBrowserParts(true);
    expect(withLang({ lang: "hi", drafts: false }, () => words.only.server)).toBe("केवल सर्वर पर");
    drawAsBrowserParts(undefined);
  });
  it("both builds, drawing two requests at once, keep their own language and their own set", async () => {
    forgetFiles();
    drawAsBrowserParts(true);
    const [a, b] = await Promise.all([
      serve("hi", async () => { await pause(2); return [words.title, words.only.server]; }),
      serve("ta", async () => { await pause(1); return [words.title, words.only.server]; }),
    ]);
    drawAsBrowserParts(undefined);
    expect(a).toEqual(["आज", "Drawn on the server only"]);
    expect(b).toEqual(["இன்று", "Drawn on the server only"]);
  });
});
