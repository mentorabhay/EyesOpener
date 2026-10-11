// Eyes Opener: The translation files in the repository, read against the English as it is now.
/**
 * The translation files in the repository, read against the English as it is now.
 *
 * What this enforces for every entry the app could show (its key is asked for and its mark is current), machine
 * draft or reviewed: the same placeholders, the same numbers in the digits 0 to 9, the same units, the product's
 * name and the names of games and exercises as they are, the same links, and no word too long for a game scene.
 * An entry that fails is a fault in the repository, not only something the app would skip.
 *
 * It also checks the list of English sentences (translations/manifest.json), which the staff's counts and every
 * template depend on. When it is older than the words in the code: `npx tsx scripts/i18n.ts count --write`.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { clientListOf } from "../../scripts/i18n/client";
import { charsOf, extract, notAWord, type Extract } from "../../scripts/i18n/extract";
import { listFiles, readFile } from "../../scripts/i18n/files";
import { keptNames, missingNames } from "../../scripts/i18n/names";
import { faultsOf, manifestOf, sameManifest } from "../../scripts/i18n/report";
import { isSourceFile } from "../../scripts/i18n/sources";
import { sentToBrowser, type ClientList } from "./client-list";
import { TRANSLATED } from "./languages";
import { mark } from "./mark";
import type { Manifest } from "./progress";
import { placeholders } from "./template";

const root = path.resolve(__dirname, "../.."), dir = path.join(root, "translations");
let x: Extract, names: string[], client: ClientList | null;
/* both readings of the source take the TypeScript compiler a while: done once, with room */
beforeAll(async () => { x = await extract(root); names = await keptNames(); client = clientListOf(root, isSourceFile); }, 240_000);

