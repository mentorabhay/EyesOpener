// Eyes Opener: Words drawn inside these games, and one line per game that says how to play it. .
/** Words drawn inside these games, and one line per game that says how to play it. */
import { help as moreHelp, words } from "./games-depth.extra";
import { joined, texts } from "@/i18n/texts";

export const games = texts("copy/games-depth", "games", () => ({
  depthDarts: { hits: "Hits", step: "Depth step:", unit: "seconds of arc", hit: "Hit", nearest: "Nearest" },
  ...words,
}));

/* This edition's own lines. An edition that adds games brings their lines in its own file of words, and the two
   are read as one: `joined` looks a line up only when it is asked for, so each stays in its own file. */
const ownHelp: Record<string, string> = texts("copy/games-depth", "help", () => ({
  "depth-darts": "One target floats nearer to you than the others. Tap it to throw a dart at it. With keys or a remote: Left and Right choose a target, Space or OK throws.",
}));

export const help: Record<string, string> = joined(ownHelp, moreHelp);
