// Eyes Opener: Guides for the Convergence group: routines that train how the two eyes turn in and out together.
/**
 * Guides for the Convergence group: routines that train how the two eyes turn in and out together.
 * The hands-on routines come first (string, cards, push-ups, jumps), then the on-screen drills, then the homework plan.
 *
 * A figure under `usual` comes only from the source it points at. Where that figure is a goal the trial's
 * therapy worked towards, and not what most people score, the words say "goal".
 */
import type { Guide, Measure, Source } from "./types";
import { textsEach } from "@/i18n/texts";
import { GUIDE_WORDS } from "./words";

const pubmed = (id: number) => `https://pubmed.ncbi.nlm.nih.gov/${id}/`;

/* Sources. Each was opened and read: the title, year and journal, and every figure used below. */

/** 221 children; weekly therapy with home practice 73% succeeded or improved, home push-ups 43%, home computer drills 33%, placebo therapy 35%. */
const CITT: Source = {
  label: "Convergence Insufficiency Treatment Trial Study Group, 2008, Archives of Ophthalmology: four treatments compared in 221 children aged 9 to 17",
  url: pubmed(18852411),
};
/** Home practice of 15 minutes a day on 5 days a week; normal taken as a near point under 6 cm and a break above 15 prism dioptres. */
const KINETICS: Source = {
  label: "Scheiman and others for the same trial group, 2010, Optometry and Vision Science: the home practice the trial set, and what it counted as normal",
  url: pubmed(20543758),
};
/** The therapy drills of the follow-on trial, step by step, with the goal for each and the list given as home practice. */
const MANUAL: Source = {
  label: "CITT-ART Investigator Group, 2015, manual of procedures, chapter 7: the therapy drills used in the trial, step by step, in the office and at home",
  url: "https://bpb-us-w2.wpmucdn.com/u.osu.edu/dist/2/74958/files/2019/04/CITT-ART_MOP_Chapter07-2ltr2n8.pdf",
};
const REVIEW: Source = {
  label: "Scheiman, Kulp, Cotter, Lawrenson, Wang and Li, 2020, Cochrane Database of Systematic Reviews: treatments for convergence insufficiency compared",
  url: pubmed(33263359),
};
/** At least 85% of the children in each school grade kept the target single to 6 cm or closer. */
const HAYES: Source = {
  label: "Hayes, Cohen, Rouse and De Land, 1998, Optometry and Vision Science: how close 297 schoolchildren could keep a small letter single",
  url: pubmed(9703039),
};
/** Adults: a cut-off of 5 cm for the break and 7 cm for the recovery. */
const SCHEIMAN: Source = {
  label: "Scheiman and others, 2003, Optometry and Vision Science: the near point of convergence test and its usual figures in adults",
  url: pubmed(12637833),
};
/** Flip prisms of 3 base-in and 12 base-out at 40 cm; under 15 cycles a minute fails. Adults aged 18 to 35. */
const GALL: Source = {
  label: "Gall, Wick and Bedell, 1998, Optometry and Vision Science: the flip-prism test of vergence facility in adults aged 18 to 35",
  url: pubmed(9798213),
};
/** 204 children; home computer therapy 23% succeeded, push-ups 22%, placebo 16%; too few children to tell the groups apart. */
const HOME: Source = {
  label: "Pediatric Eye Disease Investigator Group, 2016, Optometry and Vision Science: home computer drills, push-ups and placebo compared in 204 children",
  url: pubmed(27575992),
};
/** 310 children; 16 weeks of supervised therapy raised reading scores no more than placebo therapy did. */
const READING: Source = {
  label: "CITT-ART Investigator Group, 2019, Optometry and Vision Science: supervised therapy and reading scores in 310 children aged 9 to 14",
  url: pubmed(31651592),
};

/* Lines that many routines share. */

const STOP = [
  "Double vision that stays after you look far away and blink",
  "A headache",
  "Eye pain",
  "Feeling dizzy or sick",
];
const PULL = "A pulling or aching feeling round the eyes that is still there after a minute of looking far away";
const DOT_GONE = "One of the two dots keeps going missing: one eye is switching off";
const DRILL_STOP = [...STOP, PULL, DOT_GONE];

const DRILL_NEED = [
  "Red-cyan glasses",
  "A tablet, computer or TV that has been measured in this app, turned up bright. A wider screen lets the drill go further",
  "A ruler or tape measure, to check how far you sit from the screen",
];
const GLASSES = "Put on the red-cyan glasses, over your own glasses if you wear them, the way round your eye profile says.";
const DISTANCE = "Sit square to the screen at the distance this screen was measured for. Check it once with a ruler: leaning in or back changes the numbers.";
/** The kit gives the left eye the top dot whichever lens it wears, so this shows glasses worn the wrong way round, which would turn every pull the other way. */
const CHECK = "Close your right eye. The dot you still see should be the top one. If it is the bottom one, turn the glasses round: worn the wrong way, the drill pulls your eyes the opposite way.";
const DRILL_SETUP = [GLASSES, DISTANCE, CHECK, "Press Start under the scene."];

const RING = "Look at the ring. Each eye sees its own ring: the left eye's has a dot at the top, the right eye's a dot at the bottom. Joined, they make one ring with both dots.";
const ONE_RING = "You see one ring with a dot at the top and a dot at the bottom.";
const ONE_DOT = "Carrying on with one dot missing. One eye has switched off, so the two are no longer working together. Blink; if the dot stays missing, tap It split.";
const LEANING = "Leaning toward the screen when it gets hard. Stay at your set distance.";
const FALSE_OK = "Pressing OK while you still see two rings. The numbers are only as true as your presses.";
const PRISM = "One prism dioptre means aiming 1 cm to the side at a distance of 1 metre.";
/** The last step of a drill: the routine's own length, then a rest. */
const after = (minutes: number) => `After ${minutes} minutes, press Finish now. Then look across the room for a minute.`;

