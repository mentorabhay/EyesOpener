// Eyes Opener: Interactive visual exercise and gamified therapy logic for index.
import type { GameDef } from "../kit";
import { tunnelGlide } from "./tunnel-glide";
import { extra } from "./extra";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const games: Record<string, GameDef<any>> = {
  "tunnel-glide": tunnelGlide,
  ...extra,
};
