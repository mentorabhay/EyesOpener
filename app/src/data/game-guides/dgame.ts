// Eyes Opener: Game guides for two-eye balanced play: games for a lazy eye, played through red-cyan glasses.
/**
 * Game guides for two-eye balanced play: games for a lazy eye, played through red-cyan glasses.
 * What must be found or steered is drawn in cyan (the weaker eye), what is in the way in red (the stronger eye,
 * dimmed to the member's own setting), and the frame and score in white (both eyes).
 *
 * Sources: the two video trials were opened and read for `src/data/guides/lazy-eye.ts`. The two game trials are the
 * ones on the evidence page (`src/copy/site.ts`); their figures were read again for this file.
 */
import type { Source } from "@/data/guides/types";
import { frame, hud, key, tap, words } from "./cue";
import type { GameGuide, Shape } from "./types";
import { textsEach } from "@/i18n/texts";
import { GAME_GUIDE_WORDS } from "./words";

/** 385 children aged 5 to 12, 16 weeks: the game gained 1.05 lines, patching 1.35; 22% did more than three-quarters of the play set. */
const GAME_OR_PATCH: Source = {
  label: "Holmes and the Pediatric Eye Disease Investigator Group, 2016, JAMA Ophthalmology: a two-eye tablet game compared with patching in 385 children aged 5 to 12 (summary by the American Academy of Ophthalmology)",
  url: "https://www.aao.org/eyenet/article/binocular-ipad-game-vs-part-time-patching-amblyopi",
};
/** 115 people aged 7 and over, one hour a day for 6 weeks: the two-eye game and the placebo game gained the same. */
const GAME_OR_PLACEBO: Source = {
  label: "Gao and others, 2018, JAMA Ophthalmology: a two-eye video game compared with a placebo game in 115 people aged 7 and over with a lazy eye",
  url: "https://jamanetwork.com/journals/jamaophthalmology/fullarticle/2666808",
};
const XIAO: Source = {
  label: "Xiao and others, 2022, Ophthalmology: randomised trial of two-eye video for lazy eye in children aged 4 to 7",
  url: "https://www.sciencedirect.com/science/article/pii/S0161642021006825",
};
const WYGNANSKI: Source = {
  label: "Wygnanski-Jaffe and others, 2023, Ophthalmology: two-eye home video with coloured glasses compared with patching",
  url: "https://www.sciencedirect.com/science/article/pii/S0161642022008351",
};
const SOURCES = [GAME_OR_PATCH, GAME_OR_PLACEBO, XIAO, WYGNANSKI];

/* ── lines the three games share ── */

const HELPS =
  "A lazy eye is partly the brain turning the weaker eye down while both eyes are open. Here each eye gets its own part of the picture and the stronger eye's part is dimmed. So the weaker eye has to work while the stronger eye stays open. " +
  "Two-eye video built on this idea did about as well as patching in trials. Two-eye games did less well, and many children did not keep up the play. It is practice beside the glasses, patch or drops an eye doctor prescribed, never instead of them.";
const EVIDENCE =
  "No trial tested this game. In a trial of 385 children, a two-eye tablet game gained 1.05 lines on the letter chart in 16 weeks and patching 1.35; only 22 in 100 played over three-quarters of the time set. In a second trial a two-eye game did no better than a pretend one.";
