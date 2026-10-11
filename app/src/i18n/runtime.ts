// Eyes Opener: Which language a piece of text is wanted in right now, and the translated text if there is a usable one.
/**
 * Which language a piece of text is wanted in right now, and the translated text if there is a usable one.
 * This file runs in three places and behaves the same in each: while the server draws a page, while the server
 * draws the first picture of a browser component, and in the browser. docs/LANGUAGES.md explains the whole design.
 *
 * The language of a request is decided once, before anything is drawn (src/proxy.ts, with the rules of
 * src/i18n/decide.ts), and travels with the request in a header. It is read here from the request that Next.js is
 * serving at this moment, so two requests drawn at the same time each get their own language and nothing is
 * shared between them. In the browser the language is the one the page was loaded in, with its words
 * (window.__ioLang, set by a script that runs before the page comes alive).
 *
 * The strict rule: a translation is used only when all of these hold. Otherwise the English text is returned.
 *   - an entry exists under exactly this key (an entry under a key the app does not ask for is never read)
 *   - a person has reviewed it; a machine draft is used only where drafts were asked for, which production refuses
 *   - it carries the mark of the English text as it is now (src/i18n/mark.ts)
 *   - its placeholders, numbers, units and fixed names are those of the English (src/i18n/check.ts)
 *   - for a part of a page that also runs in the browser: it is one of the sentences the browser is given
 *     (src/i18n/client-list.ts), so the server's first picture of that part and the browser's are the same
 *
 * The request is read from inside Next.js (the import below is not part of its public interface; nothing public
 * can tell a piece of code, without waiting, which request it is running for). If a later version of Next.js
 * moves or changes it, nothing here throws: every lookup answers in English, the root layout notices that the
 * request asked for another language and says so in the log (src/i18n/html.tsx), and src/i18n/next.test.ts fails.
 */
import { workUnitAsyncStorage } from "next/dist/server/app-render/work-unit-async-storage.external";
import { problems } from "./check";
import { cleanClientList, sentToBrowser, type ClientList } from "./client-list";
import { browserParts } from "./layer";
import { isLang, SOURCE, type Lang } from "./languages";
import { mark } from "./mark";
import { fill, templateOf, type Fixed } from "./template";

/** The header the proxy sets on every request: "hi", or "hi;drafts" where machine drafts were asked for. */
export const LANG_HEADER = "x-io-lang";

/** One translated sentence as it is kept in memory. */
export interface Held {
  /** The mark of the English it was made from. */
  s: string;
  /** The translation. */
  t: string;
  /** True once a person has reviewed it. */
  r: boolean;
  /** For a template: the names of the function's parameters, in order. */
  p?: readonly string[];
  /** Set after the first check: the mark of the English it was checked against, and the result. */
  ok?: [string, boolean];
}
/** The translations of one source file, by key. */
export type HeldFile = Record<string, Held>;

export interface Choice { lang: Lang; drafts: boolean }
const ENGLISH: Choice = { lang: SOURCE, drafts: false };

/** What a caller that set the language by hand may be told. Used by the voice export and by tests. */
export interface Scope extends Choice {
  /** Told each time English was returned although another language was asked for. */
  onMiss?: (file: string, key: string, why: Miss) => void;
  onHit?: (file: string, key: string) => void;
}
export type Miss = "none" | "draft" | "stale" | "check" | "shape";

/** Everything that must be one per process (or one per browser page), whatever bundle this file was built into. */
interface Shared {
  /** Translation files read so far: `${lang}/${file}`, and `${lang}/${file}#browser` for the browser's set. Null when the file does not exist. */
  files: Map<string, { at: number; stamp: string; held: HeldFile | null }>;
  /** Server: where the translation files are. */
  dir?: string;
  /** Server: the language an action set for the rest of its own request. */
  set: WeakMap<object, Choice>;
  /** Above zero while English source text is being put together: every lookup then answers in English. */
  english: number;
  /** Server: a language set by hand for one stretch of work (never by a page). */
  scope?: { getStore(): Scope | undefined; run<T>(s: Scope, fn: () => T): T };
  /** Lookups made while a module was loading inside a request. Development only. */
  early: Set<string>;
  /** Goes up each time the files are forgotten, so anything made from them is made again. */
  epoch?: number;
}
/** The browser's copy: one language, only the entries this browser may be shown. */
interface Client { lang: Lang; drafts: boolean; files: Record<string, Record<string, [s: string, t: string, p?: string[]]>> }

