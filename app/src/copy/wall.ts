/**
 * Words for the Focus Wall.
 * The wall counts finished practice days and nothing else. Nothing here may praise a score, a speed or extra
 * minutes, and nothing may name the family or the person behind a tile that is not the reader's own.
 */
import type { ArtKey } from "@/lib/wall-rules";
import { texts } from "@/i18n/texts";

const tiles = (n: number) => (n === 1 ? "1 tile" : `${n} tiles`);

export const wall = texts("copy/wall", "wall", () => ({
  sub: "Each month one picture starts out blurred. Every finished practice day, in any family, brings one tile into focus.",
  stats: { focus: "In focus", ours: "Tiles from your family" },
  /** The card's heading while the picture is not whole: its name is kept for the end. */
  hidden: "This month's picture",
  /** Who made the pictures. Stored with each wall, and shown under it. */
  artist: "Eyes Opener",
  credit: "Drawn by Eyes Opener, in code. No photograph is used.",
  grid: (sharp: number, all: number) => `${sharp} of ${tiles(all)} in focus`,
  blurred: (sharp: number, all: number) => `This month's picture, still partly blurred: ${sharp} of ${tiles(all)} are in focus.`,
  whole: (title: string) => `The whole picture is in focus: ${title}.`,
  key: "Sharp tiles are in focus. Blurred tiles are still waiting. A white corner marks a tile your family brought into focus.",

  rule: {
    title: "How a tile is earned",
    points: [
      "A tile comes into focus when someone finishes the day's practice: the minutes their programme set for that day.",
      "One person, one day, one tile.",
      "Extra minutes, scores and levels earn nothing more.",
      "Which tile it is, is left to chance.",
      "When every tile is in focus the picture is finished. Next month brings a new one.",
    ],
  },

  today: {
    earned: (name: string) => `${name} finished today's practice. One tile came into focus for it.`,
    notYet: (name: string, done: number, goal: number) => `${name} has done ${done} of today's ${goal} minutes. The tile comes when the day's practice is finished.`,
    noGoal: (name: string) => `${name} has no practice minutes set for today. Tiles come from finished days on a programme.`,
    full: "Every tile is in focus. A finished day adds nothing more to this month's picture.",
    cta: "Go to today's practice",
  },

  gallery: {
    title: "Past pictures",
    none: "No earlier month has a picture yet.",
    finished: "Finished",
    ended: (sharp: number, all: number) => `Ended with ${sharp} of ${tiles(all)} in focus`,
    picture: (title: string, month: string) => `${title}, the picture for ${month}`,
    unfinished: (month: string, sharp: number, all: number) => `The picture for ${month}, left partly blurred: ${sharp} of ${tiles(all)} in focus.`,
  },

  /** The twelve pictures: a name, and what is in the picture for someone who cannot see it. */
  art: {
    lighthouse: { title: "Lighthouse at night", alt: "A red and white lighthouse sends two beams over a dark sea. A small boat sails past under the stars." },
    sailboat: { title: "The sailing boat", alt: "A boat with a white sail and a cyan sail rides the waves. The sun is out, and three birds fly by." },
    balloons: { title: "Balloons over the hills", alt: "Three hot-air balloons, one red, one cyan and one white, drift over rolling hills between two clouds." },
    swing: { title: "The swing tree", alt: "A big tree with a round cyan crown and red fruit. A red swing hangs from one branch, and flowers grow below." },
    sunrise: { title: "Sunrise in the mountains", alt: "A red sun comes up between two white mountains. A cyan river runs down past small trees." },
    reef: { title: "Fish on the reef", alt: "A large cyan fish and three small red fish swim over a reef, with bubbles rising and sea plants below." },
    rain: { title: "Umbrellas in the rain", alt: "A cyan umbrella and a red umbrella stand in the rain under three clouds, with puddles on the ground." },
    train: { title: "Train on the bridge", alt: "A red engine pulls three cyan carriages over a bridge of white arches, puffing rings of smoke." },
    owl: { title: "Owl under the moon", alt: "A cyan owl with wide white eyes sits on a branch with red leaves, under a crescent moon and stars." },
    kite: { title: "Kite over the hills", alt: "A child on a hill flies a red kite with a long cyan tail, high over the hills, with the sun and clouds beyond." },
    rocket: { title: "Rocket to the moon", alt: "A cyan rocket with red fins flies toward a large white moon across a sky full of stars." },
    tent: { title: "Tent under the stars", alt: "A cyan tent stands beside a small red fire, between two trees, under a crescent moon and a shooting star." },
  } satisfies Record<ArtKey, { title: string; alt: string }>,

  job: {
    what: "Gives each finished practice day its tile on the month's picture, and opens a new month's picture.",
    done: "Tiles counted.",
  },
}));
