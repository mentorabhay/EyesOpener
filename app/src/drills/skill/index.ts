/** On-screen skill drills, by exercise slug. */
import type { GameDef } from "@/games/kit";
import { blindSideSweeps } from "./blind-side-sweeps";
import { contrastLadder } from "./contrast-ladder";
import { crowdingDrill } from "./crowding-drill";
import { lineUpDrill } from "./line-up-drill";
import { seeBothLights } from "./see-both-lights";
import { stereogramPairs } from "./stereogram-pairs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const drills: Record<string, GameDef<any>> = {
  "contrast-ladder": contrastLadder,
  "crowding-drill": crowdingDrill,
  "line-up-drill": lineUpDrill,
  "see-both-lights": seeBothLights,
  "stereogram-pairs": stereogramPairs,
  "blind-side-sweeps": blindSideSweeps,
};
