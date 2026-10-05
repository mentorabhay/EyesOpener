/**
 * The browser's set: which sentences are sent to a browser, how that is worked out from the source, and what the
 * script that carries them looks like.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { clientListOf } from "../../scripts/i18n/client";
import { isSourceFile } from "../../scripts/i18n/sources";
import { cleanClientList, sentToBrowser } from "./client-list";
import { clientWords, scriptOf, type Sent } from "./client-words";
import { mark } from "./mark";
import { readTranslationsFrom } from "./runtime";

describe("is a sentence sent to the browser?", () => {
  const list = { "copy/site": ["site.nav", "site.say"], "copy/train": true } as const;
  it("yes for a listed prefix and everything that continues it with a dot or a bracket", () => {
    expect(sentToBrowser(list, "copy/site", "site.nav")).toBe(true);
    expect(sentToBrowser(list, "copy/site", "site.nav.signIn")).toBe(true);
    expect(sentToBrowser(list, "copy/site", "site.nav.links.0.label")).toBe(true);
    expect(sentToBrowser(list, "copy/site", "site.say(*)")).toBe(true);
    expect(sentToBrowser(list, "copy/site", "site.say(left).lead")).toBe(true);
    expect(sentToBrowser(list, "copy/train", "anything.at.all")).toBe(true);
  });
  it("no for a neighbour whose name only starts the same way, for another part of the file, and for a file that is not listed", () => {
    expect(sentToBrowser(list, "copy/site", "site.navigation.title")).toBe(false);
    expect(sentToBrowser(list, "copy/site", "site.sayMore")).toBe(false);
    expect(sentToBrowser(list, "copy/site", "site.hero.title")).toBe(false);
    expect(sentToBrowser(list, "copy/admin", "admin.title")).toBe(false);
    expect(sentToBrowser(list, "constructor", "x")).toBe(false);
    expect(sentToBrowser(list, "__proto__", "x")).toBe(false);
  });
  it("everything when there is no list", () => {
    expect(sentToBrowser(null, "copy/admin", "admin.title")).toBe(true);
    expect(sentToBrowser(undefined, "copy/admin", "admin.title")).toBe(true);
  });
  it("a list read from a file counts only when it has the right shape", () => {
    expect(cleanClientList({ "copy/site": ["site.nav"], "copy/train": true })).toEqual({ "copy/site": ["site.nav"], "copy/train": true });
    expect(cleanClientList(null)).toBeNull();
    expect(cleanClientList(["copy/site"])).toBeNull();
    expect(cleanClientList({ "copy/site": "all" })).toBeNull();
    expect(cleanClientList({ "copy/site": [1, 2] })).toBeNull();
    expect(cleanClientList({ "copy/site": false })).toBeNull();
  });
});

describe("working the list out from the source", () => {
  let root = "";
  const file = (name: string, text: string) => { const at = path.join(root, name); mkdirSync(path.dirname(at), { recursive: true }); writeFileSync(at, text); };
  beforeAll(() => {
    root = mkdtempSync(path.join(tmpdir(), "io-lang-client-"));
    file("tsconfig.json", JSON.stringify({ compilerOptions: { baseUrl: ".", paths: { "@/*": ["./src/*"] }, module: "esnext", moduleResolution: "bundler", target: "es2022", strict: true, skipLibCheck: true, types: [] }, include: ["src/**/*"] }));
    file("src/i18n/texts.ts", "export function texts<T>(file: string, name: string, make: () => T): T { void file; void name; return make(); }\nexport function textsEach<T>(file: string, make: () => T[]): T[] { void file; return make(); }\n");
    file("src/copy/site.ts", "import { texts } from \"@/i18n/texts\";\nexport const site = texts(\"copy/site\", \"site\", () => ({ name: \"IOpener\", nav: { signIn: \"Sign in\", open: \"Open\", links: [{ label: \"A\" }] }, hero: { title: \"T\" }, say: (n: string) => `Hi ${n}`, big: { a: \"a\", b: \"b\" }, deep: { one: { two: \"2\" } } }));\n");
    file("src/copy/train.ts", "import { texts } from \"@/i18n/texts\";\nexport const train = texts(\"copy/train\", \"train\", () => ({ title: \"Train\", other: \"Other\" }));\nexport const help: Record<string, string> = texts(\"copy/train\", \"help\", () => ({ a: \"A\" }));\n");
    file("src/copy/admin.ts", "import { texts } from \"@/i18n/texts\";\nexport const admin = texts(\"copy/admin\", \"admin\", () => ({ title: \"Admin\" }));\n");
    file("src/copy/typed.ts", "import { texts } from \"@/i18n/texts\";\nexport type Kind = \"a\" | \"b\";\nexport const typed = texts(\"copy/typed\", \"typed\", () => ({ title: \"Typed\" }));\n");
    file("src/copy/done.ts", "import { texts } from \"@/i18n/texts\";\nexport const done = texts(\"copy/done\", \"done\", () => ({ saved: \"Saved\" }));\n");
    file("src/copy/lazy.ts", "import { texts } from \"@/i18n/texts\";\nexport const lazy = texts(\"copy/lazy\", \"lazy\", () => ({ title: \"Lazy\", sub: \"Sub\" }));\n");
    file("src/data/guides.ts", "import { textsEach } from \"@/i18n/texts\";\nexport const guides = textsEach(\"data/guides\", () => [{ slug: \"x\", what: \"W\" }]);\n");
    file("src/data/unused.ts", "import { textsEach } from \"@/i18n/texts\";\nexport const unused = textsEach(\"data/unused\", () => [{ slug: \"y\", what: \"U\" }]);\n");
    file("src/lib/helper.ts", "import { help, train } from \"@/copy/train\";\nimport { guides } from \"@/data/guides\";\nexport const helper = (slug: string) => [help[slug], train.title.length, guides[0].what];\n");
    file("src/app/actions.ts", "\"use server\";\nimport { done } from \"@/copy/done\";\nexport async function act() { return done.saved; }\n");
    file("src/app/client.ts", "\"use client\";\nimport { site as t } from \"@/copy/site\";\nimport type { Kind } from \"@/copy/typed\";\nimport { helper } from \"@/lib/helper\";\nimport { act } from \"./actions\";\nexport const kind: Kind = \"a\";\nconst d = t.deep;\nexport const a = () => [t.nav.signIn, t.nav.links.filter(Boolean), t.say(\"x\"), t.big, t[\"name\"], d.one.two, helper(\"a\"), act, import(\"@/copy/lazy\").then((m) => m.lazy.title)];\n");
    file("src/app/page.ts", "import { admin } from \"@/copy/admin\";\nimport { site } from \"@/copy/site\";\nimport { unused } from \"@/data/unused\";\nexport const page = () => [admin.title, site.hero.title, unused.length];\n");
  });
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it("lists what the browser's own code reads, as far as the source names each step", () => {
    expect(clientListOf(root, isSourceFile)).toEqual({
      /* a method of every list (`links.filter`) is not a step; an object handed on whole (`t.big`, `t.deep`) covers what is under it */
      "copy/site": ["site.big", "site.deep", "site.name", "site.nav.links", "site.nav.signIn", "site.say"],
      /* a record read by a name the source does not spell out (`help[slug]`) is sent whole */
      "copy/train": ["help", "train.title"],
      /* a file the browser's code loads later (`import(...)`) or takes as a whole (`import * as`) is sent whole */
      "copy/lazy": true,
      /* a list of items is read in ways this cannot follow: all of it */
      "data/guides": true,
    });
  });
  it("leaves out what only the server draws, what is imported for its types only, and what sits behind a server action", () => {
    const list = clientListOf(root, isSourceFile)!;
    for (const f of ["copy/admin", "copy/typed", "copy/done", "data/unused"]) expect(Object.keys(list), f).not.toContain(f);
    expect(sentToBrowser(list, "copy/site", "site.hero.title")).toBe(false);
    expect(sentToBrowser(list, "copy/site", "site.nav.open")).toBe(false);
    expect(sentToBrowser(list, "copy/train", "train.other")).toBe(false);
  });
  it("gives no list at all when a file of words is named in a way the source does not spell out: everything is then sent", () => {
    file("src/copy/odd.ts", "import { texts } from \"@/i18n/texts\";\nconst where = [\"copy\", \"odd\"].join(\"/\");\nexport const odd = texts(where, \"odd\", () => ({ title: \"Odd\" }));\n");
    file("src/app/odd-client.ts", "\"use client\";\nimport { odd } from \"@/copy/odd\";\nexport const b = () => odd.title;\n");
    expect(clientListOf(root, isSourceFile)).toBeNull();
    rmSync(path.join(root, "src/copy/odd.ts")); rmSync(path.join(root, "src/app/odd-client.ts"));
  });
});

