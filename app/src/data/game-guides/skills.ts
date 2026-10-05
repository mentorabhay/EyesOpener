/**
 * Game guides for the seeing-skill games: eye-movement play with no glasses (Comet Trail, Spot Jump) and a check in
 * game form done with a patch (E Safari).
 *
 * Sources: the phone letter test and the home vision tests page are the ones on the evidence page (`src/copy/site.ts`)
 * and in `src/data/guides/monitoring.ts`; the review of eye exercises and the joint statement were read for this file.
 */
import type { Source } from "@/data/guides/types";
import { frame, hud, key, tap, words } from "./cue";
import type { CueInk, GameGuide, Shape } from "./types";
import { textsEach } from "@/i18n/texts";
import { GAME_GUIDE_WORDS } from "./words";

/** Support for convergence problems; weaker support for depth training and for field loss after brain damage; "no clear scientific evidence" for the other uses of eye exercises. */
const EXERCISE_REVIEW: Source = {
  label: "Rawstron, Burley and Elder, 2005, Journal of Pediatric Ophthalmology and Strabismus: a systematic review of the applicability and efficacy of eye exercises",
  url: "https://pubmed.ncbi.nlm.nih.gov/15825744/",
};
/** "Scientific evidence does not support the efficacy of eye exercises, behavioral vision therapy, or special tinted filters or lenses for improving the long-term educational performance" of children with learning disabilities. */
const JOINT_STATEMENT: Source = {
  label: "American Academy of Pediatrics, American Academy of Ophthalmology and others, 2009, Pediatrics: joint statement on learning disabilities, dyslexia and vision",
  url: "https://pubmed.ncbi.nlm.nih.gov/19651597/",
};
/** A pointing E on a phone at 2 metres, 233 people in Kenya: on average less than one chart line from the clinic chart. */
const PHONE_TEST: Source = {
  label: "Peek Vision: the Peek Acuity phone test (a pointing letter E) compared with clinic charts in 233 people in Kenya, published in JAMA Ophthalmology in 2015",
  url: "https://peekvision.org/resources/research/validating-our-vision-test/",
};
const HOME_TESTS: Source = {
  label: "US National Library of Medicine, MedlinePlus Medical Encyclopedia: Home vision tests",
  url: "https://medlineplus.gov/ency/article/003446.htm",
};

const STOP = ["Double vision that stays after you look far away and blink", "A headache", "Eye pain", "Feeling dizzy or sick"];
const NO_GLASSES = "No red-cyan glasses and no patch. Wear the glasses you normally use for a screen.";
const HEAD_STILL = "Turning the head to follow. The head stays still; the eyes do the moving.";

/* ── Comet Trail ── */

const STARS: [number, number][] = [[22, 30], [50, 24], [132, 28], [144, 58], [18, 70], [112, 74], [70, 44]];
const sky = (seconds: number): Shape[] => [frame(), hud(`On the comet ${seconds} s`), ...STARS.map(([x, y]): Shape => ({ t: "disc", x, y, r: 0.7, ink: "dim" }))];
/** The comet with its tail trailing away at the angle `a` (radians). */
const comet = (x: number, y: number, a: number): Shape[] => [
  ...[5, 4, 3, 2, 1].map((n): Shape => ({ t: "disc", x: x + Math.cos(a) * n * 3.6, y: y + Math.sin(a) * n * 3.6, r: 3.6 * (1 - n / 7), ink: "dim" })),
  { t: "disc", x, y, r: 4, ink: "both" },
];
/** The member's ring. Its line is thick while the comet is inside it. */
const ring = (x: number, y: number, on = false): Shape => ({ t: "ring", x, y, r: 7.5, ink: "weak", w: on ? 2.6 : 1 });

/* ── Spot Jump ── */

/** The quiet dashed line down the middle: left of it is Left, right of it is Right. */
const centre = (): Shape[] => Array.from({ length: 8 }, (_, n): Shape => ({ t: "line", x1: 80, y1: 22 + n * 6.5, x2: 80, y2: 25 + n * 6.5, ink: "weak", w: 0.7 }));
const field = (line: string): Shape[] => [frame(), hud(line), ...centre()];
const spot = (x: number, y: number): Shape => ({ t: "disc", x, y, r: 5.5, ink: "both" });

