// Eyes Opener: The wrapper every file of words is made with.
/**
 * The wrapper every file of words is made with.
 *
 *   export const today = texts("copy/today", "today", () => ({ title: "Today", ... }));
 *
 * `texts` returns something that looks and types exactly like the object it was given: the same fields, the same
 * functions, the same arrays. The difference is what happens when a piece of text is read from it. At that
 * moment, and not before, the text is looked up in the language of the request being served (or of the page, in
 * the browser). So the hundreds of places that write `today.title` or `t.sub(name)` need no change, and the
 * compiler still checks every one of them against the English object.
 *
 * What comes back, by kind:
 *   a string        the translation when a usable one exists, else the English string
 *   a function      a function with the same parameters; its result is looked up as a template (template.ts)
 *   an object, an array   the same wrapper one level down, so reading stays lazy
 *   anything else   itself
 *
 * The English object is made inside `inEnglish`, so a file of words that builds its sentences from another file's
 * words (`${common.product}`) always builds them in English.
 *
 * The one thing a caller must not do is read a word while a module is loading (a `const` at the top of a file):
 * a module loads once and would keep that word in one language for everybody. scripts/i18n/scan.ts finds such
 * places, and a test fails on them.
 */
import { current, inEnglish, say, sayCall } from "./runtime";
import { SOURCE } from "./languages";

const RAW = Symbol.for("iopener.words.raw");
/** On the function that stands in for a copy function: the English function behind it. */
const FN = Symbol.for("iopener.words.fn");
/** True for something `texts` already made: an object, a list or a function of another file of words. */
const isMade = (v: unknown): boolean => (typeof v === "object" || typeof v === "function") && v !== null && (v as Record<symbol, unknown>)[RAW] !== undefined || (typeof v === "function" && (v as unknown as Record<symbol, unknown>)[FN] !== undefined);

/** Which strings of a source are words. Left out: all of them. Data files say which fields are words. */
export interface Rule {
  /**
   * True when the string at this place is a word to translate. `path` ends with the field's own name; `owner` is
   * the object the field belongs to, for a field that is a word only beside certain values.
   */
  word?: (path: readonly string[], owner: object) => boolean;
  /** True for words drawn inside a game scene or a picture: a translation much longer than the English is refused. */
  scene?: boolean | ((path: readonly string[]) => boolean);
}

export interface Source { file: string; name: string; value: unknown; rule: Rule }

/** Every source made so far in this process: what the pipeline and the staff's counts read. */
const g = globalThis as unknown as { __ioWordSources?: Map<string, Source> };
const sources: Map<string, Source> = (g.__ioWordSources ??= new Map());
export const allSources = (): Source[] => [...sources.values()];

const plain = (v: unknown): v is Record<string, unknown> | unknown[] => {
  if (v === null || typeof v !== "object") return false;
  if (Array.isArray(v)) return true;
  const proto = Object.getPrototypeOf(v) as unknown;
  return proto === Object.prototype || proto === null;
};

interface At { file: string; key: string; path: readonly string[]; rule: Rule }
/** Is the word at this place drawn where there is no room to grow? */
export const sceneAt = (rule: Rule, path: readonly string[]): boolean => (typeof rule.scene === "function" ? rule.scene(path) : !!rule.scene);
const wrapped = new WeakMap<object, Map<string, unknown>>();
const callers = new WeakMap<object, Map<string, unknown>>();

/** A value that can be part of a key: f(left).lead */
const simple = (v: unknown): boolean => (typeof v === "string" && /^[\w .:+-]{0,40}$/.test(v)) || (typeof v === "number" && Number.isFinite(v)) || typeof v === "boolean" || v === null;

function wrap<T extends object>(target: T, at: At): T {
  /* A frozen object must hand back exactly what it holds, so it cannot be translated. */
  if (Object.isFrozen(target)) return target;
  let mine = wrapped.get(target);
  if (!mine) wrapped.set(target, (mine = new Map()));
  const had = mine.get(at.key);
  if (had) return had as T;
  const proxy = new Proxy(target, {
    get(t, prop, receiver) {
      if (prop === RAW) return t;
      const v = Reflect.get(t, prop, receiver) as unknown;
      if (typeof prop === "symbol" || !Object.prototype.hasOwnProperty.call(t, prop)) return v;
      const key = `${at.key}.${prop}`;
      if (typeof v === "string") {
        if (current().lang === SOURCE) return v;
        const path = [...at.path, prop];
        return at.rule.word && !at.rule.word(path, t) ? v : say(at.file, key, v, sceneAt(at.rule, path));
      }
      /* Words taken over from another file of words (`{ ...shared }`) keep that file's keys: they are handed on as they are. */
      if (isMade(v)) return v;
      if (typeof v === "function") return at.rule.word && !at.rule.word([...at.path, prop], t) ? v : callerOf(t, prop, v as (...a: unknown[]) => unknown, { ...at, key, path: [...at.path, prop] });
      if (plain(v)) return wrap(v, { ...at, key, path: [...at.path, prop] });
      return v;
    },
  });
  mine.set(at.key, proxy);
  return proxy;
}