const g = globalThis as unknown as { __ioLangShared?: Shared; __ioLang?: Client };
const shared: Shared = (g.__ioLangShared ??= { files: new Map(), set: new WeakMap(), english: 0, early: new Set() });
const onServer = typeof window === "undefined";
const production = process.env.NODE_ENV === "production";
/** Watching for words read while a module loads costs a stack trace for each lookup, so it runs in development only. */
let watchEarly = process.env.NODE_ENV === "development";
/** For tests of the watch itself. */
export const watchEarlyReads = (on: boolean): void => { watchEarly = on; };

/* ───────────── which language ───────────── */

/**
 * Reads the header's value: "hi" or "hi;drafts". Anything else is English.
 * Production never shows a draft, whatever the header says: the proxy never writes ";drafts" there, and if a
 * request ever reached the app without passing the proxy this is the second lock.
 */
export function readChoice(value: string | null | undefined, inProduction: boolean = production): Choice {
  if (!value || typeof value !== "string") return ENGLISH;
  const [lang, flag] = value.split(";");
  return isLang(lang) && lang !== SOURCE ? { lang, drafts: flag === "drafts" && !inProduction } : ENGLISH;
}
export const writeChoice = (c: Choice): string => (c.lang === SOURCE ? SOURCE : c.drafts ? `${c.lang};drafts` : c.lang);

function scopes(): Shared["scope"] {
  if (shared.scope || !onServer) return shared.scope;
  const hooks = (process as unknown as { getBuiltinModule?: (id: string) => unknown }).getBuiltinModule?.("node:async_hooks") as
    | { AsyncLocalStorage: new () => { getStore(): Scope | undefined; run<T>(s: Scope, fn: () => T): T } } | undefined;
  if (hooks) shared.scope = new hooks.AsyncLocalStorage();
  return shared.scope;
}

/** As much of a request as is read here. */
interface RequestLike { type: "request"; headers: { get(name: string): string | null } }

/**
 * The request Next.js is serving at this moment, or nothing: outside a request, while a page is built ahead of
 * time, inside something Next.js keeps for later (a cache), or when Next.js no longer hands the request over in
 * the shape this file knows. It never throws.
 */
function requestNow(): RequestLike | undefined {
  if (!onServer) return undefined;
  try {
    const store = workUnitAsyncStorage?.getStore() as unknown as Partial<RequestLike> | undefined;
    return store && store.type === "request" && typeof store.headers?.get === "function" ? (store as RequestLike) : undefined;
  } catch { return undefined; }
}

/** The language wanted right now, and whether machine drafts may be shown. */
export function current(): Choice | Scope {
  if (shared.english > 0) return ENGLISH;
  if (!onServer) { const c = g.__ioLang; return c && isLang(c.lang) ? c : ENGLISH; }
  const byHand = shared.scope?.getStore();
  if (byHand) return byHand;
  const request = requestNow();
  if (!request) return ENGLISH;
  const set = shared.set.get(request);
  if (set) return set;
  try { return readChoice(request.headers.get(LANG_HEADER)); } catch { return ENGLISH; }
}
export const currentLang = (): Lang => current().lang;

/** True in the build that draws the browser's parts of a page. A test may say otherwise. */
let partsBuild = browserParts;
/** For tests: draw as the server-only build (false), as the build of the browser's parts (true), or as built (undefined). */
export const drawAsBrowserParts = (on: boolean | undefined): void => { partsBuild = on ?? browserParts; };
/**
 * Is the server drawing, for a request, a part of a page that the browser will draw again? Then only the
 * sentences the browser is given may be used. A job, a script or a test that set the language by hand is not a page.
 */
const forBrowserParts = (): boolean => onServer && partsBuild && !shared.scope?.getStore() && !!requestNow();

/**
 * Runs `fn` with every lookup answering in English, whatever the request's language. For putting English source
 * text together (the copy files do this as they load) and for code that must read the English wording, such as
 * the marks of the spoken scripts. `fn` must not wait for anything: the switch is on only while it runs.
 */
