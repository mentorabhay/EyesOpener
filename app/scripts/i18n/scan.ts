// Eyes Opener: Finds the two ways code can go wrong once words are looked up in the reader's language.
/**
 * Finds the two ways code can go wrong once words are looked up in the reader's language.
 *
 * 1. A word read while a module loads, instead of while a page is drawn ("load").
 *    The words in `src/copy/` are looked up at the moment they are read (docs/LANGUAGES.md). A module loads once,
 *    inside whichever request happens to need it first. A word read at that moment would be kept in that first
 *    reader's language and shown to everyone after them. So no word may be read at module level: only inside a
 *    function that runs for one request. Reported:
 *      word     a string, a number, or the result of calling a copy function, read at module level
 *      spread   a copy object spread or destructured into its words at module level
 *      call     a copy object handed to a function at module level (the function may read its words)
 *      reads    a call at module level to a function of this project that reads words when it runs
 *
 * 2. Code that decides something by looking at a word ("logic").
 *    `if (label === "Done")`, `list.includes(word)`, `text.split(" · ")`: all of these stop working when the word
 *    comes back in Hindi. Reported for a person to read: either the comparison is against a value that is not a
 *    word (then the value must be marked as not a word in scripts/i18n/policy.ts), or the code must use
 *    `english(...)` from src/i18n/texts.ts.
 *
 * 3. A word on its way into the database ("stored"): inside `.values(...)`, `.set(...)` or `audit(...)`.
 *    It would be kept in the language of whoever was signed in, and shown to others in that language.
 *
 * Also listed, as "state": module-level state that changes, in a file that reads words. It may keep a word from
 * one request for the next. A person reads these.
 *
 * Used by `src/i18n/captures.test.ts`, which fails on any finding that is not in the allowed list of
 * scripts/i18n/policy.ts, and by `npx tsx scripts/i18n.ts scan`.
 */
import path from "node:path";
import ts from "typescript";

export interface Finding { file: string; line: number; kind: "word" | "spread" | "call" | "reads" | "logic" | "stored" | "state"; text: string }

const short = (s: string) => s.replace(/\s+/g, " ").slice(0, 110);

/** A module whose exports are looked up per request. Given as a path relative to `src`, without the extension. */
export type IsSource = (relativeToSrc: string) => boolean;

