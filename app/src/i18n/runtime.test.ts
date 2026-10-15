/**
 * The strict rule and the wrapper, end to end, against translation files in a folder made for the test.
 * Nothing here needs Next.js: the language is set with `withLang`, as a job or a script would.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Lang } from "./languages";
import { mark } from "./mark";
import { callKeys, current, currentLang, earlyReads, forDirection, forgetFiles, holdFile, inEnglish, say, readTranslationsFrom, watchEarlyReads, withLang, type Miss, type Scope } from "./runtime";
import { allSources, english, joined, texts, textsEach } from "./texts";

type E = { source: string; text: string; status: "machine" | "reviewed"; params?: string[] };
let dir = "";
function put(lang: Lang, file: string, entries: Record<string, E>) {
  const at = path.join(dir, lang, `${file}.json`);
  mkdirSync(path.dirname(at), { recursive: true });
  writeFileSync(at, JSON.stringify({ lang, file, entries }));
  forgetFiles();
}
const hi = <T>(fn: () => T, over: Partial<Scope> = {}) => withLang({ lang: "hi", drafts: false, ...over }, fn);

/** A small file of words with every kind of entry the app has. */
const demo = texts("test/demo", "demo", () => ({
  title: "Today",
  dose: "Play for 20 minutes.",
  nav: { home: "Home", away: "Away" },
  list: ["One", "Two", "Three"],
  rows: [{ name: "First", n: 1 }, { name: "Second", n: 2 }],
  count: 3,
  switchTo: (name: string) => `Switch to ${name}`,
  minutes: (n: number) => (n ? `${n} minutes` : "No training minutes"),
  lens: (cyan: "left" | "right") => `Cyan lens over the ${cyan} eye, red lens over the ${cyan === "left" ? "right" : "left"} eye`,
  mm: (cm: number) => `${(cm * 10).toFixed(1)} mm`,
  next: (n: number) => `${n + 1} of 5`,
  cover: (eye: "L" | "R") => ({ lead: eye === "L" ? "Cover the right eye." : "Cover the left eye.", rest: " Keep both eyes open." }),
  line: (kind: string, age: number | null) => `${kind}, ${age === null ? "age not given" : `age ${age}`}`,
}));

beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), "io-lang-"));
  readTranslationsFrom(dir);
  put("hi", "test/demo", {
    "demo.title": { source: mark("Today"), text: "आज", status: "reviewed" },
    "demo.dose": { source: mark("Play for 20 minutes."), text: "20 मिनट खेलें।", status: "reviewed" },
    "demo.nav.home": { source: mark("Home"), text: "घर", status: "machine" },
    "demo.nav.away": { source: mark("Away from home"), text: "बाहर", status: "reviewed" },
    "demo.list.0": { source: mark("One"), text: "एक", status: "reviewed" },
    "demo.list.2": { source: mark("Three"), text: "तीन", status: "reviewed" },
    "demo.rows.1.name": { source: mark("Second"), text: "दूसरा", status: "reviewed" },
    "demo.gone": { source: mark("Gone"), text: "गया", status: "reviewed" },
    "demo.switchTo(*)": { source: mark("Switch to {name}"), text: "{name} पर जाएँ", status: "reviewed", params: ["name"] },
    "demo.minutes(*)": { source: mark("{n} minutes"), text: "{n} मिनट", status: "reviewed", params: ["n"] },
    "demo.minutes(0)": { source: mark("No training minutes"), text: "अभ्यास के मिनट नहीं", status: "reviewed" },
    "demo.lens(left)": { source: mark("Cyan lens over the left eye, red lens over the right eye"), text: "सियान लेंस बाईं आँख पर, लाल लेंस दाईं आँख पर", status: "reviewed" },
    /* a template that was wrongly made for a function with a choice in it */
    "demo.lens(*)": { source: mark("Cyan lens over the {cyan} eye, red lens over the left eye"), text: "सियान लेंस {cyan} आँख पर", status: "reviewed", params: ["cyan"] },
    "demo.next(*)": { source: mark("{n}1 of 5"), text: "5 में से {n}1", status: "reviewed", params: ["n"] },
    "demo.cover(L).lead": { source: mark("Cover the right eye."), text: "दाईं आँख ढकें।", status: "reviewed" },
    "demo.cover(L).rest": { source: mark(" Keep both eyes open."), text: " दोनों आँखें खुली रखें।", status: "reviewed" },
    "demo.line(*,*)": { source: mark("{kind}, age {age}"), text: "{kind}, उम्र {age}", status: "reviewed", params: ["kind", "age"] },
    "demo.line(*,null)": { source: mark("{kind}, age not given"), text: "{kind}, उम्र नहीं बताई", status: "reviewed", params: ["kind", "age"] },
  });
  put("ur", "test/demo", { "demo.title": { source: mark("Today"), text: "آج", status: "reviewed" } });
  /* The list of English sentences, as the extractor would write it. It has no "demo.lens(*)": the extractor makes
     no open template for a parameter that takes one of a few fixed words. */
  writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ made: "2026-10-05", units: 0, chars: 0, files: { "test/demo": {
    "demo.switchTo(*)": mark("Switch to {name}"), "demo.minutes(*)": mark("{n} minutes"), "demo.next(*)": mark("{n}1 of 5"),
    "demo.line(*,*)": mark("{kind}, age {age}"), "demo.line(*,null)": mark("{kind}, age not given"),
  } } }));
  forgetFiles();
});
afterAll(() => { readTranslationsFrom(undefined); rmSync(dir, { recursive: true, force: true }); });

