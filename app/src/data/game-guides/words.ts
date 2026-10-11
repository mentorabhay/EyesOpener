// Eyes Opener: Which fields of a game guide are words for the reader (see src/i18n/texts.ts). The rest are values the code.
/**
 * Which fields of a game guide are words for the reader (see src/i18n/texts.ts). The rest are values the code
 * uses: the slug, a measure's key, a cue's tone and the numbers of its shapes, a source's address.
 * Words written inside a cue picture have a fixed space, so a translation much longer than the English is refused
 * (`scene`). A key cap ("Space", "OK") names a key on the keyboard and stays as it is.
 */
import type { Rule } from "@/i18n/texts";

const TOP = new Set(["what", "helps", "need", "see", "play", "controls", "success", "stop", "mistakes", "evidence"]);

export const GAME_GUIDE_WORDS: Rule = {
  scene: (path) => path[1] === "cues" && path[3] === "shapes",
  word: (path, owner) => {
    const [, field, , leaf] = path;
    if (TOP.has(field)) return true;
    if (field === "measures") return leaf === "label" || leaf === "unit" || leaf === "how";
    if (field === "cues") {
      if (leaf === "title" || leaf === "then") return true;
      /* cues.<i>.shapes.<j>.s: the words of a text shape */
      return leaf === "shapes" && path[5] === "s" && (owner as { t?: string }).t === "text";
    }
    return false;
  },
};
