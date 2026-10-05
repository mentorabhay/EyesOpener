/**
 * Which games are built, and how each one is shown. Safe to import on the server.
 *  - "kit": a canvas game inside the Stage (session clock, stop rule, glasses view).
 *  - "cinema": the member's own film through the two-eye filter with a game drawn on top.
 *  - "care": a log the family keeps away from the screen (daylight, breaks and more). No training dose.
 */
import { help as hCare } from "@/copy/games-care";
import { help as hDepth } from "@/copy/games-depth";
import { help as hDgame } from "@/copy/games-dgame";
import { help as hSkills } from "@/copy/games-skills";
import { help as hVerg } from "@/copy/games-verg";
import { joined } from "@/i18n/texts";
import { slugs as care } from "./care/slugs";
import { defs } from "./defs";
import { cinema, help as hExtra } from "./extra";

export type GameKind = "kit" | "cinema" | "care";

const kinds = new Map<string, GameKind>([
  ...Object.keys(defs).map((s) => [s, "kit"] as const),
  ...cinema.map((s) => [s, "cinema"] as const),
  ...care.map((s) => [s, "care"] as const),
]);
/* joined, not spread: a spread would read every line while this file loads, in one reader's language */
const help: Record<string, string> = joined(hDgame, hVerg, hDepth, hSkills, hCare, hExtra);

export const kindOf = (slug: string): GameKind | undefined => kinds.get(slug);
export const isBuilt = (slug: string) => kinds.has(slug);
export const builtCount = () => kinds.size;
export const builtSlugs = () => [...kinds.keys()];
/** One line that says how to play: what to tap, which keys work. */
export const helpFor = (slug: string): string | undefined => help[slug];
