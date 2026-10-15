/** Words drawn inside the two-eye games, and one line per game that says how to play it. */
import { help as moreHelp, words } from "./games-dgame.extra";
import { joined, texts } from "@/i18n/texts";

export const games = texts("copy/games-dgame", "games", () => ({
  fireflyCatch: { caught: "Caught" },
  lanternRun: { coins: "Coins" },
  mazeOfTwoLights: { mazes: "Mazes" },
  ...words,
}));

/* This edition's own lines. An edition that adds games brings their lines in its own file of words, and the two
   are read as one: `joined` looks a line up only when it is asked for, so each stays in its own file. */
const ownHelp: Record<string, string> = texts("copy/games-dgame", "help", () => ({
  "firefly-catch": "Tap the cyan fireflies. Leave the red moths. With keys or a remote: move the ring with the arrows and press Space or OK.",
  "lantern-run": "Tap the scene to jump. Jump up to the cyan coins and over the red crates and stalls, and stay down under the red hanging signs. A stumble puts the lantern out, and coins need its light: pass the next red thing cleanly to light it again. With keys or a remote: press Up, Space or OK to jump.",
  "maze-of-two-lights": "Touch the scene on the side of the cyan ball you want it to roll toward. Roll it between the red walls to the white light. With keys or a remote: roll the ball with the arrows.",
}));

export const help: Record<string, string> = joined(ownHelp, moreHelp);
