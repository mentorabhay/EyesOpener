/**
 * What happens if Next.js ever stops handing this package the request (see next.test.ts for the check that
 * catches that before a release): nothing throws, every word is English, and the root layout draws the whole
 * page in English and says in the log that the language could not be read. Never half a page in each language.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ storage: undefined as unknown, header: "hi" as string | null }));
vi.mock("next/dist/server/app-render/work-unit-async-storage.external", () => ({ get workUnitAsyncStorage() { return h.storage; } }));
vi.mock("next/headers", () => ({ headers: async () => ({ get: (name: string) => (name === "x-io-lang" ? h.header : null) }), cookies: async () => ({ get: () => undefined }) }));
vi.mock("./watch", () => ({ LanguageWatch: () => null }));
vi.mock("./languages.css", () => ({}));

import { pageLanguage } from "./html";
import { mark } from "./mark";
import { current, readTranslationsFrom, requestChoiceWasSet, say, setRequestChoice } from "./runtime";
import { texts } from "./texts";

const words = texts("test/broken", "words", () => ({ title: "Today", hello: (name: string) => `Hello ${name}` }));
let dir = "";
beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), "io-lang-broken-"));
  mkdirSync(path.join(dir, "hi", "test"), { recursive: true });
  writeFileSync(path.join(dir, "hi", "test", "broken.json"), JSON.stringify({ lang: "hi", file: "test/broken", entries: { "words.title": { source: mark("Today"), text: "आज", status: "reviewed" } } }));
  readTranslationsFrom(dir);
});
afterAll(() => { readTranslationsFrom(undefined); rmSync(dir, { recursive: true, force: true }); });
beforeEach(() => { h.storage = undefined; h.header = "hi"; });

/** Every way the store could come back wrong after a change inside Next.js. */
const broken: [string, unknown][] = [
  ["the store is gone", undefined],
  ["the store is something else", "not a store"],
  ["asking the store throws", { getStore: () => { throw new Error("moved"); } }],
  ["the store gives nothing", { getStore: () => undefined }],
  ["a request has another name", { getStore: () => ({ type: "page-request", headers: new Headers({ "x-io-lang": "hi" }) }) }],
  ["a request has no headers", { getStore: () => ({ type: "request" }) }],
  ["the headers cannot be read", { getStore: () => ({ type: "request", headers: { get: () => { throw new Error("changed"); } } }) }],
  ["the headers give something that is not text", { getStore: () => ({ type: "request", headers: { get: () => ({ lang: "hi" }) } }) }],
];

describe("when Next.js no longer hands over the request", () => {
  for (const [name, storage] of broken) {
    it(`${name}: nothing throws and every word is English`, () => {
      h.storage = storage;
      expect(current()).toEqual({ lang: "en", drafts: false });
      expect(words.title).toBe("Today");
      expect(words.hello("Asha")).toBe("Hello Asha");
      expect(say("test/broken", "words.title", "Today")).toBe("Today");
      expect(() => setRequestChoice({ lang: "hi", drafts: false })).not.toThrow();
      expect(requestChoiceWasSet()).toBe(false);
    });
  }
  it("the root layout draws the whole page in English and says so, rather than half in each language", async () => {
    const said = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const l = await pageLanguage();
    expect(l).toMatchObject({ lang: "en", drafts: false, tag: "en-IN", dir: "ltr", script: "latin", words: null });
    expect(said).toHaveBeenCalledTimes(1);
    expect(String(said.mock.calls[0][0])).toContain("Drawing this page in English");
    said.mockRestore();
  });
  it("and says nothing when the request asked for English anyway", async () => {
    h.header = null;
    const said = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect((await pageLanguage()).lang).toBe("en");
    expect(said).not.toHaveBeenCalled();
    said.mockRestore();
  });
});

describe("when it works", () => {
  it("the same words come back in the request's language, and the layout agrees", async () => {
    h.storage = { getStore: () => ({ type: "request", headers: new Headers({ "x-io-lang": "hi" }) }) };
    expect(words.title).toBe("आज");
    const l = await pageLanguage();
    expect(l).toMatchObject({ lang: "hi", tag: "hi-IN", dir: "ltr", script: "devanagari" });
    expect(l.words).toMatch(/^\/lang\/words\/hi\/[0-9a-f]+$/);
  });
});
