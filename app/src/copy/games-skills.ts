/** Words drawn inside these games, and one line per game that says how to play it. */
import { help as moreHelp, words } from "./games-skills.extra";
import { joined, texts } from "@/i18n/texts";

export const games = texts("copy/games-skills", "games", () => ({
  cometTrail: { on: "On the comet", seconds: "s" },
  spotJump: { hits: "Hits", aMinute: "a minute" },
  eSafari: {
    ask: "Which way do the toes point?",
    askShort: "Which way?",
    smallest: "Smallest tracks read: step",
    short: "Step",
    floor: "That is as small as this screen goes",
  },
  ...words,
}));

/* This edition's own lines. An edition that adds games brings their lines in its own file of words, and the two
   are read as one: `joined` looks a line up only when it is asked for, so each stays in its own file. */
const ownHelp: Record<string, string> = texts("copy/games-skills", "help", () => ({
  "comet-trail": "Keep the ring on the comet. Hold a finger on the scene and follow the comet, or steer the ring with the arrows on the keys or a remote.",
  "spot-jump": "Look at each spot as soon as it appears and tap it. With keys or a remote: press Left or Right for the side the spot is on.",
  "e-safari": "Cover one eye with the patch. Point the way the three toes face: tap the left, right, top or bottom part of the scene, or press that arrow on the keys or a remote. This is practice. For a result that is kept, use Letter size in Check-ups.",
}));

export const help: Record<string, string> = joined(ownHelp, moreHelp);
