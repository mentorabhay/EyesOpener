// Eyes Opener: Which fields of an exercise guide are words for the reader (see src/i18n/texts.ts). Everything else in a guide.
/**
 * Which fields of an exercise guide are words for the reader (see src/i18n/texts.ts). Everything else in a guide
 * is a value the code uses: the slug, a measure's key and limits, the tool, the print card, a source's address.
 * A source's label is the citation as it was published, so it stays as written.
 */
import type { Rule } from "@/i18n/texts";

const TOP = new Set(["what", "need", "setup", "steps", "right", "stop", "mistakes", "evidence"]);

export const GUIDE_WORDS: Rule = {
  word: (path) => {
    const [, field, , leaf, last] = path;
    if (TOP.has(field)) return true;
    if (field === "measures") return leaf === "label" || leaf === "unit" || leaf === "how" || (leaf === "usual" && last === "text");
    if (field === "tool") return path[2] === "tap" || path[2] === "items";
    return false;
  },
};
