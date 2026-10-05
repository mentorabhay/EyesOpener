/**
 * Which words the browser's own code can ever read.
 *
 * Most of the app's words are read on the server, while a page is drawn. Only the parts of a page that run in the
 * browser ("use client") read words there, and a browser has to be given those words before the page comes alive
 * (src/i18n/client-words.ts). Sending a language's whole set to every browser would be a megabyte or more; this
 * finds the part that is needed, by reading the source with the TypeScript compiler:
 *
 *   1. the files that reach the browser: every file that says "use client", and everything they import, and so
 *      on. An `import type` brings no code, and a file of server actions ("use server") is a door, not code: both
 *      are left out.
 *   2. in those files, every place a file of words is read: `site.nav.signIn`, `t.choose`, `joined(a, b)`. The
 *      part before the first step that cannot be read from the source is kept as a prefix: `site.nav.signIn`,
 *      `languages.choose`, and for a whole object handed on, just its name.
 *
 * The answer, for each source file of words: `true` (all of it), or the list of prefixes. A key is sent to the
 * browser when it is a prefix, or continues one with "." or "(" (src/i18n/client-list.ts).
 *
 * It errs on the side of sending more. And it cannot make a page wrong: while the server draws the browser's
 * parts of a page it reads from the very same set the browser is given (src/i18n/runtime.ts), so the two always
 * agree. A word this analysis missed is shown in English by both, and tools/lang-sweep finds it.
 * When something cannot be read from the source at all, the answer is null and everything is sent.
 */
import path from "node:path";
import ts from "typescript";
import type { ClientList } from "../../src/i18n/client-list";

const DIRECTIVE = (sf: ts.SourceFile, text: string): boolean => {
  for (const st of sf.statements) {
    if (!ts.isExpressionStatement(st) || !ts.isStringLiteral(st.expression)) return false;
    if (st.expression.text === text) return true;
  }
  return false;
};

