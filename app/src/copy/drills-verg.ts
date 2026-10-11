// Eyes Opener: Words drawn inside the vergence drills, and one line of help for each.
/**
 * Words drawn inside the vergence drills, and one line of help for each.
 * A drill is practice with a measurement: the top line shows the numbers, the line under it says what to do now.
 * Plain words, short enough to fit a phone. Numbers for how far the eyes turn are in prism dioptres; the page says so.
 */

import { texts } from "@/i18n/texts";

export const words = texts("copy/drills-verg", "words", () => ({
  /** The label of the spot the member taps when one picture turns into two, and the question beside it. */
  split: "It split",
  ask: "Seeing two?",
  /** Shown in place of a number that has not been measured yet. */
  none: "–",
  /** How far the eyes are turned at this moment, before the number. */
  turnedIn: "Turned in",
  turnedOut: "Turned out",
  /** Seconds, after a number. */
  s: "s",
  /** What to do while the picture holds still or drifts. */
  keep: "Keep one ring with both dots",
  /** What to do when the drill waits for the member. */
  oneRing: "One ring? Tap or press OK",

  ramp: {
    best: "Best break",
    again: "One ring again? Tap or press OK",
    rest: "Good. It climbs again soon.",
    limit: "The screen's limit",
  },
  steps: {
    steps: "Steps",
    each: "s each",
    hold: "Hold it. The next step is coming.",
  },
  flip: {
    cycles: "Cycles",
    pair: (turnIn: number, turnOut: number) => `${turnIn} in, ${turnOut} out`,
  },
  hold: {
    at: "Hold at",
    held: "Held",
    best: "Best",
    more: "Harder: tap up here or press Up",
    done: "Two minutes held",
  },
  read: {
    lines: "Lines",
    aMinute: "a minute",
    read: "Read it. Then tap or press OK.",
  },
  far: {
    held: "Held",
    rest: "Rest. It starts again soon.",
  },

  /** Read one at a time in Reading Under Demand. Four to eight plain words each, about everyday things, no names. */
  sentences: [
    "The kettle is on the stove.",
    "We walked to the shop today.",
    "The bus stops near the park.",
    "Rain fell on the tin roof.",
    "The cat sleeps on the mat.",
    "Fresh bread smells warm and sweet.",
    "A red kite flew over the hill.",
    "The clock on the wall is slow.",
    "Tea tastes better with a biscuit.",
    "The dog ran after the ball.",
    "Open the window and let air in.",
    "The moon is bright tonight.",
    "Put your shoes by the door.",
    "The market opens early on Sunday.",
    "Birds sing before the sun is up.",
    "The river is cold in winter.",
    "Wash your hands before you eat.",
    "The train was late again today.",
    "A good book makes time fly.",
    "The garden needs water every day.",
    "Rice and lentils make a fine lunch.",
    "The lamp gives a soft yellow light.",
    "Leaves turn brown when it is dry.",
    "The sky changes colour at dusk.",
    "Mangoes are sweet in the summer.",
    "The stairs creak at night.",
    "Fold the clothes and put them away.",
    "The road was quiet after the rain.",
    "A warm bath helps you sleep.",
    "Cold milk is kept in the fridge.",
    "The children played until it got dark.",
    "Honey is made by busy bees.",
    "Turn off the light when you leave.",
    "The baker starts work before dawn.",
    "Hang the wet towel in the sun.",
    "The tailor mends coats and shirts.",
  ],
}));

const one = "one ring with both dots";
const split = "If you see two, tap It split or press Down.";

export const help: Record<string, string> = texts("copy/drills-verg", "help", () => ({
  "screen-vergence-ramp": `Watch the ring and keep it as ${one} while it slowly gets harder. The moment it turns into two rings, tap It split or press Down. When the two join again, tap the scene or press Space or OK.`,
  "screen-diverge-ramp": `The ring drifts the other way, so let your eyes relax to keep ${one}. The moment it turns into two rings, tap It split or press Down. When the two join again, tap the scene or press Space or OK.`,
  "screen-vergence-steps": `The ring jumps. Bring it back to ${one}, then tap the scene or press Space or OK for the next jump. ${split}`,
  "flip-switch": `Each time you see ${one}, tap the scene or press Space or OK. The ring then flips between pulling your eyes in and letting them out. ${split}`,
  "long-hold": `Tap the top half of the scene or press Up to make it harder, one step at a time. Tap the bottom left or press Left to make it easier. Then hold ${one} while the bar fills for two minutes. ${split}`,
  "reading-under-demand": `Read the sentence, then tap the scene or press Space or OK for the next one. Each eye's words have a dot: you should see one sentence with a dot above and a dot below. If the words double, tap It split or press Down.`,
  "distance-fusion-hold": `Sit about 3 metres from the TV and keep ${one}. It gets a little harder after every 20 seconds you hold it. If you see two rings, tap It split or press Down.`,
}));