const NO_DRILL_TRIAL = "No trial tested this drill on its own.";
const HOME_DRILLS = "In the main trial, computer drills done at home (with push-ups) did no better than placebo (pretend) therapy: 33 in 100 children succeeded or improved, against 35. Drills like this one were also part of the weekly therapy that reached 73.";

/** A number the screen measures in prism dioptres. */
const prism = (key: string, label: string, how: string, max = 30): Measure =>
  ({ key, label, unit: "prism dioptres", how, from: "auto", min: 0, max, step: 0.1, better: "higher" });

export const guides: Guide[] = textsEach("data/guides/convergence", () => [
  {
    slug: "brock-string",
    what: "A string with three beads runs from your nose to a door handle. You look from bead to bead, and the string itself shows where your two eyes are aiming, so you can feel it and steer it.",
    need: [
      "About 3 metres of string and three beads of different colours. Bright buttons or big knots will do",
      "A door handle or chair back to tie the far end to",
      "A ruler",
      "Good light, and your usual glasses if you wear them",
    ],
    setup: [
      "Thread the three beads on the string. Tie one end to a door handle at about the height of your nose.",
      "Stand back until the string is tight. Hold the free end against the bridge of your nose, between your eyes.",
      "Slide one bead to 30 cm from your nose, one to 60 cm, and the third near the far end.",
      "Press Start timer on this page. Keep your head still and both eyes open.",
    ],
    steps: [
      "Look at the far bead. You should see one bead, with two strings that run away from you and meet at it. The two nearer beads look double: that is right.",
      "Look at the middle bead. Now the two strings cross at it like an X, and the other two beads look double.",
      "Look at the near bead. The X now crosses at the near bead.",
      "Hold each bead for a slow count of 5, then move on: far, middle, near, middle, far. That is one round. Do 3 rounds.",
      "Slide the near bead 5 cm closer to your nose and do one more round.",
      "Keep bringing the near bead closer, 5 cm at a time and then 2 cm at a time. Go on while it still becomes one bead with the X on it.",
      "When the near bead will not become one, slide it back to the last place where it did.",
      "Measure from that bead to the bridge of your nose. Type the number on this page and press Save this routine.",
    ],
    right: [
      "The bead you look at is one bead and every other bead is double.",
      "You always see two strings, and they cross exactly at the bead you are looking at.",
      "You can feel your eyes pull in for the near bead and let go for the far one.",
    ],
    measures: [{
      key: "nearest_cm", label: "Nearest distance the bead stays single", unit: "cm",
      how: "Bring the near bead toward your nose until it will not become one bead. Slide it back to the last place it was one, with the strings crossing at it. Measure from the bead to the bridge of your nose.",
      from: "typed", min: 1, max: 60, step: 0.5, better: "lower",
      usual: { text: "On the clinic test with a small letter, at least 85 in 100 schoolchildren stay single to 6 cm or closer. With the string, the trial's therapy worked towards 2.5 cm: a goal, not an average.", source: 2 },
    }],
    stop: [...STOP, PULL, "The near bead is double even at 30 cm, however long you look"],
    mistakes: [
      "Carrying on with only one string in view. One eye has switched off: blink, or jiggle the string, until both strings are back.",
      "Letting the strings cross in front of the bead or behind it. Your eyes are aiming too near or too far: look again until the X sits on the bead.",
      "Turning or tilting your head. The string must run straight out from the middle of your face.",
      "Hurrying on before the bead has become one.",
    ],
    tool: { kind: "timer" },
    evidence: "No trial tested the string on its own. It is one of the home drills in the supervised therapy the trials used, where a therapist also saw the child every week.",
    sources: [MANUAL, CITT, HAYES, REVIEW],
  },

  {
    slug: "target-push-ups",
    what: "You bring a small letter slowly toward your nose and keep it as one sharp letter for as long as you can. It works on how close your eyes can turn in together.",
    need: [
      "The printed letter strip taped round the end of a pen, or a pen with small clear print on it",
      "A ruler",
      "A wall 2 to 3 metres away with something on it to look past the pen at: a picture, a clock, a light switch",
      "Your usual glasses if you wear them",
    ],
    setup: [
      "Print the letter card at 100% size. Cut out the strip and tape it round the end of a pen, with the small letter facing you.",
      "Stand or sit facing the wall. Hold the pen upright at arm's length, straight in front of your nose, with the letter at the height of your eyes.",
      "Press Start timer on this page. Keep your head still.",
    ],
    steps: [
      "Look at the small letter. It should be one sharp letter. The picture on the wall behind it should look double: that shows both eyes are working.",
      "Move the pen slowly toward the bridge of your nose, about 2 cm each second. Keep the letter single and sharp.",
      "The moment the letter turns into two, stop the pen. Try for a few seconds to pull the two back into one.",
      "If it becomes one, carry on toward your nose. If it stays two, move the pen away until it is one again.",
      "Take the pen back out to arm's length. That is one push-up.",
      "Do 20 push-ups, then rest for a minute with your eyes on something far away. That is one set.",
      "On the last push-up of the set, hold the pen where the letter doubled and measure from the letter to the bridge of your nose.",
      "Do 3 sets. Type your nearest distance and the sets you finished, and press Save this routine.",
    ],
    right: [
      "The letter stays one and sharp most of the way in.",
      "The picture on the wall looks double the whole time.",
      "You feel your eyes pulling in as the pen comes close.",
    ],
    measures: [
      {
        key: "break_cm", label: "Distance from the nose where the letter doubles", unit: "cm",
        how: "Stop the pen where the letter turns into two and will not join. Measure from the letter to the bridge of your nose, or ask a helper to. Type the nearest distance you reached today.",
        from: "typed", min: 1, max: 60, step: 0.5, better: "lower",
        usual: { text: "At least 85 in 100 schoolchildren keep a small letter single to 6 cm or closer. For adults the clinic cut-off is 5 cm (Scheiman, 2003, listed below).", source: 1 },
      },
      {
        key: "sets", label: "Sets of 20 push-ups finished", unit: "of 3",
        how: "Count each set of 20 push-ups you finished today. Three sets is the full routine.",
        from: "typed", min: 0, max: 3, step: 1, better: "higher",
      },
    ],
    stop: [...STOP, PULL, "The letter is double even at arm's length. Do not do this routine: tell your eye doctor"],
    mistakes: [
      "Moving the pen fast. Slow is the exercise: about 2 cm each second.",
      "Carrying on when the wall picture has stopped looking double. One eye has switched off: blink and start that push-up again.",
      "Looking at the pen as a whole. Look at the small letter and keep it sharp.",
      "Moving your head toward the pen. Keep your head still and move the pen.",
    ],
    tool: { kind: "timer" },
    print: "letter",
    evidence: "In the main trial, push-ups alone for 15 minutes a day did no better than placebo (pretend) therapy: 43 in 100 children succeeded or improved, against 35. Weekly therapy with a therapist, plus home practice, reached 73 in 100.",
    sources: [CITT, HAYES, SCHEIMAN, REVIEW],
  },

  {
    slug: "barrel-card",
    what: "A folded card with three barrels, red on one side and green on the other, held out from your nose. You turn your eyes in to make each barrel one, from the farthest to the nearest.",
    need: [
      "The barrel card, printed in colour, cut out, folded and glued",
      "A clock with a seconds hand, or count slowly in your head",
      "Good light, and your usual glasses if you wear them",
    ],
    setup: [
      "Print the card in colour at 100% size. Cut it out, fold it along the dashed line with the barrels on the outside, and glue the two halves together.",
      "Hold the card by its lower edge, straight out in front of you, with the nose end touching the tip of your nose.",
      "Check that one eye sees the red barrels and the other eye sees the green ones. Keep both eyes open.",
      "Press Start timer on this page.",
    ],
    steps: [
      "Look at the largest barrel, the one farthest from you. Pull your eyes in until the red barrel and the green barrel become one barrel in mixed red and green.",
      "Notice the two nearer barrels. Each looks double, one red and one green: that is right.",
      "Hold the far barrel as one for a slow count of 5.",
      "Look at the middle barrel and make it one. Now the far and near barrels look double. Hold for a count of 5.",
      "Look at the smallest barrel, nearest your nose, and make it one. Hold for a count of 5. This one is the hardest.",
      "Go back out to the middle barrel, then the far one. Far, middle, near and back is one round. Do rounds for 3 minutes.",
      "On the last round, time how long you can keep the nearest barrel as one, up to 30 seconds.",
      "Type how many barrels you made into one and your longest hold, and press Save this routine.",
    ],
    right: [
      "The barrel you look at is one barrel in a mix of red and green. The colours may shimmer.",
      "The other two barrels look double.",
      "Each barrel becomes one within about 3 seconds.",
    ],
    measures: [
      {
        key: "joined", label: "Barrels made into one", unit: "of 3",
        how: "On your last round, count the barrels you could make into one barrel in mixed red and green and hold for a count of 5.",
        from: "typed", min: 0, max: 3, step: 1, better: "higher",
        usual: { text: "The trial's therapy worked towards all three, each made one within 3 seconds and held for 5 seconds, ten rounds running. That is a goal, not an average.", source: 0 },
      },
      {
        key: "hold_s", label: "Longest hold on the nearest barrel", unit: "seconds",
        how: "Make the smallest barrel one, then count slowly or watch a clock until it splits or one colour goes. Stop at 30. Type 0 if you could not make it one.",
        from: "typed", min: 0, max: 30, step: 1, better: "higher",
      },
    ],
    stop: [...STOP, PULL, "The farthest barrel will not become one however long you look"],
    mistakes: [
      "Carrying on when the barrel looks only red or only green. One eye has switched off: blink, or move the card a little, until both colours are there.",
      "Letting the card point to one side. It must run straight out from the middle of your face, so each eye sees one side.",
      "Starting with the nearest barrel. Start far, where it is easiest.",
    ],
    tool: { kind: "timer" },
    print: "barrel",
    evidence: "No trial tested this card on its own. A card of the same kind, with three dots in place of three barrels, is one of the home drills in the supervised therapy the trials used.",
    sources: [MANUAL, CITT, REVIEW],
  },

  {
    slug: "dot-card",
    what: "A long strip with a line of dots, held out from the tip of your nose. You make each dot one, stepping from the farthest dot to the nearest, which works your eyes at very close range.",
    need: [
      "The printed dot card, cut out. Glue it onto thin card if the paper is soft",
      "Good light, and your usual glasses if you wear them",
    ],
    setup: [
      "Print the card at 100% size and cut out the strip.",
      "Hold the nose end against the tip of your nose. Point the strip straight ahead and tilt the far end slightly down, so you can see every dot.",
      "Press Start timer on this page. Keep both eyes open.",
    ],
    steps: [
      "Look at the dot farthest from your nose and make it one dot. The line on the card should look like two lines that meet at that dot.",
      "Notice the nearer dots. They look double: that is right.",
      "Hold the far dot as one for a slow count of 5.",
      "Step to the next dot toward your nose. Make it one, with the two lines now crossing at this dot. Hold for a count of 5.",
      "Keep stepping in, one dot at a time, holding each for a count of 5.",
      "When a dot will not become one, go back to the dot before it and hold that one for a count of 10.",
      "Walk your eyes back out, dot by dot, to the far dot. Then go in again until 3 minutes are up.",
      "Read the number printed beside the nearest dot you kept as one. Type it on this page and press Save this routine.",
    ],
    right: [
      "The dot you look at is one dot and the others look double.",
      "The two lines meet or cross exactly at the dot you are looking at.",
      "You can step in and back out without losing the dot each time.",
    ],
    measures: [{
      key: "nearest_cm", label: "Nearest dot kept as one", unit: "cm from the nose",
      how: "Find the nearest dot you could make one and hold for a count of 5. The number printed beside it is its distance from the tip of your nose in centimetres. Type that number.",
      from: "typed", min: 1, max: 30, step: 1, better: "lower",
    }],
    stop: [...STOP, PULL, "The farthest dot will not become one however long you look"],
    mistakes: [
      "Carrying on with only one line in view. One eye has switched off: blink, or tap the card, until both lines are back.",
      "Holding the strip flat or to one side. Point it straight ahead and tilt the far end slightly down.",
      "Skipping dots. Step one dot at a time, in and out.",
    ],
    tool: { kind: "timer" },
    print: "dots",
    evidence: "No trial tested the dot card on its own, and no published figure says which dot is usual. It trains the same skill as the three-dot card and the string, which are home drills in the supervised therapy the trials used.",
    sources: [MANUAL, CITT, REVIEW],
  },

  {
    slug: "lifesaver-card",
    what: "A card with pairs of rings. You cross your eyes until two rings slide into a third ring in the middle, then make that ring sharp. It trains joining and focusing with nothing but the card.",
    need: [
      "The printed Lifesaver card, cut out",
      "A pen or pencil",
      "A ruler, to check the 40 cm the first time",
      "Good light, and your usual glasses if you wear them",
    ],
    setup: [
      "Print the card at 100% size and cut it out.",
      "Hold the card upright 40 cm from your eyes. Check the distance with a ruler the first time.",
      "Start with row 1, where the two rings are closest together. Press Start timer on this page.",
    ],
    steps: [
      "Hold the pen tip half way between your eyes and the card, in front of the two rings. Look at the pen tip, not at the card.",
      "Move the pen slowly toward you. Behind it the two rings blur and double, then the middle two slide into one. You now see three rings.",
      "Keep the pen still and look at the middle ring. Wait until you can read the word CLEAR on it.",
      "Check the hole of the middle ring: two small dots, one above the other, and the hole seems to float toward you.",
      "Hold the middle ring sharp for a count of 5. Then take the pen away and try to keep the ring for another count of 5.",
      "Look across the room, then do it again. When a row works 5 times running, move to the next row: each is harder.",
      "On the hardest row you can do, time how long you keep the middle ring sharp, up to 30 seconds.",
      "Type the number of rows you joined and your longest hold, and press Save this routine.",
    ],
    right: [
      "You see three rings and look at the middle one.",
      "The word CLEAR on the middle ring is sharp enough to read.",
      "The hole of the middle ring shows two dots, one above the other, and floats toward you.",
    ],
    measures: [
      {
        key: "rows", label: "Rows joined and sharp", unit: "of 4",
        how: "Count the rows where you made the middle ring, read CLEAR on it and held it for a count of 5.",
        from: "typed", min: 0, max: 4, step: 1, better: "higher",
        usual: { text: "With its own four-row card, the trial's therapy worked towards every row held sharp for at least 5 seconds without the pen. That is a goal, not an average.", source: 0 },
      },
      {
        key: "hold_s", label: "Longest hold on your hardest row", unit: "seconds",
        how: "On the hardest row you joined, count slowly or watch a clock from the moment the middle ring is sharp until it blurs or splits. Stop at 30.",
        from: "typed", min: 0, max: 30, step: 1, better: "higher",
      },
    ],
    stop: [...STOP, PULL, "Far things stay blurred for more than a minute after you stop"],
    mistakes: [
      "Settling for three blurred rings. Keep looking at the middle one and wait; move the pen a little nearer or farther until the word is sharp.",
      "Carrying on with one dot missing in the hole. One eye has switched off: blink, look away and start again.",
      "Bringing the card closer than 40 cm. The rows make it harder, not the distance.",
      "Moving to a harder row before the row you are on is easy.",
    ],
    tool: { kind: "timer" },
    print: "lifesaver",
    evidence: "No trial tested this card on its own. Life Saver cards are part of the supervised therapy the trials used, in the office and then at home, once the first drills had become easy.",
    sources: [MANUAL, CITT, REVIEW],
  },

  {
    slug: "near-far-jumps",
    what: "You jump your eyes between your thumbnail at arm's length and a letter across the room, making each one single and sharp. It works on turning the eyes in and letting them go quickly.",
    need: [
      "A letter or number across the room, at least 3 metres away: a clock face, a calendar, a book spine",
      "Your thumb",
      "This phone or tablet within reach of your free hand, or a helper to tap for you",
      "Your usual glasses if you wear them",
    ],
    setup: [
      "Stand or sit facing the letter. Hold one thumb up at arm's length, just below the line from your eyes to the letter.",
      "Put the phone or tablet where your other hand can tap it without looking.",
      "Keep your head still. Only your eyes move.",
    ],
    steps: [
      "Look at the letter across the room. Wait until it is one sharp letter. Your thumb, in front of it, should look double.",
      "Jump your eyes to your thumbnail. Wait until it is one sharp thumbnail. The letter behind it should now look double.",
      "Jump back to the letter. Near and far, each seen single and sharp, is one jump.",
      "Do 20 jumps at a steady pace, then rest for a minute with your eyes on something far away. That is one set.",
      "Do a second set of 20 jumps the same way.",
      "For the third set, press Start the count. Tap the big button with your free hand after each near and far pair, for one minute.",
      "When the time is up, press Save this routine. The page works out your jumps a minute.",
      "When all three sets feel easy, hold your thumb closer, about 30 cm from your nose, so the jump is bigger.",
    ],
    right: [
      "Each target is one and sharp before you jump away from it.",
      "Whatever you are not looking at appears double.",
      "Your head stays still and the pace stays even.",
    ],
    measures: [{
      key: "jumps_per_min", label: "Near and far jumps", unit: "a minute",
      how: "The page counts your taps for 60 seconds. Tap once after each pair: the thumbnail seen single and sharp, then the far letter seen single and sharp. Do not tap if either was double or blurred.",
      from: "auto", min: 0, max: 60, step: 1, better: "higher",
    }],
    stop: [...STOP, PULL, "The far letter stays blurred for more than a minute after you stop"],
    mistakes: [
      "Jumping away before the target is single and sharp. A fast count of blurred looks is worth nothing.",
      "Moving your head or your thumb in place of your eyes.",
      "Tapping for jumps where the thumb or the letter was double.",
    ],
    tool: { kind: "count", seconds: 60, per: "minute", measure: "jumps_per_min", tap: "Tap after each near and far pair" },
    evidence: "No trial tested this routine on its own, and no published figure says how many jumps a minute is usual. The trials' supervised therapy trained the same jump between near and far with a string and two beads.",
    sources: [MANUAL, CITT, REVIEW],
  },

  {
    slug: "screen-vergence-ramp",
    what: "On screen, through red-cyan glasses, each eye sees its own ring. The two rings drift apart slowly and your eyes turn in to keep them as one. The screen measures how far you get before one ring turns into two.",
    need: DRILL_NEED,
    setup: DRILL_SETUP,
    steps: [
      RING,
      "The two rings now drift apart slowly, so your eyes must turn in more and more. Keep it one sharp ring with both dots.",
      "The moment it turns into two rings that you cannot pull back, tap It split in the bottom right corner, or press Down. The screen saves that point as your break.",
      "The rings now come back toward each other. The moment they are one ring again, tap the scene or press Space, Enter or OK. The screen saves that point as your recovery.",
      "Rest for the two seconds the screen gives you. It then climbs again from where you are.",
      "If the words The screen's limit appear, you kept one ring as far as this screen can go. The ring comes back to rest and the climb starts again.",
      after(5),
    ],
    right: [
      ONE_RING,
      "The ring looks a little smaller and nearer as it gets harder. That is normal.",
      "You tap It split at the moment the ring doubles, not later.",
    ],
    measures: [
      {
        ...prism("break_pd", "Break: the furthest you kept one ring", `The screen saves how far apart the rings were when you tap It split, and keeps the highest of the session. If you reach the screen's limit with no split, the limit is saved. ${PRISM}`),
        usual: { text: "In the trial, a break above 15 on the clinic's prism test at reading distance counted as normal for children, with one other check. The screen is a different test and may stop sooner, so treat this as a rough guide.", source: 1 },
      },
      prism("recover_pd", "Recovery: where two rings became one again", "After a split the rings come back slowly. The screen saves how far apart they still were at the moment you press OK for one ring, and keeps the highest of the session."),
    ],
    stop: DRILL_STOP,
    mistakes: [
      ONE_DOT,
      FALSE_OK,
      LEANING,
      "Letting the ring go blurred to keep it single. It should be sharp as well as single.",
    ],
    tool: { kind: "drill" },
    evidence: HOME_DRILLS,
    sources: [CITT, KINETICS, HOME, MANUAL, REVIEW],
  },

  {
    slug: "screen-vergence-steps",
    what: "The same two rings as the ramp, but the pull changes in sudden jumps. After each jump you bring the two rings back into one. The screen counts the jumps and times how fast you get one ring back.",
    need: DRILL_NEED,
    setup: DRILL_SETUP,
    steps: [
      RING,
      "When you see one ring, tap the scene or press Space, Enter or OK. The words Hold it appear.",
      "One second later the ring jumps: it splits into two rings side by side.",
      "Pull the two rings back into one ring with both dots, as quickly as you can while keeping it sharp.",
      "The moment it is one ring, tap the scene or press OK. The screen times how long that took, and one second later it jumps again.",
      "If you cannot join the rings, tap It split or press Down. The screen eases off and makes the next jump half the size.",
      "Carry on. The jumps climb until the screen's limit is near, come back down, and climb again.",
      after(5),
    ],
    right: [
      ONE_RING,
      "After a jump the two rings slide together within a few seconds.",
      "You press OK only when the ring is one and sharp.",
    ],
    measures: [
      {
        key: "steps", label: "Jumps cleared", unit: "",
        how: "The screen adds one each time you press OK with one ring after a jump. A jump you answer with It split is not counted.",
        from: "auto", min: 0, max: 500, step: 1, better: "higher",
      },
      prism("step_pd", "Largest jump cleared", `The screen keeps the size of the biggest jump you cleared. Jumps grow with your level, from about 2 up to 12 at most, and halve after a split. ${PRISM}`, 12),
      {
        key: "regain_s", label: "Average time to get one ring back", unit: "seconds",
        how: "The screen times each jump from the moment the ring jumps to the moment you press OK, and saves the average over the jumps you cleared.",
        from: "auto", min: 0, max: 120, step: 0.1, better: "lower",
      },
    ],
    stop: DRILL_STOP,
    mistakes: [
      FALSE_OK,
      ONE_DOT,
      LEANING,
      "Struggling on with two rings for a long time. Tap It split: the next jump is smaller and you lose nothing.",
    ],
    tool: { kind: "drill" },
    evidence: `${NO_DRILL_TRIAL} Sudden jumps in the pull were a later stage of the supervised therapy the trials used. Computer drills done at home, without the weekly visits, did no better than placebo (pretend) therapy.`,
    sources: [MANUAL, CITT, HOME, REVIEW],
  },

  {
    slug: "flip-switch",
    what: "The pull on the two rings flips between turning your eyes in and letting them out. Each time you get one ring, you press OK and it flips again. The screen counts how many full cycles you manage in a minute.",
    need: DRILL_NEED,
    setup: DRILL_SETUP,
    steps: [
      RING,
      "When you see one ring, tap the scene or press Space, Enter or OK. This starts the clock.",
      "The ring flips: the two rings jump apart so that your eyes must turn in. Pull them into one ring with both dots.",
      "The moment it is one ring, tap or press OK. The ring flips the other way, so your eyes must relax outward a little.",
      "Make it one ring again and press OK. In and out is one cycle.",
      "Keep going at a steady pace: join, press, join, press. If it will not join, tap It split or press Down; that flip is not counted.",
      "Watch the top line. It shows your cycles and the pair in use, such as 4.3 in, 1 out. The pair grows as you succeed.",
      after(3),
    ],
    right: [
      ONE_RING,
      "Turning in takes effort; letting out feels like relaxing. Both end in one sharp ring.",
      "Your presses come at an even pace, a few seconds apart.",
    ],
    measures: [
      {
        key: "cycles_per_min", label: "Full cycles, in and out", unit: "a minute",
        how: "One cycle is one flip in and one flip out, each ended by your OK press with one ring. The screen counts them from your first press and divides by the minutes played. It shows after 20 seconds.",
        from: "auto", min: 0, max: 60, step: 0.1, better: "higher",
        usual: { text: "On the clinic test (prisms of 12 in and 3 out at 40 cm), adults aged 18 to 35 who scored under 15 cycles a minute were counted as low. The screen's pair is smaller, at most about 10 in and 2.5 out, so compare with your own results.", source: 0 },
      },
      prism("conv_pd", "Turning in: the pull you reached", `The screen keeps the largest turning-in pull at which you pressed OK with one ring. It starts near 1.6 and can reach about 10. ${PRISM}`, 12),
      prism("div_pd", "Turning out: the pull you reached", "The screen keeps the largest turning-out pull at which you pressed OK with one ring. It is a quarter of the turning-in pull: from about 0.4 up to about 2.5.", 4),
    ],
    stop: DRILL_STOP,
    mistakes: [
      FALSE_OK,
      ONE_DOT,
      LEANING,
      "Racing. A cycle counts only if the ring was really one each time; a slower, true count is the one to keep.",
    ],
    tool: { kind: "drill" },
    evidence: `${NO_DRILL_TRIAL} It copies a clinic test, and the trials' supervised therapy ended with fast switches between turning in and turning out. Computer drills done at home alone did no better than placebo (pretend) therapy.`,
    sources: [GALL, MANUAL, CITT, HOME],
  },

  {
    slug: "long-hold",
    what: "You raise the pull on the two rings to a level you can only just manage, then hold one ring there for two minutes. It trains staying joined under a steady pull, as in long reading.",
    need: DRILL_NEED,
    setup: DRILL_SETUP,
    steps: [
      RING,
      "Tap the top half of the scene or press Up. Each tap adds 1 to the pull: the rings creep apart and your eyes turn in to keep one ring.",
      "Keep adding, one step at a time, until one ring takes real effort but is still sharp. To take 1 off, tap the bottom left or press Left.",
      "Now hold it. A bar fills while the clock counts up to two minutes. Breathe and blink as usual.",
      "If it turns into two rings, tap It split or press Down. The pull eases and the clock starts again from zero.",
      "At two minutes the words Two minutes held appear and the ring comes back to rest. Look across the room for a minute.",
      "Do up to three holds, then press Finish now. Next time, start one step higher if two minutes was easy.",
    ],
    right: [
      ONE_RING,
      "The ring stays sharp for the whole hold, not only single.",
      "It takes effort, but you can still breathe and blink normally.",
    ],
    measures: [
      {
        key: "hold_s", label: "Longest hold as one ring", unit: "seconds",
        how: "The screen runs a clock while the pull sits at the level you chose, and starts it again after a split or a change of level. It saves your longest hold, up to 120 seconds.",
        from: "auto", min: 0, max: 120, step: 1, better: "higher",
      },
      prism("hold_pd", "The pull during that hold", `The screen saves the level you were holding during your longest hold. ${PRISM}`),
    ],
    stop: DRILL_STOP,
    mistakes: [
      "Choosing a level so high that the ring splits every few seconds. Take 1 off and hold longer.",
      ONE_DOT,
      LEANING,
      "Staring without blinking. Blink as usual: the ring will still be there.",
    ],
    tool: { kind: "drill" },
    evidence: "No trial tested two-minute holds. The trials' supervised therapy asked for clear, single vision at each level of pull but set no hold time, so the two minutes here is a choice made for this app.",
    sources: [MANUAL, CITT, REVIEW],
  },

  {
    slug: "bead-slide",
    what: "One bead on a string held to your nose. You slide the bead slowly toward you and keep the two strings crossing at it. The crossing shows you at once when your eyes let go.",
    need: [
      "About 1 metre of string with one bead on it. The three-bead string works: push the other beads to the far end",
      "A door handle or chair back to tie the far end to",
      "A ruler",
      "Good light, and your usual glasses if you wear them",
    ],
    setup: [
      "Tie one end of the string to a door handle at about the height of your nose. Stand back until the string is tight.",
      "Hold the free end against the bridge of your nose, between your eyes. Put the bead 40 cm from your nose.",
      "Press Start timer on this page. Keep your head still and both eyes open.",
    ],
    steps: [
      "Look at the bead. You should see one bead, with two strings crossing at it like an X.",
      "With your free hand, slide the bead slowly toward your nose, about 2 cm each second. Keep looking at the bead.",
      "Watch the X as you slide. It must stay crossed exactly at the bead all the way in.",
      "Stop sliding the moment the bead turns into two, or the X slips behind the bead.",
      "Slide the bead back about 2 cm until it is one bead again. Hold it as one for a count of 5.",
      "Slide the bead back out to 40 cm and look at something far away for a few seconds.",
      "Do slides for 3 minutes. On your best slide, measure from the bead to the bridge of your nose.",
      "Type that number on this page and press Save this routine.",
    ],
    right: [
      "The bead stays one bead most of the way in.",
      "You always see two strings, and the X sits on the bead, not in front of it or behind it.",
      "You feel your eyes pulling in harder as the bead comes close.",
    ],
    measures: [{
      key: "nearest_cm", label: "Nearest distance the bead stays single", unit: "cm",
      how: "On your best slide, stop where the bead is still one bead with the strings crossing at it. Measure from the bead to the bridge of your nose with a ruler.",
      from: "typed", min: 1, max: 60, step: 0.5, better: "lower",
      usual: { text: "On the clinic test with a small letter, at least 85 in 100 schoolchildren stay single to 6 cm or closer. With the string, the trial's therapy worked towards 2.5 cm: a goal, not an average.", source: 2 },
    }],
    stop: [...STOP, PULL, "The bead is double even at 40 cm, however long you look"],
    mistakes: [
      "Sliding fast. About 2 cm each second lets your eyes keep up.",
      "Carrying on with only one string in view. One eye has switched off: blink, or jiggle the string, until both strings are back.",
      "Watching your hand in place of the bead.",
      "Turning or tilting your head. The string must run straight out from the middle of your face.",
    ],
    tool: { kind: "timer" },
    evidence: "No trial tested this drill on its own. Turning the eyes in slowly along a string, from 1 metre to 2.5 cm, is one of the home drills in the supervised therapy the trials used.",
    sources: [MANUAL, CITT, HAYES, REVIEW],
  },

  {
    slug: "stereogram-pairs",
    what: "Two rings sit side by side on screen, with no glasses. You join them into a third ring in the middle, first by crossing your eyes and then by relaxing them. Then you say whether the dot inside floats nearer or farther.",
    need: [
      "A tablet, computer or TV that has been measured in this app",
      "No red-cyan glasses. Keep your own glasses on if you wear them",
      "A pen or pencil, to help you learn to cross your eyes",
      "The printed pairs card, if you want to learn the trick on paper first",
    ],
    setup: [
      "Take off the red-cyan glasses. This drill is done without them.",
      DISTANCE,
      "Press Start under the scene.",
      "Read the words at the top of the scene. They say which way to join: Cross your eyes, or Relax your eyes, look through the screen.",
    ],
    steps: [
      "To cross: hold a pen tip half way between you and the screen and look at it. Behind it the two rings double, then the middle two slide into one. You see three rings.",
      "To relax: look at the rings as if staring through the screen at something far behind it. Again the middle two slide into one and you see three rings.",
      "Look at the middle ring and wait until it is sharp. It has a small dot inside.",
      "Decide where that dot floats: nearer to you than the ring, or farther away.",
      "Tap the left half or press Left for nearer. Tap the right half or press Right for farther.",
      "If the rings will not join, tap Cannot join or press Down. Do not guess.",
      "Carry on. A right answer moves the rings 0.5 cm further apart; a wrong one, or Cannot join, brings them 0.5 cm closer. The way of joining changes every 6 answers.",
      after(3),
    ],
    right: [
      "You see three rings and look at the middle one.",
      "The middle ring is sharp, and its dot clearly sits in front of the ring or behind it.",
      "After looking away, you can get the third ring back within a few seconds.",
    ],
    measures: [
      {
        key: "cross_cm", label: "Widest gap joined by crossing", unit: "cm",
        how: "The screen keeps the widest distance between the centres of the two rings at which you joined them by crossing your eyes and answered right about the dot. It starts at 2 cm and moves in steps of 0.5 cm.",
        from: "auto", min: 0, max: 12, step: 0.1, better: "higher",
        usual: { text: "With printed cards at 40 cm, the trial's therapy worked towards a gap of 12 cm joined by crossing. That is a goal, not an average, and a phone or tablet is too narrow to show it.", source: 0 },
      },
      {
        key: "relax_cm", label: "Widest gap joined by relaxing", unit: "cm",
        how: "The same, for joining by relaxing your eyes. The screen never goes past 4 cm this way, so that your eyes are not asked to point outward.",
        from: "auto", min: 0, max: 6, step: 0.1, better: "higher",
      },
    ],
    stop: [...STOP, PULL, "Far things stay blurred for more than a minute after you stop"],
    mistakes: [
      "Answering while you still see only two rings. The dot floats only once the rings are joined.",
      "Joining the wrong way. Crossing and relaxing give opposite answers, so follow the words at the top.",
      "Guessing. Cannot join makes the next pair easier and costs nothing.",
      "Moving closer to the screen, which changes how far your eyes must turn.",
    ],
    tool: { kind: "drill" },
    print: "pairs",
    evidence: "No trial tested this drill on its own. Joining side-by-side pictures without glasses, by crossing and by relaxing, was a later stage of the supervised therapy the trials used.",
    sources: [MANUAL, CITT, REVIEW],
  },

  {
    slug: "screen-diverge-ramp",
    what: "The ramp drill the other way. Through red-cyan glasses the two rings drift so that your eyes must relax outward to keep them as one. The screen measures how far you get before one ring turns into two.",
    need: DRILL_NEED,
    setup: DRILL_SETUP,
    steps: [
      RING,
      "The two rings now drift slowly the other way. Let your eyes relax, as if looking through the screen at something behind it. Keep one sharp ring with both dots.",
      "The moment it turns into two rings that will not join, tap It split in the bottom right corner, or press Down. The screen saves that point as your break.",
      "The rings now come back toward each other. The moment they are one ring again, tap the scene or press Space, Enter or OK. The screen saves that point as your recovery.",
      "Rest for the two seconds the screen gives you. It then drifts again from where you are.",
      "If the words The screen's limit appear, you kept one ring as far as the screen will go this way. The ring comes back to rest and the drift starts again.",
      after(5),
    ],
    right: [
      ONE_RING,
      "The ring looks a little bigger and farther away as it gets harder. That is normal.",
      "It feels like letting go, not like straining.",
    ],
    measures: [
      prism("break_pd", "Break: the furthest you kept one ring", `The screen saves how far apart the rings were when you tap It split, and keeps the highest of the session. It stops at 4 cm between the rings; with no split by then, that limit is saved. ${PRISM}`),
      prism("recover_pd", "Recovery: where two rings became one again", "After a split the rings come back slowly. The screen saves how far apart they still were at the moment you press OK for one ring, and keeps the highest of the session."),
    ],
    stop: DRILL_STOP,
    mistakes: [
      "Trying hard. Turning out is a letting go: soften your gaze and look through the screen.",
      ONE_DOT,
      FALSE_OK,
      "Leaning back from the screen as it gets harder. Stay at your set distance.",
    ],
    tool: { kind: "drill" },
    evidence: `${NO_DRILL_TRIAL} The trials' supervised therapy trained turning out as well as turning in, once turning in had improved. Computer drills done at home alone did no better than placebo (pretend) therapy.`,
    sources: [MANUAL, CITT, HOME, REVIEW],
  },

  {
    slug: "reading-under-demand",
    what: "You read short sentences through red-cyan glasses while the screen pulls the two eyes' copies apart, so your eyes must keep turning in as you read. It carries the ring drills over into reading.",
    need: DRILL_NEED,
    setup: DRILL_SETUP,
    steps: [
      "Look at the sentence. Each eye sees its own copy: the left eye's has a small dot above the words, the right eye's a dot below. Joined, you see one sentence with a dot above and a dot below.",
      "Read the sentence, aloud if you can.",
      "Tap the scene or press Space, Enter or OK for the next sentence. That counts one line.",
      "As you read on, the two copies creep apart, so your eyes must turn in more to keep one sentence. The number after the word Now on the top line shows how far.",
      "If the words double and will not join, tap It split or press Down. The screen eases off, waits three seconds and then asks for a little less.",
      "Keep reading at a steady, comfortable pace.",
      after(5),
    ],
    right: [
      "You see one sharp sentence with a dot above and a dot below.",
      "You can read every word without the letters swimming or doubling.",
      "The pace feels like ordinary reading, not a race.",
    ],
    measures: [
      {
        key: "lines", label: "Lines read", unit: "",
        how: "The screen adds one each time you press OK for the next sentence. Press only after you have read the whole sentence as one clear line.",
        from: "auto", min: 0, max: 1000, step: 1, better: "higher",
      },
      {
        key: "lines_per_min", label: "Reading pace", unit: "lines a minute",
        how: "The screen divides the lines read by the minutes since the start. It shows after 20 seconds. Single, clear words matter more than speed.",
        from: "auto", min: 0, max: 100, step: 0.1, better: "higher",
      },
      prism("hold_pd", "The most pull while reading", `The screen keeps the highest pull at which you finished a line. The pull rises with your level and drops after a split. ${PRISM}`),
    ],
    stop: DRILL_STOP,
    mistakes: [
      "Pressing OK before you have read the sentence. The pace number then means nothing.",
      "Reading on with one dot missing. One eye has switched off: blink; if the dot stays missing, tap It split.",
      LEANING,
    ],
    tool: { kind: "drill" },
    evidence: "No trial tested this drill. In a trial of 310 children, 16 weeks of supervised therapy improved reading test scores no more than placebo (pretend) therapy did, so do not expect this drill to raise reading scores.",
    sources: [READING, CITT, MANUAL, REVIEW],
  },

  {
    slug: "therapy-homework-plan",
    what: "The home half of supervised therapy. Your therapist sets the drills for the week; this page times your daily practice and keeps the record to take to your next visit.",
    need: [
      "This week's list of drills from your therapist",
      "Whatever those drills use: string, cards, pen, glasses",
      "A quiet place and 15 minutes",
    ],
    setup: [
      "Read this week's list. Do only what is on it, at the levels your therapist set.",
      "Lay out what each drill needs before you start, so the 15 minutes go on the drills.",
      "Use this page for the hands-on drills. An on-screen drill has its own page, which keeps its own record.",
    ],
    steps: [
      "Press Start timer on this page.",
      "Do the first drill on your list for the time or the count your therapist set.",
      "Rest for half a minute with your eyes on something far away.",
      "Do the next drill the same way, and the next, until the list is done or 15 minutes are up.",
      "Type how many drills you finished and how many days you have practised this week, and press Save this routine.",
      "Write down anything that was hard or brought on a symptom, and tell your therapist at the next visit.",
      "Do this on 5 days each week for as long as your therapist says. The trial ran for 12 weeks.",
    ],
    right: [
      "You did the drills on the list, at the levels set, and nothing extra.",
      "The timer shows about 15 minutes.",
      "Your record shows 5 practice days in the week.",
    ],
    measures: [
      {
        key: "drills_done", label: "Drills finished today", unit: "",
        how: "Count each drill on this week's list that you finished today. A drill you started and gave up early does not count.",
        from: "typed", min: 0, max: 12, step: 1, better: "higher",
      },
      {
        key: "days_week", label: "Days practised this week, with today", unit: "days",
        how: "Count the days since Monday on which you did your home practice, and include today. The trial set 15 minutes a day on 5 days a week.",
        from: "typed", min: 1, max: 7, step: 1, better: "higher",
      },
    ],
    stop: [...STOP, PULL, "Anything your therapist told you to stop for"],
    mistakes: [
      "Making up for a missed day with a double session. Tired eyes practise badly: carry on with the next day.",
      "Raising a level your therapist did not raise.",
      "Leaving out the drill you find hardest.",
      "Doing the home practice but missing the weekly visit. In the trial it was the two together that worked.",
    ],
    tool: { kind: "timer" },
    evidence: "This is the home part of the treatment the trial tested. Weekly therapy in the office plus this practice worked for 73 in 100 children; home practice without the office visits did no better than placebo (pretend) therapy.",
    sources: [CITT, KINETICS, MANUAL, REVIEW],
  },
], GUIDE_WORDS);
