/**
 * Copy functions as templates.
 *
 * Many words are functions: `(name: string) => \`Switch to ${name}\``. A translator cannot translate a function,
 * so a function is turned into a template, "Switch to {name}", by calling it with stand-ins and seeing where they
 * land. The translation is a template with the same placeholders, and is filled with the real values.
 *
 * Nothing here trusts that a function is a simple sentence. Three things keep a wrong template from being shown:
 *   1. A stand-in that is used for anything other than being written into the sentence (arithmetic, a method, a
 *      comparison that decides the wording) leaves a trace, and no template is made.
 *   2. A choice between fixed values (`"left" | "right"`, true or false, exactly 0 or 1) has its own template for
 *      each value, made with that value in place.
 *   3. At the moment of use, the English function is called with the real values and compared with the English
 *      template filled with the same values. Only when they are identical is the translated template used.
 *      Otherwise the English sentence is shown.
 */
const OPEN = "", CLOSE = "", POISON = "";
const TOKEN = /(\d+)((?:\.[A-Za-z_$][\w$]*)*)/g;
const ANY_MARK = /[-]/;

/** Values that take the place of a parameter while a template is made: `[index, value]`. */
export type Fixed = readonly (readonly [number, string | number | boolean | null])[];

/** A stand-in for parameter `i`. Written into a string it leaves a token; used any other way it leaves poison. */
function standIn(i: number, path = ""): unknown {
  const poison: unknown = new Proxy(function () { /* a stand-in */ }, {
    get: (_t, p) => (p === Symbol.toPrimitive ? () => POISON : p === "then" ? undefined : poison),
    apply: () => poison,
    has: () => false,
  });
  return new Proxy(function () { /* a stand-in */ }, {
    get(_t, p) {
      if (p === Symbol.toPrimitive) return (hint: string) => (hint === "number" ? Number.NaN : `${OPEN}${i}${path}${CLOSE}`);
      if (p === "toString") return () => `${OPEN}${i}${path}${CLOSE}`;
      if (typeof p === "symbol" || p === "then" || p === "toJSON") return undefined;
      /* a field of an object parameter: ${p.name} */
      if (/^[A-Za-z_$][\w$]*$/.test(p) && !(p in Object.prototype) && !(p in String.prototype) && !(p in Number.prototype) && !(p in Array.prototype)) return standIn(i, `${path}.${p}`);
      return poison;
    },
    apply: () => poison,
    has: () => false,
  });
}

/**
 * The English template of a copy function, with the given values held fixed: "Switch to {name}".
 * Null when the function is not a plain sentence around its parameters.
 */
export function templateOf(fn: (...args: never[]) => unknown, params: readonly string[], fixed: Fixed = []): string | null {
  const args: unknown[] = params.map((_, i) => standIn(i));
  for (const [i, v] of fixed) { if (i < 0 || i >= params.length) return null; args[i] = v; }
  let out: unknown;
  try { out = (fn as (...a: unknown[]) => unknown)(...args); } catch { return null; }
  if (typeof out !== "string" || out.includes(POISON) || /\bNaN\b|\bundefined\b|\[object |function \(\)/.test(out)) return null;
  const named = out.replace(TOKEN, (_m, i: string, path: string) => `{${params[Number(i)]}${path}}`);
  return ANY_MARK.test(named) ? null : named;
}

const PLACE = /\{([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\}/g;

/** The placeholders of a text, in order: ["name", "n"]. */
export const placeholders = (text: string): string[] => [...text.matchAll(PLACE)].map((m) => m[1]);

/**
 * A template with the real values written in, exactly as a JavaScript template string would write them.
 * A placeholder that names no parameter is left as it is: some of the app's own sentences carry `{cyan}` for a
 * later step to fill.
 */
export function fill(template: string, params: readonly string[], args: readonly unknown[]): string {
  return template.replace(PLACE, (whole, name: string) => {
    const [head, ...path] = name.split(".");
    const i = params.indexOf(head);
    if (i < 0) return whole;
    let v: unknown = args[i];
    for (const p of path) v = v === null || v === undefined ? undefined : (v as Record<string, unknown>)[p];
    return String(v);
  });
}

/** The name of a variant: "cyan=left,n=1". Empty for the general template. */
export const variantName = (params: readonly string[], fixed: Fixed): string =>
  [...fixed].sort((a, b) => a[0] - b[0]).map(([i, v]) => `${params[i]}=${String(v)}`).join(",");

/** Do the real values match the values a variant was made with? */
export const fits = (fixed: Fixed, args: readonly unknown[]): boolean => fixed.every(([i, v]) => args[i] === v);