export function inEnglish<T>(fn: () => T): T {
  shared.english++;
  try {
    const out = fn();
    if (out instanceof Promise) throw new Error("inEnglish: the work must finish at once; it may not wait for anything.");
    return out;
  } finally { shared.english--; }
}

/**
 * Runs `fn` in one language, outside any page: a job, a script, a test. Server only.
 * A page never calls this: its language is the request's.
 */
export function withLang<T>(scope: Scope, fn: () => T): T {
  const s = scopes();
  if (!s) throw new Error("withLang runs on the server only.");
  return s.run(scope, fn);
}

/**
 * For a server action that has just changed the language: the rest of this request, the action's own answer
 * included, is in the new language. The browser then loads the page afresh (see docs/LANGUAGES.md).
 */
/** True when an action has set the language for the rest of this request. */
export function requestChoiceWasSet(): boolean {
  const request = requestNow();
  return !!request && shared.set.has(request);
}

export function setRequestChoice(choice: Choice): void {
  const request = requestNow();
  if (request) shared.set.set(request, { lang: choice.lang, drafts: choice.drafts && !production });
}

/* ───────────── the translation files ───────────── */

type Fs = { readFileSync(p: string, enc: "utf8"): string; statSync(p: string): { mtimeMs: number }; existsSync(p: string): boolean };
const node = <T>(id: string): T | undefined => (onServer ? (process as unknown as { getBuiltinModule?: (id: string) => unknown }).getBuiltinModule?.(id) as T | undefined : undefined);

/** Where the translation files are: `translations/` beside the app, unless a test or a script says otherwise. */
export function translationsDir(): string {
  if (shared.dir) return shared.dir;
  const path = node<{ join(...p: string[]): string }>("node:path");
  return process.env.IOPENER_TRANSLATIONS_DIR || (path ? path.join(process.cwd(), "translations") : "translations");
}
/** For tests and scripts: read translation files from this folder, and forget what was read before. */
export function readTranslationsFrom(dir: string | undefined): void { shared.dir = dir; forgetFiles(); }
/** How many times the files were forgotten. What is made from them (the browser's script) is kept only for one such stretch. */
export const filesEpoch = (): number => shared.epoch ?? 0;

/** A file name is made only of these, so a key can never reach outside the folder. */
const SAFE_FILE = /^[a-z0-9][a-z0-9.-]*(\/[a-z0-9][a-z0-9.-]*)*$/;

/** Turns the content of a translation file into what is kept in memory. Anything misshapen is left out. */
export function holdFile(value: unknown, lang: Lang, file: string): HeldFile | null {
  if (!value || typeof value !== "object") return null;
  const v = value as { lang?: unknown; file?: unknown; entries?: unknown };
  if (v.lang !== lang || v.file !== file || !v.entries || typeof v.entries !== "object" || Array.isArray(v.entries)) return null;
  const out: HeldFile = Object.create(null) as HeldFile;
  for (const [key, raw] of Object.entries(v.entries as Record<string, unknown>)) {
    const e = raw as { source?: unknown; text?: unknown; status?: unknown; params?: unknown } | null;
    if (!e || typeof e.source !== "string" || typeof e.text !== "string" || !e.text.trim()) continue;
    if (e.status !== "reviewed" && e.status !== "machine") continue;
    const p = Array.isArray(e.params) && e.params.every((x) => typeof x === "string") ? (e.params as string[]) : undefined;
    out[key] = { s: e.source, t: e.text, r: e.status === "reviewed", ...(p ? { p } : {}) };
  }
  return out;
}

/**
 * The list of English sentences (translations/manifest.json): every key the app asks for, with the mark of its
 * English, and which of them the browser is given. Server only. It decides whether a template may be used at
 * all (see `heldFile`), and what the browser's set is.
 */