function callerOf(owner: object, prop: string, fn: (...a: unknown[]) => unknown, at: At): unknown {
  let mine = callers.get(fn);
  if (!mine) callers.set(fn, (mine = new Map()));
  const had = mine.get(at.key);
  if (had) return had;
  const call = (...args: unknown[]): unknown => {
    const english = inEnglish(() => fn.apply(owner, args));
    if (current().lang === SOURCE) return english;
    if (typeof english === "string") return sayCall(at.file, at.key, fn as (...a: never[]) => unknown, args, english, sceneAt(at.rule, at.path));
    /* a function that gives back an object of sentences: each sentence is looked up under the values it was called with */
    if (plain(english) && args.every(simple)) return wrap(english, { ...at, key: `${at.key}(${args.map(String).join(",")})` });
    return english;
  };
  Object.defineProperty(call, "length", { value: fn.length });
  Object.defineProperty(call, FN, { value: fn });
  mine.set(at.key, call);
  return call;
}

/**
 * Makes a file's words. `file` is the source file without "src/" and ".ts" ("copy/today"); `name` is the export.
 * `make` builds the English object.
 */
/**
 * Words drawn inside a scene or on a printed card, by where they live: the `games` and `words` of a games or
 * drills file are what a game writes on its canvas, and `print` of the drill tools is what is written on a card
 * drawn to real size. There a translation has only the room the English had (src/i18n/check.ts).
 */
export const sceneSource = (file: string, name: string): boolean =>
  (/^copy\/(games|drills)-/.test(file) && (name === "games" || name === "words" || name === "cinema")) || (file === "copy/drills-tools" && name === "print");

export function texts<T>(file: string, name: string, make: () => T, given: Rule = {}): T {
  const rule: Rule = given.scene === undefined && sceneSource(file, name) ? { ...given, scene: true } : given;
  const value = inEnglish(make);
  sources.set(`${file}#${name}`, { file, name, value, rule });
  return plain(value) ? (wrap(value as object, { file, key: name, path: [name], rule }) as T) : value;
}

/**
 * Makes the words of a list of items that each have a slug: the guides of one group, for example. Each item is
 * its own source, named by its slug, so its keys do not move when the list is put in another order.
 */
export function textsEach<T extends { slug: string }>(file: string, make: () => T[], rule: Rule = {}): T[] {
  return inEnglish(make).map((item) => texts(file, item.slug, () => item, rule));
}

/** The English original of something made with `texts`. For code that must read the English wording. */
export function english<T>(value: T): T {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) return value;
  const v = value as Record<symbol, unknown>;
  return ((v[RAW] ?? v[FN]) as T | undefined) ?? value;
}

/** True for an object, a list or a function that `texts` made. The extractor uses it to list each word once. */
export const madeByTexts = (value: unknown): boolean => isMade(value);

/**
 * Several records of words read as one, the later ones winning: `joined(a, b)[key]`.
 * For the place where `{ ...a, ...b }` was written at the top of a file: spreading reads every word at once, while
 * the module loads; this reads a word only when it is asked for.
 */
export function joined<T extends Record<string, unknown>>(...parts: readonly T[]): T {
  const find = (prop: string | symbol): T | undefined => { for (let i = parts.length - 1; i >= 0; i--) if (Object.prototype.hasOwnProperty.call(english(parts[i]), prop)) return parts[i]; return undefined; };
  return new Proxy(Object.create(null) as T, {
    get: (_t, prop) => (find(prop) as Record<string | symbol, unknown> | undefined)?.[prop],
    has: (_t, prop) => !!find(prop),
    ownKeys: () => [...new Set(parts.flatMap((p) => Reflect.ownKeys(english(p))))],
    getOwnPropertyDescriptor: (_t, prop) => { const from = find(prop); return from ? { value: (from as Record<string | symbol, unknown>)[prop], enumerable: true, configurable: true, writable: false } : undefined; },
  });
}