describe("the list of English sentences", () => {
  it("finds the app's words: thousands of sentences, each with a key, a mark and where it is from", () => {
    expect(x.units.length).toBeGreaterThan(5000);
    expect(charsOf(x.units)).toBeGreaterThan(200_000);
    const keys = new Set(x.units.map((u) => `${u.file}|${u.key}`));
    expect(keys.size).toBe(x.units.length);
    for (const u of x.units) {
      expect(u.source).toBe(mark(u.english));
      expect(u.english.trim()).not.toBe("");
      expect(u.note).toContain("src/");
    }
  });
  it("covers the app shell, a guide and a game's words", () => {
    const has = (file: string, key: string) => x.units.some((u) => u.file === file && u.key === key);
    expect(has("copy/common", "common.nav.today")).toBe(true);
    expect(has("copy/today", "today.title")).toBe(true);
    expect(has("data/guides/convergence", "brock-string.what")).toBe(true);
    expect(has("data/guides/convergence", "brock-string.steps.0")).toBe(true);
    expect(has("data/game-guides/verg", "tunnel-glide.cues.0.title")).toBe(true);
    /* values the code uses are not words */
    expect(has("data/guides/convergence", "brock-string.slug")).toBe(false);
    expect(has("data/guides/convergence", "brock-string.sources.0.url")).toBe(false);
    expect(has("data/guides/convergence", "brock-string.measures.0.key")).toBe(false);
  });
  it("turns a copy function into templates whose placeholders are its parameters", () => {
    const templates = x.units.filter((u) => u.kind === "template");
    expect(templates.length).toBeGreaterThan(300);
    for (const u of templates) {
      expect(u.key).toMatch(/\(.*\*.*\)$/);
      for (const p of placeholders(u.english)) expect(u.params, `${u.file} ${u.key}`).toContain(p.split(".")[0]);
    }
  });
  it("never leaves a choice between fixed words open in a template", () => {
    /* settings.eye.lens takes "left" | "right": one entry for each, and no open template */
    const lens = x.units.filter((u) => u.file === "copy/settings" && u.key.startsWith("settings.eye.lens("));
    expect(lens.map((u) => u.key).sort()).toEqual(["settings.eye.lens(left)", "settings.eye.lens(right)"]);
    expect(lens.every((u) => u.kind === "fixed" && !/\{/.test(u.english))).toBe(true);
  });
  it("tells a word from a value for the code", () => {
    expect(notAWord("title", "Today")).toBeNull();
    expect(notAWord("unit", "prism dioptres")).toBeNull();
    expect(notAWord("email", "Your counsellor's email")).toBeNull();
    expect(notAWord("minUnit", "min")).toBeNull();
    expect(notAWord("href", "/together/experiments")).not.toBeNull();
    expect(notAWord("url", "https://pubmed.ncbi.nlm.nih.gov/1/")).not.toBeNull();
    expect(notAWord("id", "bird-wire")).not.toBeNull();
    expect(notAWord("tone", "ok")).not.toBeNull();
    expect(notAWord("none", "–")).not.toBeNull();
    expect(notAWord("x", "needs_consent")).not.toBeNull();
  });
  it("is written down in translations/manifest.json, and that file is not older than the words", () => {
    const at = path.join(dir, "manifest.json");
    expect(existsSync(at), "run: npx tsx scripts/i18n.ts count --write").toBe(true);
    const had = JSON.parse(readFileSync(at, "utf8")) as Manifest;
    const now = manifestOf(x, had.made, client);
    expect(JSON.stringify(had.files) === JSON.stringify(now.files), "the words changed: run npx tsx scripts/i18n.ts count --write").toBe(true);
    /* which sentences the browser is given (src/i18n/client-list.ts) is part of the list, and must follow the code too */
    expect(had.client, "the browser's own code reads other words than the list says: run npx tsx scripts/i18n.ts count --write").toEqual(now.client);
    expect(sameManifest(had, now)).toBe(true);
  });
  it("sends a browser only a small part of the words, and never a file only the server draws", () => {
    const had = JSON.parse(readFileSync(path.join(dir, "manifest.json"), "utf8")) as Manifest;
    expect(had.client).toBeTruthy();
    expect(had.sent!.units).toBeGreaterThan(500);
    expect(had.sent!.chars).toBeLessThan(charsOf(x.units) / 2);
    /* Today is drawn on the server; the language menu and a game's words run in the browser */
    expect(sentToBrowser(had.client, "copy/today", "today.title")).toBe(false);
    expect(sentToBrowser(had.client, "copy/languages", "languages.choose.go")).toBe(true);
    expect(sentToBrowser(had.client, "copy/languages", "languages.staff.title")).toBe(false);
    expect(sentToBrowser(had.client, "copy/games-verg", "games.split")).toBe(true);
  });
});

describe("the translation files", () => {
  it("keep every placeholder, number, unit and name of the English, in every language", () => {
    for (const lang of TRANSLATED) {
      const { shown } = faultsOf(lang, dir, x.units, names);
      expect(shown.map((f) => `${f.lang}/${f.file} ${f.key}: ${f.what}`)).toEqual([]);
    }
  });
  it("carry no template of their own: every key with an open place is one the list has", () => {
    const listed = new Set(x.units.map((u) => `${u.file}|${u.key}`));
    for (const lang of TRANSLATED) for (const file of listFiles(dir, lang)) {
      for (const key of Object.keys(readFile(dir, lang, file).entries)) if (/\*/.test(key)) expect(listed.has(`${file}|${key}`), `${lang}/${file} ${key}`).toBe(true);
    }
  });
  it("mark every entry as a machine draft or as reviewed, and say where a reviewed one came from", () => {
    for (const lang of TRANSLATED) for (const file of listFiles(dir, lang)) {
      for (const [key, e] of Object.entries(readFile(dir, lang, file).entries)) {
        expect(["machine", "reviewed"], `${lang}/${file} ${key}`).toContain(e.status);
        if (e.status === "reviewed") expect(e.reviewed, `${lang}/${file} ${key}: a reviewed entry names its reviewer and the day`).toBeTruthy();
      }
    }
  });
});

describe("what may not be in the repository", () => {
  it("no pretend translation and no layout sample: they are for a development server and are removed after the look", () => {
    for (const lang of TRANSLATED) for (const file of listFiles(dir, lang)) {
      for (const [key, e] of Object.entries(readFile(dir, lang, file).entries)) {
        expect(e.made ?? "", `${lang}/${file} ${key}`).not.toMatch(/pretend|layout sample/i);
        expect(e.reviewed ?? "", `${lang}/${file} ${key}`).not.toMatch(/pretend/i);
        expect(e.english, `${lang}/${file} ${key}: an entry keeps the English it was made from`).toBeTruthy();
      }
    }
  });
});

describe("names that stay in English letters", () => {
  it("are the names of the games and exercises of this edition", () => {
    expect(names).toContain("Tunnel Glide");
    expect(names).toContain("Brock String");
  });
  it("must be in the translation letter for letter, as often as in the English", () => {
    expect(missingNames("Play Tunnel Glide after the Brock String.", "Brock String के बाद Tunnel Glide खेलें।", names)).toEqual([]);
    expect(missingNames("Play Tunnel Glide after the Brock String.", "ब्रॉक स्ट्रिंग के बाद टनल ग्लाइड खेलें।", names).sort()).toEqual(["Brock String", "Tunnel Glide"]);
    expect(missingNames("Hold the string.", "डोरी पकड़ें।", names)).toEqual([]);
  });
});
