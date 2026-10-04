import type { GameDef } from "../kit";
import { depthDarts } from "./depth-darts";
import { extra } from "./extra";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const games: Record<string, GameDef<any>> = {
  "depth-darts": depthDarts,
  ...extra,
};
