/**
 * Game guides for the depth games: games that train seeing depth with two eyes, played through red-cyan glasses.
 *
 * Sources: the pooled adult studies were opened and read for `src/data/guides/lazy-eye.ts` and read again for the
 * depth figures used here; the review of eye exercises was read for this file.
 */
import type { Source } from "@/data/guides/types";
import { frame, hud, key, tap, words } from "./cue";
import type { CueInk, GameGuide, Shape } from "./types";
import { textsEach } from "@/i18n/texts";
import { GAME_GUIDE_WORDS } from "./words";

/** Of the adults who had measurable depth vision before training, 34% improved it by two octaves (four times finer) or more. The authors urge caution: coarse depth scores vary between sessions with no training. */
const ADULT_TRAINING: Source = {
  label: "Tsirlin and others, 2015, Investigative Ophthalmology and Visual Science: pooled studies of visual training for adults with lazy eye",
  url: "https://iovs.arvojournals.org/article.aspx?articleid=2363050",
};
/** "Less robust, but believable, evidence indicates visual training may be useful in developing fine stereoscopic skills." */
const EXERCISE_REVIEW: Source = {
  label: "Rawstron, Burley and Elder, 2005, Journal of Pediatric Ophthalmology and Strabismus: a systematic review of the applicability and efficacy of eye exercises",
  url: "https://pubmed.ncbi.nlm.nih.gov/15825744/",
};

const STOP = ["Double vision that stays after you look far away and blink", "A headache", "Eye pain", "Feeling dizzy or sick"];

/* ── Depth Darts ── */

const ROW = [34, 80, 126], NEAR = 2, R = 13;
/** One dart board: two rings and a centre. */
const board = (x: number, y: number, ink: CueInk): Shape[] => [
  { t: "ring", x, y, r: R, ink, w: 1.5 },
  { t: "ring", x, y, r: R * 0.58, ink, w: 1.5 },
  { t: "disc", x, y, r: R * 0.22, ink },
];
/** The row as the screen draws it: every board once in each eye's ink. The nearer board's two drawings sit a step apart (drawn larger here than in the game). */
const drawn = (y: number): Shape[] => ROW.flatMap((x, n) => { const gap = n === NEAR ? 4 : 0; return [...board(x - gap / 2, y, "strong"), ...board(x + gap / 2, y, "weak")]; });
/** The row as joined eyes see it through the glasses: every board single. */
const joined = (y: number): Shape[] => ROW.flatMap((x) => board(x, y, "both"));
const corner = (): Shape => ({ t: "text", x: 9, y: 82, s: "Depth step: 600", ink: "both", size: 6.5 });
const scene = (hits: number): Shape[] => [frame(), hud(`Hits ${hits}`), corner()];

