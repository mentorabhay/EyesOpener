/**
 * What must be the same in a translation as in the English it stands for. Pure, and the same on the server, in the
 * browser, in the pipeline and in the tests.
 *
 * `problems` returns what is wrong, in plain words. An entry with any problem is not shown: the English sentence
 * is shown in its place. Nothing here judges whether a translation is good; only a person who reads the language
 * can. It only catches what a machine can prove is wrong.
 */
import { LANGUAGE, type Lang, type Script } from "./languages";
import { KEEP } from "./terms";
import { placeholders } from "./template";
import { hasMeasure, measuresOf } from "./units";

const NUMBER = /\d+(?:[.,:/]\d+)*/g;
const counted = (list: readonly string[]) => { const m = new Map<string, number>(); for (const x of list) m.set(x, (m.get(x) ?? 0) + 1); return m; };
const sameBag = (a: readonly string[], b: readonly string[]) => { const x = counted(a), y = counted(b); return x.size === y.size && [...x].every(([k, n]) => y.get(k) === n); };
const edge = (s: string) => [/^\s*/.exec(s)![0], /\s*$/.exec(s)![0]] as const;
const LINK = /https?:\/\/[^\s)"']+|[\w.+-]+@[\w-]+\.[\w.-]+/g;
/** Links and addresses of a text, without the full stop or comma that ends the sentence around them. */
const links = (s: string): string[] => (s.match(LINK) ?? []).map((l) => l.replace(/[.,;:!?\u0964\u06D4]+$/, ""));
/** What a reader counts as one letter: a base character with its marks. */
export const lettersIn = (s: string): number => s.replace(/\p{M}/gu, "").length;

/**
 * Marks that cannot be seen and change the order text is drawn in, and control characters. A direction override
 * in front of "90" draws it as "09" while every check on the digits still passes, so none of them may be in a
 * translation. The app sets direction itself (`forDirection` in src/i18n/runtime.ts). The joiners that Indian
 * scripts and Urdu need inside words (U+200C, U+200D) are not among them.
 */
const HIDDEN = /[\u0000-\u0008\u000B-\u001F\u007F\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/;
/** A numeral that is not one of the digits 0 to 9: the digits of another script, a full-width digit, "²", "½", "①". */
const OTHER_NUMERAL = /[^\P{N}0-9]/gu;
const SCRIPT: Record<Script, RegExp> = {
  latin: /\p{Script=Latin}/u, devanagari: /\p{Script=Devanagari}/u, bengali: /\p{Script=Bengali}/u, tamil: /\p{Script=Tamil}/u, telugu: /\p{Script=Telugu}/u,
  gujarati: /\p{Script=Gujarati}/u, kannada: /\p{Script=Kannada}/u, malayalam: /\p{Script=Malayalam}/u, arabic: /\p{Script=Arabic}/u, gurmukhi: /\p{Script=Gurmukhi}/u,
};
/** Letters of a script that is neither the language's own nor Latin, and that the English does not have either. */
function strangers(english: string, text: string, lang: Lang): string[] {
  const own = SCRIPT[LANGUAGE[lang].script];
  return [...new Set(text.match(/\p{L}/gu) ?? [])].filter((ch) => !own.test(ch) && !SCRIPT.latin.test(ch) && !english.includes(ch));
}
/** From this many letters on, a translation a third as long as the English, or four times as long, has lost or gained something. */
const LONG_ENOUGH = 60;

/** How much longer than the English a word drawn inside a game scene may be. A scene has no room to wrap. */
export const sceneRoom = (english: string): number => Math.max(Math.ceil(lettersIn(english) * 1.5), lettersIn(english) + 6);

export function problems(english: string, text: string, lang: Lang, o: { scene?: boolean } = {}): string[] {
  if (lang === "en") return [];
  const out: string[] = [];
  if (!text.trim()) return ["empty"];
  /* placeholders: {name}, {n}, and the app's own {cyan} */
  if (!sameBag(placeholders(english), placeholders(text))) out.push("placeholders differ");
  /* numbers, in the digits 0 to 9 and in no other numeral, unless the English itself has that sign */
  if (!sameBag(english.match(OTHER_NUMERAL) ?? [], text.match(OTHER_NUMERAL) ?? [])) out.push("digits are not 0 to 9");
  const strip = (s: string) => s.replace(/\{[^}]*\}/g, " ");
  if (!sameBag(strip(english).match(NUMBER) ?? [], strip(text).match(NUMBER) ?? [])) out.push("numbers differ");
  /* units, after a number and after a place where the app writes a number */
  for (const m of measuresOf(english)) if (!hasMeasure(text, m, lang)) out.push(`"${m.number} ${m.unit}" is missing or changed`);
  /* nothing hidden that changes the order text is drawn in */
  if (HIDDEN.test(text)) out.push("a hidden direction or control mark");
  /* the language's own letters: a translation filed under the wrong language is not shown */
  if (strangers(english, text, lang).length) out.push("letters of another script");
  /* a long sentence that came back a fraction of its length, or several times it: cut off, or padded */
  const en = lettersIn(english), tr = lettersIn(text);
  if (en >= LONG_ENOUGH && (tr * 3 < en || tr > en * 4)) out.push("much shorter or much longer than the English");
  /* names that stay in English letters */
  for (const name of KEEP) {
    const count = (s: string) => s.split(name).length - 1;
    if (count(english) !== count(text)) out.push(`"${name}" must stay as it is`);
  }
  /* addresses */
  if (!sameBag(links(english), links(text))) out.push("a link or an address differs");
  /* the space around it and its line breaks: sentences are joined together by the app */
  const [a, b] = edge(english), [c, d] = edge(text);
  if (a !== c || b !== d) out.push("space at the start or the end differs");
  if (english.split("\n").length !== text.split("\n").length) out.push("line breaks differ");
  /* a private mark of the template machinery must never be in a text */
  if (/[-]/.test(text)) out.push("stray mark");
  if (o.scene && lettersIn(text) > sceneRoom(english)) out.push("too long for a game scene");
  return out;
}
