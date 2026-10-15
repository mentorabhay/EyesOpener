/**
 * Puts every object and array of words in `src/copy/` inside `texts(...)` (see src/i18n/texts.ts), and turns a
 * page's fixed `metadata` into `generateMetadata`, so a page's title is read for each request.
 *
 * Both changes are mechanical and can be run again at any time: a file that is already done is left alone.
 *   npx tsx scripts/i18n.ts wrap [--write]
 *   npx tsx scripts/i18n.ts metadata [--write]
 * Without --write nothing is changed; the plan is printed.
 *
 * What `wrap` leaves alone, and prints, for a person to decide:
 *   - a list marked `as const`: its strings are also types, and code may compare against them
 *   - helper functions at the top of a file (date formats, "1 minute" or "2 minutes"): they run in English
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

export interface WrapPlan { file: string; wrapped: string[]; already: string[]; left: { name: string; why: string }[]; text: string | null }

const strip = (e: ts.Expression): ts.Expression => {
  while (ts.isAsExpression(e) || ts.isSatisfiesExpression(e) || ts.isParenthesizedExpression(e)) e = e.expression;
  return e;
};
const isConst = (e: ts.Expression): boolean => {
  for (;;) {
    if (ts.isAsExpression(e)) { if (ts.isTypeReferenceNode(e.type) && e.type.typeName.getText() === "const") return true; e = e.expression; }
    else if (ts.isSatisfiesExpression(e) || ts.isParenthesizedExpression(e)) e = e.expression;
    else return false;
  }
};
const isWrapped = (e: ts.Expression) => ts.isCallExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === "texts";

/** The id of a source file: its path under src without the extension, "copy/today". */
export const sourceId = (srcRoot: string, file: string) => path.relative(srcRoot, file).split(path.sep).join("/").replace(/\.tsx?$/, "");

export function planWrap(srcRoot: string, file: string, text = readFileSync(file, "utf8")): WrapPlan {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const id = sourceId(srcRoot, file);
  const plan: WrapPlan = { file: id, wrapped: [], already: [], left: [], text: null };
  const edits: { at: number; end: number; put: string }[] = [];
  /* names exported further down: `export { eye as eyeWord }` */
  const exportedLater = new Set<string>();
  for (const st of sf.statements) if (ts.isExportDeclaration(st) && st.exportClause && ts.isNamedExports(st.exportClause)) for (const e of st.exportClause.elements) exportedLater.add((e.propertyName ?? e.name).text);

  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st)) continue;
    const exported = st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
    for (const d of st.declarationList.declarations) {
      if (!ts.isIdentifier(d.name) || !d.initializer) continue;
      const name = d.name.text;
      if (!exported && !exportedLater.has(name)) continue;
      const init = d.initializer, inner = strip(init);
      if (isWrapped(init)) { plan.already.push(name); continue; }
      if (ts.isArrowFunction(inner) || ts.isFunctionExpression(inner)) { plan.left.push({ name, why: "a helper function: it answers in English" }); continue; }
      if (!ts.isObjectLiteralExpression(inner) && !ts.isArrayLiteralExpression(inner)) { plan.left.push({ name, why: "not an object or a list written out here" }); continue; }
      if (isConst(init)) { plan.left.push({ name, why: "marked `as const`: its strings are also types" }); continue; }
      if (ts.isObjectLiteralExpression(inner) && inner.properties.length === 0) { plan.left.push({ name, why: "empty" }); continue; }
      if (ts.isArrayLiteralExpression(inner) && inner.elements.length === 0) { plan.left.push({ name, why: "empty" }); continue; }
      edits.push({ at: init.getStart(sf), end: init.getEnd(), put: `texts("${id}", "${name}", () => (${init.getText(sf)}))` });
      plan.wrapped.push(name);
    }
  }
  if (!edits.length) return plan;
  let out = text;
  for (const e of edits.sort((a, b) => b.at - a.at)) out = out.slice(0, e.at) + e.put + out.slice(e.end);
  if (!/from "@\/i18n\/texts"/.test(out)) {
    /* after the last import, or after the opening comment */
    const imports = sf.statements.filter(ts.isImportDeclaration);
    const line = `import { texts } from "@/i18n/texts";\n`;
    if (imports.length) { const end = imports[imports.length - 1].getEnd(); const nl = out.indexOf("\n", end) + 1; out = out.slice(0, nl) + line + out.slice(nl); }
    else {
      const first = sf.statements[0], start = first ? first.getStart(sf) : 0;
      out = out.slice(0, start) + line + (start === 0 ? "\n" : "\n") + out.slice(start);
    }
  }
  plan.text = out;
  return plan;
}

export const copyFiles = (srcRoot: string): string[] =>
  readdirSync(path.join(srcRoot, "copy")).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.endsWith(".d.ts")).sort().map((f) => path.join(srcRoot, "copy", f));

export function wrapAll(srcRoot: string, write: boolean): WrapPlan[] {
  const plans = copyFiles(srcRoot).map((f) => ({ f, plan: planWrap(srcRoot, f) }));
  if (write) for (const { f, plan } of plans) if (plan.text !== null) writeFileSync(f, plan.text);
  return plans.map((p) => p.plan);
}

/* ───────────── a page's title ───────────── */

/**
 * `export const metadata: Metadata = X;` becomes `export const generateMetadata = (): Metadata => (X);` when X
 * reads words. Null when the file has no such line or needs no change.
 */
export function planMetadata(text: string, readsWords: (expr: string) => boolean): string | null {
  const sf = ts.createSourceFile("page.tsx", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st) || !st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue;
    const d = st.declarationList.declarations[0];
    if (!d || !ts.isIdentifier(d.name) || d.name.text !== "metadata" || !d.initializer) continue;
    const init = d.initializer.getText(sf);
    if (!readsWords(init)) return null;
    const type = d.type ? d.type.getText(sf) : "Metadata";
    const put = `export const generateMetadata = (): ${type} => (${init});`;
    let out = text.slice(0, st.getStart(sf)) + put + text.slice(st.getEnd());
    if (!d.type && !/import type \{[^}]*\bMetadata\b[^}]*\} from "next"/.test(out)) out = `import type { Metadata } from "next";\n${out}`;
    return out;
  }
  return null;
}