describe("the script that carries a language's words to the browser", () => {
  let dir = "";
  const read = (body: string): Sent => {
    const self: { __ioLang?: Sent } = {};
    new Function("self", body)(self);
    return self.__ioLang!;
  };
  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), "io-lang-words-"));
    const put = (f: string, entries: Record<string, unknown>) => { const at = path.join(dir, "hi", `${f}.json`); mkdirSync(path.dirname(at), { recursive: true }); writeFileSync(at, JSON.stringify({ lang: "hi", file: f, entries })); };
    put("copy/site", {
      "site.nav.signIn": { source: mark("Sign in"), text: "साइन इन", status: "reviewed" },
      "site.nav.open": { source: mark("Open"), text: "खोलें", status: "machine" },
      "site.hero.title": { source: mark("T"), text: "शीर्षक", status: "reviewed" },
      "site.say(*)": { source: mark("Hi {n}"), text: "नमस्ते {n}", status: "reviewed", params: ["n"] },
      "site.fake(*)": { source: mark("Bye {n}"), text: "अलविदा {n}", status: "reviewed", params: ["n"] },
    });
    put("copy/admin", { "admin.title": { source: mark("Admin"), text: "प्रबंधन", status: "reviewed" } });
    writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ made: "2026-10-05", units: 0, chars: 0,
      files: { "copy/site": { "site.say(*)": mark("Hi {n}") } }, client: { "copy/site": ["site.nav", "site.say", "site.fake"] } }));
    readTranslationsFrom(dir);
  });
  afterAll(() => { readTranslationsFrom(undefined); rmSync(dir, { recursive: true, force: true }); });

  it("holds only reviewed sentences of the browser's set, each with the mark of its English", () => {
    const sent = read(clientWords("hi", false).body);
    expect(sent.lang).toBe("hi");
    expect(sent.drafts).toBe(false);
    expect(sent.dir).toBe("ltr");
    expect(sent.files).toEqual({ "copy/site": { "site.nav.signIn": [mark("Sign in"), "साइन इन"], "site.say(*)": [mark("Hi {n}"), "नमस्ते {n}", ["n"]] } });
  });
  it("adds machine drafts only when they are asked for, and never a sentence outside the browser's set", () => {
    const sent = read(clientWords("hi", true).body);
    expect(Object.keys(sent.files["copy/site"]).sort()).toEqual(["site.nav.open", "site.nav.signIn", "site.say(*)"]);
    expect(sent.files["copy/admin"]).toBeUndefined();
    expect(JSON.stringify(sent)).not.toContain("शीर्षक");
  });
  it("never carries a template the list of English sentences does not have", () => {
    expect(JSON.stringify(read(clientWords("hi", true).body))).not.toContain("site.fake");
  });
  it("has a version that changes with its content, and is empty for English", () => {
    const a = clientWords("hi", false), b = clientWords("hi", true);
    expect(a.version).toMatch(/^[0-9a-f]{14}$/);
    expect(a.version).not.toBe(b.version);
    expect(clientWords("en", false)).toEqual({ body: "", version: "0" });
  });
  it("sends everything a person reviewed when there is no list of the browser's set", () => {
    writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ made: "2026-10-06", units: 0, chars: 0, files: { "copy/site": { "site.say(*)": mark("Hi {n}") } } }));
    readTranslationsFrom(dir);
    const sent = read(clientWords("hi", false).body);
    expect(Object.keys(sent.files).sort()).toEqual(["copy/admin", "copy/site"]);
    expect(Object.keys(sent.files["copy/site"]).sort()).toEqual(["site.hero.title", "site.nav.signIn", "site.say(*)"]);
  });
  it("cannot be turned into code by anything a key or a sentence holds", () => {
    const hostile: Sent = { lang: "hi", drafts: false, dir: "ltr", files: { "copy/x": {
      "x.a": ["m", "</script><script>self.hacked=1</script>"],
      "x.b": ["m", "\"); self.hacked = 1; (\""],
      "x.c": ["m", "line\u2028break\u2029s and a back\\slash and ${self.hacked = 1}"],
      "x.d\"]});self.hacked=1;//": ["m", "key"],
    } } };
    /* a key named like the prototype, as a translation file could hold one */
    Object.defineProperty(hostile.files["copy/x"], "__proto__", { value: ["m", "polluted"], enumerable: true, configurable: true, writable: true });
    const body = scriptOf(hostile);
    expect(body).not.toContain("</script");
    expect(body).not.toMatch(/[\u2028\u2029]/);
    const self: { __ioLang?: Sent; hacked?: number } = {};
    new Function("self", body)(self);
    expect(self.hacked).toBeUndefined();
    expect(self.__ioLang!.files["copy/x"]["x.a"][1]).toBe("</script><script>self.hacked=1</script>");
    expect(self.__ioLang!.files["copy/x"]["x.c"][1]).toBe("line\u2028break\u2029s and a back\\slash and ${self.hacked = 1}");
    /* a key named like the prototype is just a key: nothing else gains a field */
    expect(Object.prototype.hasOwnProperty.call(self.__ioLang!.files["copy/x"], "__proto__")).toBe(true);
    expect(({} as Record<string, unknown>)[0]).toBeUndefined();
    expect(Array.isArray(Object.getPrototypeOf(self.__ioLang!.files["copy/x"]))).toBe(false);
  });
});