describe("a file of words in English", () => {
  it("reads exactly as the object it was made from", () => {
    expect(currentLang()).toBe("en");
    expect(demo.title).toBe("Today");
    expect(demo.switchTo("Aarav")).toBe("Switch to Aarav");
    expect(demo.minutes(0)).toBe("No training minutes");
    expect(demo.cover("L")).toEqual({ lead: "Cover the right eye.", rest: " Keep both eyes open." });
    expect(demo.count).toBe(3);
    expect(JSON.parse(JSON.stringify(demo.nav))).toEqual({ home: "Home", away: "Away" });
    expect(Object.keys(demo.nav)).toEqual(["home", "away"]);
    expect(Array.isArray(demo.list)).toBe(true);
    expect(demo.list.map((x) => x.toLowerCase())).toEqual(["one", "two", "three"]);
    expect([...demo.list]).toEqual(["One", "Two", "Three"]);
    expect(demo.list.length).toBe(3);
    expect({ ...demo.nav }).toEqual({ home: "Home", away: "Away" });
    expect("home" in demo.nav).toBe(true);
  });
  it("hands back the same object and the same function each time", () => {
    expect(demo.nav).toBe(demo.nav);
    expect(demo.switchTo).toBe(demo.switchTo);
    expect(demo.rows[0]).toBe(demo.rows[0]);
    expect(demo.switchTo.length).toBe(1);
  });
  it("is listed as a source, with its English kept", () => {
    const s = allSources().find((x) => x.file === "test/demo" && x.name === "demo");
    expect((s?.value as { title: string }).title).toBe("Today");
    expect(english(demo.nav).home).toBe("Home");
  });
});

describe("the strict rule", () => {
  it("shows a reviewed translation of the English as it is now", () => {
    expect(hi(() => demo.title)).toBe("आज");
    expect(hi(() => demo.dose)).toBe("20 मिनट खेलें।");
    expect(hi(() => demo.list.map((x) => x))).toEqual(["एक", "Two", "तीन"]);
    expect(hi(() => demo.rows[1].name)).toBe("दूसरा");
    expect(hi(() => demo.rows[1].n)).toBe(2);
  });
  it("shows English where there is no entry", () => {
    const missed: [string, Miss][] = [];
    expect(hi(() => demo.list[1], { onMiss: (_f, key, why) => missed.push([key, why]) })).toBe("Two");
    expect(missed).toEqual([["demo.list.1", "none"]]);
  });
  it("shows English for a machine draft, unless drafts were asked for", () => {
    const missed: Miss[] = [];
    expect(hi(() => demo.nav.home, { onMiss: (_f, _k, why) => missed.push(why) })).toBe("Home");
    expect(missed).toEqual(["draft"]);
    expect(hi(() => demo.nav.home, { drafts: true })).toBe("घर");
  });
  it("shows English when the English has changed since the translation was made", () => {
    const missed: Miss[] = [];
    expect(hi(() => demo.nav.away, { onMiss: (_f, _k, why) => missed.push(why) })).toBe("Away");
    expect(missed).toEqual(["stale"]);
  });
  it("never reads an entry under a key the app does not ask for", () => {
    expect(hi(() => JSON.stringify(demo))).not.toContain("गया");
  });
  it("shows English when a number, a unit or a placeholder was changed, even in a reviewed entry", () => {
    const strict = texts("test/strict", "strict", () => ({ dose: "Play for 20 minutes.", far: "Sit 40 cm away.", who: "Hello {name}", brand: "Eyes Opener is free." }));
    put("hi", "test/strict", {
      "strict.dose": { source: mark("Play for 20 minutes."), text: "20 घंटे खेलें।", status: "reviewed" },
      "strict.far": { source: mark("Sit 40 cm away."), text: "400 cm दूर बैठें।", status: "reviewed" },
      "strict.who": { source: mark("Hello {name}"), text: "नमस्ते", status: "reviewed" },
      "strict.brand": { source: mark("Eyes Opener is free."), text: "आईओपनर मुफ़्त है।", status: "reviewed" },
    });
    const missed: Miss[] = [];
    const out = hi(() => [strict.dose, strict.far, strict.who, strict.brand], { onMiss: (_f, _k, why) => missed.push(why) });
    expect(out).toEqual(["Play for 20 minutes.", "Sit 40 cm away.", "Hello {name}", "Eyes Opener is free."]);
    expect(missed).toEqual(["check", "check", "check", "check"]);
  });
  it("leaves out a misshapen entry or a file that says it is another file", () => {
    expect(holdFile({ lang: "hi", file: "a/b", entries: { k: { source: "x", text: "y", status: "reviewed" }, bad: { source: 1, text: "y", status: "reviewed" }, odd: { source: "x", text: "y", status: "approved" }, empty: { source: "x", text: " ", status: "reviewed" } } }, "hi", "a/b"))
      .toEqual({ k: { s: "x", t: "y", r: true } });
    expect(holdFile({ lang: "ta", file: "a/b", entries: {} }, "hi", "a/b")).toBeNull();
    expect(holdFile({ lang: "hi", file: "a/c", entries: {} }, "hi", "a/b")).toBeNull();
    expect(holdFile("nonsense", "hi", "a/b")).toBeNull();
  });
  it("reads no file outside the folder, whatever a key says", () => {
    const odd = texts("../../etc/passwd", "x", () => ({ a: "A" }));
    expect(hi(() => odd.a)).toBe("A");
  });
});

