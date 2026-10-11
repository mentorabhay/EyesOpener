// Eyes Opener: `count` and `check`: the numbers and the faults of the translation files, read against the words in the code.
/**
 * `count` and `check`: the numbers and the faults of the translation files, read against the words in the code.
 *
 *   count            how much there is to translate, what could not be covered, and how far each language is
 *   count --write    also writes translations/manifest.json, the list of English sentences the staff's counts use
 *   check            every entry of every translation file against the English as it is now. Ends with an error
 *                    when an entry that would be shown breaks a rule (a placeholder, a number, a unit, a name)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { problems } from "../../src/i18n/check";
import { sentToBrowser, type ClientList } from "../../src/i18n/client-list";
import { isLang, TRANSLATED, type Lang } from "../../src/i18n/languages";
import { allProgress, type Manifest } from "../../src/i18n/progress";
import { clientListOf } from "./client";
import { charsOf, extract, type Extract, type Unit } from "./extract";
import { listFiles, readFile } from "./files";
import { keptNames, missingNames } from "./names";
import { isSourceFile } from "./sources";

/**
 * The list of English sentences, with which of them the browser is given (`client`: scripts/i18n/client.ts).
 * Without `client` the list says nothing about that, and the app sends a browser every sentence.
 */
export function manifestOf(x: Extract, made: string, client?: ClientList | null): Manifest {
  const files: Manifest["files"] = {};
  for (const u of [...x.units].sort((a, b) => a.file.localeCompare(b.file) || a.key.localeCompare(b.key))) (files[u.file] ??= {})[u.key] = u.source;
  const sent = client ? x.units.filter((u) => sentToBrowser(client, u.file, u.key)) : null;
  return { made, units: x.units.length, chars: charsOf(x.units), files, ...(client !== undefined ? { client } : {}), ...(sent ? { sent: { units: sent.length, chars: charsOf(sent) } } : {}) };
}
/** The same list, whatever day it was made? */
export const sameManifest = (a: Manifest, b: Manifest): boolean =>
  JSON.stringify(a.files) === JSON.stringify(b.files) && JSON.stringify(a.client ?? null) === JSON.stringify(b.client ?? null);

export interface Fault { lang: Lang; file: string; key: string; status: string; what: string }

/** Every fault of a language's files. `shown` faults are in entries the app would show; the rest are only notes. */
export function faultsOf(lang: Lang, dir: string, units: readonly Unit[], names: readonly string[]): { shown: Fault[]; notes: Fault[] } {
  const byKey = new Map(units.map((u) => [`${u.file}|${u.key}`, u]));
  const shown: Fault[] = [], notes: Fault[] = [];
  for (const file of listFiles(dir, lang)) {
    const f = readFile(dir, lang, file);
    for (const [key, e] of Object.entries(f.entries)) {
      const u = byKey.get(`${file}|${key}`);
      const at = { lang, file, key, status: e.status };
      if (!u) { notes.push({ ...at, what: "the app no longer asks for this key" }); continue; }
      if (u.source !== e.source) { notes.push({ ...at, what: "made from an older English wording" }); continue; }
      if ((u.params ?? []).join(",") !== (e.params ?? []).join(",")) shown.push({ ...at, what: "the names of its placeholders are not those of the function" });
      for (const p of problems(u.english, e.text, lang, { scene: u.scene })) shown.push({ ...at, what: p });
      for (const n of missingNames(u.english, e.text, names)) shown.push({ ...at, what: `the name "${n}" must stay as it is` });
    }
  }
  return { shown, notes };
}

export async function report(command: string, o: { lang?: string; say: (line: string) => void; root: string; write?: boolean }): Promise<number> {
  const x = await extract(o.root), dir = path.join(o.root, "translations");
  const langs = o.lang ? o.lang.split(",").filter(isLang).filter((l): l is Exclude<Lang, "en"> => l !== "en") : [...TRANSLATED];
  const names = await keptNames();
  if (command === "count") {
    const say = o.say, n = (v: number) => v.toLocaleString("en-US");
    say(`${n(x.units.length)} pieces of English text, ${n(charsOf(x.units))} characters, in ${x.files.length} source files`);
    const kinds = { text: 0, template: 0, fixed: 0 };
    for (const u of x.units) kinds[u.kind]++;
    say(`  ${n(kinds.text)} plain sentences, ${n(kinds.template)} templates of copy functions, ${n(kinds.fixed)} sentences of copy functions with fixed values`);
    const why = new Map<string, number>();
    for (const s of x.skipped) { const w = /^(a "|an address|no letters|a code|one of a fixed)/.test(s.why) || !/function|parameters|depends|field name|combinations/.test(s.why) ? "values for the code, not words" : s.why; why.set(w, (why.get(w) ?? 0) + 1); }
    say("Left out:");
    for (const [w, c] of [...why].sort((a, b) => b[1] - a[1])) say(`  ${n(c)}  ${w}`);
    const made = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
    const client = clientListOf(o.root, isSourceFile);
    const manifest = manifestOf(x, made, client), at = path.join(dir, "manifest.json");
    if (manifest.sent) say(`The browser is given ${n(manifest.sent.units)} of them, ${n(manifest.sent.chars)} characters: the sentences its own code can read. The rest is drawn on the server.`);
    else say("Which sentences the browser's own code reads could not be worked out from the source, so a browser is given all of them.");
    const had = existsSync(at) ? (JSON.parse(readFileSync(at, "utf8")) as Manifest) : null;
    if (o.write) {
      if (had && sameManifest(had, manifest)) say("translations/manifest.json is up to date");
      else { mkdirSync(dir, { recursive: true }); writeFileSync(at, `${JSON.stringify(manifest)}\n`); say("wrote translations/manifest.json"); }
    } else if (!had || !sameManifest(had, manifest)) say("translations/manifest.json is older than the words in the code: run this again with --write");
    say("Languages:");
    for (const p of allProgress(manifest, dir).filter((p) => langs.includes(p.lang as Exclude<Lang, "en">))) {
      say(`  ${p.lang}  translated ${n(p.translated)} of ${n(p.total)}, checked by a person ${n(p.reviewed)}, machine drafts ${n(p.drafts)}, of an older wording ${n(p.stale)}, no longer asked for ${n(p.unknown)}`);
    }
    return 0;
  }
  let bad = 0;
  for (const lang of langs) {
    const { shown, notes } = faultsOf(lang, dir, x.units, names);
    for (const f of shown) o.say(`${f.lang}/${f.file} ${f.key} [${f.status}]: ${f.what}`);
    if (shown.length || notes.length) o.say(`${lang}: ${shown.length} faults, ${notes.length} entries that are not read (older wording, or a key that is gone)`);
    bad += shown.length;
  }
  if (!bad) o.say("No faults.");
  return bad ? 1 : 0;
}