interface Listed { at: number; stamp: number; files: Record<string, Record<string, string>> | null; client: ClientList | null }
let listed: Listed | null = null;
function listOfEnglish(): Listed | null {
  const now = Date.now();
  if (listed && (production || now - listed.at < 2000)) return listed;
  const fs = node<Fs>("node:fs"), path = node<{ join(...p: string[]): string }>("node:path");
  if (!fs || !path) return null;
  const full = path.join(translationsDir(), "manifest.json");
  let files: Listed["files"] = null, client: ClientList | null = null, stamp = 0;
  try {
    stamp = fs.statSync(full).mtimeMs;
    if (listed && listed.stamp === stamp) { listed.at = now; return listed; }
    const v = JSON.parse(fs.readFileSync(full, "utf8")) as { files?: unknown; client?: unknown };
    files = v.files && typeof v.files === "object" ? (v.files as Record<string, Record<string, string>>) : null;
    client = cleanClientList(v.client);
  } catch { files = null; client = null; }
  listed = { at: now, stamp, files, client };
  return listed;
}
/** Which sentences the browser is given (src/i18n/client-list.ts). Null: no list, so all of them. Server only. */
export const clientList = (): ClientList | null => listOfEnglish()?.client ?? null;
/** A key with an open place in it: "settings.family.switchTo(*)". */
const isOpen = (key: string): boolean => /\((?:[^()]*,)?\*(?:,[^()]*)?\)$/.test(key);

/**
 * The translations of one source file in one language. Null when there are none.
 *
 * A template (a key with an open place) is kept only when the list of English sentences has this very key with
 * this very mark. The list is made from the source text, where a parameter's type can be read: a template is made
 * only where the open place takes a number or a free text, never a choice between fixed words, which would be
 * written into the translated sentence in English. A translation file cannot add a template of its own.
 */
export function heldFile(lang: Lang, file: string, browserSet = false): HeldFile | null {
  if (!onServer) {
    const c = g.__ioLang;
    if (!c || c.lang !== lang) return null;
    const id = `${lang}/${file}`, had = shared.files.get(id);
    if (had) return had.held;
    const sent = c.files?.[file];
    let held: HeldFile | null = null;
    if (sent) {
      held = Object.create(null) as HeldFile;
      /* The server sends only what this browser may be shown, so everything here counts as cleared for showing. */
      for (const [key, [s, t, p]] of Object.entries(sent)) held[key] = { s, t, r: true, ...(p ? { p } : {}) };
    }
    shared.files.set(id, { at: 0, stamp: "", held });
    return held;
  }
  if (!SAFE_FILE.test(file)) return null;
  const id = browserSet ? `${lang}/${file}#browser` : `${lang}/${file}`, had = shared.files.get(id), now = Date.now();
  /* Production reads each file once. Development looks again after two seconds, so a new run of the pipeline shows at once. */
  if (had && (production || now - had.at < 2000)) return had.held;
  if (browserSet) {
    /* the browser's set of this file: the same entries as the whole file holds, fewer of them */
    const all = heldFile(lang, file), list = listOfEnglish();
    const stamp = `${shared.files.get(`${lang}/${file}`)?.stamp ?? ""}|${list?.stamp ?? ""}`;
    if (had && had.stamp === stamp) { had.at = now; return had.held; }
    let held: HeldFile | null = null;
    if (all) {
      held = Object.create(null) as HeldFile;
      for (const key of Object.keys(all)) if (sentToBrowser(list?.client, file, key)) held[key] = all[key];
    }
    shared.files.set(id, { at: now, stamp, held });
    return held;
  }
  const fs = node<Fs>("node:fs"), path = node<{ join(...p: string[]): string }>("node:path");
  if (!fs || !path) return null;
  const full = path.join(translationsDir(), lang, `${file}.json`);
  let held: HeldFile | null = null, stamp = "";
  try {
    stamp = String(fs.statSync(full).mtimeMs);
    if (had && had.stamp === stamp) { had.at = now; return had.held; }
    held = holdFile(JSON.parse(fs.readFileSync(full, "utf8")), lang, file);
  } catch { held = null; }
  if (held) {
    const marks = listOfEnglish()?.files?.[file];
    for (const key of Object.keys(held)) if (isOpen(key) && marks?.[key] !== held[key].s) delete held[key];
  }
  shared.files.set(id, { at: now, stamp, held });
  return held;
}

