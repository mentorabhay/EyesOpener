/** Every game guide, by slug. The package files hold the words and pictures; this file only joins them. */
import { guides as care } from "./care";
import { guides as depth } from "./depth";
import { guides as dgame } from "./dgame";
import { guides as extra } from "./extra";
import { guides as skills } from "./skills";
import type { GameGuide } from "./types";
import { guides as verg } from "./verg";

export type { Cue, CueInk, GameGuide, GameMeasure, Shape } from "./types";

export const gameGuides: GameGuide[] = [...dgame, ...verg, ...depth, ...skills, ...care, ...extra];
const bySlug = new Map(gameGuides.map((g) => [g.slug, g]));

export const gameGuideFor = (slug: string): GameGuide | undefined => bySlug.get(slug);

/** What the game kit itself records in every session. A guide's measures use these keys, or a key the game reports. */
export const KIT_KEYS = ["score", "hits", "misses", "top", "conv", "div", "splits"] as const;
