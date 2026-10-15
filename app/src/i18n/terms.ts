/**
 * Fixed terms: words that must come out the same way every time.
 *
 * KEEP    written in English letters in every language, exactly as here. The product's own name is one. A game's
 *         or an exercise's name is kept too, but those lists come from the catalogue (the pipeline and the tests
 *         read them from `@/data`), so no name has to be written twice.
 * SAME    translated, and always with the same words. "Weaker eye" and "stronger eye" are how the whole app
 *         speaks about the two eyes; a second wording for either would read as a third eye. The pipeline gives
 *         these to the translator, and marks any sentence that uses the English term without the agreed words.
 *
 * The Hindi words were proposed without a native reviewer. They are a starting point for the Hindi reviewer, who
 * owns this column. Other languages get their column from their own reviewer; until then the pipeline asks the
 * translator to be consistent and checks nothing for these terms.
 */
import type { Lang } from "./languages";

/** Checked every time a translation is about to be shown (src/i18n/check.ts). */
export const KEEP: readonly string[] = ["Eyes Opener"];

export interface SameTerm {
  en: string;
  /** What it means, for the translator. */
  note: string;
  /**
   * For each language: the agreed words first, exactly as the translator is to write them, then any other
   * spellings and beginnings of the word that count as the same (an ending may follow them).
   */
  in: Partial<Record<Exclude<Lang, "en">, readonly string[]>>;
}

export const SAME: readonly SameTerm[] = [
  { en: "weaker eye", note: "The eye that sees less well. Never 'bad eye', 'lazy eye' or 'sick eye'.", in: { hi: ["कमज़ोर आँख", "कमज़ोर आंख", "कमजोर आँख", "कमजोर आंख"] } },
  { en: "stronger eye", note: "The eye that sees better. Never 'good eye' or 'healthy eye'.", in: { hi: ["मज़बूत आँख", "मज़बूत आंख", "मजबूत आँख", "मजबूत आंख"] } },
  { en: "check-up", note: "A measurement the member does in the app. Not a visit to a doctor.", in: { hi: ["जाँच", "जांच"] } },
  { en: "practice", note: "Games, exercises and film that use training minutes.", in: { hi: ["अभ्यास"] } },
  { en: "care routine", note: "Patch, glasses, drops, daylight, breaks: recorded, never counted as training.", in: { hi: ["देखभाल"] } },
  { en: "eye doctor", note: "An ophthalmologist or optometrist. The everyday word.", in: { hi: ["आँखों के डॉक्टर", "आंखों के डॉक्टर", "आँखों का डॉक्टर", "आँख के डॉक्टर", "आंख के डॉक्टर", "नेत्र चिकित्सक"] } },
  { en: "counsellor", note: "A vision therapist or eye-care professional linked to a member.", in: { hi: ["काउंसलर", "सलाहकार"] } },
  { en: "guardian", note: "The parent or adult who decides for a child.", in: { hi: ["अभिभावक"] } },
  { en: "red-cyan glasses", note: "Glasses with one red and one blue-green lens.", in: { hi: ["लाल-सियान चश्मा", "लाल-सियान चश्म", "लाल और सियान चश्म", "लाल-नीले चश्म"] } },
  { en: "double vision", note: "Seeing two of one thing. A stop sign.", in: { hi: ["दोहरा दिखना", "दोहरा दिख", "दो-दो दिख", "दोहरी दृष्टि"] } },
];

/** The English terms of SAME that a sentence uses and whose agreed words are missing from its translation. */
export function brokenTerms(english: string, text: string, lang: Exclude<Lang, "en">): string[] {
  const lower = english.toLowerCase();
  return SAME.filter((t) => t.in[lang]?.length && new RegExp(`\\b${t.en.replace(/[-]/g, "[- ]")}s?\\b`).test(lower) && !t.in[lang]!.some((w) => text.includes(w))).map((t) => t.en);
}
