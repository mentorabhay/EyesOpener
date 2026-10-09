/**
 * Decisions a machine cannot make by looking at a string. Read by the extractor and by the scan.
 *
 * NOT_WORDS   strings in files of words that the code uses as values (compares, looks up, builds an address
 *             from). They are never offered for translation. Each line says why.
 * ALLOWED     places the scan reports (scripts/i18n/scan.ts) that a person has read and found safe, with the
 *             reason. Anything the scan finds that is not listed here fails the test.
 *
 * A pattern is "<file>:<key>", where "*" stands for any run of characters.
 */
import { MORE_ALLOWED, MORE_NOT_WORDS } from "./policy.extra";

export const NOT_WORDS: readonly { at: string; why: string }[] = [
  ...MORE_NOT_WORDS,
  { at: "copy/drills-tools:passages.*", why: "A reading passage is the task itself, written and sized for English letters. A passage in another script is a new task to be written for that script." },
  { at: "copy/drills-tools:print.cards.lifesaver.on.word", why: "The word printed inside the Lifesaver card is the target the eyes keep clear, drawn to a real size." },
  { at: "copy/results:results.lowerIsBetter.*", why: "The keys of the numbers for which lower is better. The page looks a key up in this list." },
  { at: "copy/admin:admin.catalogue.kinds.*.key", why: "The value of a filter in the address." },
  { at: "copy/admin:admin.manual.kinds.*.key", why: "The value of a filter in the address." },
];

export const ALLOWED: readonly { file: string; kind: string; text: string; why: string }[] = [
  ...MORE_ALLOWED,
  { file: "lib/hero-rules.ts", kind: "word", text: "heroGamesExtra.map((g) => g.slug)", why: "Reads the slugs of the games, which are values and never translated." },
  { file: "app/(app)/setup/eyes/flow.tsx", kind: "call", text: "Object.keys(o.steps)", why: "Reads the names of the steps, not their words." },
  { file: "drills/index.ts", kind: "call", text: "joined(hVerg, hSkill)", why: "`joined` reads a word only when it is asked for." },
  { file: "games/built.ts", kind: "call", text: "joined(", why: "`joined` reads a word only when it is asked for." },
  { file: "games/care/far-break.tsx", kind: "logic", text: "picked.includes(x.id)", why: "`id` is a value, not a word: the extractor leaves every `id` out." },
  { file: "games/care/outdoor.tsx", kind: "logic", text: "before.has(x.id)", why: "`id` is a value, not a word: the extractor leaves every `id` out." },
  { file: "app/(app)/train/cinema/player.tsx", kind: "state", text: "reelAddress", why: "Keeps the address of the test reel, not a word." },
  { file: "voice/scripts.ts", kind: "state", text: "built:", why: "The list of spoken scripts is built inside `inEnglish`, so it is the same for every request." },
];

const pattern = (p: string) => new RegExp(`^${p.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`);
const notWords = NOT_WORDS.map((n) => ({ test: pattern(n.at), why: n.why }));

/** Why this key is a value and not a word, or null. */
export const valueByPolicy = (file: string, key: string): string | null => notWords.find((n) => n.test.test(`${file}:${key}`))?.why ?? null;

export const isAllowed = (f: { file: string; kind: string; text: string }): boolean =>
  ALLOWED.some((a) => a.file === f.file && a.kind === f.kind && f.text.includes(a.text));
