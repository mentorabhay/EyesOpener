/**
 * Guides for the after-stroke group: two routines for half-field loss (the left or the right half of what each eye
 * sees is missing after a stroke). Both are counsellor-led: slow, plain, with no time pressure and no glasses.
 * The on-screen tools fill in the numbers; the member types nothing.
 */
import type { Guide, Measure, Source } from "./types";
import { textsEach } from "@/i18n/texts";
import { GUIDE_WORDS } from "./words";

/* ── sources ── */

const EYE_SEARCH: Source = {
  label: "Ong and others, 2015, Annals of Clinical and Translational Neurology: Eye-Search, a web-based therapy that improves visual search in hemianopia",
  url: "https://pubmed.ncbi.nlm.nih.gov/25642437/",
};
const READ_RIGHT: Source = {
  label: "Ong and others, 2012, Journal of Neurology: Read-Right, a web app that improves reading speeds in patients with hemianopia",
  url: "https://link.springer.com/article/10.1007/s00415-012-6549-8",
};
const COCHRANE: Source = {
  label: "Pollock and others, 2019, Cochrane Database of Systematic Reviews: interventions for visual field defects in people with stroke",
  url: "https://pubmed.ncbi.nlm.nih.gov/31120142/",
};

/* ── shared lines ── */

const STOP = [
  "Double vision that stays after a short rest",
  "A headache",
  "Eye pain",
  "Feeling dizzy or sick",
  "Any sudden new loss of sight, weakness, numbness or trouble speaking. This is an emergency: call an ambulance at once.",
  "Tired eyes or a tired head. Rest and come back later: tiredness is common after a stroke.",
];
const AS_SHOWN = "Do this as your counsellor showed you. There is no hurry in this routine and nothing is timed out.";
const OWN_GLASSES = "Your reading or screen glasses, if you use them. No red-cyan glasses for this routine.";
const PLAN = "Your counsellor's plan for minutes and days. With no other advice the dose is 20 minutes a day; rest whenever you tire.";
const SCREEN = "A laptop or a tablet standing on a table, with no window or lamp reflected in the screen.";
const MORE = "Doing more minutes than your counsellor's plan says.";

const auto = (key: string, label: string, unit: string, how: string, max: number, step: number, better: Measure["better"]): Measure =>
  ({ key, label, unit, how, from: "auto", min: 0, max, step, better });