/* ── E Safari ── */

type Way = "left" | "right" | "up" | "down";
const STEP: Record<Way, [number, number]> = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
const block = (x: number, y: number, w: number, h: number): Shape => ({ t: "box", x, y, w, h, ink: "both", fill: true });
/** The animal track: a bar with three toes, like a letter E, on a five by five grid. */
function track(size: number, way: Way, cx = 80, cy = 50): Shape[] {
  const u = size / 5, x = cx - size / 2, y = cy - size / 2;
  return way === "left" || way === "right"
    ? [block(way === "right" ? x : x + 4 * u, y, u, size), ...[0, 2, 4].map((row) => block(x, y + row * u, size, u))]
    : [block(x, way === "down" ? y : y + 4 * u, size, u), ...[0, 2, 4].map((col) => block(x + col * u, y, u, size))];
}
const head = (x: number, y: number, size: number, way: Way, ink: CueInk): Shape => {
  const [ax, ay] = STEP[way], h = size / 2;
  return { t: "poly", pts: [[x + ax * h, y + ay * h], [x - ax * h + ay * h, y - ay * h + ax * h], [x - ax * h - ay * h, y - ay * h - ax * h]], ink };
};
/** The scene with its four quiet arrows at the edges: the places to tap. */
const safari = (line: string): Shape[] => [frame(), hud(line), head(13, 50, 5, "left", "weak"), head(147, 50, 5, "right", "weak"), head(80, 24, 5, "up", "weak"), head(80, 81, 5, "down", "weak")];

