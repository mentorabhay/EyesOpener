#!/usr/bin/env node
// Fails when the product's old name could reach a person's screen: the product is Eyes Opener (October 2026).
//
// What counts is what a member or a staff member can see: words on pages, titles, emails, the admin console,
// the demo people's addresses on the sign-in page, a downloaded file's name. Technical names nobody sees
// (cookie and storage keys, request headers, environment variables, cloud resource names, the Android package)
// may keep the old spelling (Ved, 17 October 2026: "no change needed if any of the user surface does not see it").
// So this looks for the written name (IOpener, Iopener, I-Opener, I Opener), and for the two lowercase forms
// that are shown to people.
//
// Usage: node tools/no-old-name.mjs            (checks every tracked file)
//        node tools/no-old-name.mjs --staged   (checks only what is about to be committed; used by the hook)
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const NAME = /\bI[ ._-]?[Oo]pener\b/g;
/* Shown to people: the demo addresses on the sign-in page and the family-data file name. Test files may keep old fake values (a signed test token carries one). */
const SHOWN = /@iopener\.test\b|iopener-family-data/g;
const isTest = (f) => /\.test\.[cm]?[jt]sx?$/.test(f);
const SELF = "tools/no-old-name.mjs";

const staged = process.argv.includes("--staged");
const files = execFileSync("git", staged ? ["diff", "--cached", "--name-only", "--diff-filter=ACMR"] : ["ls-files"], { encoding: "utf8" })
  .split("\n").filter(Boolean);

const hits = [];
for (const file of files) {
  if (file === SELF || !existsSync(file)) continue;
  const buf = readFileSync(file);
  if (buf.includes(0)) continue; // binary
  buf.toString("utf8").split("\n").forEach((line, i) => {
    const found = [...(line.match(NAME) ?? []), ...(isTest(file) ? [] : line.match(SHOWN) ?? [])];
    if (found.length) hits.push(`${file}:${i + 1}: ${found.join(", ")}`);
  });
}

if (hits.length) {
  console.error(`The old product name appears ${hits.length} time(s) where people could see it. The product is Eyes Opener.`);
  for (const h of hits.slice(0, 60)) console.error("  " + h);
  if (hits.length > 60) console.error(`  … and ${hits.length - 60} more`);
  process.exit(1);
}
console.log(`No old product name in ${files.length} file(s).`);
