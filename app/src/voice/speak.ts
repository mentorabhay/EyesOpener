/**
 * Turns the app's written instructions into text that reads well aloud. Pure: no clock, no files, no network.
 *
 * The app's words are already plain, so little changes. What does change is what a voice would stumble on:
 *   - units written short ("40 cm" becomes "40 centimetres", "15%" becomes "15 percent")
 *   - numbers joined by hyphens or a slash ("20-20-20" becomes "20, 20, 20"; "6/6" becomes "6 over 6")
 *   - words in capitals for emphasis ("ONE ring" becomes "one ring"); short names that are said as letters stay ("OK", "TV")
 *   - quotation marks and brackets, which a voice cannot say: the words inside stay, set off by commas
 *   - the product's own name, which is said "Eye Opener"
 * Pauses come from full stops and line breaks. No markup of any speech service is written here, so the same text
 * can be handed to a translator and to any voice.
 *
 * English only. A translated script is spoken as its translator wrote it (see `tidy`).
 */
import { createHash } from "node:crypto";

/** Capitals that are said letter by letter, or are a name. Any other word in capitals is emphasis and is lowered. */
export const SAID_AS_LETTERS: ReadonlySet<string> = new Set(["OK", "TV", "PC", "PIN", "USB", "HDMI", "LED", "MEMC", "ID", "PDF"]);

/** Units after a number. The plural is used unless the number is exactly 1. */
const UNITS: Record<string, [one: string, many: string]> = {
  mm: ["millimetre", "millimetres"],
  cm: ["centimetre", "centimetres"],
  km: ["kilometre", "kilometres"],
  m: ["metre", "metres"],
  ms: ["millisecond", "milliseconds"],
  s: ["second", "seconds"],
  min: ["minute", "minutes"],
  Hz: ["hertz", "hertz"],
  px: ["dot", "dots"],
};
const UNIT = new RegExp(`(\\d+(?:\\.\\d+)?)\\s?(${Object.keys(UNITS).sort((a, b) => b.length - a.length).join("|")})\\b`, "g");

/** Words a voice would say wrongly as written. */
const SAY: readonly [RegExp, string][] = [
  [/\bIOpener\b/g, "Eye Opener"],
  [/\bEsc\b/g, "Escape"],
];

/** White space made even, and typed punctuation made plain. Safe for any language: nothing is reworded. */
export function tidy(text: string): string {
  return text
    .replace(/[‘’]/g, "'").replace(/[“”]/g, "\"").replace(/…/g, "...").replace(/ /g, " ")
    .split(/\n/).map((line) => line.replace(/[ \t\r\f\v]+/g, " ").trim()).join("\n")
    .replace(/\n{3,}/g, "\n\n").trim();
}

/** One piece of the app's English text, made speakable. */
export function speakable(text: string): string {
  let t = tidy(text).replace(/\n+/g, " ");
  for (const [from, to] of SAY) t = t.replace(from, to);
  t = t
    /* dashes typed as punctuation become a pause */
    .replace(/\s*[–—]\s*/g, ", ").replace(/\s+-\s+/g, ", ")
    /* quotation marks are dropped; the words stay */
    .replace(/"/g, "")
    /* brackets become commas: "the left one (cyan lens) shows" is read "the left one, cyan lens, shows" */
    .replace(/\s*\(\s*/g, ", ").replace(/\s*\)/g, ",")
    /* three or more numbers joined by hyphens are read one by one: the 20-20-20 rule */
    .replace(/\b\d+(?:-\d+){2,}\b/g, (m) => m.split("-").join(", "))
    /* two numbers joined by a hyphen are a range */
    .replace(/\b(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\b(?!-)/g, "$1 to $2")
    /* a slash between numbers is an eye-chart size or a fraction; between words it means "or" */
    .replace(/\b(\d+)\/(\d+)\b/g, "$1 over $2").replace(/([A-Za-z])\/([A-Za-z])/g, "$1 or $2")
    .replace(UNIT, (_, n: string, u: string) => `${n} ${UNITS[u][Number(n) === 1 ? 0 : 1]}`)
    .replace(/(\d)\s?%/g, "$1 percent").replace(/(\d)\s?°/g, "$1 degrees")
    .replace(/\s*&\s*/g, " and ").replace(/\s*×\s*/g, " times ").replace(/(\d)\s*\+\s*(\d)/g, "$1 plus $2").replace(/\s*=\s*/g, " equals ")
    /* a word in capitals is emphasis on the page; a voice would spell it out */
    .replace(/\b[A-Z]{2,}\b/g, (w) => (SAID_AS_LETTERS.has(w) ? w : w.toLowerCase()));
  return t
    .replace(/\s+([,.;:!?])/g, "$1").replace(/,{2,}/g, ",").replace(/,([.;:!?])/g, "$1").replace(/([.;:!?]),/g, "$1").replace(/:\s*,\s*/g, ": ")
    .replace(/^[,\s]+/, "").replace(/ {2,}/g, " ").trim();
}

/** A piece of text as one or more whole sentences: it ends with a full stop, so the voice lets its tone fall and pauses. */
export function sentence(text: string): string {
  const t = speakable(text).replace(/[,;:\s]+$/, "");
  return t === "" || /[.!?]$/.test(t) ? t : `${t}.`;
}

/** A list read one item after another, each as its own sentence on its own line. */
export const spokenList = (items: readonly string[]): string => items.map(sentence).filter(Boolean).join("\n");

/** A numbered list read as steps: "Step 1. ..." on a line each, so a listener can keep their place. */
export const spokenSteps = (items: readonly string[], word = "Step"): string =>
  items.map(sentence).filter(Boolean).map((line, i) => `${word} ${i + 1}. ${line}`).join("\n");

/** A heading said before what it introduces. "You need" becomes "You need:" and the list follows on the next line. */
export function spokenSection(heading: string, body: string): string {
  const h = speakable(heading).replace(/[.:;,\s]+$/, "");
  return body ? `${h}:\n${body}` : "";
}

/** Parts of one script, with a longer pause (an empty line) between them. */
export const spokenParts = (...parts: string[]): string => parts.filter(Boolean).join("\n\n");

/**
 * The mark of a text: the first 16 hex digits of its SHA-256. Audio is kept under this mark, so a sentence that
 * changes gets new audio and a sentence that does not is never made twice.
 */
export const hashOf = (text: string): string => createHash("sha256").update(text, "utf8").digest("hex").slice(0, 16);

/** How many characters a speech service counts for a text: every character, spaces and line breaks included. */
export const charsOf = (text: string): number => [...text].length;
