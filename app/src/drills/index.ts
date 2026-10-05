/**
 * The on-screen drills that go with exercises, by exercise slug. Plain definitions on the game kit:
 * no screen code, safe on the server and in tests. The exercise page shows a drill inside the same Stage a game uses.
 */
import { help as hSkill } from "@/copy/drills-skill";
import { help as hVerg } from "@/copy/drills-verg";
import type { GameDef } from "@/games/kit";
import { joined } from "@/i18n/texts";
import { drills as skill } from "./skill";
import { drills as verg } from "./verg";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const drills: Record<string, GameDef<any>> = { ...verg, ...skill };
/* joined, not spread: a spread would read every line while this file loads, in one reader's language */
export const drillHelp: Record<string, string> = joined(hVerg, hSkill);
export const hasDrill = (slug: string) => slug in drills;
