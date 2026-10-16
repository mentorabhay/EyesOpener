// Eyes Opener: The plain-words check: rules that every sentence a person reads in Eyes Opener must pass.
/**
 * The plain-words check: rules that every sentence a person reads in Eyes Opener must pass.
 *
 * They come from the project's copy rules: plain words a school student can follow, one idea per sentence, no
 * internal codes on screen, no jargon, no emoji, "weaker eye" and "stronger eye", no cure wording and no
 * diagnosis wording. The check runs over every English sentence the app holds (the same list the translation
 * pipeline reads), so a new screen is covered the day it is written.
 *
 * Two kinds of finding:
 *   hard   must not exist. The test fails on any one that is not listed in ALLOWED with a reason.
 *   soft   a sentence that is long or reads above a school level. They are counted for each kind of reader, and
 *          the test fails when a count goes up (the numbers in src/lib/plain-words.baseline.json only ever go down).
 *
 * Pure functions, no imports from the app: the test (plain-words.test.ts) and the report
 * (`npx tsx scripts/plain-words.ts`) feed them.
 */
import { MORE_ALLOWED } from "./plain-words.extra";

/** Who reads a file of words. Staff and professionals may meet a trade word; a family may not. */
export type Reader = "family" | "public" | "professional" | "staff";

export function readerOf(file: string, key: string): Reader {
  if (/^copy\/(admin|gatherings)$/.test(file) || /(^|\.)(staff|staffNotes|forStaff)(\.|$)/.test(key)) return "staff";
  if (/^copy\/(counsellor|sponsor)$/.test(file)) return "professional";
  if (/^copy\/(site|landing|gate|auth|signin)$/.test(file)) return "public";
  return "family";
}

/** A citation: the title of a paper or the name of a trial, written as its authors wrote it. */
export const isCitation = (key: string): boolean => /(^|\.)(sources?|source)(\.\d+)?\.(label|title|name)$/.test(key) || /(^|\.)sources\.\d+$/.test(key);

export interface Finding { rule: string; hard: boolean; what: string }

const NEGATION = /\b(not|never|no|nor|cannot|can't|doesn't|does not|do not|don't|is not|isn't|without|nobody|nothing|neither|refused|refuses)\b/i;
const CLINICIAN = /\b(doctor|optometrist|orthoptist|ophthalmologist|clinic|clinician|eye test|eye examination|specialist)\b/i;

/** Sentences of a text. A placeholder never ends one. */
export function sentences(text: string): string[] {
  return text.replace(/\{[^}]*\}/g, "X").split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])|\n+/).map((s) => s.trim()).filter(Boolean);
}
export const wordsOf = (sentence: string): string[] => sentence.match(/[A-Za-z][A-Za-z'’-]*|\d+(?:[.,]\d+)*/g) ?? [];

/** A rough count of the beats in an English word. Good enough to rank sentences; never shown to anyone. */
export function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 1;
  if (w.length <= 3) return 1;
  const groups = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "").match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}
/** School grade a sentence reads at (Flesch-Kincaid). */
export function grade(sentence: string): number {
  const ws = wordsOf(sentence).filter((w) => /[A-Za-z]/.test(w));
  if (!ws.length) return 0;
  const syl = ws.reduce((n, w) => n + syllables(w), 0);
  return 0.39 * ws.length + 11.8 * (syl / ws.length) - 15.59;
}

/* ───────────── hard rules, for every reader ───────────── */

/** Pictures typed as letters. The copyright, registered and trade marks, arrows and maths signs are letters here. */
const EMOJI = /(?![©®™←-⇿∀-⋿■-◿✓✔✕✖])\p{Extended_Pictographic}/u;