describe("a copy function", () => {
  it("fills the translated template with the real values", () => {
    expect(hi(() => demo.switchTo("Aarav"))).toBe("Aarav पर जाएँ");
    expect(hi(() => demo.minutes(45))).toBe("45 मिनट");
  });
  it("uses the entry made for a fixed value before the general one", () => {
    expect(hi(() => demo.minutes(0))).toBe("अभ्यास के मिनट नहीं");
    expect(hi(() => demo.lens("left"))).toBe("सियान लेंस बाईं आँख पर, लाल लेंस दाईं आँख पर");
    expect(hi(() => demo.line("Child", null))).toBe("Child, उम्र नहीं बताई");
    expect(hi(() => demo.line("Child", 6))).toBe("Child, उम्र 6");
  });
  it("never uses a template the list of English sentences does not have", () => {
    /* The file carries a template for lens(*). For "right" it would even pass the proof below, and would write the
       English word "right" into a Hindi sentence. It is not in the list, so it is never read. */
    expect(hi(() => demo.lens("right"))).toBe("Cyan lens over the right eye, red lens over the left eye");
  });
  it("shows English when the template is not this function for these values: the proof fails", () => {
    /* a sum was taken for a place to write the number in */
    expect(hi(() => demo.next(3))).toBe("4 of 5");
  });
  it("shows English for a function that works on its value", () => {
    expect(hi(() => demo.mm(0.69))).toBe("6.9 mm");
  });
  it("looks up each sentence of an object a function gives back, under the values it was called with", () => {
    expect(hi(() => { const c = demo.cover("L"); return c.lead + c.rest; })).toBe("दाईं आँख ढकें। दोनों आँखें खुली रखें।");
    expect(hi(() => { const c = demo.cover("R"); return c.lead + c.rest; })).toBe("Cover the left eye. Keep both eyes open.");
  });
  it("lists the keys a call may be translated under, most exact first", () => {
    expect(callKeys("f", ["left", 3]).map((k) => k.key)).toEqual(["f(left,3)", "f(*,3)", "f(left,*)", "f(*,*)"]);
    expect(callKeys("f", []).map((k) => k.key)).toEqual(["f()"]);
    /* a value that is not short and plain can only be open */
    expect(callKeys("f", ["a, b (c)"]).map((k) => k.key)).toEqual(["f(*)"]);
    expect(callKeys("f", [1, 2, 3, 4, 5, 6])).toEqual([]);
  });
});