const NEED = [
  "Red-cyan glasses, with the cyan (blue-green) lens over the weaker eye. Your eye settings say which eye that is. Without the glasses both eyes see everything and nothing is trained.",
  "Your own prescribed glasses, if you have them, under the red-cyan pair.",
  "A screen square in front of you, with no lamp or window reflected in it.",
];
const DIMMED = "The red shapes are fainter than the cyan ones on purpose: red is dimmed to your own setting, so the stronger eye does not take over. It is not a fault of the screen.";
const BUTTONS = "With no glasses on, the buttons above the scene (\"Weaker eye sees\", \"Stronger eye sees\") show each eye's share.";
const START = "Put the glasses on, cyan lens over the weaker eye, and press Start. Keep both eyes open.";
const REST = (minutes: number) => `After about ${minutes} minutes press Finish now and look across the room for a minute.`;
const STOP = ["Double vision that stays after you look far away and blink", "A headache", "Eye pain", "Feeling dizzy or sick"];
const SWITCHED_OFF = "Your weaker eye has switched off. Blink, look far away, then look again. If the cyan shapes stay away, stop for today.";
const ONE_EYE_SHUT = "Shutting or covering the stronger eye to see the cyan shapes better. Both eyes must stay open.";

/* ── Firefly Catch ── */

const FLIES: [number, number][] = [[30, 36], [62, 58], [96, 34], [128, 62], [116, 44], [44, 70]];
const MOTHS: [number, number][] = [[48, 48], [80, 44], [122, 26], [142, 48], [24, 60], [86, 61]];
const fly = ([x, y]: [number, number]): Shape => ({ t: "disc", x, y, r: 3.2, ink: "weak" });
const moth = ([x, y]: [number, number]): Shape => ({ t: "poly", pts: [[x - 5, y], [x, y - 2.8], [x + 5, y], [x, y + 2.8]], ink: "strong" });
const meadow = (score: number, flies = true): Shape[] => [frame(), hud(`Caught ${score}`), ...MOTHS.map(moth), ...(flies ? FLIES.map(fly) : [])];

/* ── Lantern Run ── */

const GROUND = 70;
/** The street both eyes see: the ground with its cobbles and the string of lanterns overhead. */
const street = (coins: number): Shape[] => [
  frame(), hud(`Coins ${coins}`),
  { t: "line", x1: 6, y1: GROUND, x2: 154, y2: GROUND, ink: "both", w: 1.2 },
  ...[30, 62, 94, 126].map((x): Shape => ({ t: "line", x1: x, y1: GROUND + 3, x2: x - 3, y2: GROUND + 6, ink: "both", w: 0.9 })),
  { t: "line", x1: 6, y1: 21, x2: 154, y2: 21, ink: "dim", w: 0.7 },
  ...[42, 80, 118].map((x): Shape => ({ t: "disc", x, y: 23, r: 1.3, ink: "dim" })),
];
/** The runner with the lantern, 22 tall. `out` draws the lantern unlit and the runner faint, as after a stumble. */
function runner(x: number, out = false): Shape[] {
  const y = GROUND, ink = out ? "dim" : "weak";
  return [
    { t: "line", x1: x, y1: y - 9, x2: x - 4, y2: y, ink, w: 2.3 },
    { t: "line", x1: x, y1: y - 9, x2: x + 4, y2: y, ink, w: 2.3 },
    { t: "line", x1: x, y1: y - 9, x2: x + 0.6, y2: y - 15.5, ink, w: 4.2 },
    { t: "disc", x: x + 1.3, y: y - 20, r: 3.6, ink },
    { t: "line", x1: x + 0.6, y1: y - 15, x2: x + 7, y2: y - 13.5, ink, w: 1.7 },
    { t: "line", x1: x + 7, y1: y - 13.5, x2: x + 8, y2: y - 11, ink, w: 0.8 },
    { t: "ring", x: x + 8, y: y - 8.3, r: 2.7, ink, w: 1 },
    ...(out ? [] : [{ t: "disc", x: x + 8, y: y - 8.3, r: 1.4, ink } as Shape]),
  ];
}
/** A coin hangs higher than the runner's head: only a jump reaches it. */
const coin = (x: number): Shape => ({ t: "disc", x, y: GROUND - 38, r: 4.5, ink: "weak" });
const crate = (x: number): Shape[] => [
  { t: "box", x, y: GROUND - 12, w: 13, h: 12, ink: "strong" },
  { t: "box", x: x + 3.5, y: GROUND - 8.5, w: 6, h: 5, ink: "strong", fill: true },
];
/** A shop sign on two cords: low enough to catch a jump, high enough to run under. */
const sign = (x: number): Shape[] => [
  { t: "line", x1: x + 3, y1: 21, x2: x + 3, y2: GROUND - 36, ink: "strong", w: 0.9 },
  { t: "line", x1: x + 12, y1: 21, x2: x + 12, y2: GROUND - 36, ink: "strong", w: 0.9 },
  { t: "box", x, y: GROUND - 36, w: 15, h: 9, ink: "strong", fill: true },
];