export const guides: GameGuide[] = textsEach("data/game-guides/skills", () => [
  {
    slug: "comet-trail",
    what: "A white comet with a tail drifts round the screen on a smooth path. You keep a cyan ring on it, with a finger or with the arrow keys. Every whole second the ring is on the comet adds one to the score.",
    helps:
      "Following something that moves steadily is called smooth tracking. The game gives the eyes a slow, even target to follow, and a hand task that shows whether you stayed with it. " +
      "No trial shows that tracking games improve the sight or the eye movements of healthy eyes. A review of eye exercises found support for a few uses, such as convergence problems, and no clear evidence for the rest. Use it as a two-minute warm-up, not as a treatment.",
    need: [NO_GLASSES, "Any screen: a phone, tablet, computer or TV, square in front of you.", "A seat where you can see the whole scene without moving your head."],
    see: [
      "A white comet with a fading tail on a black sky with a few faint stars. It wanders smoothly and never jumps or turns sharply.",
      "A cyan ring: that is yours. Its line turns thick while the comet is inside it and thin when the comet has slipped out.",
      "The top line reads \"On the comet\" and the seconds you have scored so far.",
      "Both eyes see everything. Cyan is only a second colour here.",
    ],
    play: [
      "Press Start.",
      "Find the comet and follow it with your eyes. Keep your head still.",
      "Put a finger on the comet and keep it down: the ring jumps to the finger and follows it. With keys or a remote, steer the ring with the four arrows.",
      "Stay on the comet. While the ring's line is thick, every whole second adds one to the top line.",
      "If the comet slips out, catch up smoothly. Do not jab at where it will be next.",
      "After 2 minutes press Finish now.",
    ],
    controls: {
      touch: "Hold a finger on the scene, or hold the mouse button down, and the ring follows it. Lift the finger and the ring stays where it was.",
      keys: "The four arrows steer the ring; hold two to move on a slant. The ring moves a little faster than the comet. Space and OK do nothing here. Esc or Back moves to the Stop button.",
    },
    cues: [
      {
        title: "The comet is outside your ring",
        then: "Put a finger on the comet and keep it there, or steer the ring to it with the arrows.",
        tone: "go",
        shapes: [...sky(12), ...comet(104, 40, 2.6), ring(52, 58), tap(104, 40), key(52, 76, "Arrows")],
      },
      {
        title: "The ring's line is thick: you are on the comet",
        then: "Stay with it. Every whole second on the comet adds one to the top line.",
        tone: "wait",
        shapes: [...sky(13), ...comet(92, 48, 2.9), ring(93, 49, true), words("thick line: on the comet", 80, 6.5, "dim")],
      },
      {
        title: "The comet is too fast to stay on",
        then: "Nothing to press. Stay off it for about three seconds and it slows down by a step.",
        tone: "wait",
        shapes: [...sky(13), ...comet(124, 34, 2.8), ring(66, 56), words("it slows down for you", 80, 6.5, "dim")],
      },
    ],
    success: [
      "One point is one whole second with the comet inside your ring. Seconds add up over the session; they need not be in one run.",
      "A good two-minute session: the ring's line is thick nearly all the time, and the eyes lead while the hand follows.",
      "The level (1 to 10) is the comet's speed. About six seconds on the comet raise it; about three seconds in a row off it lower it.",
      "The game sees the ring, not your eyes. A high score with your eyes somewhere else means nothing.",
    ],
    measures: [
      { key: "score", label: "Seconds on the comet", unit: "seconds", how: "Each whole second with the comet inside the ring adds one. Compare sessions of the same length.", better: "higher" },
      { key: "misses", label: "Times the comet was lost", unit: "", how: "Counts once for every second and a half the ring stays off the comet.", better: "lower" },
      { key: "top", label: "Highest level", unit: "of 10", how: "The fastest comet you reached. Level 1 is a slow drift and level 10 a brisk glide.", better: "higher" },
    ],
    stop: [...STOP, "The comet blurs or doubles and does not clear when you blink"],
    mistakes: [
      HEAD_STILL,
      "Watching the finger or the ring. Watch the comet and let the hand follow.",
      "Jabbing ahead to where the comet will be. Smooth following is the whole task.",
      "Playing on and on to raise the score. It is a two-minute warm-up.",
    ],
    evidence: "No trial tested this game, and no trial shows that eye-movement games improve healthy eyes. A review of eye exercises found support for a few uses, such as convergence problems, and no clear evidence for the rest.",
    sources: [EXERCISE_REVIEW],
  },
  {
    slug: "spot-jump",
    what: "A white spot appears to the left or the right of a centre line. You look at it and tap it, and the next spot appears somewhere else. Each spot hit is one point.",
    helps:
      "The eyes move from one place to another in quick jumps. Reading uses one at the end of every line. The game asks for one jump after another and moves the spots further out as you hit them. " +
      "No trial shows that jump practice improves healthy eyes. A joint statement of children's doctors and eye doctors says the evidence does not support eye exercises for reading or learning problems. Use it as a two-minute warm-up, not as a treatment.",
    need: [NO_GLASSES, "Any screen: a phone, tablet, computer or TV, square in front of you.", "A seat where you can see both sides of the scene without moving your head."],
    see: [
      "A faint dashed line down the middle of the scene. Left of it is Left, right of it is Right.",
      "One white spot at a time, on one side. It grows in quickly and then waits until you hit it. It is always the same size.",
      "When you hit it, a ring opens and fades where it was. The next spot comes after about a second, at a moment you cannot guess from the rhythm.",
      "The top line reads \"Hits\", which is your score, and your pace as hits a minute. Both eyes see everything; cyan is only a second colour here.",
    ],
    play: [
      "Press Start and rest your eyes on the dashed centre line.",
      "When a spot appears, jump to it with your eyes. Keep your head still.",
      "Tap the spot. With keys or a remote, press Left if it is left of the line and Right if it is right of it.",
      "Bring your eyes back to the centre line and wait for the next spot.",
      "If the spot is still there, the tap landed off it or the key was for the other side. Answer again.",
      "After 2 minutes press Finish now.",
    ],
    controls: {
      touch: "Tap the spot itself. While a spot is showing, a tap anywhere else counts as a miss.",
      keys: "Left or Right, for the side of the line the spot is on. Up, Down, Space and OK do nothing here. Esc or Back moves to the Stop button.",
    },
    cues: [
      {
        title: "A white spot left of the line",
        then: "Look at it, then tap it. With keys, press Left, because it is on the left side.",
        tone: "go",
        shapes: [...field("Hits 7 · 31 a minute"), spot(34, 42), tap(34, 42), key(34, 66, "Left")],
      },
      {
        title: "No spot, and a ring fading where it was",
        then: "That was a hit. Look back at the centre line and wait: the next spot comes in about a second.",
        tone: "wait",
        shapes: [...field("Hits 8 · 34 a minute"), { t: "ring", x: 34, y: 42, r: 8.5, ink: "dim", w: 1 }, words("wait for the next spot", 81, 6.5, "dim")],
      },
      {
        title: "The spot is still there after your answer",
        then: "The tap landed off the spot, or the key was for the other side. That is one miss. The spot waits: answer again.",
        tone: "wait",
        shapes: [
          ...field("Hits 8 · 30 a minute"), spot(124, 58),
          { t: "line", x1: 101, y1: 37, x2: 107, y2: 43, ink: "dim", w: 1.2 }, { t: "line", x1: 107, y1: 37, x2: 101, y2: 43, ink: "dim", w: 1.2 },
          { t: "text", x: 110, y: 31, s: "tap landed here", ink: "dim", size: 6.5, anchor: "middle" },
        ],
      },
    ],
    success: [
      "One point is one spot hit: tapped, or answered with the key for its side.",
      "A good two-minute session: few misses, and the eyes land on the spot before the finger does. Accuracy first, then pace.",
      "The level (1 to 10) is the length of the jump. Three hits in a row push the spots further from the centre line and vary their height more; two misses in a row bring them back in.",
      "\"a minute\" on the top line is your pace over the last half minute. It is shown while you play and is not kept.",
    ],
    measures: [
      { key: "score", label: "Spots hit", unit: "", how: "Each spot tapped, or answered with the key for its side, adds one.", better: "higher" },
      { key: "misses", label: "Misses", unit: "", how: "Taps that landed off the spot, and presses of the key for the wrong side.", better: "lower" },
      { key: "top", label: "Highest level", unit: "of 10", how: "The longest jumps you reached. Level 1 keeps the spot near the centre line; level 10 puts it near the edge.", better: "higher" },
    ],
    stop: [...STOP, "The spots blur or double and do not clear when you blink"],
    mistakes: [
      HEAD_STILL,
      "Tapping fast all over the scene. Every tap off the spot is a miss.",
      "With keys, pressing before looking. The key only says which side; the practice is the eye jump.",
      "Racing the pace number. A clean hit matters more than a quick one.",
    ],
    evidence: "No trial tested this game, and no trial shows that eye-jump practice improves healthy eyes. A joint statement of children's doctors and eye doctors says the evidence does not support eye exercises for reading or learning problems.",
    sources: [EXERCISE_REVIEW, JOINT_STATEMENT],
  },
  {
    slug: "e-safari",
    what: "A check, in game form, of how small a shape one eye can read. An animal track with three toes, like a letter E, shows in the middle. You point the way the toes face, and the track shrinks until you can no longer tell.",
    helps:
      "It is a check, not training: it does not improve sight. Done with each eye in turn, it lets a family notice that one eye reads smaller tracks than the other. That is a reason to book an eye test. " +
      "A phone test that uses the same pointing E came, on average, within one chart line of a clinic chart in 233 people. This game has not been compared with a clinic chart, and its steps are not chart lines. It cannot show that an eye is healthy.",
    need: [
      "A patch for the eye that is not being checked, or a clean cupped hand. Do not press on the eye.",
      "The child's own glasses, if they have them, on as usual.",
      "A TV at about 3 metres, or a tablet propped up at arm's length. Mark the place: the distance must be the same every time.",
      "A grown-up beside a young child, to watch for peeking and leaning in. A child who cannot name left and right can point with a hand, and the grown-up answers.",
    ],
    see: [
      "One white track in the middle: a bar with three toes, like a letter E. The toes point right, left, up or down.",
      "Four small cyan arrows at the edges show where to tap. No red-cyan glasses are worn: cyan is only a second colour, and the open eye sees everything.",
      "After an answer, a tick under the track means right. A white arrow beside the track means wrong, and shows the way the toes pointed.",
      "The top line asks \"Which way do the toes point?\" until two in a row are right, then reads \"Smallest tracks read: step\" and a number. A small screen shortens these to \"Which way?\" and \"Step\". Step 1 is the largest track; each step is one fifth smaller.",
    ],
    play: [
      "Cover the left eye with the patch, sit at your marked distance and press Start.",
      "Look at the track and point the way its three toes face: tap the right, left, top or bottom part of the scene, or press that arrow.",
      "Two right in a row make the next track smaller. One wrong makes it bigger again.",
      "Carry on for about 3 minutes, until the step on the top line stops changing or the scene says \"That is as small as this screen goes\".",
      "Press Finish now. The step is kept with the session, but the game does not know which eye was covered: note which eye it was.",
      "Move the patch to the right eye, start again and note that step too.",
      "Compare the two eyes. For a letter-chart result, use Letter size in Check-ups.",
    ],
    controls: {
      touch: "Tap the part of the scene the toes point to: left, right, top or bottom. The four parts meet along the diagonals. A tap on the very middle says nothing.",
      keys: "Press the arrow the toes point to: Left, Right, Up or Down. Space and OK do nothing here. Esc or Back moves to the Stop button.",
    },
    cues: [
      {
        title: "The three toes point right",
        then: "Tap the right side of the scene, or press Right. Always answer the way the toes face.",
        tone: "go",
        shapes: [...safari("Which way?"), ...track(30, "right"), tap(122, 50), key(122, 70, "Right")],
      },
      {
        title: "A tick under the track",
        then: "You were right. Two right in a row and the next track is smaller.",
        tone: "wait",
        shapes: [
          ...safari("Step 3"), ...track(22, "up"),
          { t: "line", x1: 76.5, y1: 70, x2: 79, y2: 73, ink: "both", w: 1.4 }, { t: "line", x1: 79, y1: 73, x2: 84, y2: 66.5, ink: "both", w: 1.4 },
        ],
      },
      {
        title: "A white arrow beside the track",
        then: "That answer was wrong. The arrow shows the way the toes pointed. The next track is one step bigger.",
        tone: "wait",
        shapes: [...safari("Step 3"), ...track(18, "left"), head(62, 50, 6, "left", "both")],
      },
      {
        title: "The track is too small to tell",
        then: "Do not lean in and do not peek round the patch. Give one best answer. A wrong answer brings a bigger track back: that is the check finding your limit.",
        tone: "stop",
        shapes: [...safari("Step 9"), ...track(5, "down"), words("too small to tell", 68, 6.5, "dim")],
      },
    ],
    success: [
      "One point is one track read right. The score is not the result, though: the result is the step on the top line.",
      "\"Smallest tracks read: step 6\" means the sixth size down was read right twice in a row. One lucky guess does not count.",
      "A good check: the same distance and the same room light for both eyes, no peeking, and a step that has stopped changing.",
      "There is no pass mark. What matters is one eye clearly behind the other on more than one day, or a step that gets worse over the weeks. Either is a reason to book an eye test.",
    ],
    measures: [
      { key: "step", label: "Smallest tracks read (size step)", unit: "", how: "The smallest size step read right twice in a row. Step 1 is the largest; each step is four fifths of the one before. Compare only on the same screen at the same distance: a step is not a line on a letter chart.", better: "higher" },
      { key: "score", label: "Tracks read right", unit: "", how: "Each right answer adds one, at any size. It shows how long you played, not how small you could read.", better: "none" },
      { key: "misses", label: "Wrong answers", unit: "", how: "Each wrong answer. Close to the limit some answers are always wrong: that is the check working, not a poor result.", better: "none" },
    ],
    stop: [...STOP, "The child is upset or tired of the patch. Stop: a check done unwillingly tells nothing."],
    mistakes: [
      "Peeking round the patch, or pressing on the covered eye.",
      "Leaning toward the screen as the tracks get small. The distance must stay the same.",
      "Checking with both eyes open. That only shows what the stronger eye can do.",
      "Reading the step as a chart line or a pass mark. It can only be compared with your own earlier steps, on the same screen at the same distance.",
    ],
    evidence: "This game has not been compared with a clinic chart. A phone test that uses the same pointing E came, on average, within one chart line of clinic charts in 233 people in Kenya. That was a different app, used at a fixed 2 metres.",
    sources: [PHONE_TEST, HOME_TESTS],
  },
], GAME_GUIDE_WORDS);
