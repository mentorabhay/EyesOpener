import type { GameDef } from "../kit";
import { cometTrail } from "./comet-trail";
import { eSafari } from "./e-safari";
import { spotJump } from "./spot-jump";
import { extra } from "./extra";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const games: Record<string, GameDef<any>> = {
  "comet-trail": cometTrail,
  "spot-jump": spotJump,
  "e-safari": eSafari,
  ...extra,
};