describe("right to left", () => {
  const LRI = "\u2066", PDI = "\u2069";
  it("holds a number and its Latin unit together inside an Urdu sentence, so a dose never reads backwards", () => {
    expect(forDirection("ناک سے 40 cm دور رکھیں۔", "ur", true)).toBe(`ناک سے ${LRI}40 cm${PDI} دور رکھیں۔`);
    expect(forDirection("کنٹراسٹ 15% ہے، 20 منٹ۔", "ur", true)).toBe("کنٹراسٹ 15% ہے، 20 منٹ۔");
    expect(forDirection("6.9 mm اور 2 m", "ur", true)).toBe(`\u200F${LRI}6.9 mm${PDI} اور ${LRI}2 m${PDI}`);
  });
  it("marks a translated sentence that begins with a Latin name as right-to-left text", () => {
    expect(forDirection("Eyes Opener کوئی طبی آلہ نہیں ہے۔", "ur", true)).toBe("\u200FEyes Opener کوئی طبی آلہ نہیں ہے۔");
    expect(forDirection("آج", "ur", true)).toBe("آج");
    /* a sentence that opens with a measure: its first letter is the Latin unit */
    expect(forDirection("40 cm دور", "ur", true)).toBe(`\u200F${LRI}40 cm${PDI} دور`);
  });
  it("holds an English sentence together when it is shown in an Urdu page", () => {
    expect(forDirection("Today's practice is done.", "ur", false)).toBe(`${LRI}Today's practice is done.${PDI}`);
    expect(forDirection("48", "ur", false)).toBe("48");
  });
  it("changes nothing in a language written left to right", () => {
    expect(forDirection("नाक से 40 cm दूर रखें।", "hi", true)).toBe("नाक से 40 cm दूर रखें।");
    expect(forDirection("Today", "hi", false)).toBe("Today");
    expect(forDirection("Today", "en", false)).toBe("Today");
  });
  it("is applied to what a page reads", () => {
    const ur = <T,>(fn: () => T) => withLang({ lang: "ur", drafts: false }, fn);
    expect(ur(() => demo.title)).toBe("آج");
    expect(ur(() => demo.dose)).toBe(`${LRI}Play for 20 minutes.${PDI}`);
    expect(ur(() => demo.switchTo("Aarav"))).toBe(`${LRI}Switch to Aarav${PDI}`);
  });
});

describe("one language at a time", () => {
  it("keeps two languages apart while both are being worked on", async () => {
    const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const draw = (lang: Lang, ms: number) => withLang({ lang, drafts: false }, async () => {
      const seen: string[] = [];
      for (let i = 0; i < 6; i++) { seen.push(demo.title); await pause(ms); }
      return [...new Set(seen)];
    });
    const [a, b, c] = await Promise.all([draw("hi", 3), draw("en", 2), draw("ur", 1)]);
    expect(a).toEqual(["आज"]);
    expect(b).toEqual(["Today"]);
    expect(c).toEqual(["آج"]);
    expect(currentLang()).toBe("en");
  });
  it("answers in English inside `inEnglish`, whatever the language around it", () => {
    expect(hi(() => inEnglish(() => demo.title))).toBe("Today");
    expect(hi(() => english(demo).title)).toBe("Today");
    expect(() => inEnglish(() => Promise.resolve(1))).toThrow();
    expect(current().lang).toBe("en");
  });
  it("builds a file's English in English even when it is first loaded for a Hindi reader", () => {
    const built = hi(() => texts("test/built", "built", () => ({ about: `${demo.title} in the app`, again: demo.switchTo("you") })));
    expect(english(built).about).toBe("Today in the app");
    expect(english(built).again).toBe("Switch to you");
  });
  it("reads a list of items by slug, and several records as one, only when asked", () => {
    const items = textsEach("test/items", () => [{ slug: "brock-string", what: "A string with beads.", code: "x" }], { word: (p) => p[1] === "what" });
    put("hi", "test/items", {
      "brock-string.what": { source: mark("A string with beads."), text: "मनकों वाली डोरी।", status: "reviewed" },
      "brock-string.code": { source: mark("x"), text: "य", status: "reviewed" },
    });
    expect(hi(() => items[0].what)).toBe("मनकों वाली डोरी।");
    /* a field the source says is not a word is never translated, even with an entry */
    expect(hi(() => items[0].code)).toBe("x");
    expect(hi(() => items[0].slug)).toBe("brock-string");
    const both = joined(demo.nav as Record<string, string>, { extra: "Extra" });
    expect(Object.keys(both)).toEqual(["home", "away", "extra"]);
    expect(both.extra).toBe("Extra");
    expect(hi(() => both.home, { drafts: true })).toBe("घर");
    expect(both.home).toBe("Home");
  });
  it("in development, answers in English for a word read while a module loads, and remembers where", async () => {
    watchEarlyReads(true);
    try {
      const got = await withLang({ lang: "hi", drafts: false }, async () => (await import("./test-early")).early);
      expect(got).toBe("Today");
      expect(earlyReads()).toContain("test/demo:demo.title");
      /* the same word read inside a function is translated as usual */
      expect(hi(() => say("test/demo", "demo.title", "Today"))).toBe("आज");
    } finally { watchEarlyReads(false); }
  });
});
