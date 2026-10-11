// Eyes Opener: Guides for the Focus group: routines that train how quickly the eyes change focus between far and near.
/**
 * Guides for the Focus group: routines that train how quickly the eyes change focus between far and near.
 * Both use the printed letter chart (read from 3 m) and its small near card (held at 40 cm).
 *
 * Neither measure has a `usual`: the published figures for focus flexibility come from a test with flip
 * lenses, not from a far chart and a near card, so there is nothing true to compare these counts with.
 */
import type { Guide, Source } from "./types";
import { textsEach } from "@/i18n/texts";
import { GUIDE_WORDS } from "./words";

const pubmed = (id: number) => `https://pubmed.ncbi.nlm.nih.gov/${id}/`;

/* Sources. Each was opened and read: the title, year and journal, and what is said of it below. */

/** 221 children, 164 with a focusing problem; only the supervised therapy improved focus flexibility more than placebo therapy did. */
const FOCUS_TRIAL: Source = {
  label: "Scheiman and others for the Convergence Insufficiency Treatment Trial, 2011, Optometry and Vision Science: focusing problems treated in 221 children aged 9 to 17",
  url: pubmed(21873922),
};
/** The letter chart drill of the trial's therapy: one eye covered, large chart at 3 m, small chart at 40 cm, swapping after each letter. */
const MANUAL: Source = {
  label: "CITT-ART Investigator Group, 2015, manual of procedures, chapter 7: the therapy drills used in the trial, step by step, in the office and at home",
  url: "https://bpb-us-w2.wpmucdn.com/u.osu.edu/dist/2/74958/files/2019/04/CITT-ART_MOP_Chapter07-2ltr2n8.pdf",
};
const CITT: Source = {
  label: "Convergence Insufficiency Treatment Trial Study Group, 2008, Archives of Ophthalmology: four treatments compared in 221 children aged 9 to 17",
  url: pubmed(18852411),
};

/* Lines the two routines share. */

const STOP = [
  "Double vision that stays after you look far away and blink",
  "A headache",
  "Eye pain",
  "Feeling dizzy or sick",
  "Letters that stay blurred, far or near, for more than a minute after you stop",
  "Eyes that water or burn",
];
const NEED = [
  "The printed letter chart and one of its small near cards",
  "A wall with 3 metres of clear floor in front of it, and good light on the chart and on the card",
  "A ruler or tape measure",
  "The glasses you normally wear, if any",
];
const PIN = "Print both sheets at 100% size. Pin the far chart to a wall at the height of your eyes and cut out one near card.";
const PLACE = "Mark a spot on the floor 3 metres from the wall and stand or sit there. Hold the near card 40 cm from your eyes; check with the ruler the first time.";
const PAIR = "One pair is one letter read sharp on the far chart and then one letter read sharp on the near card.";
const BLURRED = "Saying a letter from memory, or from its blurred shape. Wait until it is sharp.";
const DRIFT = "Letting the near card drift further away than 40 cm, which makes it easier. Check with the ruler now and then.";

