/**
 * Lists every piece of English text the app can show, with the key it is looked up under and its mark.
 * This is the one list the counts, the checks and the translation pipeline all work from, in both editions.
 *
 * It reads the words twice, and joins the two readings by key:
 *   - from the running code: every source made with `texts(...)` is loaded and walked, so each sentence is exactly
 *     what the app would show, with sentences built from other sentences already put together
 *   - from the source text, with the TypeScript compiler: the names and types of each copy function's
 *     parameters, and which strings are not words but values the code compares against
 *
 * A copy function becomes one or more templates (src/i18n/template.ts):
 *   - a parameter that takes one of a few fixed values ("left" | "right", true or false, null) is never left
 *     open: each value gets its own entry, with the value in the key: `settings.eye.lens(left)`
 *   - a number or a free text stays open: `settings.family.switchTo(*)` with the template "Switch to {name}"
 *   - where 0 or 1 reads differently ("No training minutes", "1 minute"), those get their own entries too
 *   - a function whose wording depends on its values in any other way cannot be a template. It is listed in
 *     `skipped` with the reason, and the app shows it in English.
 */
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { mark } from "../../src/i18n/mark";
import { callKeys } from "../../src/i18n/runtime";
import { fill, placeholders, templateOf, type Fixed } from "../../src/i18n/template";
import { allSources, madeByTexts, sceneAt, type Source } from "../../src/i18n/texts";
import { valueByPolicy } from "./policy";
import { DATA_SOURCES, isSourceFile } from "./sources";

export interface Unit {
  /** The source file, "copy/today". Also the name of the translation file. */
  file: string;
  key: string;
  /** The English text, or the English template with {placeholders}. */
  english: string;
  /** The mark of `english`. */
  source: string;
  kind: "text" | "template" | "fixed";
  /** For a template: the function's parameter names, in order. */
  params?: string[];
  /** True for words drawn inside a game scene. */
  scene?: boolean;
  /** For the reviewer: where this text is from, and what its placeholders stand for. */
  note: string;
}
export interface Skipped { file: string; key: string; why: string; english?: string }
export interface Extract { units: Unit[]; skipped: Skipped[]; files: string[] }

/* ───────────── is this string a word? ───────────── */

/** Field names whose strings are values for the code when they look like one: `id: "kite"`, `tone: "ok"`, `key: "all"`. */
const VALUE_FIELD = /^(href|url|src|slug|id|key|code|icon|tone|className|class|path|route|param|kind|type|name|field|link|unit|email|address|file)$/;
/** A lone lower-case token with no space: "bird-wire", "ok", "all". */
const TOKEN = /^[a-z0-9]+([_-][a-z0-9]+)*$/;
/** The string is a word unless it is plainly a value for the code. Returns why it is not a word, or null. */
export function notAWord(field: string, value: string): string | null {
  if (!/\p{L}/u.test(value)) return "no letters in it";
  if (/^(https?:\/\/|mailto:|\/|#|\.\.?\/)\S*$/.test(value)) return "an address";
  if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(value)) return "an address";
  if (/^(href|url|src|slug)$/.test(field) && /^\S+$/.test(value)) return `a "${field}" value`;
  if (TOKEN.test(value) && VALUE_FIELD.test(field) && !/^(name|unit|kind|type|field|link|email|code|address|file)$/.test(field)) return `a "${field}" value`;
  if (TOKEN.test(value) && value.includes("_")) return "a code";
  return null;
}

/* ───────────── the source text ───────────── */

type ParamKind = { kind: "enum"; values: (string | number | boolean | null)[] } | { kind: "number" | "string" | "other" };
interface Param { name: string; optional: boolean; type: ParamKind }
interface Ast { program: ts.Program; checker: ts.TypeChecker; root: string }

function openAst(root: string, files: string[]): Ast {
  const config = ts.readConfigFile(path.join(root, "tsconfig.json"), ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const program = ts.createProgram(files, { ...parsed.options, noEmit: true, incremental: false });
  return { program, checker: program.getTypeChecker(), root };
}

const strip = (e: ts.Node): ts.Node => {
  while (ts.isAsExpression(e) || ts.isSatisfiesExpression(e) || ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e)) e = e.expression;
  return e;
};

/** The expression a name stands for, when the name is a `const` with a value written out. */
function valueOf(ast: Ast, id: ts.Identifier): ts.Node | undefined {
  let sym = ast.checker.getSymbolAtLocation(id);
  if (sym && sym.flags & ts.SymbolFlags.Alias) sym = ast.checker.getAliasedSymbol(sym);
  const d = sym?.valueDeclaration;
  return d && ts.isVariableDeclaration(d) && d.initializer ? d.initializer : undefined;
}

function resolve(ast: Ast, node: ts.Node | undefined, depth = 0): ts.Node | undefined {
  if (!node || depth > 6) return undefined;
  const n = strip(node);
  if (ts.isIdentifier(n)) return resolve(ast, valueOf(ast, n), depth + 1);
  /* texts("file", "name", () => (...)) */
  if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "texts" && n.arguments[2] && ts.isArrowFunction(n.arguments[2])) return resolve(ast, n.arguments[2].body, depth + 1);
  return n;
}

