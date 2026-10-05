/**
 * Tools for the languages of the app. docs/LANGUAGES.md explains the design.
 *
 *   npx tsx scripts/i18n.ts wrap [--write]        put new files of words inside texts(...)
 *   npx tsx scripts/i18n.ts metadata [--write]    turn a page's fixed title into one read for each request
 *   npx tsx scripts/i18n.ts scan                  words read while a module loads (must be none)
 *   npx tsx scripts/i18n.ts count [--lang hi] [--write]   how much there is to translate, and how much is done;
 *                                                 --write also renews translations/manifest.json
 *   npx tsx scripts/i18n.ts check [--lang hi]     every translation file against the English as it is now
 *
 * The translation pipeline itself (the part that calls a translation service) is not in this repository.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2), command = args[0];
const flag = (name: string) => args.includes(`--${name}`);
const opt = (name: string): string | undefined => { const i = args.indexOf(`--${name}`); return i < 0 ? undefined : args[i + 1]; };
const root = process.cwd(), src = path.join(root, "src");
const say = (line: string) => console.log(line);

async function main() {
  if (command === "wrap") {
    const { wrapAll } = await import("./i18n/wrap");
    const plans = wrapAll(src, flag("write"));
    for (const p of plans) {
      if (p.wrapped.length) say(`${p.file}: ${flag("write") ? "wrapped" : "would wrap"} ${p.wrapped.join(", ")}`);
      for (const l of p.left) say(`${p.file}: left ${l.name} (${l.why})`);
    }
    say(`${plans.reduce((n, p) => n + p.wrapped.length, 0)} ${flag("write") ? "wrapped" : "to wrap"}, ${plans.reduce((n, p) => n + p.already.length, 0)} already done`);
    return;
  }
  if (command === "scan" || command === "metadata") {
    const { scan } = await import("./i18n/scan");
    const { isSourceFile } = await import("./i18n/sources");
    const found = scan(root, isSourceFile);
    if (command === "scan") {
      for (const f of found) say(`${f.kind}\t${f.file}:${f.line}\t${f.text}`);
      say(`${found.length} places`);
      if (found.some((f) => f.kind !== "state")) process.exitCode = 1;
      return;
    }
    const { planMetadata } = await import("./i18n/wrap");
    const files = [...new Set(found.filter((f) => f.kind !== "state").map((f) => f.file))];
    let changed = 0;
    for (const f of files) {
      const full = path.join(src, f), text = readFileSync(full, "utf8");
      /* only when the finding sits on the metadata line */
      const lines = new Set(found.filter((x) => x.file === f).map((x) => x.line));
      const out = planMetadata(text, () => true);
      if (!out) continue;
      const at = text.split("\n").findIndex((l) => /^export const metadata\b/.test(l)) + 1;
      const end = at + (/^export const metadata[^\n]*(\n(?!export |const |function |\/\*\*)[^\n]*)*/m.exec(text)?.[0].split("\n").length ?? 1) - 1;
      if (![...lines].some((l) => l >= at && l <= end)) continue;
      changed++;
      if (flag("write")) writeFileSync(full, out);
      say(`${f}: ${flag("write") ? "changed" : "would change"}`);
    }
    say(`${changed} pages`);
    return;
  }
  if (command === "count" || command === "check") {
    const { report } = await import("./i18n/report");
    process.exitCode = await report(command, { lang: opt("lang"), say, root, write: flag("write") });
    return;
  }
  throw new Error("Say what to do: wrap, metadata, scan, count or check. The top of scripts/i18n.ts lists the choices.");
}

main().catch((err) => { console.error(err instanceof Error ? err.message : String(err)); process.exitCode = 1; });