/** Forget every file read so far. After staff or a script changed the files. */
export function forgetFiles(): void { shared.files.clear(); listed = null; shared.epoch = (shared.epoch ?? 0) + 1; }

/* ───────────── one sentence ───────────── */

/** May this entry stand in for this English text, in this language? Checked once for each wording of the English. */
function usable(e: Held, english: string, lang: Lang, scene: boolean): boolean {
  const m = mark(english);
  if (e.ok && e.ok[0] === m) return e.ok[1];
  const good = e.s === m && problems(english, e.t, lang, { scene }).length === 0;
  e.ok = [m, good];
  return good;
}

const why = (e: Held | undefined, drafts: boolean, english: string): Miss => (!e ? "none" : !e.r && !drafts ? "draft" : e.s !== mark(english) ? "stale" : "check");

/**
 * In development: a word looked up while a module is still loading. It would be kept in the first reader's
 * language, so English is returned, and the place is said in the server's log and remembered (`earlyReads`).
 */
function loading(file: string, key: string): boolean {
  if (!watchEarly || !onServer) return false;
  const stack = new Error().stack ?? "";
  if (!/instantiateModule|__webpack_require__|ModuleJob\.run|at Module\._compile|runInlinedModule/.test(stack)) return false;
  const at = stack.split("\n").find((l) => /\/src\/|%2Fsrc%2F|\[project\]/.test(l) && !/i18n/.test(l)) ?? "";
  if (!shared.early.has(`${file}:${key}`)) {
    shared.early.add(`${file}:${key}`);
    console.warn(`[languages] "${file}:${key}" was read while a module was loading, so it stays in English. Read it inside a function. ${decodeURIComponent(at.trim()).slice(0, 200)}`);
  }
  return true;
}
/** The words read too early since the server started. Development only. */
export const earlyReads = (): string[] => [...shared.early];

/* ───────────── right to left ───────────── */

const LRI = "\u2066", PDI = "\u2069", RLM = "\u200F";
/** The first letter of a text that has a direction of its own: Latin, or Hebrew and Arabic script. */
const FIRST_STRONG = /[A-Za-z\u00C0-\u024F\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFC]/;
const RTL: ReadonlySet<Lang> = new Set<Lang>(["ur"]);
/** A number with a unit written as a Latin sign: "40 cm", "15%", "6.9 mm". */
const MEASURE = /\d+(?:[.,:/]\d+)*[\s\u00A0]?(?:mm|cm|km|ms|min|px|Hz|kB|MB|m|s|D)(?![A-Za-z\u00C0-\u024F])/g;

/**
 * Makes a text read rightly inside a right-to-left page. Does nothing in a left-to-right language.
 *
 * Two things go wrong otherwise, and both matter for a dose:
 *   - "40 cm" inside an Urdu sentence is drawn "cm 40": the number and its Latin unit are two pieces, and the
 *     page's direction swaps them. Each measure is held together, left to right.
 *   - an English sentence, shown because no checked translation exists yet, would get its full stop at the wrong
 *     end. The whole sentence is held together, left to right.
 * It is done with the two invisible marks Unicode has for exactly this (an isolate), so nothing else about the
 * text changes: no element is added, and it works the same in a page, in a title and in a game scene.
 */
export function forDirection(text: string, lang: Lang, translated: boolean): string {
  if (!RTL.has(lang) || !text) return text;
  if (!translated) return /[A-Za-z]/.test(text) ? `${LRI}${text}${PDI}` : text;
  const held = text.replace(MEASURE, (m) => `${LRI}${m}${PDI}`);
  /* A translated sentence that begins with a name kept in Latin letters ("IOpener ...") or with a figure would be
     taken for left-to-right text by its first letter. The invisible right-to-left mark in front settles it. */
  const first = FIRST_STRONG.exec(text)?.[0];
  return first && /[A-Za-z\u00C0-\u024F]/.test(first) ? `${RLM}${held}` : held;
}

/**
 * In development, in the browser: every sentence the browser asked for and was not given (`window.__ioLangMissed`).
 * tools/lang-sweep reads it to find a sentence that the list of the browser's set (src/i18n/client-list.ts) left out.
 */
