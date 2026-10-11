// Eyes Opener: No word may be read while a module loads, compared against, or written to the database in a reader's language.
/**
 * No word may be read while a module loads, compared against, or written to the database in a reader's language.
 * scripts/i18n/scan.ts reads the whole app with the TypeScript compiler and lists every such place; this test
 * fails on any that a person has not read and allowed in scripts/i18n/policy.ts.
 *
 * When this fails after new work:
 *   - "word", "spread", "reads": a word is read at the top of a file. Move the read inside the function that
 *     draws (`const items = () => [...]`), or for a page's title run `npx tsx scripts/i18n.ts metadata --write`.
 *   - "logic": code decides something by looking at a word. Compare a value instead, or read `english(...)`.
 *   - "stored": a word goes into the database. Wrap it in `inEnglish(() => ...)`.
 *   - a new file of words that is not inside `texts(...)`: run `npx tsx scripts/i18n.ts wrap --write`.
 */
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isAllowed } from "../../scripts/i18n/policy";
import { scan } from "../../scripts/i18n/scan";
import { isSourceFile } from "../../scripts/i18n/sources";
import { planMetadata, planWrap, wrapAll } from "../../scripts/i18n/wrap";

const root = path.resolve(__dirname, "../..");

describe("words are read for one request at a time", () => {
  it("nothing reads a word while a module loads, decides by a word, or stores one", { timeout: 180_000 }, () => {
    const found = scan(root, isSourceFile).filter((f) => !isAllowed(f));
    expect(found.map((f) => `${f.kind} ${f.file}:${f.line} ${f.text}`)).toEqual([]);
  });
  it("every object and list of words in src/copy is made with texts(...)", () => {
    const left = wrapAll(path.join(root, "src"), false).flatMap((p) => p.wrapped.map((name) => `${p.file}: ${name}`));
    expect(left, "run: npx tsx scripts/i18n.ts wrap --write").toEqual([]);
  });
});

describe("the two mechanical changes", () => {
  const src = "/app/src";
  it("puts an object of words inside texts(...), with its file and name", () => {
    const plan = planWrap(src, "/app/src/copy/today.ts", `/** Words. */\nimport { x } from "./x";\n\nexport const today = {\n  title: "Today",\n};\nexport const help: Record<string, string> = { a: "A" };\n`);
    expect(plan.wrapped).toEqual(["today", "help"]);
    expect(plan.text).toContain(`import { texts } from "@/i18n/texts";`);
    expect(plan.text).toContain(`export const today = texts("copy/today", "today", () => ({\n  title: "Today",\n}));`);
    expect(plan.text).toContain(`export const help: Record<string, string> = texts("copy/today", "help", () => ({ a: "A" }));`);
  });
  it("leaves alone what is already done, helper functions, lists that are also types, and empty objects", () => {
    const text = `import { texts } from "@/i18n/texts";\nexport const a = texts("copy/a", "a", () => ({ x: "X" }));\nexport const day = (d: Date) => String(d);\nexport const DAYS = ["Mon", "Tue"] as const;\nexport const none = {};\n`;
    const plan = planWrap(src, "/app/src/copy/a.ts", text);
    expect(plan.wrapped).toEqual([]);
    expect(plan.already).toEqual(["a"]);
    expect(plan.left.map((l) => l.name)).toEqual(["day", "DAYS", "none"]);
    expect(plan.text).toBeNull();
  });
  it("wraps a name that is exported further down", () => {
    const plan = planWrap(src, "/app/src/copy/c.ts", `const eye = { left: "left" };\nexport { eye as eyeWord };\n`);
    expect(plan.wrapped).toEqual(["eye"]);
    expect(plan.text).toContain(`const eye = texts("copy/c", "eye", () => ({ left: "left" }));`);
  });
  it("turns a page's fixed title into one that is read for each request", () => {
    const out = planMetadata(`import type { Metadata } from "next";\nimport { today as t } from "@/copy/today";\nexport const metadata: Metadata = { title: t.title };\nexport default function Page() { return null; }\n`, () => true);
    expect(out).toContain(`export const generateMetadata = (): Metadata => ({ title: t.title });`);
    expect(out).not.toContain("export const metadata");
    expect(planMetadata(`export default function Page() { return null; }\n`, () => true)).toBeNull();
  });
});