export const guides: Guide[] = textsEach("data/guides/focus", () => [
  {
    slug: "near-far-focus-rock",
    what: "You read letters in turn from a chart 3 metres away and a small card at 40 cm, waiting each time until the letter is sharp. It works on how quickly your eyes change focus between far and near.",
    need: [...NEED, "This phone or tablet within reach of your free hand, or a helper to tap for you"],
    setup: [
      PIN,
      PLACE,
      "Put the phone or tablet where your free hand can tap it without looking.",
    ],
    steps: [
      "Warm up: read the top row on the far chart, then the same row on the near card. Wait each time until the letters are sharp.",
      "Now swap after every letter. Read the first letter of the second row on the far chart, aloud.",
      "Look at the near card. Wait until the second letter of that row is sharp, then read it aloud.",
      "Go back to the far chart for the third letter, the near card for the fourth, and so on along the row and down the chart.",
      "Practise like this for about 2 minutes.",
      "Press Start the count. Carry on the same way and tap the big button after each far and near pair, for one minute.",
      "When the time is up, press Save this routine. The page works out your pairs a minute.",
    ],
    right: [
      "Each letter comes sharp before you say it.",
      "The swap gets quicker as you go, without the letters swimming.",
      "A helper checking against the chart hears no wrong letters.",
    ],
    measures: [{
      key: "cycles_per_min", label: "Far and near pairs", unit: "a minute",
      how: `The page counts your taps for 60 seconds. Tap once after each pair. ${PAIR} Do not tap if you said a letter while it was still blurred.`,
      from: "auto", min: 0, max: 60, step: 1, better: "higher",
    }],
    stop: STOP,
    mistakes: [
      BLURRED,
      DRIFT,
      "Reading in dim light. Both the chart and the card need good light.",
      "Taking off the glasses you normally wear.",
    ],
    tool: { kind: "count", seconds: 60, per: "minute", measure: "cycles_per_min", tap: "Tap after each far and near pair" },
    print: "letters",
    evidence: "No trial tested this routine on its own, and no published figure says what count is usual with a far chart and a near card. The trials' supervised therapy, which included a chart drill like this, improved focusing more than placebo (pretend) therapy did.",
    sources: [FOCUS_TRIAL, MANUAL, CITT],
  },

  {
    slug: "one-eye-focus-rock",
    what: "The same far and near reading with one eye covered, then the other. Each eye has to change focus on its own, so you can see whether the two eyes keep up with each other.",
    need: [
      ...NEED,
      "A patch, or the palm of your hand, to cover one eye",
      "A helper to watch the clock and count is a great help. On your own, make a pencil mark on paper after each pair",
    ],
    setup: [
      PIN,
      PLACE,
      "Cover your left eye with the patch. If you use your palm, cup it so it does not press on the eye.",
      "Press Start timer on this page.",
    ],
    steps: [
      "With your right eye, read the first letter of the top row on the far chart, aloud.",
      "Look at the near card. Wait until the second letter of that row is sharp, then read it aloud.",
      "Carry on: the third letter far, the fourth near, along the row and down the chart. Practise for about 1 minute.",
      "Now count. For one minute by the timer, count each far and near pair you read sharp. Remember the number for the right eye.",
      "Move the patch to your right eye and rest for half a minute.",
      "Do the same with your left eye: about 1 minute of practice, then one counted minute.",
      "Type the two counts on this page and press Save this routine.",
    ],
    right: [
      "The covered eye sees nothing at all.",
      "Each letter comes sharp before you say it, far and near.",
      "Each eye had the same practice and the same counted minute.",
    ],
    measures: [
      {
        key: "right_cpm", label: "Right eye: far and near pairs", unit: "a minute",
        how: `With your left eye covered, count the pairs you read in one minute by the timer. ${PAIR}`,
        from: "typed", min: 0, max: 60, step: 1, better: "higher",
      },
      {
        key: "left_cpm", label: "Left eye: far and near pairs", unit: "a minute",
        how: "With your right eye covered, count the pairs you read in one minute, the same way. If one eye stays well behind the other for several days, tell your eye doctor.",
        from: "typed", min: 0, max: 60, step: 1, better: "higher",
      },
    ],
    stop: STOP,
    mistakes: [
      "Peeking round the patch. The covered eye must see nothing.",
      "Pressing on the covered eye with your hand. It blurs that eye for a while afterwards.",
      BLURRED,
      DRIFT,
    ],
    tool: { kind: "timer" },
    print: "letters",
    evidence: "No trial tested this routine on its own, and no published figure says what count is usual at 40 cm. The trials' supervised therapy used the same chart drill one eye at a time, and that therapy improved focusing more than placebo (pretend) therapy did.",
    sources: [MANUAL, FOCUS_TRIAL, CITT],
  },
], GUIDE_WORDS);
