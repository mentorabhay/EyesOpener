// Eyes Opener: How far each language has come: how many of the app's English sentences have a translation, and how many of.
/**
 * How far each language has come: how many of the app's English sentences have a translation, and how many of
 * those a person has checked. Server only. The staff's Languages section and `scripts/i18n.ts count` show it.
 *
 * The count is made against the list of English sentences, `translations/manifest.json`: every key the app can
 * ask for, with the mark of its English text. The list is written by `npx tsx scripts/i18n.ts count --write` and a
 * test fails when it is older than the words in the code.
 *
 *   translated   an entry under a key of the list, made from the English as it is now
 *   reviewed     translated, and a person has checked it. These are the sentences families are shown
 *   drafts       translated by a machine, waiting for a person
 *   stale        made from an older English wording: not shown until it is done again
 *   unknown      under a key the app no longer asks for: never read
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { ClientList } from "./client-list";
import { filesOf } from "./client-words";
import { TRANSLATED, type Lang } from "./languages";
import { holdFile, translationsDir } from "./runtime";

export interface Manifest {
  /** The day the list was made, YYYY-MM-DD. */
  made: string;
  units: number;
  /** Characters of English, as a translation service counts them. */
  chars: number;
  /** For each source file: every key with the mark of its English. */
  files: Record<string, Record<string, string>>;
  /**
   * Which sentences the browser is given (src/i18n/client-list.ts). Null or absent: no list, so all of them.
   * `sent` is how many sentences and characters of English that is, for the counts.
   */
  client?: ClientList | null;
  sent?: { units: number; chars: number };
}

export function readManifest(dir = translationsDir()): Manifest | null {
  const at = path.join(dir, "manifest.json");
  if (!existsSync(at)) return null;
  try {
    const v = JSON.parse(readFileSync(at, "utf8")) as Manifest;
    return v && typeof v.made === "string" && v.files && typeof v.files === "object" ? v : null;
  } catch { return null; }
}

export interface Progress { lang: Lang; total: number; translated: number; reviewed: number; drafts: number; stale: number; unknown: number; files: number }

export function progressOf(lang: Lang, manifest: Manifest, dir = translationsDir()): Progress {
  const p: Progress = { lang, total: manifest.units, translated: 0, reviewed: 0, drafts: 0, stale: 0, unknown: 0, files: 0 };
  for (const file of filesOf(lang, dir)) {
    let held;
    try { held = holdFile(JSON.parse(readFileSync(path.join(dir, lang, `${file}.json`), "utf8")), lang, file); } catch { held = null; }
    if (!held) continue;
    p.files++;
    const marks = manifest.files[file] ?? {};
    for (const [key, e] of Object.entries(held)) {
      const now = marks[key];
      if (now === undefined) p.unknown++;
      else if (now !== e.s) p.stale++;
      else { p.translated++; if (e.r) p.reviewed++; else p.drafts++; }
    }
  }
  return p;
}

export const allProgress = (manifest: Manifest, dir = translationsDir()): Progress[] => TRANSLATED.map((l) => progressOf(l, manifest, dir));

/** A share as a whole percent. A part that is not zero never shows as 0, and a part that is not all never shows as 100. */
export function share(part: number, all: number): number {
  if (all <= 0 || part <= 0) return 0;
  if (part >= all) return 100;
  return Math.min(99, Math.max(1, Math.round((100 * part) / all)));
}