/* ── Maze of Two Lights ── */

const MX = 10, MY = 21, CELL = 18;
const cell = (c: number, r: number): [number, number] => [MX + (c + 0.5) * CELL, MY + (r + 0.5) * CELL];
/** A wall from grid corner (c1, r1) to grid corner (c2, r2). */
const wall = (c1: number, r1: number, c2: number, r2: number): Shape => ({ t: "line", x1: MX + c1 * CELL, y1: MY + r1 * CELL, x2: MX + c2 * CELL, y2: MY + r2 * CELL, ink: "strong", w: 1.6 });
/** A maze of six cells by three: the walls for the stronger eye. */
const walls = (): Shape[] => [
  { t: "box", x: MX, y: MY, w: 6 * CELL, h: 3 * CELL, ink: "strong" },
  wall(1, 1, 2, 1), wall(3, 1, 6, 1), wall(1, 2, 4, 2), wall(2, 0, 2, 1), wall(3, 1, 3, 2), wall(5, 2, 5, 3),
];
const exit = (open = false): Shape[] => { const [x, y] = cell(5, 0); return [{ t: "disc", x, y, r: 2.2, ink: "both" }, { t: "ring", x, y, r: open ? 7.5 : 4.6, ink: "both", w: 1.1 }]; };
const ball = (x: number, y: number): Shape => ({ t: "disc", x, y, r: 5, ink: "weak" });
const maze = (mazes: number): Shape[] => [frame(), hud(`Mazes ${mazes}`), ...walls()];

