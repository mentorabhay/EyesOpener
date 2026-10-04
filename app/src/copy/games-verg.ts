/** Words drawn inside these games, and one line per game that says how to play it. */
import { help as moreHelp, words } from "./games-verg.extra";

export const games = {
  /** The label of the spot the member taps when one picture turns into two. */
  split: "It split",
  tunnelGlide: { rings: "Rings", reach: "Reach" },
  ...words,
};

const split = "If you see two, tap It split or press Down.";

export const help: Record<string, string> = {
  "tunnel-glide": `Watch the ring come toward you. When the tunnel mouth lights up and you see one ring with both dots, tap the scene or press Space or OK. ${split}`,
  ...moreHelp,
};