export function clientListOf(root: string, isSource: (relativeToSrc: string) => boolean): ClientList | null {
  const config = ts.readConfigFile(path.join(root, "tsconfig.json"), ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const src = path.join(root, "src") + path.sep;
  const files = parsed.fileNames.filter((f) => f.startsWith(src) && !/\.test\.tsx?$/.test(f) && !f.endsWith(".d.ts"));
  const program = ts.createProgram(files, { ...parsed.options, noEmit: true, incremental: false });
  const checker = program.getTypeChecker();
  const rel = (f: string) => path.relative(src, f).split(path.sep).join("/").replace(/\.tsx?$/, "");
  const inSrc = (f: string) => f.startsWith(src) && !f.endsWith(".d.ts") && /\.tsx?$/.test(f);

  /* ── 1. the files that reach the browser ── */
  /** Files brought in as a whole (`import * as`, `import(...)`, `require(...)`, `export *`): what is read from them cannot be followed by name. */
  const takenWhole = new Set<string>();
  const runtimeImports = (sf: ts.SourceFile): string[] => {
    const out: string[] = [];
    const add = (spec: ts.Expression | undefined, whole: boolean) => {
      if (!spec || !ts.isStringLiteralLike(spec)) return;
      const r = ts.resolveModuleName(spec.text, sf.fileName, parsed.options, ts.sys).resolvedModule;
      if (!r || !inSrc(r.resolvedFileName)) return;
      out.push(r.resolvedFileName);
      if (whole) takenWhole.add(r.resolvedFileName);
    };
    const visit = (n: ts.Node) => {
      if (ts.isImportDeclaration(n)) {
        const c = n.importClause;
        /* `import type {...}` and `import { type A, type B }` bring no code */
        const typeOnly = !!c && (c.isTypeOnly || (!c.name && !!c.namedBindings && ts.isNamedImports(c.namedBindings) && c.namedBindings.elements.length > 0 && c.namedBindings.elements.every((e) => e.isTypeOnly)));
        if (!typeOnly) add(n.moduleSpecifier, !!c?.namedBindings && ts.isNamespaceImport(c.namedBindings));
        return;
      }
      if (ts.isExportDeclaration(n)) { if (!n.isTypeOnly) add(n.moduleSpecifier, !n.exportClause || ts.isNamespaceExport(n.exportClause)); return; }
      if (ts.isCallExpression(n) && (n.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(n.expression) && n.expression.text === "require"))) add(n.arguments[0], true);
      ts.forEachChild(n, visit);
    };
    visit(sf);
    return out;
  };
  const reach = new Set<string>();
  const stack = program.getSourceFiles().filter((sf) => inSrc(sf.fileName) && files.includes(sf.fileName) && DIRECTIVE(sf, "use client")).map((sf) => sf.fileName);
  while (stack.length) {
    const f = stack.pop()!;
    if (reach.has(f)) continue;
    const sf = program.getSourceFile(f);
    if (!sf || DIRECTIVE(sf, "use server")) continue;
    reach.add(f);
    for (const i of runtimeImports(sf)) if (!reach.has(i)) stack.push(i);
  }

  /* ── 2. what those files read ── */
  const out = new Map<string, true | Set<string>>();
  const whole = (file: string) => { out.set(file, true); };
  const prefix = (file: string, p: string) => { const had = out.get(file); if (had === true) return; if (had) had.add(p); else out.set(file, new Set([p])); };
  const strip = (e: ts.Node): ts.Node => { while (ts.isAsExpression(e) || ts.isSatisfiesExpression(e) || ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e)) e = e.expression; return e; };
  const literal = (e: ts.Expression | undefined): string | null => {
    if (!e) return null;
    const n = strip(e);
    if (ts.isStringLiteralLike(n)) return n.text;
    if (ts.isIdentifier(n)) {
      let sym = checker.getSymbolAtLocation(n);
      if (sym && sym.flags & ts.SymbolFlags.Alias) sym = checker.getAliasedSymbol(sym);
      const d = sym?.valueDeclaration;
      if (d && ts.isVariableDeclaration(d) && d.initializer) { const v = strip(d.initializer); if (ts.isStringLiteralLike(v)) return v.text; }
    }
    return null;
  };
  /** `const x = texts("copy/site", "site", ...)`: the file and the name its keys begin with. */
  const made = new Map<ts.Symbol, { file: string; name: string }>();
  let unknown = false;
  for (const f of reach) {
    /* the wrapper's own file calls itself with whatever it was given */
    if (rel(f) === "i18n/texts") continue;
    const sf = program.getSourceFile(f)!;
    const visit = (n: ts.Node) => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && (n.expression.text === "texts" || n.expression.text === "textsEach")) {
        const file = literal(n.arguments[0]);
        if (file === null) { unknown = true; if (process.env.IO_LANG_DEBUG) console.error(`cannot read the file name of ${n.getText(sf).slice(0, 80)} in ${rel(f)}`); return; }
        if (!isSource(file)) { ts.forEachChild(n, visit); return; }
        const name = n.expression.text === "texts" ? literal(n.arguments[1]) : null;
        const p = n.parent;
        const sym = name !== null && ts.isVariableDeclaration(p) && p.initializer === n && ts.isIdentifier(p.name) ? checker.getSymbolAtLocation(p.name) : undefined;
        /* anything other than a named object kept in a `const` is read in ways this cannot follow: all of the file */
        if (sym && name !== null && !takenWhole.has(f)) made.set(sym, { file, name }); else whole(file);
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  if (unknown) return null;

  /**
   * Is this step a field written in the words themselves? `links.filter`, `title.length` and `list[0].trim` are
   * not: they belong to every list and every string, and the chain stops before them. So does a name looked up
   * in a record whose fields the compiler does not know one by one (`help[slug]`, `Record<string, string>`).
   */
  const isOwnField = (name: ts.Node): boolean => {
    const decls = checker.getSymbolAtLocation(name)?.declarations ?? [];
    return decls.length > 0 && decls.every((d) => inSrc(d.getSourceFile().fileName) && (ts.isPropertyAssignment(d) || ts.isShorthandPropertyAssignment(d) || ts.isMethodDeclaration(d)));
  };
  const isDeclarationName = (n: ts.Identifier): boolean => {
    const p = n.parent;
    return (ts.isVariableDeclaration(p) && p.name === n) || ts.isImportSpecifier(p) || ts.isImportClause(p) || ts.isNamespaceImport(p) || ts.isExportSpecifier(p)
      || (ts.isPropertyAccessExpression(p) && p.name === n) || (ts.isPropertyAssignment(p) && p.name === n) || ts.isTypeQueryNode(p) || ts.isQualifiedName(p)
      || (ts.isBindingElement(p) && p.propertyName === n) || (ts.isJsxAttribute(p) && p.name === n);
  };
  for (const f of reach) {
    const sf = program.getSourceFile(f)!;
    const visit = (n: ts.Node) => {
      if (ts.isImportDeclaration(n) || ts.isTypeNode(n) || ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n)) return;
      if (ts.isIdentifier(n) && !isDeclarationName(n)) {
        let sym = ts.isShorthandPropertyAssignment(n.parent) ? checker.getShorthandAssignmentValueSymbol(n.parent) : checker.getSymbolAtLocation(n);
        if (sym && sym.flags & ts.SymbolFlags.Alias) sym = checker.getAliasedSymbol(sym);
        const source = sym && made.get(sym);
        if (source) {
          /* as far along the chain as the source text names each step */
          let at: ts.Node = n, key = source.name;
          for (;;) {
            let p = at.parent;
            while (ts.isAsExpression(p) || ts.isSatisfiesExpression(p) || ts.isParenthesizedExpression(p) || ts.isNonNullExpression(p)) { at = p; p = p.parent; }
            if (ts.isPropertyAccessExpression(p) && p.expression === at && !ts.isPrivateIdentifier(p.name) && isOwnField(p.name)) { key += `.${p.name.text}`; at = p; continue; }
            if (ts.isElementAccessExpression(p) && p.expression === at && (ts.isStringLiteralLike(p.argumentExpression) || ts.isNumericLiteral(p.argumentExpression)) && isOwnField(p.argumentExpression)) { key += `.${p.argumentExpression.text}`; at = p; continue; }
            break;
          }
          prefix(source.file, key);
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }

  const result: Record<string, true | string[]> = {};
  for (const [file, v] of [...out].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (v === true) { result[file] = true; continue; }
    /* a prefix that continues a shorter one adds nothing */
    const all = [...v].sort();
    result[file] = all.filter((p) => !all.some((q) => q !== p && p.startsWith(q) && (p[q.length] === "." || p[q.length] === "(")));
  }
  return result;
}