const nameOf = (p: ts.PropertyName): string | undefined => (ts.isIdentifier(p) || ts.isStringLiteral(p) || ts.isNumericLiteral(p) || ts.isNoSubstitutionTemplateLiteral(p) ? p.text : undefined);

/** The node written for one field of an object or one element of a list. */
function child(ast: Ast, node: ts.Node | undefined, seg: string): ts.Node | undefined {
  const n = resolve(ast, node);
  if (!n) return undefined;
  if (ts.isObjectLiteralExpression(n)) {
    for (let i = n.properties.length - 1; i >= 0; i--) {
      const p = n.properties[i];
      if (ts.isPropertyAssignment(p) && nameOf(p.name) === seg) return p.initializer;
      if (ts.isShorthandPropertyAssignment(p) && p.name.text === seg) {
        const sym = ast.checker.getShorthandAssignmentValueSymbol(p);
        const d = sym?.valueDeclaration;
        return d && ts.isVariableDeclaration(d) ? d.initializer : undefined;
      }
      if (ts.isMethodDeclaration(p) && nameOf(p.name) === seg) return p;
      if (ts.isSpreadAssignment(p)) { const found = child(ast, p.expression, seg); if (found) return found; }
    }
    return undefined;
  }
  if (ts.isArrayLiteralExpression(n)) {
    const i = Number(seg);
    return Number.isInteger(i) && !n.elements.slice(0, i + 1).some(ts.isSpreadElement) ? n.elements[i] : undefined;
  }
  return undefined;
}

function kindOfType(ast: Ast, t: ts.Type): ParamKind {
  const parts = t.isUnion() ? t.types : [t];
  const values: (string | number | boolean | null)[] = [];
  let open: "number" | "string" | "other" | null = null;
  for (const p of parts) {
    if (p.flags & ts.TypeFlags.StringLiteral) values.push((p as ts.StringLiteralType).value);
    else if (p.flags & ts.TypeFlags.NumberLiteral) values.push((p as ts.NumberLiteralType).value);
    else if (p.flags & ts.TypeFlags.BooleanLiteral) values.push(ast.checker.typeToString(p) === "true");
    else if (p.flags & ts.TypeFlags.Null) values.push(null);
    else if (p.flags & ts.TypeFlags.Undefined) continue;
    else if (p.flags & ts.TypeFlags.Number) open = open && open !== "number" ? "other" : "number";
    else if (p.flags & ts.TypeFlags.String) open = open && open !== "string" ? "other" : "string";
    else open = "other";
  }
  if (!open) return values.length ? { kind: "enum", values } : { kind: "other" };
  /* "number | null": the number stays open and null gets its own entry */
  return open === "other" ? { kind: "other" } : values.length ? { kind: open, ...({ also: values } as object) } as ParamKind : { kind: open };
}

function paramsOf(ast: Ast, node: ts.Node | undefined): Param[] | undefined {
  const n = resolve(ast, node);
  if (!n || !(ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isMethodDeclaration(n))) return undefined;
  const out: Param[] = [];
  for (const p of n.parameters) {
    if (!ts.isIdentifier(p.name) || p.dotDotDotToken) return undefined;
    out.push({ name: p.name.text, optional: !!p.questionToken || !!p.initializer, type: kindOfType(ast, ast.checker.getTypeAtLocation(p)) });
  }
  return out;
}

/** True when the string written here is one of a fixed set of values by its type: the code compares against it. */
function isValueByType(ast: Ast, node: ts.Node | undefined): boolean {
  if (!node) return false;
  const n = strip(node);
  if (!ts.isStringLiteral(n) && !ts.isNoSubstitutionTemplateLiteral(n)) return false;
  const t = ast.checker.getContextualType(n as ts.Expression);
  if (!t) return false;
  const parts = t.isUnion() ? t.types : [t];
  return parts.length > 0 && parts.every((p) => !!(p.flags & (ts.TypeFlags.StringLiteral | ts.TypeFlags.Undefined | ts.TypeFlags.Null)));
}

