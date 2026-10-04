/** Words drawn inside these games, and one line per game that says how to play it. */
import { help as moreHelp, words } from "./games-depth.extra";

export const games = {
  depthDarts: { hits: "Hits", step: "Depth step:", hit: "Hit", nearest: "Nearest" },
  ...words,
};

export const help: Record<string, string> = {
  "depth-darts": "One target floats nearer to you than the others. Tap it to throw a dart at it. With keys or a remote: Left and Right choose a target, Space or OK throws.",
  ...moreHelp,
};