export const guides: GameGuide[] = textsEach("data/game-guides/depth", () => [
  {
    slug: "depth-darts",
    what: "A row of three or four round targets. One of them floats a little nearer to you than the others. You throw a dart at that one.",
    helps:
      "Depth vision is the brain comparing the two eyes' pictures. Every target is drawn once for each eye; for one target the two drawings sit a small step apart, and joined eyes see that target as nearer. Right answers make the step finer. " +
      "In pooled studies of training in adults with a lazy eye, about a third of those who started with some depth vision made it four times finer or better. But coarse depth scores also change from test to test with no training. A score here is not a clinic depth test.",
    need: [
      "Red-cyan glasses, cyan lens over the eye your eye settings name. Without them no target can float: every one looks flat.",
      "Your own prescribed glasses, if you have them, under the red-cyan pair.",
      "A tablet, computer or TV. On a small phone the targets are crowded.",
      "A seat square to the screen, at the distance this screen was measured for in setup. The depth step is worked out for that distance.",
    ],
    see: [
      "On the screen itself every target is drawn twice, once in red and once in cyan, one on top of the other. For one target the two drawings sit a small step apart, so with no glasses it shows a thin red edge and a thin cyan edge.",
      "Through the glasses each eye gets one drawing of every target. One eye alone sees a row of targets that all look the same. With both eyes working together, one target floats in front of the screen, nearer to you than the rest.",
      "The red drawing may be fainter than the cyan one: red is dimmed to your own setting. It is not a fault of the screen.",
      "\"Depth step\" in the bottom corner is the size of the step, in seconds of arc (a measure of angle: 3,600 make one degree). A smaller number is a finer step and harder to see.",
    ],
    play: [
      "Put the glasses on and press Start. Keep both eyes open.",
      "Look along the row calmly and let the targets settle. Do not stare at one.",
      "Find the target that floats nearer to you than the others.",
      "Tap it. With keys or a remote, move the white marker under it with Left and Right, then press Space or OK.",
      "The dart flies. A white ring then marks the target that really was nearest, with \"Hit\" under it if you were right and \"Nearest\" if you were not.",
      "A new row follows by itself. The targets shift sideways a little every time, so their spacing is no clue.",
      "After about 5 minutes press Finish now and look across the room for a minute.",
    ],
    controls: {
      touch: "Tap the target you think is nearest. A tap away from every target does nothing.",
      keys: "Left and Right move a white marker under the targets; the first key press only shows the marker. Space, Enter or OK on a TV remote throws at the marked target. Up and Down do nothing here. Esc or Back moves to the Stop button.",
    },
    cues: [
      {
        title: "No glasses on: one target has coloured edges",
        then: "Put the glasses on first. Choosing by the coloured edges trains nothing.",
        tone: "wait",
        shapes: [...scene(2), ...drawn(42), words("the screen as drawn", 68, 6.5, "dim")],
      },
      {
        title: "Through the glasses: one target floats nearer",
        then: "Tap that target. With keys, put the white marker under it with Left and Right and press Space.",
        tone: "go",
        shapes: [
          ...scene(2), ...joined(40),
          { t: "text", x: 122, y: 20, s: "floats nearer", ink: "dim", size: 6.5, anchor: "middle" },
          { t: "poly", pts: [[ROW[NEAR], 57], [ROW[NEAR] - 3.5, 62], [ROW[NEAR] + 3.5, 62]], ink: "both" },
          tap(ROW[NEAR], 40), key(ROW[NEAR], 75, "Space"),
        ],
      },
      {
        title: "A white ring and a word under one target",
        then: "That is the answer: the ring marks the target that was nearest. \"Hit\" means your dart was on it. Wait for the next row.",
        tone: "wait",
        shapes: [
          ...scene(3), ...joined(40),
          { t: "ring", x: ROW[NEAR], y: 40, r: R + 3.5, ink: "both", w: 1.2 },
          { t: "line", x1: ROW[NEAR], y1: 40, x2: ROW[NEAR] + 5, y2: 47, ink: "both", w: 1.8 },
          { t: "disc", x: ROW[NEAR], y: 40, r: 2.4, ink: "both" },
          { t: "text", x: ROW[NEAR], y: 68, s: "Hit", ink: "both", size: 8, anchor: "middle" },
        ],
      },
      {
        title: "No target floats, or the targets look double",
        then: "Blink, look far away, then look again. If you still cannot tell, give one best answer: two misses in a row make the step bigger. If nothing ever floats, stop for today.",
        tone: "stop",
        shapes: [...scene(2), ...joined(42), words("all look equally far", 68, 6.5, "dim")],
      },
    ],
    success: [
      "One point is one dart thrown at the target that was nearest. \"Hits\" on the top line is your score.",
      "Three hits in a row make the depth step finer; two misses in a row make it bigger again. A good session ends on a smaller Depth step than it began, with few misses.",
      "The level (1 to 10) is the step: level 1 asks for 1,200 seconds of arc and level 10 for 40. A screen cannot draw a step finer than one of its own dots, so the corner shows the step that was really drawn.",
      "The game only knows which target you chose. Choosing by the coloured edges with the glasses off, or by luck, raises the numbers and trains nothing.",
    ],
    measures: [
      { key: "score", label: "Darts on the nearest target", unit: "", how: "Each dart thrown at the target that floated nearest adds one.", better: "higher" },
      { key: "misses", label: "Darts on a wrong target", unit: "", how: "Each dart thrown at a target that was not the nearest. With three targets, luck alone puts two darts in three here.", better: "lower" },
      { key: "top", label: "Highest level", unit: "of 10", how: "The finest step you reached. Level 1 is a step of 1,200 seconds of arc and level 10 is 40. A small or coarse screen cannot draw the finest steps.", better: "higher" },
    ],
    stop: [...STOP, "The targets go double and will not settle", "One colour of the targets keeps fading away: one eye is switching off"],
    mistakes: [
      "Playing without the glasses and picking the target with the coloured edges.",
      "Guessing fast. Luck hits one time in three or four, and a lucky run makes the step finer than your eyes can use.",
      "Leaning in, or moving the head from side to side, to make the depth show. Sit still at your set distance.",
      "Carrying on when nothing floats. If no target stands out even at the biggest step, stop for today and tell your eye doctor at the next visit.",
    ],
    evidence: "No trial tested this game. In pooled studies of training in adults with a lazy eye, about a third of those who started with some depth vision made it four times finer or better. The authors warn that coarse depth scores vary between tests even with no training.",
    sources: [ADULT_TRAINING, EXERCISE_REVIEW],
  },
], GAME_GUIDE_WORDS);
