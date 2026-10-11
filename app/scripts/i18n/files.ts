// Eyes Opener: Translation files: one for each language and each source file, kept in the repository.
/**
 * Translation files: one for each language and each source file, kept in the repository.
 *
 *   translations/<language>/<source file>.json        translations/hi/copy/today.json
 *   {
 *     "lang": "hi",
 *     "file": "copy/today",
 *     "entries": {
 *       "today.title": {
 *         "source":  "1f0c2a9b3d4e5f",   the mark of the English this was made from (src/i18n/mark.ts)
 *         "english": "Today",            that English, so the file can be read on its own
 *         "text":    "आज",               the translation
 *         "status":  "machine",          "machine": a draft no person has read. "reviewed": a person checked it
 *         "made":    "2026-10-05 gemini-3.8-flash",
 *         "reviewed": "2026-10-12 by A. Sharma",        only on reviewed entries
 *         "params":  ["name"]            only on a template: the names its {placeholders} may use, in order
 *       }
 *     }
 *   }
 *
 * The app reads `source`, `text`, `status` and `params` and nothing else (src/i18n/runtime.ts). It uses an entry
 * only when the key is one it asks for, the mark matches the English as it is now, a person has reviewed it, and
 * its placeholders, numbers and units are those of the English (src/i18n/check.ts).
 * Entries are written in the order of their keys, so a change shows as a small difference.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Lang } from "../../src/i18n/languages";

export interface Entry { source: string; english: string; text: string; status: "machine" | "reviewed"; made?: string; reviewed?: string; params?: string[] }
export interface TranslationFile { lang: Lang; file: string; entries: Record<string, Entry> }

export const fileAt = (dir: string, lang: Lang, file: string) => path.join(dir, lang, `${file}.json`);

export function readFile(dir: string, lang: Lang, file: string): TranslationFile {
  const at = fileAt(dir, lang, file);
  if (!existsSync(at)) return { lang, file, entries: {} };
  const v = JSON.parse(readFileSync(at, "utf8")) as TranslationFile;
  if (v.lang !== lang || v.file !== file || !v.entries || typeof v.entries !== "object") throw new Error(`${at} is not the translation file of ${lang}/${file}`);
  return v;
}

/** Writes a file, or removes it when it has no entries left. True when the file on disk changed. */
export function writeFile(dir: string, f: TranslationFile): boolean {
  const at = fileAt(dir, f.lang, f.file);
  const keys = Object.keys(f.entries).sort();
  if (!keys.length) { if (existsSync(at)) { rmSync(at); return true; } return false; }
  const entries: Record<string, Entry> = {};
  for (const k of keys) {
    const e = f.entries[k];
    entries[k] = { source: e.source, english: e.english, text: e.text, status: e.status, ...(e.made ? { made: e.made } : {}), ...(e.reviewed ? { reviewed: e.reviewed } : {}), ...(e.params ? { params: e.params } : {}) };
  }
  const text = `${JSON.stringify({ lang: f.lang, file: f.file, entries }, null, 1)}\n`;
  if (existsSync(at) && readFileSync(at, "utf8") === text) return false;
  mkdirSync(path.dirname(at), { recursive: true });
  writeFileSync(at, text);
  return true;
}

/** Every file a language has: "copy/today", "data/guides/convergence". */
export function listFiles(dir: string, lang: Lang): string[] {
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
