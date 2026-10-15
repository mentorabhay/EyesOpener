import type { GameDef } from "../kit";
import { fireflyCatch } from "./firefly-catch";
import { lanternRun } from "./lantern-run";
import { mazeOfTwoLights } from "./maze-of-two-lights";
import { extra } from "./extra";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const games: Record<string, GameDef<any>> = {
  "firefly-catch": fireflyCatch,
  "lantern-run": lanternRun,
  "maze-of-two-lights": mazeOfTwoLights,
  ...extra,
};
