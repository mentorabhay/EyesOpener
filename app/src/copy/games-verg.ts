// Eyes Opener: Words drawn inside these games, and one line per game that says how to play it. .
/** Words drawn inside these games, and one line per game that says how to play it. */
import { help as moreHelp, words } from "./games-verg.extra";
import { joined, texts } from "@/i18n/texts";

export const games = texts("copy/games-verg", "games", () => ({
  /** The label of the spot the member taps when one picture turns into two. */
  split: "It split",
  tunnelGlide: { rings: "Rings", reach: "Reach" },
  ...words,
}));

const split = "If you see two, tap It split or press Down.";

/* This edition's own lines. An edition that adds games brings their lines in its own file of words, and the two
   are read as one: `joined` looks a line up only when it is asked for, so each stays in its own file. */
const ownHelp: Record<string, string> = texts("copy/games-verg", "help", () => ({
  "tunnel-glide": `Watch the ring come toward you. When the tunnel mouth lights up and you see one ring with both dots, tap the scene or press Space or OK. ${split}`,
}));

export const help: Record<string, string> = joined(ownHelp, moreHelp);
