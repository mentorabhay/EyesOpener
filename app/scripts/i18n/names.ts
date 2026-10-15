/**
 * Names that stay in English letters in every language: the names of the games and of the exercises.
 * They are read from the catalogue, so a new game is covered the day it is added, in whichever edition.
 * (The product's own name is in src/i18n/terms.ts and is checked every time a translation is shown.)
 */
export async function keptNames(): Promise<string[]> {
  const { exercises, games } = await import("../../src/data");
  return [...new Set([...games.map((g) => g.name), ...exercises.map((e) => e.name)])].sort((a, b) => b.length - a.length);
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The names an English text uses that its translation does not carry, letter for letter. */
export function missingNames(english: string, text: string, names: readonly string[]): string[] {
  const out: string[] = [];
  let rest = english;
  for (const name of names) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${esc(name)}(?![\\p{L}\\p{N}])`, "gu");
    const n = (rest.match(re) ?? []).length;
    if (!n) continue;
    /* a longer name was counted first; its words are not counted again as a shorter name */
    rest = rest.replace(re, " ");
    if ((text.match(re) ?? []).length < n) out.push(name);
  }
  return out;
}