/** Names the code uses for things, which must never reach a screen. */
const CODE_KEYS = /\b(dgame|dvid|dfind|vstep|verg|vdyn|percl|antisupp|scan_train|eye_move|care_patch|care_glasses|care_drops)\b/;
const SNAKE = /\b[a-z]+(?:_[a-z0-9]+)+\b/;
const CAMEL = /\b[a-z]+[A-Z][a-z]+[A-Za-z]*\b/;
/** Words that look like code and are not: product and brand names. */
const CAMEL_OK = /^(iPhone|iPad|iOS|macOS|pgvector|eBook|logMAR|logCS)$/;
const PATHS = /(^|[\s(])(src|app|lib|scripts)\/[a-z]/;
/** The build's own task numbers and the catalogue's clip codes: "A6", "C11", "M17". Paper sizes are words. */
const TASK_CODE = /\b(?![AB][3-5]\b)[A-K]\d{1,2}\b|\bM\d{2}\b/;
const NOTES_TO_SELF = /\b(TODO|FIXME|TBD|lorem ipsum|placeholder text)\b/i;

const CURE = /\b(cure[sd]?|curing|heal(?:s|ed|ing)?|guarantee[sd]?|miracle|permanent(?:ly)? fix(?:es|ed)?|restor(?:e|es|ed|ing) (?:your |their |his |her )?(?:vision|sight|eyesight))\b/i;
const DIAGNOSE = /\b(diagnos(?:e|es|ed|ing|is))\b/i;
const YOU_HAVE = /\byou(?:r child)? (?:have|has|suffer from|are suffering from) (?:amblyopia|a lazy eye|lazy eye|a squint|strabismus|convergence insufficiency|myopia|short sight)\b/i;

/** The two eyes have one pair of names. "Lazy eye" is the plain name of the condition and is fine. */
const EYE_NAMES = /\b(bad|good|weak|strong|dominant|non-dominant|amblyopic|fellow|sound|poor|better|worse) eye\b/i;

/* ───────────── hard rules for families and the public ───────────── */

/** Trade words. A family reads the plain form; a citation, a professional and staff may read the trade word. */
export const JARGON: readonly { word: RegExp; plain: string }[] = [
  { word: /\bamblyop\w*/i, plain: "lazy eye" },
  { word: /\bstrabism\w*/i, plain: "squint" },
  { word: /\b(?:eso|exo|hyper|hypo)(?:trop|phor)\w*/i, plain: "an eye that turns in, out, up or down" },
  { word: /\bdichoptic\w*/i, plain: "two-eye" },
  { word: /\bbinocular\w*/i, plain: "two-eye, or both eyes together" },
  { word: /\bmonocular\w*/i, plain: "one eye" },
  { word: /\bstereo(?:psis|acuity)\b/i, plain: "depth vision" },
  { word: /\bfusional\b/i, plain: "keeping one picture" },
  { word: /\bvergence\b/i, plain: "turning the eyes in and out" },
  { word: /\baccommodat\w*/i, plain: "focusing" },
  { word: /\bdiplopia\b/i, plain: "double vision" },
  { word: /\bsaccad\w*/i, plain: "eye jumps" },
  { word: /\banisometrop\w*/i, plain: "one eye needing stronger glasses than the other" },
  { word: /\bhyperop\w*/i, plain: "long sight" },
  { word: /\bocclu(?:sion|de[sd]?|ding)\b/i, plain: "patching, or covering" },
  { word: /\bpenali[sz]\w*/i, plain: "blurring the stronger eye" },
  { word: /\bcrosstalk\b/i, plain: "leak" },
  { word: /\blog ?(?:MAR|CS)\b/i, plain: "the size or faintness, in plain words" },
  { word: /\barcsec(?:onds?)?\b/i, plain: "seconds of arc" },
  { word: /\bpsychophysic\w*/i, plain: "measuring what a person can see" },
  { word: /\bstaircase procedure\b/i, plain: "steps that follow the answers" },
  { word: /\bcontralateral|ipsilateral\b/i, plain: "the other side, the same side" },
  { word: /\bproprioce\w*/i, plain: "feeling where the eyes aim" },
  { word: /\bneuroplastic\w*/i, plain: "the brain can still learn" },
];

/** Long words with a short one that says the same. */
export const HARD_WORDS: readonly { word: RegExp; plain: string }[] = [
  { word: /\butili[sz]e[sd]?\b|\butili[sz]ing\b/i, plain: "use" },
  { word: /\bcommenc(?:e|es|ed|ing)\b/i, plain: "start" },
  { word: /\bapproximately\b/i, plain: "about" },
  { word: /\bprior to\b/i, plain: "before" },
  { word: /\bin order to\b/i, plain: "to" },
  { word: /\bterminat(?:e|es|ed|ing)\b/i, plain: "end" },
  { word: /\bpurchas(?:e|es|ed|ing)\b/i, plain: "buy" },
  { word: /\bsufficient(?:ly)?\b/i, plain: "enough" },
  { word: /\bfacilitat(?:e|es|ed|ing)\b/i, plain: "help" },
  { word: /\bleverag(?:e|es|ed|ing)\b/i, plain: "use" },
  { word: /\bsubsequent(?:ly)?\b/i, plain: "later, or after" },
  { word: /\bnumerous\b/i, plain: "many" },
  { word: /\bendeavou?r\w*/i, plain: "try" },
  { word: /\bascertain\w*/i, plain: "find out" },
  { word: /\bthereafter|therein|thereof|herein|hereby|whilst\b/i, plain: "plain words for it" },
  { word: /\band\/or\b/i, plain: "or, or both" },
  { word: /\b(?:e\.g\.|i\.e\.|etc\.?|viz\.)(?=\W|$)/i, plain: "for example, that is, and so on" },
  { word: /\bN\/A\b/, plain: "say what is missing" },
  { word: /\bvia\b/i, plain: "through, or by" },
  { word: /\bper (?:day|week|month|minute|session|eye)\b/i, plain: "a day, a week, a minute" },
];

/** "User" is right when it is part of a name the reader will meet elsewhere. */
const isOk = (word: string, text: string): boolean => /^users?$/i.test(word) && /\buser account linking\b|\bscreen users\b/i.test(text);
const LONGEST = 45;
/** Where a sentence starts to be long for a family. */
export const LONG = 28;
/** Where a sentence starts to read above a school level. Only sentences of a dozen words or more are graded. */
export const GRADE = 11;

/** Everything wrong with one piece of text, for one reader. */
export function check(text: string, reader: Reader, citation = false): Finding[] {
  const out: Finding[] = [];
  const hard = (rule: string, what: string) => out.push({ rule, hard: true, what });
  const soft = (rule: string, what: string) => out.push({ rule, hard: false, what });
  if (citation) return out;

  const emoji = EMOJI.exec(text);
  if (emoji) hard("emoji", emoji[0]);
  const noPlace = text.replace(/\{[^}]*\}/g, " ");
  const code = CODE_KEYS.exec(noPlace) ?? SNAKE.exec(noPlace) ?? PATHS.exec(noPlace);
  if (code) hard("code", code[0].trim());
  const camel = [...noPlace.matchAll(new RegExp(CAMEL, "g"))].map((m) => m[0]).find((w) => !CAMEL_OK.test(w));
  if (camel) hard("code", camel);
  const task = TASK_CODE.exec(noPlace);
  if (task) hard("code", task[0]);
  const typo = /\S {2,}\S|\s[,.;:!?](?:\s|$)|,,|(?<!\.)\.\.(?!\.)|\bteh\b|\b([a-z]{2,}) \1\b(?<!\b(?:had had|that that)\b)/i.exec(text.replace(/\{[^}]*\}/g, "X"));
  if (typo) hard("typo", JSON.stringify(typo[0]));
  const note = NOTES_TO_SELF.exec(text);
  if (note) hard("note", note[0]);
  const eye = EYE_NAMES.exec(text);
  if (eye) hard("eye-names", eye[0]);
  /* "Lazy eye" names the condition. An eye is the weaker eye. */
  const lazy = /\b(?:the|your|their|his|her|its|this|that|each|one|child's) lazy eye\b(?! programme| course| league)/i.exec(text);
  if (lazy && reader !== "staff") hard("eye-names", lazy[0]);
  if (reader !== "staff") {
    const who = /\b(?:patients?|users?|subjects|end[- ]users?)\b/i.exec(noPlace);
    if (who && !isOk(who[0], text)) hard("people", `${who[0]} (say: member, child, family, person)`);
    const glasses = /\b(?:anaglyph\w*|3-?D glasses|red[/ ]blue glasses|red and blue glasses|red\/cyan)\b/i.exec(noPlace);
    if (glasses) hard("glasses", `${glasses[0]} (say: red-cyan glasses)`);
    /* Capital letters are left alone: trials go by their initials, and a card's printed word is quoted as printed. */
    if (/!{2,}/.test(noPlace)) hard("shout", "!!");
    if (/\bclick(?:s|ed|ing)?\b/i.test(noPlace) && !/\b(?:tap|press|mouse)\b/i.test(noPlace)) soft("click", "click (a TV and a phone have no click: say tap, press or choose)");
  }

  for (const s of sentences(text)) {
    const cure = CURE.exec(s);
    if (cure && !NEGATION.test(s)) hard("cure", cure[0]);
    const dx = DIAGNOSE.exec(s);
    if (dx && !NEGATION.test(s) && !CLINICIAN.test(s) && reader !== "staff") hard("diagnosis", dx[0]);
    const have = YOU_HAVE.exec(s);
    if (have) hard("diagnosis", have[0]);
    const n = wordsOf(s).length;
    if (n > LONGEST) hard("too-long", `${n} words`);
    else if (n > LONG && reader !== "staff") soft("long", `${n} words`);
    if (n >= 12 && reader !== "staff" && reader !== "professional" && grade(s) > GRADE) soft("grade", grade(s).toFixed(1));
  }

  /* A placeholder's own name is never read by anyone: "{arcsec} seconds of arc" is plain. */
  if (reader === "family" || reader === "public") {
    for (const j of JARGON) { const m = j.word.exec(noPlace); if (m) hard("jargon", `${m[0]} (say: ${j.plain})`); }
  }
  if (reader !== "staff") for (const h of HARD_WORDS) { const m = h.word.exec(noPlace); if (m) hard("hard-word", `${m[0]} (say: ${h.plain})`); }
  return out;
}

/**
 * Places a person has read and found right, with the reason. A pattern is "<rule>:<file>:<key>"; "*" stands for
 * any run of characters. Keep this list short: the answer to a finding is nearly always to rewrite the sentence.
 */
export const ALLOWED: readonly { at: string; why: string }[] = [
  ...MORE_ALLOWED,
  { at: "code:copy/data:data.file.*", why: "The words inside a family's copy of its data explain that file, and name its fields as the file spells them." },
  { at: "jargon:copy/data:data.file.*", why: "The same: the file names its units as it stores them, and says what each means." },
  { at: "cure:copy/assist:assistCopy.*.cure_claim", why: "Names the kind of wording that is refused." },
  { at: "cure:copy/discovery:discovery.staff.*.promise", why: "Tells staff which words to take out." },
  { at: "cure:copy/wish-jam:wishJam.problems.promise", why: "Tells a guardian which word to leave out." },
];

const pattern = (p: string) => new RegExp(`^${p.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`);
export function allowedBy(list: readonly { at: string; why: string }[]) {
  const tests = list.map((a) => pattern(a.at));
  return (rule: string, file: string, key: string): boolean => tests.some((t) => t.test(`${rule}:${file}:${key}`));
}
