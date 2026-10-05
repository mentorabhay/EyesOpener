/**
 * The words a browser is given for its language: one script, loaded before the page comes alive, that sets
 * `window.__ioLang`. Server only.
 *
 * Two things decide what is in it:
 *   - only entries this browser may be shown: those a person has reviewed, and machine drafts only when the
 *     development switch asked for them
 *   - only sentences that the browser's own code can read (src/i18n/client-list.ts). Everything else is drawn on
 *     the server and arrives as part of the page; sending it again would cost a family about five times the
 *     download for nothing.
 * The browser then applies the same strict rule as the server (src/i18n/runtime.ts): each entry carries the mark
 * of its English and is checked against the English text the page was built with.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { LANGUAGE, SOURCE, type Lang } from "./languages";
import { mark } from "./mark";
import { clientList, filesEpoch, heldFile, translationsDir } from "./runtime";

/** Every translation file of a language: "copy/today", "data/guides/convergence". */
export function filesOf(lang: Lang, dir = translationsDir()): string[] {
  const root = path.join(dir, lang), out: string[] = [];
  const walk = (at: string) => {
    for (const e of readdirSync(at, { withFileTypes: true })) {
      if (e.isDirectory()) walk(path.join(at, e.name));
      else if (e.name.endsWith(".json")) out.push(path.relative(root, path.join(at, e.name)).split(path.sep).join("/").replace(/\.json$/, ""));
    }
  };
  if (existsSync(root)) walk(root);
  return out.sort();
}

/** What the script hands the browser. */
export interface Sent { lang: Lang; drafts: boolean; dir: "ltr" | "rtl"; files: Record<string, Record<string, [string, string] | [string, string, readonly string[]]>> }

/**
 * The script itself. The words travel as one piece of text that the browser reads with `JSON.parse`: a key or a
 * sentence can then never be taken for code, whatever is in it, and a large set is read faster than as script.
 */
export function scriptOf(sent: Sent): string {
  const text = JSON.stringify(JSON.stringify(sent)).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return `self.__ioLang=JSON.parse(${text});`;
}

const made = new Map<string, { at: number; stamp: string; epoch: number; body: string; version: string }>();
const production = process.env.NODE_ENV === "production";

/** The script for one language, and a version that changes when its content does. */
export function clientWords(lang: Lang, drafts: boolean): { body: string; version: string } {
  if (lang === SOURCE) return { body: "", version: "0" };
  const id = `${lang}|${drafts ? "d" : "r"}`, epoch = filesEpoch(), kept = made.get(id), had = kept && kept.epoch === epoch ? kept : undefined, now = Date.now();
  if (had && (production || now - had.at < 2000)) return had;
  const dir = translationsDir(), names = filesOf(lang, dir);
  /* In development the files may change under us: look at their dates before reading them all again. */
  const list = clientList();
  const stamp = production ? "" : `${names.map((f) => { try { return statSync(path.join(dir, lang, `${f}.json`)).mtimeMs; } catch { return 0; } }).join(",")}|${mark(JSON.stringify(list))}`;
  if (had && had.stamp === stamp) { had.at = now; return had; }
  const files: Sent["files"] = Object.create(null) as Sent["files"];
  for (const f of names) {
    /* through `heldFile`, so the browser is sent exactly what the server itself uses for the browser's parts of a page */
    const held = heldFile(lang, f, true);
    if (!held) continue;
    const mine: Sent["files"][string] = Object.create(null) as Sent["files"][string];
    for (const [key, e] of Object.entries(held)) if (e.r || drafts) mine[key] = e.p ? [e.s, e.t, e.p] : [e.s, e.t];
    if (Object.keys(mine).length) files[f] = mine;
  }
  const body = scriptOf({ lang, drafts, dir: LANGUAGE[lang].dir, files });
  const out = { at: now, stamp, epoch, body, version: mark(body) };
  made.set(id, out);
  return out;
}