/* ───────────── one copy function ───────────── */

const NUMBERS = [2, 5, 12, 30], TEXTS = ["Asha", "Brock String"];
const also = (p: Param): (string | number | boolean | null)[] => (p.type as { also?: (string | number | boolean | null)[] }).also ?? [];

function unitsOfFunction(file: string, key: string, fn: (...a: unknown[]) => unknown, params: Param[], scene: boolean, where: string, units: Unit[], skipped: Skipped[], walk: (value: unknown, key: string, path: string[], node: ts.Node | undefined) => void) {
  const skip = (why: string) => skipped.push({ file, key, why });
  if (params.length > 5) return skip("more than five parameters");
  if (params.some((p) => p.optional)) {
    /* the app may call it with or without its last values: both ways are listed */
    const required = params.filter((p) => !p.optional).length;
    if (required < params.length) unitsOfFunction(file, key, fn, params.slice(0, required).map((p) => ({ ...p, optional: false })), scene, where, units, skipped, walk);
    params = params.map((p) => ({ ...p, optional: false }));
  }
  const names = params.map((p) => p.name);
  /* every way of choosing the fixed values */
  let combos: Fixed[] = [[]];
  for (const [i, p] of params.entries()) {
    const fixedValues = p.type.kind === "enum" ? p.type.values : null;
    const extra = p.type.kind === "number" ? [0, 1, ...also(p)] : also(p);
    const next: Fixed[] = [];
    for (const c of combos) {
      if (fixedValues) for (const v of fixedValues) next.push([...c, [i, v as string]]);
      else { next.push(c); for (const v of extra) next.push([...c, [i, v as string]]); }
    }
    combos = next;
    if (combos.length > 96) return skip("too many combinations of fixed values");
  }
  const sample = (fixed: Fixed, round: number): unknown[] => params.map((p, i) => {
    const f = fixed.find(([at]) => at === i);
    if (f) return f[1];
    return p.type.kind === "number" ? NUMBERS[(round + i) % NUMBERS.length] : p.type.kind === "string" ? TEXTS[(round + i) % TEXTS.length] : undefined;
  });
  const keyFor = (fixed: Fixed) => {
    const args = params.map((_, i) => { const f = fixed.find(([at]) => at === i); return f ? f[1] : Symbol("open"); });
    return callKeys(key, args).find((k) => k.fixed.length === fixed.length)?.key;
  };
  const made = new Map<string, { fixed: Fixed; template: string }>();
  let any = false;
  /* general templates first (fewest fixed values), so a special case is kept only when it reads differently */
  for (const fixed of [...combos].sort((a, b) => a.length - b.length)) {
    const k = keyFor(fixed);
    if (!k) continue;
    const open = params.filter((_, i) => !fixed.some(([at]) => at === i));
    if (open.length === 0) {
      let out: unknown;
      try { out = fn(...sample(fixed, 0)); } catch { continue; }
      if (typeof out === "string") {
        /* the same wording as a more general template gives for these values needs no entry of its own */
        const general = [...made.values()].find((m) => m.fixed.every(([i, v]) => fixed.some(([j, w]) => i === j && v === w)) && fill(m.template, names, sample(fixed, 0)) === out);
        if (general) continue;
        if (!out.trim() || notAWord("", out)) continue;
        units.push({ file, key: k, english: out, source: mark(out), kind: "fixed", scene, note: `${where}, with ${fixed.map(([i, v]) => `${names[i]} = ${String(v)}`).join(", ") || "no values"}` });
        any = true;
      } else if (out && typeof out === "object") { walk(out, k, [], undefined); any = true; }
      continue;
    }
    if (open.some((p) => p.type.kind === "enum")) continue;
    const template = templateOf(fn as (...a: never[]) => unknown, names, fixed);
    if (template === null) continue;
    /* proof on examples: the function and its template must agree at least once, or the template is not this function */
    const rounds = [0, 1, 2].map((r) => sample(fixed, r));
    const agrees = rounds.filter((args) => { try { return open.every((p) => p.type.kind !== "other") ? fn(...args) === fill(template, names, args) : true; } catch { return false; } }).length;
    if (!agrees) continue;
    /* a special case that reads the same as the general template is not listed */
    const general = [...made.values()].find((m) => m.fixed.length < fixed.length && m.fixed.every(([i, v]) => fixed.some(([j, w]) => i === j && v === w)));
    if (general && rounds.every((args) => fill(general.template, names, args) === fill(template, names, args))) continue;
    if (!/\p{L}/u.test(template.replace(/\{[^}]*\}/g, ""))) continue; /* only values and signs: nothing to translate */
    made.set(k, { fixed, template });
    const stands = placeholders(template).filter((p, i, all) => all.indexOf(p) === i).map((p) => `{${p}}`).join(", ");
    units.push({
      file, key: k, english: template, source: mark(template), kind: "template", params: names, scene,
      note: `${where}${fixed.length ? `, with ${fixed.map(([i, v]) => `${names[i]} = ${String(v)}`).join(", ")}` : ""}. Keep ${stands || "the sentence"} exactly; the app fills ${stands ? "them" : "nothing"} in.`,
    });
    any = true;
  }
  if (!any) skip("its wording depends on its values in a way a template cannot hold");
}

