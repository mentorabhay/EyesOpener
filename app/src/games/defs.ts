// Eyes Opener: Every canvas game in this build, by slug. Plain definitions: no screen code, safe on the server and in tests. .
/** Every canvas game in this build, by slug. Plain definitions: no screen code, safe on the server and in tests. */
import { games as depth } from "./depth";
import { games as dgame } from "./dgame";
import { kit as extra } from "./extra";
import type { GameDef } from "./kit";
import { games as skills } from "./skills";
import { games as verg } from "./verg";

/** The families of canvas games, for tests that check each family lists what it holds. */
export const families = { dgame, verg, depth, skills, extra };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const defs: Record<string, GameDef<any>> = { ...dgame, ...verg, ...depth, ...skills, ...extra };