export function scan(root: string, isSource: IsSource): Finding[] {
  const config = ts.readConfigFile(path.join(root, "tsconfig.json"), ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  /* TypeScript names files with "/" on every system, Windows too */
  const src = path.join(root, "src").split(path.sep).join("/") + "/";
  const files = parsed.fileNames.filter((f) => f.startsWith(src) && !/\.test\.tsx?$/.test(f) && !f.endsWith(".d.ts"));
  const fileSet = new Set(files);
  const program = ts.createProgram(files, { ...parsed.options, noEmit: true, incremental: false });
  const checker = program.getTypeChecker();
  const rel = (f: string) => path.relative(src, f).split(path.sep).join("/");
  const inSource = (f: string) => f.startsWith(src) && isSource(rel(f).replace(/\.tsx?$/, ""));

  const strip = (e: ts.Expression): ts.Expression => {
    while (ts.isAsExpression(e) || ts.isSatisfiesExpression(e) || ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e)) e = e.expression;
    return e;
  };
  const isFunctionLike = (e: ts.Node) => ts.isArrowFunction(e) || ts.isFunctionExpression(e);

  /** Is this declaration inside the value handed to `texts(...)` in a source file? */
  const sourceCache = new Map<ts.Node, boolean>();
  const inTexts = (d: ts.Node): boolean => {
    if (sourceCache.has(d)) return sourceCache.get(d)!;
    let found = false;
    if (inSource(d.getSourceFile().fileName)) {
      for (let n: ts.Node | undefined = d; n && !ts.isSourceFile(n); n = n.parent) {
        if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "texts") { found = true; break; }
      }
    }
    sourceCache.set(d, found);
    return found;
  };
  /** The export of a source file made with `texts(...)`: `export const today = texts(...)`. */
  const isTextsExport = (d: ts.Declaration): boolean =>
    ts.isVariableDeclaration(d) && !!d.initializer && inSource(d.getSourceFile().fileName)
    && ts.isCallExpression(d.initializer) && ts.isIdentifier(d.initializer.expression) && d.initializer.expression.text === "texts";

  const symbolOf = (n: ts.Node): ts.Symbol | undefined => {
    const s = checker.getSymbolAtLocation(n);
    return s && s.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(s) : s;
  };

  /** Does this expression read from a source: `today`, `today.title`, `t.blocked[reason]`, `n.track`? */
  const readsSource = (e: ts.Expression, depth = 0): boolean => {
    e = strip(e);
    if (depth > 12) return false;
    if (ts.isIdentifier(e)) {
      const sym = symbolOf(e);
      for (const d of sym?.declarations ?? []) {
        if (isTextsExport(d)) return true;
        /* an alias: const n = common.nav; const { title } = today; a parameter is not followed */
        if (ts.isVariableDeclaration(d) && d.initializer && d.initializer !== e && (ts.isIdentifier(d.name))) return readsSource(d.initializer, depth + 1);
        if (ts.isBindingElement(d)) {
          let top: ts.Node = d;
          while (ts.isBindingElement(top) || ts.isObjectBindingPattern(top) || ts.isArrayBindingPattern(top)) top = top.parent;
          if (ts.isVariableDeclaration(top) && top.initializer) return readsSource(top.initializer, depth + 1);
        }
      }
      return false;
    }
    if (ts.isPropertyAccessExpression(e)) {
      const sym = symbolOf(e.name);
      if (sym?.declarations?.some((d) => inTexts(d))) return true;
      return readsSource(e.expression, depth + 1);
    }
    if (ts.isElementAccessExpression(e)) return readsSource(e.expression, depth + 1);
    if (ts.isCallExpression(e)) {
      /* t.sub(name): the result of a copy function. list.map(...) on a copy list still holds words */
      return readsSource(e.expression, depth + 1);
    }
    return false;
  };

  const isWord = (t: ts.Type): boolean => (t.isUnion() ? t.types.some(isWord) : !!(t.flags & (ts.TypeFlags.StringLike | ts.TypeFlags.TemplateLiteral)));
  const isWordList = (t: ts.Type): boolean => checker.isArrayType(t) || checker.isTupleType(t) ? isWord(checker.getTypeArguments(t as ts.TypeReference)[0] ?? t) : false;
  const callable = (t: ts.Type) => t.getCallSignatures().length > 0;

  const declOfCallee = (callee: ts.Expression): ts.Node | undefined => {
    const sym = symbolOf(ts.isPropertyAccessExpression(callee) ? callee.name : callee);
    for (const d of sym?.declarations ?? []) {
      if (!fileSet.has(d.getSourceFile().fileName) || inSource(d.getSourceFile().fileName)) continue;
      if (ts.isFunctionDeclaration(d) || ts.isMethodDeclaration(d)) return d;
      if (ts.isVariableDeclaration(d) && d.initializer && isFunctionLike(strip(d.initializer))) return strip(d.initializer);
    }
    return undefined;
  };

  /** Does running this function read words? Functions it only defines are not followed; functions it calls are. */
  const readsCache = new Map<ts.Node, boolean>();
  const bodyReads = (fn: ts.Node, depth = 0): boolean => {
    if (readsCache.has(fn)) return readsCache.get(fn)!;
    readsCache.set(fn, false);
    let found = false;
    const visit = (n: ts.Node, top: boolean) => {
      if (found) return;
      if (!top && (ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n))) return;
      if (!top && isFunctionLike(n)) {
        const p = n.parent;
        const called = (ts.isCallExpression(p) && p.expression === n) || (ts.isParenthesizedExpression(p) && ts.isCallExpression(p.parent) && p.parent.expression === p)
          /* handed to map, filter, forEach and the like: it runs now */
          || (ts.isCallExpression(p) && p.arguments.includes(n as ts.Expression) && ts.isPropertyAccessExpression(p.expression) && /^(map|flatMap|filter|forEach|reduce|some|every|find|sort)$/.test(p.expression.name.text));
        if (!called) return;
      }
      if ((ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n) || ts.isIdentifier(n)) && ts.isExpression(n) && !isName(n) && readsSource(n)) {
        const t = checker.getTypeAtLocation(n);
        if (isWord(t) || ts.isCallExpression(n.parent) && n.parent.expression === n) { found = true; return; }
      }
      if (depth < 4 && ts.isCallExpression(n)) {
        const target = declOfCallee(n.expression);
        if (target && bodyReads(target, depth + 1)) { found = true; return; }
      }
      ts.forEachChild(n, (c) => visit(c, false));
    };
    visit(fn, true);
    readsCache.set(fn, found);
    return found;
  };
  const isName = (n: ts.Node): boolean => {
    const p = n.parent;
    return (ts.isPropertyAccessExpression(p) && p.name === n) || (ts.isPropertyAssignment(p) && p.name === n) || ts.isImportSpecifier(p) || ts.isExportSpecifier(p)
      || (ts.isBindingElement(p) && (p.propertyName === n || p.name === n)) || (ts.isVariableDeclaration(p) && p.name === n) || ts.isTypeReferenceNode(p) || ts.isTypeQueryNode(p)
      || ts.isQualifiedName(p) || (ts.isParameter(p) && p.name === n) || (ts.isJsxAttribute(p) && p.name === n);
  };

  const LOGIC_METHOD = /^(includes|indexOf|lastIndexOf|startsWith|endsWith|split|match|matchAll|search|localeCompare|test|slice|substring|substr|charAt|at|toLowerCase|toUpperCase)$/;
  const LOOKUP_METHOD = /^(includes|indexOf|has|get|startsWith|endsWith)$/;

  const out: Finding[] = [];
  for (const sf of program.getSourceFiles()) {
    if (!fileSet.has(sf.fileName) || inSource(sf.fileName) || /\/i18n\//.test(sf.fileName)) continue;
    const add = (n: ts.Node, kind: Finding["kind"]) => {
      const line = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
      if (!out.some((o) => o.file === rel(sf.fileName) && o.line === line && o.kind === kind)) out.push({ file: rel(sf.fileName), line, kind, text: short(n.getText(sf)) });
    };
    let reads = false;

    /** `e` is a whole read of a source (not part of a longer chain). `atLoad`: this code runs when the module loads. */
    const judge = (e: ts.Expression, atLoad: boolean) => {
      reads = true;
      const type = checker.getTypeAtLocation(e);
      const p = e.parent;
      const word = isWord(type) && !callable(type);
      /* logic, wherever it is */
      if (word || isWordList(type)) {
        if (word && ts.isBinaryExpression(p) && /^(===|!==|==|!=)$/.test(p.operatorToken.getText(sf))) {
          const other = strip(p.left === e ? p.right : p.left);
          if (!(other.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(other) && other.text === "undefined") || (ts.isStringLiteral(other) && other.text === ""))) add(p, "logic");
        }
        if (ts.isPropertyAccessExpression(p) && p.expression === e && ts.isCallExpression(p.parent) && p.parent.expression === p && (word ? LOGIC_METHOD : /^(includes|indexOf)$/).test(p.name.text)) add(p.parent, "logic");
        if (word && ts.isCallExpression(p) && p.arguments.includes(e) && ts.isPropertyAccessExpression(p.expression) && LOOKUP_METHOD.test(p.expression.name.text)) add(p, "logic");
        if (word && ts.isNewExpression(p) && p.arguments?.includes(e) && p.expression.getText(sf) === "RegExp") add(p, "logic");
        if (word && ts.isElementAccessExpression(p) && p.argumentExpression === e) add(p, "logic");
        if (word && (ts.isSwitchStatement(p) || ts.isCaseClause(p))) add(p, "logic");
      }
      /* a word on its way into the database: it would be kept in the language of whoever was there */
      if (word || ts.isCallExpression(strip(e))) {
        for (let up: ts.Node = e; up.parent && !ts.isSourceFile(up.parent) && !ts.isFunctionLike(up); up = up.parent) {
          const c = up.parent;
          if (ts.isCallExpression(c) && c.arguments.includes(up as ts.Expression) && ((ts.isPropertyAccessExpression(c.expression) && /^(values|set|onConflictDoUpdate)$/.test(c.expression.name.text)) || (ts.isIdentifier(c.expression) && c.expression.text === "audit"))) { add(e, "stored"); break; }
        }
      }
      if (!atLoad) return;
      if (word || !!(type.flags & ts.TypeFlags.NumberLike) || ts.isCallExpression(strip(e))) { add(e, "word"); return; }
      if (callable(type)) return; /* a copy function kept for later: it is looked up when it is called */
      if (ts.isSpreadElement(p) || ts.isSpreadAssignment(p)) { add(p, "spread"); return; }
      if (ts.isVariableDeclaration(p) && p.initializer === e && !ts.isIdentifier(p.name)) {
        /* const { a, b } = copy: fine when a and b are objects, a capture when they are words */
        const leaks = (b: ts.BindingName): boolean => !ts.isIdentifier(b) && b.elements.some((el) => ts.isBindingElement(el) && (ts.isIdentifier(el.name) ? isWord(checker.getTypeAtLocation(el.name)) || !!el.dotDotDotToken : leaks(el.name)));
        if (leaks(p.name)) add(p, "spread");
        return;
      }
      if ((ts.isCallExpression(p) || ts.isNewExpression(p)) && p.arguments?.includes(e)) { add(p, "call"); return; }
      if (ts.isForOfStatement(p) || ts.isForInStatement(p)) { add(p, "spread"); return; }
      if (ts.isTemplateSpan(p) || ts.isBinaryExpression(p) || ts.isJsxExpression(p)) add(p, "word");
    };

    const walk = (n: ts.Node, atLoad: boolean) => {
      if (ts.isImportDeclaration(n) || ts.isTypeAliasDeclaration(n) || ts.isInterfaceDeclaration(n) || ts.isExportDeclaration(n) || ts.isTypeNode(n)) return;
      let inner = atLoad;
      if (ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n) || ts.isGetAccessor(n) || ts.isSetAccessor(n) || ts.isConstructorDeclaration(n)) inner = false;
      else if (isFunctionLike(n)) {
        const p = n.parent;
        const called = (ts.isCallExpression(p) && p.expression === n) || (ts.isParenthesizedExpression(p) && ts.isCallExpression(p.parent) && p.parent.expression === p)
          || (ts.isCallExpression(p) && p.arguments.includes(n as ts.Expression) && ts.isPropertyAccessExpression(p.expression) && /^(map|flatMap|filter|forEach|reduce|some|every|find|sort)$/.test(p.expression.name.text));
        if (!called) inner = false;
      } else if (ts.isPropertyDeclaration(n) && !n.modifiers?.some((x) => x.kind === ts.SyntaxKind.StaticKeyword)) inner = false;

      if (inner && ts.isCallExpression(n)) {
        const target = declOfCallee(n.expression);
        if (target && bodyReads(target)) add(n, "reads");
      }
      if ((ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n) || ts.isIdentifier(n) || ts.isCallExpression(n)) && !isName(n) && readsSource(n)) {
        /* only the whole chain is judged: common.nav.today, not common.nav */
        const p = n.parent;
        const partOfLonger = ((ts.isPropertyAccessExpression(p) || ts.isElementAccessExpression(p) || ts.isNonNullExpression(p)) && p.expression === n) || (ts.isCallExpression(p) && p.expression === n)
          || (ts.isParenthesizedExpression(p) || ts.isAsExpression(p) || ts.isSatisfiesExpression(p));
        if (!partOfLonger) judge(n, inner);
        /* the arguments of a copy function are walked too */
        if (ts.isCallExpression(n)) n.arguments.forEach((a) => walk(a, inner));
        else if (ts.isElementAccessExpression(n)) walk(n.argumentExpression, inner);
        if (!partOfLonger) return;
      }
      ts.forEachChild(n, (c) => walk(c, inner));
    };
    const stateful: ts.Node[] = [];
    for (const st of sf.statements) {
      walk(st, true);
      if (ts.isVariableStatement(st)) {
        const isLet = !(st.declarationList.flags & ts.NodeFlags.Const);
        for (const d of st.declarationList.declarations) {
          const init = d.initializer && strip(d.initializer);
          if (isLet || (init && ts.isNewExpression(init) && ts.isIdentifier(init.expression) && /^(Map|WeakMap)$/.test(init.expression.text) && !init.arguments?.length)) stateful.push(d);
        }
      }
    }
    if (reads) for (const d of stateful) add(d, "state");
  }
  return out.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.kind.localeCompare(b.kind));
}