/* ───────────── the walk ───────────── */

export async function loadSources(root: string): Promise<void> {
  const src = path.join(root, "src");
  const copy = readdirSync(path.join(src, "copy")).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts")).map((f) => path.join(src, "copy", f));
  const data = DATA_SOURCES.map((f) => path.join(src, `${f}.ts`)).filter(existsSync);
  for (const f of [...copy, ...data]) await import(pathToFileURL(f).href);
}

export async function extract(root: string): Promise<Extract> {
  await loadSources(root);
  const sources = allSources().filter((s) => isSourceFile(s.file)).sort((a, b) => a.file.localeCompare(b.file) || a.name.localeCompare(b.name));
  const files = [...new Set(sources.map((s) => s.file))];
  const ast = openAst(root, files.map((f) => path.join(root, "src", `${f}.ts`)));
  const units: Unit[] = [], skipped: Skipped[] = [];
  const seen = new Set<string>();

  const one = (s: Source) => {
    const sf = ast.program.getSourceFile(path.join(root, "src", `${s.file}.ts`));
    /* the declaration: export const <name> = texts(...) */
    let top: ts.Node | undefined;
    if (sf) for (const st of sf.statements) if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name) && d.name.text === s.name) top = d.initializer;
    const walk = (value: unknown, key: string, pathIn: string[], node: ts.Node | undefined) => {
      const visit = (v: unknown, k: string, p: string[], n: ts.Node | undefined, owner: object) => {
        /* words taken over from another file of words are listed under that file, once */
        if (v !== value && madeByTexts(v)) return;
        const field = p[p.length - 1] ?? "";
        const scene = sceneAt(s.rule, p);
        if (typeof v === "string") {
          if (s.rule.word && !s.rule.word(p, owner)) return;
          if (!v.trim()) return;
          const why = valueByPolicy(s.file, k) ?? notAWord(field, v) ?? (isValueByType(ast, n) ? "one of a fixed set of values" : null);
          if (why) { skipped.push({ file: s.file, key: k, why, english: v }); return; }
          if (seen.has(`${s.file}|${k}`)) return;
          seen.add(`${s.file}|${k}`);
          units.push({ file: s.file, key: k, english: v, source: mark(v), kind: "text", ...(scene ? { scene } : {}), note: `src/${s.file}.ts` });
          return;
        }
        if (typeof v === "function") {
          if (s.rule.word && !s.rule.word(p, owner)) return;
          const params = paramsOf(ast, n);
          if (!params) { skipped.push({ file: s.file, key: k, why: "a function whose parameters could not be read from the source" }); return; }
          unitsOfFunction(s.file, k, v as (...a: unknown[]) => unknown, params, scene, `src/${s.file}.ts`, units, skipped, (value2, key2) => walk(value2, key2, p, undefined));
          return;
        }
        if (Array.isArray(v)) { v.forEach((x, i) => visit(x, `${k}.${i}`, [...p, String(i)], child(ast, n, String(i)), v)); return; }
        if (v && typeof v === "object" && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null)) {
          for (const [name, x] of Object.entries(v)) {
            if (/[.()|,*]/.test(name)) { skipped.push({ file: s.file, key: `${k}.${name}`, why: "a field name with a dot, a bracket or a comma in it" }); continue; }
            visit(x, `${k}.${name}`, [...p, name], child(ast, n, name), v);
          }
        }
      };
      visit(value, key, pathIn, node, {});
    };
    walk(s.value, s.name, [s.name], top);
  };
  for (const s of sources) one(s);
  return { units, skipped, files };
}

/** Characters as a translation service counts them. */
export const charsOf = (units: readonly Unit[]): number => units.reduce((n, u) => n + [...u.english].length, 0);
