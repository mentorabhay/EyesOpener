/**
 * The names of the pages the trail may lead back to (components/shell/trail.tsx): the menu's pages, every game, every
 * exercise and every check-up, by address. Words in the reader's language; game and exercise names stay as they are.
 */
import { exercises, games, tests } from "@/data";
import { testWords } from "@/data/words";
import type { NavItem } from "@/components/nav";

export function trailNames(pages: readonly NavItem[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of pages) if (!p.href.includes("#")) out[p.href] = p.label;
  for (const g of games) out[`/train/games/${g.slug}`] = g.name;
  for (const e of exercises) out[`/train/exercises/${e.slug}`] = e.name;
  for (const t of tests) out[`/test/${t.key}`] = testWords(t).name;
  return out;
}