export const guides: GameGuide[] = textsEach("data/game-guides/dgame", () => [
  {
    slug: "firefly-catch",
    what: "Cyan fireflies and red moths drift about inside a white frame. You catch the fireflies and leave the moths alone. Only your weaker eye can see the fireflies, so that eye has to do the finding.",
    helps: HELPS,
    need: NEED,
    see: [
      "On the screen itself there are always both colours: six cyan dots (the fireflies) and six red diamonds (the moths), inside a white frame. That is how it is meant to look.",
      "Through the glasses the eye behind the cyan lens gets the fireflies, bright, and no moths. The eye behind the red lens gets the moths and no fireflies. The white frame and the score reach both eyes, so with both eyes working you see everything at once.",
      DIMMED,
      BUTTONS,
    ],
    play: [
      START,
      "Look for a cyan firefly among the red moths.",
      "Tap it. With keys or a remote, move the white ring over it with the arrows and press Space or OK.",
      "A caught firefly vanishes, a new one appears somewhere else, and \"Caught\" on the top line goes up by one.",
      "Leave the red moths alone. A tap on a moth is a miss. A tap on empty space does nothing.",
      "Keep going. Three catches in a row make everything fly a little faster.",
      REST(5),
    ],
    controls: {
      touch: "Tap a firefly to catch it. A tap counts when it lands on the firefly or just beside it.",
      keys: "The four arrows move a white aiming ring; it appears at the first key press. Space, Enter or OK on a TV remote catches the firefly inside the ring. Esc or Back moves to the Stop button.",
    },
    cues: [
      {
        title: "A cyan dot: a firefly",
        then: "Tap it. One firefly caught is one point.",
        tone: "go",
        shapes: [...meadow(4), tap(62, 58)],
      },
      {
        title: "Keys: the white ring is over a firefly",
        then: "Move the ring with the arrows, then press Space or OK.",
        tone: "go",
        shapes: [...meadow(4), { t: "ring", x: 96, y: 34, r: 6.5, ink: "both", w: 1.2 }, key(70, 76, "Arrows"), key(110, 76, "Space")],
      },
      {
        title: "A red diamond: a moth",
        then: "Leave it alone. A tap on a moth is a miss, and two in a row slow the game down.",
        tone: "wait",
        shapes: [frame(), hud("Caught 4"), ...MOTHS.map(moth), fly(FLIES[0]), fly(FLIES[3]), words("leave the red moths", 82, 6.5, "dim")],
      },
      {
        title: "Only red moths, no cyan dots",
        then: SWITCHED_OFF,
        tone: "stop",
        shapes: [...meadow(4, false), words("no fireflies to be seen", 82, 6.5, "dim")],
      },
    ],
    success: [
      "One point is one firefly caught. \"Caught\" on the top line is your score.",
      "A good session: the count climbs steadily, few moths are touched, and the fireflies stay easy to see to the end.",
      "The level (1 to 10) is only speed. Three catches in a row with no moth touched raise it; two moths in a row lower it. Nothing gets smaller or fainter.",
      "It only trains when the weaker eye does the finding. Catching fireflies with the glasses off, or with one eye shut, raises the score and trains nothing.",
    ],
    measures: [
      { key: "score", label: "Fireflies caught", unit: "", how: "Each firefly you tap, or catch inside the ring, adds one.", better: "higher" },
      { key: "misses", label: "Moths touched", unit: "", how: "Each tap or catch that lands on a red moth with no firefly beside it. Fewer means the weaker eye is picking the fireflies out cleanly.", better: "lower" },
      { key: "top", label: "Highest level", unit: "of 10", how: "The fastest flying you reached. Three catches in a row raise the level; two moths in a row lower it.", better: "higher" },
    ],
    stop: [...STOP, "The fireflies keep fading away while the moths stay: the weaker eye is switching off. Rest, and if it happens every time, tell the eye doctor."],
    mistakes: [
      "Playing without the glasses, or with them the wrong way round. Close the stronger eye: you should still see the fireflies, and the moths should be gone.",
      ONE_EYE_SHUT,
      "Tapping everything that moves. Moths count against you.",
      "Thinking the faint red moths mean a poor screen. They are drawn faint for you on purpose.",
    ],
    evidence: EVIDENCE,
    sources: SOURCES,
  },
  {
    slug: "lantern-run",
    what: "A runner carries a lantern through a night market that scrolls past. You make the runner jump: up to the cyan coins, over the red crates and stalls. Under the red hanging signs you stay down. Coins are the score.",
    helps: HELPS,
    need: NEED,
    see: [
      "On the screen itself there are always both colours. The runner and the coins are cyan. The crates, stalls and hanging signs are red. The street is white, with a string of lanterns overhead.",
      "Through the glasses the eye behind the cyan lens gets the runner and the coins, and no red things. The eye behind the red lens gets the crates, stalls and signs, and no runner. The white street reaches both eyes, so with both eyes working you see it all on one street.",
      DIMMED,
      "When the runner turns faint, the lantern is out after a stumble. That is the game, not your eyes. A hero made in Draw Your Hero takes the runner's place.",
    ],
    play: [
      "Put the glasses on, cyan lens over the weaker eye, and press Start. The runner runs by itself.",
      "A red crate or stall on the ground: jump just before the runner reaches it.",
      "A red sign hanging overhead: do nothing. The runner fits under it, and a jump hits it.",
      "A cyan coin in the air: jump so the runner passes through it. Coins hang too high to run into.",
      "If you hit something, the runner stumbles, slows and turns faint. The lantern is out, and coins pass by uncounted.",
      "Pass the next red thing cleanly and the lantern lights again.",
      REST(10),
    ],
    controls: {
      touch: "Tap anywhere in the scene to jump. Every jump is the same height; holding the finger down adds nothing.",
      keys: "Up, Space, Enter or OK on a TV remote to jump. Left, Right and Down do nothing here. Esc or Back moves to the Stop button.",
    },
    cues: [
      {
        title: "A cyan coin overhead, or a red crate ahead",
        then: "Jump: tap the scene, or press Up or Space. Jump when the runner is about to reach it.",
        tone: "go",
        shapes: [...street(5), ...runner(28), coin(45), ...crate(70), tap(120, 36), key(104, 56, "Up"), key(134, 56, "Space")],
      },
      {
        title: "A red sign hanging overhead",
        then: "Stay down and run under it. A jump here is a stumble.",
        tone: "wait",
        shapes: [...street(5), ...runner(28), ...sign(48), coin(114), words("no jump: run under", 84, 6.5, "dim")],
      },
      {
        title: "The runner has turned faint",
        then: "You stumbled and the lantern is out. Coins do not count until you pass the next red thing cleanly.",
        tone: "wait",
        shapes: [...street(5), ...crate(10), ...runner(38, true), coin(72), ...crate(112), words("lantern out: no coins counted", 84, 6.5, "dim")],
      },
      {
        title: "Red crates and signs, but no runner or coins",
        then: SWITCHED_OFF,
        tone: "stop",
        shapes: [...street(5), ...sign(48), ...crate(100), words("no runner to be seen", 84, 6.5, "dim")],
      },
    ],
    success: [
      "One point is one coin taken while the lantern is lit. \"Coins\" on the top line is your score.",
      "A good session: the coins climb, stumbles are few, and the lantern stays lit for long stretches.",
      "The level (1 to 10) is pace and spacing. Three coins in a row with no stumble speed the street up and bring things closer together; two stumbles in a row slow it down.",
      "Both eyes are needed: the weaker eye for the runner and the coins, the stronger eye for what is in the way. Jumping all the time hits the signs and puts the lantern out.",
    ],
    measures: [
      { key: "score", label: "Coins taken", unit: "", how: "Each coin the runner passes through with the lantern lit adds one.", better: "higher" },
      { key: "misses", label: "Stumbles", unit: "", how: "Each crate or stall the runner ran into, and each hanging sign a jump hit.", better: "lower" },
      { key: "top", label: "Highest level", unit: "of 10", how: "The fastest street you reached. Three coins in a row raise the level; two stumbles in a row lower it.", better: "higher" },
    ],
    stop: [...STOP, "The runner and the coins keep fading away while the red things stay, and it is not after a stumble: the weaker eye is switching off. Rest, and if it happens every time, tell the eye doctor."],
    mistakes: [
      "Playing without the glasses, or with them the wrong way round. Close the stronger eye: you should still see the runner and the coins, and the red things should be gone.",
      "Jumping at everything. A jump under a hanging sign is a stumble.",
      "Watching only the coins. The red things decide when to jump and when to stay down.",
      "Thinking the game is broken when coins stop counting. The lantern is out: pass one red thing cleanly.",
    ],
    evidence: EVIDENCE,
    sources: SOURCES,
  },
  {
    slug: "maze-of-two-lights",
    what: "A cyan ball of light rolls through a maze of red walls to a white light, the way out. You roll it one cell at a time. Each maze solved is one point, and a new maze follows.",
    helps: HELPS,
    need: NEED,
    see: [
      "On the screen itself there are always both colours: a cyan ball, red walls, and a white light with a ring round it.",
      "Through the glasses the eye behind the cyan lens gets the ball and no walls. The eye behind the red lens gets the walls and no ball. The white light, the frame and the score reach both eyes.",
      "The way through only exists when your brain lays the ball from one eye over the walls from the other. " + DIMMED,
      "Every new maze puts the ball in a new place. You have to find it with the weaker eye before you can move it.",
    ],
    play: [
      START,
      "Find the cyan ball. Find the white light. Look for the open way between them.",
      "Touch the scene on the side you want the ball to go: right of the ball to roll right, above it to roll up. With keys or a remote, press that arrow.",
      "The ball rolls one cell. Keep the finger down and it keeps rolling toward the finger; hold an arrow and it keeps rolling that way until a wall.",
      "If the ball leans and springs back, there is a wall. Choose another way.",
      "Roll onto the white light. Its ring opens wide, \"Mazes\" on the top line goes up by one and a new maze fades in.",
      REST(10),
    ],
    controls: {
      touch: "Touch or hold the scene on the side of the ball you want it to roll toward. A touch on the ball itself does nothing.",
      keys: "The four arrows roll the ball one cell left, right, up or down; hold an arrow to keep rolling. Space and OK do nothing here. Esc or Back moves to the Stop button.",
    },
    cues: [
      {
        title: "Cyan ball, red walls, white light",
        then: "Touch the scene on the side the ball should roll to, or press that arrow. Head for the white light.",
        tone: "go",
        shapes: [...maze(2), ...exit(), ball(...cell(0, 1)), tap(...cell(1, 1)), key(137, 48, "Right")],
      },
      {
        title: "The ball leans at a wall and springs back",
        then: "That way is closed, and the push counts as one bump. Look for the open way, then roll.",
        tone: "wait",
        shapes: [...maze(2), ...exit(), ball(cell(2, 1)[0] + 3.5, cell(2, 1)[1]), words("a wall: one bump", 83.5, 6.5, "dim")],
      },
      {
        title: "The ball is on the white light",
        then: "Maze solved: one point. A new maze fades in. Find the ball again before you move.",
        tone: "wait",
        shapes: [...maze(3), ...exit(true), ball(...cell(5, 0))],
      },
      {
        title: "Red walls and the white light, but no ball",
        then: SWITCHED_OFF,
        tone: "stop",
        shapes: [...maze(2), ...exit(), words("no ball to be seen", 83.5, 6.5, "dim")],
      },
    ],
    success: [
      "One point is one maze solved: the ball reached the white light. \"Mazes\" on the top line is your score.",
      "A bump is a fresh push at a wall. A maze solved with two bumps or fewer is a clean maze.",
      "The level (1 to 10) sets the size of the maze: it gains a row of cells at every second level. Three clean mazes raise the level; two mazes in a row with more than eight bumps lower it.",
      "A good session is mazes solved by looking first and rolling second. Pushing in every direction until something gives still solves the maze, but it trains nothing and lowers the level.",
    ],
    measures: [
      { key: "score", label: "Mazes solved", unit: "", how: "Each time the ball reaches the white light adds one, however many bumps it took.", better: "higher" },
      { key: "hits", label: "Clean mazes", unit: "", how: "Mazes solved with two bumps into walls or fewer. This is the number that shows the walls were seen and used.", better: "higher" },
      { key: "misses", label: "Mazes bumped through", unit: "", how: "Mazes solved with more than eight bumps into walls.", better: "lower" },
      { key: "top", label: "Highest level", unit: "of 10", how: "The largest maze you reached. Three clean mazes raise the level; two bumped-through mazes in a row lower it.", better: "higher" },
    ],
    stop: [...STOP, "The ball keeps fading away while the walls stay: the weaker eye is switching off. Rest, and if it happens every time, tell the eye doctor."],
    mistakes: [
      "Playing without the glasses, or with them the wrong way round. Close the stronger eye: you should still see the ball, and the walls should be gone.",
      "Rolling before looking. Find the ball, the light and the open way first.",
      "Tapping in every direction to feel for the gaps. Each push at a wall is a bump.",
      ONE_EYE_SHUT,
    ],
    evidence: EVIDENCE,
    sources: SOURCES,
  },
], GAME_GUIDE_WORDS);