export const guides: Guide[] = textsEach("data/guides/after-stroke", () => [
  {
    slug: "blind-side-sweeps",
    what: "Practice at finding things on the side you can no longer see after a stroke. A white dot appears on the screen, more often on your hard side, and you sweep your eyes across to find it.",
    need: [SCREEN, OWN_GLASSES, PLAN],
    setup: [
      AS_SHOWN,
      "Sit with the middle of the screen straight in front of your nose, at your usual distance from this screen.",
      "Press Start. The screen asks \"Which side is hard to see?\". Press Left or Right, or tap that half of the screen.",
    ],
    steps: [
      "Look at the small cross in the middle of the screen. Every search starts there.",
      "Keep your head still, facing the middle. Only your eyes move.",
      "A white dot appears somewhere on the screen. Seven dots in ten come up on your hard side.",
      "If you see no dot, make one big sweep with your eyes, all the way to the edge of the screen on your hard side.",
      "Then search back towards the middle until you find the dot.",
      "Press Left if the dot is in the left half, or Right if it is in the right half, or tap the dot. A wrong answer changes nothing: the dot waits.",
      "Look back at the cross. The next dot comes after 1 to 2 seconds.",
      "Carry on for the time on your plan. Then press \"Finish now\".",
    ],
    right: [
      "When no dot shows, your first move is a big sweep to the far edge of your hard side.",
      "Your head stays still and your eyes do the searching.",
      "You find the dot itself before you answer. You do not guess the side.",
      "You rest when your eyes or your head feel tired.",
    ],
    measures: [
      auto(
        "find_s_blind", "Time to find a dot on the hard side", "seconds",
        "The screen measures this: the average time from a dot appearing on your hard side to your finding it. It shows once 3 dots have been found there. A search of over a minute is left out.",
        60, 0.1, "lower",
      ),
      auto(
        "find_s_seeing", "Time to find a dot on the other side", "seconds",
        "The screen measures this in the same way for dots on the side you see well. Compare the two numbers: the gap between them is what the practice works on.",
        60, 0.1, "lower",
      ),
      auto(
        "found", "Dots found", "dots",
        "The screen counts every dot you found in this session, on either side.",
        5000, 1, "none",
      ),
    ],
    stop: STOP,
    mistakes: [
      "Turning your head to find the dot. In this drill the eyes do the work.",
      "Small, careful eye movements that stop short of the edge. Sweep all the way out, then come back.",
      "Pressing a side at once as a guess. Find the dot first.",
      MORE,
    ],
    tool: { kind: "drill" },
    evidence: "In one study, 78 people with half-field loss did 800 searches of a web therapy like this over 11 days. Their searches into the hard side became 24% faster than at the start. A 2019 Cochrane review still calls the evidence for such training uncertain.",
    sources: [EYE_SEARCH, COCHRANE],
  },
  {
    slug: "guided-line-reading",
    what: "Reading practice for people who lost the left or the right half of their sight after a stroke and now lose their place on the page. The screen shows one line at a time between two bars: a thick bar where the line starts and a thin bar where it ends.",
    need: [SCREEN, OWN_GLASSES, PLAN],
    setup: [
      AS_SHOWN,
      "Sit with the screen straight in front of you, at your usual reading distance.",
      "Choose the text size (Large, Larger or Largest) and the line length (Short lines or Medium lines). Begin with the largest text and short lines.",
      "Press \"Start reading\".",
    ],
    steps: [
      "Find the thick coloured bar on the left first. The line starts just after it.",
      "If your hard side is the left, move your eyes left until you see the thick bar before every line. Then you do not miss the first words.",
      "If your hard side is the right, glance across to the thin bar on the right first, so that you know where the line ends.",
      "Read the line word by word, across to the thin bar. The line ends just before it.",
      "When you have read the whole line, press \"Next line\". On a keyboard, Space, Enter or the right arrow do the same.",
      "If you missed something, press \"Back\" to see the line again. It is not counted twice.",
      "Read for the time on your plan. Press \"Pause\" when you need a rest.",
      "Press \"Save this reading\" when you have finished.",
    ],
    right: [
      "You see the thick bar before you read the first word of each line.",
      "You read every word up to the thin bar before you press \"Next line\".",
      "The words make sense as you go. Nothing seems to be missing.",
      "You read at an easy pace. This is practice, not a race.",
    ],
    measures: [
      auto(
        "words_per_min", "Reading speed", "words a minute",
        "The screen measures this: the words in the lines you finished, divided by the minutes you took. It shows after 3 lines and 20 seconds of reading.",
        600, 1, "higher",
      ),
      auto(
        "lines", "Lines finished", "lines",
        "The screen counts one line each time you press \"Next line\". A line you read again after \"Back\" is counted once.",
        5000, 1, "none",
      ),
    ],
    stop: STOP,
    mistakes: [
      "Pressing \"Next line\" before the end of the line to go faster. The speed means something only when every word was read.",
      "Starting to read where your eyes happen to land. Find the thick bar first.",
      "Text that is too small. Use the largest size.",
      MORE,
    ],
    tool: { kind: "reading" },
    evidence: "The study behind this used text that scrolls sideways: 33 people with right-side loss read still text 46% faster after 20 hours of practice than at their own start. This tool marks the ends of still lines instead, and is untested itself.",
    sources: [READ_RIGHT, COCHRANE],
  },
], GUIDE_WORDS);
