#!/usr/bin/env node
/**
 * The last gate before anything reaches the public repository.
 * It reads every file git would publish (tracked, staged, or with --candidates also untracked files that
 * are not ignored) and stops with an error if a path or a line looks like it belongs in private.
 * It runs before every commit and push (.githooks) and again on GitHub.
 *
 *   node tools/check-public.mjs              tracked and staged files
 *   node tools/check-public.mjs --candidates also files that `git add` would pick up
 */
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).split("\0").filter(Boolean);
const files = new Set([...git("ls-files", "-z"), ...git("diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z")]);
if (process.argv.includes("--candidates")) for (const f of git("ls-files", "--others", "--exclude-standard", "-z")) files.add(f);

/** Only these top-level entries may exist in the public repository. */
const ROOTS = [/^\.gitignore$/, /^\.gitattributes$/, /^README\.md$/, /^app\//, /^\.github\//, /^\.githooks\//, /^tools\/check-public\.mjs$/];

const BAD_PATH = [
  [/(^|\/)(plan|plans|deliverables|refs|private|_private)(\/|$)/i, "a plan or private folder"],
  [/\.private\./i, "a file marked private"],
  [/owner-manual-actions|status-tracking/i, "a planning document"],
  [/(^|\/)\.env(\.(?!example$)[^/]*)?$/, "an environment file"],
  [/\.(pem|key|p12|pfx|jks|keystore)$/i, "a key file"],
  [/(service-account|credentials)[^/]*\.json$/i, "a credentials file"],
  [/(^|\/)(google-services\.json|GoogleService-Info\.plist|key\.properties)$/, "an app signing or services file"],
  [/\.zip$/i, "an archive"],
];

const BAD_LINE = [
  [/@private\b/, "the @private marker"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "a private key"],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, "a Google API key"],
  [/\b(ghp|gho|ghs|ghu)_[0-9A-Za-z]{30,}\b|\bgithub_pat_[0-9A-Za-z_]{40,}\b/, "a GitHub token"],
  [/\b[0-9A-F]{6}-[0-9A-F]{6}-[0-9A-F]{6}\b/, "a billing account number"],
  [/[A-Za-z0-9._%+-]+@(gmail|outlook|yahoo|hotmail)\.[a-z.]+/i, "a personal email address"],
  [/client_secret["']?\s*[:=]\s*["'][^"']{8,}/i, "a client secret"],
  [/[A-Za-z]:\\\\?(IOpener|EyesOpener|IO|clapjar|VC)\b|\/home\/claude\//, "a path on a private machine"],
];

const problems = [];
for (const f of [...files].sort()) {
  if (!ROOTS.some((r) => r.test(f))) problems.push(`${f}: not under an allowed top-level folder`);
  for (const [re, what] of BAD_PATH) if (re.test(f)) problems.push(`${f}: looks like ${what}`);
  let text;
  try {
    if (statSync(f).size > 2_000_000) continue;
    text = readFileSync(f, "utf8");
  } catch { continue; }
  if (text.includes("\u0000") || f === "tools/check-public.mjs") continue;
  text.split("\n").forEach((line, i) => {
    for (const [re, what] of BAD_LINE) if (re.test(line)) problems.push(`${f}:${i + 1}: contains ${what}`);
  });
}

if (problems.length) {
  console.error(`check-public: ${problems.length} problem(s). Nothing may be committed or pushed until these are gone.\n`);
  for (const p of problems.slice(0, 60)) console.error("  " + p);
  if (problems.length > 60) console.error(`  ... and ${problems.length - 60} more`);
  process.exit(1);
}
console.log(`check-public: ${files.size} files checked, nothing private found.`);
