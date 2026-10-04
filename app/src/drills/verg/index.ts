/** On-screen vergence drills, by exercise slug. Each reports the keys in `AUTO_KEYS[slug]` (src/data/guides/index.ts). */
import type { GameDef } from "@/games/kit";
import { distanceFusionHold } from "./distance-fusion-hold";
import { flipSwitch } from "./flip-switch";
import { longHold } from "./long-hold";
import { readingUnderDemand } from "./reading-under-demand";
import { screenDivergeRamp } from "./screen-diverge-ramp";
import { screenVergenceRamp } from "./screen-vergence-ramp";
import { screenVergenceSteps } from "./screen-vergence-steps";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const drills: Record<string, GameDef<any>> = {
  "screen-vergence-ramp": screenVergenceRamp,
  "screen-diverge-ramp": screenDivergeRamp,
  "screen-vergence-steps": screenVergenceSteps,
  "flip-switch": flipSwitch,
  "long-hold": longHold,
  "reading-under-demand": readingUnderDemand,
  "distance-fusion-hold": distanceFusionHold,
};
