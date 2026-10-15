/**
 * The plain-words report: every finding of src/lib/plain-words.ts over every English sentence of the app.
 *   npx tsx scripts/plain-words.ts            counts by rule and by file, then the hard findings
 *   npx tsx scripts/plain-words.ts --soft     the soft findings too (long sentences, school grade)
 *   npx tsx scripts/plain-words.ts --baseline write src/lib/plain-words.baseline.json from today's soft counts
 */
import "./env";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ALLOWED, allowedBy, check, isCitation, readerOf, type Reader } from "../src/lib/plain-words";
import { extract } from "./i18n/extract";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const { units } = await extract(root);
  const ok = allowedBy(ALLOWED);
  const hard: string[] = [], soft: string[] = [];
  const byRule = new Map<string, number>(), softBy: Record<string, Record<Reader, number>> = {};
  for (const u of units) {
    const reader = readerOf(u.file, u.key);
    for (const f of check(u.english, reader, isCitation(u.key))) {
      if (f.hard && ok(f.rule, u.file, u.key)) continue;
      byRule.set(f.rule, (byRule.get(f.rule) ?? 0) + 1);
      const line = `${f.rule.padEnd(10)} ${u.file}:${u.key}  [${f.what}]  ${u.english.slice(0, 150)}`;
      if (f.hard) hard.push(line);
      else { soft.push(line); ((softBy[f.rule] ??= { family: 0, public: 0, professional: 0, staff: 0 })[reader])++; }
    }
  }
  console.log(`${units.length} sentences. Findings by rule: ${[...byRule].map(([r, n]) => `${r} ${n}`).join(", ") || "none"}`);
  console.log(`Hard findings: ${hard.length}`);
  for (const l of hard.sort()) console.log("  " + l);
  if (process.argv.includes("--soft")) for (const l of soft.sort()) console.log("  " + l);
  console.log("Soft counts:", JSON.stringify(softBy));
  if (process.argv.includes("--baseline")) {
    writeFileSync(path.join(root, "src/lib/plain-words.baseline.json"), JSON.stringify(softBy, null, 1) + "\n");
    console.log("Baseline written.");
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