function missedInBrowser(file: string, key: string): void {
  if (production || onServer) return;
  const w = g as unknown as { __ioLangMissed?: Set<string> };
  (w.__ioLangMissed ??= new Set()).add(`${file}|${key}`);
}

/** The text for `key` of `file` in the language wanted now, or `english` when there is no usable translation. */
export function say(file: string, key: string, english: string, scene = false): string {
  const c = current();
  if (c.lang === SOURCE) return english;
  if (loading(file, key)) return english;
  const e = heldFile(c.lang, file, forBrowserParts())?.[key];
  if (e && (e.r || c.drafts) && usable(e, english, c.lang, scene)) { (c as Scope).onHit?.(file, key); return forDirection(e.t, c.lang, true); }
  (c as Scope).onMiss?.(file, key, why(e, c.drafts, english));
  missedInBrowser(file, key);
  return forDirection(english, c.lang, false);
}

/** A value that can be written into a key: short, and made of plain characters. */
const simple = (v: unknown): v is string | number | boolean | null =>
  (typeof v === "string" && /^[\w .:+-]{0,40}$/.test(v)) || (typeof v === "number" && Number.isFinite(v)) || typeof v === "boolean" || v === null;

/** The keys a call may be translated under, most exact first: "f(left,3)", "f(left,*)", "f(*,3)", "f(*,*)". */
export function callKeys(key: string, args: readonly unknown[]): { key: string; fixed: Fixed }[] {
  const n = args.length;
  if (n > 5) return [];
  const out: { key: string; fixed: Fixed; free: number }[] = [];
  for (let mask = 0; mask < 1 << n; mask++) {
    const fixed: [number, string | number | boolean | null][] = [];
    let good = true;
    const parts = args.map((a, i) => {
      if (mask & (1 << i)) return "*";
      if (!simple(a)) { good = false; return ""; }
      fixed.push([i, a]);
      return String(a);
    });
    if (good) out.push({ key: `${key}(${parts.join(",")})`, fixed, free: n - fixed.length });
  }
  return out.sort((a, b) => a.free - b.free);
}

const templates = new WeakMap<object, Map<string, string | null>>();
function englishTemplate(fn: (...a: never[]) => unknown, key: string, params: readonly string[], fixed: Fixed): string | null {
  let mine = templates.get(fn);
  if (!mine) templates.set(fn, (mine = new Map()));
  const id = `${key}|${params.join(",")}`;
  if (!mine.has(id)) mine.set(id, templateOf(fn, params, fixed));
  return mine.get(id) ?? null;
}

/**
 * The result of a copy function in the language wanted now.
 * `english` is what the English function gave for these values; it is always worked out first, and it is what is
 * returned unless a translation is proved to say the same thing for these very values.
 */
export function sayCall(file: string, key: string, fn: (...a: never[]) => unknown, args: readonly unknown[], english: string, scene = false): string {
  const c = current();
  if (c.lang === SOURCE) return english;
  if (loading(file, key)) return english;
  const held = heldFile(c.lang, file, forBrowserParts());
  let miss: Miss = "none";
  if (held) for (const cand of callKeys(key, args)) {
    const e = held[cand.key];
    if (!e) continue;
    if (!e.r && !c.drafts) { miss = "draft"; continue; }
    if (cand.fixed.length === args.length) {
      /* every value is part of the key: the entry is this very sentence */
      if (usable(e, english, c.lang, scene)) { (c as Scope).onHit?.(file, cand.key); return forDirection(e.t, c.lang, true); }
      miss = why(e, c.drafts, english);
      continue;
    }
    if (!e.p || e.p.length < args.length) { miss = "shape"; continue; }
    const template = englishTemplate(fn, cand.key, e.p, cand.fixed);
    if (template === null) { miss = "shape"; continue; }
    if (!usable(e, template, c.lang, scene)) { miss = why(e, c.drafts, template); continue; }
    /* the proof: for these values the English sentence is exactly its template filled in */
    if (fill(template, e.p, args) !== english) { miss = "shape"; continue; }
    (c as Scope).onHit?.(file, cand.key);
    return forDirection(fill(e.t, e.p, args), c.lang, true);
  }
  (c as Scope).onMiss?.(file, key, miss);
  missedInBrowser(file, key);
  return forDirection(english, c.lang, false);
}
