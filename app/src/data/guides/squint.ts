/**
 * Guides for the squint group: two slow drills for intermittent squint (an eye that drifts some of the time).
 * Both are counsellor-led: the member does them as the counsellor showed, with no time pressure.
 */
import type { Guide, Measure, Source } from "./types";
import { textsEach } from "@/i18n/texts";
import { GUIDE_WORDS } from "./words";

/* ── sources ── */

const CLINIC_TRIAL: Source = {
  label: "Ma and others, 2024, Ophthalmic and Physiological Optics: randomised trial of clinic vergence and anti-suppression therapy for intermittent exotropia",
  url: "https://pubmed.ncbi.nlm.nih.gov/38146812/",
};
const COCHRANE: Source = {
  label: "Pang and others, 2021, Cochrane Database of Systematic Reviews: interventions for intermittent exotropia",
  url: "https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD003737.pub4/full",
};

/* ── shared lines ── */

const STOP = ["Double vision that stays after a short rest", "A headache", "Eye pain", "Feeling dizzy or sick"];
const DRIFT = "An eye that keeps drifting, or double vision, after the session has ended. Stop and tell your counsellor before the next one.";
const AS_SHOWN = "Do this as your counsellor showed you. It opens only when a counsellor has put it on your plan.";
const LENS = "Put the red-cyan glasses on with the cyan (blue-green) lens over the weaker eye. Your eye settings say which eye that is.";
const PLAN = "Your counsellor's plan: how many minutes and how often.";
const MORE = "Doing more minutes than the counsellor's plan says.";
const EVIDENCE_TAIL = "A 2021 Cochrane review found no usable trial of eye exercises. This home screen drill is untested.";

const auto = (key: string, label: string, unit: string, how: string, max: number, step: number, better: Measure["better"]): Measure =>
  ({ key, label, unit, how, from: "auto", min: 0, max, step, better });

export const guides: Guide[] = textsEach("data/guides/squint", () => [
  {
    slug: "see-both-lights",
    what: "A slow drill for noticing both eyes at once. Through red-cyan glasses each eye sees one of two lights, and now and then the screen asks how many you see. It is for intermittent squint (an eye that drifts some of the time), on a counsellor's plan.",
    need: [
      "Red-cyan glasses, worn over your own glasses if you have them.",
      "This screen, in a room with soft light and nothing reflected in the screen.",
      PLAN,
    ],
    setup: [
      AS_SHOWN,
      LENS,
      "Sit facing the middle of the screen, at the distance it was set up for.",
      "Press Start.",
    ],
    steps: [
      "Look at the white frame. Inside it are two lights side by side: one cyan, one red.",
      "Know what you are looking for: each eye can see only one of the lights, so seeing both means both eyes are switched on.",
      "Keep looking gently at the frame with both eyes open. Blink as usual.",
      "When the screen asks \"How many lights?\", press Left for one or Right for two.",
      "Answer what you really see. There is no hurry, and no answer is wrong.",
      "If one light fades, blink a few times and keep looking. Do not strain to bring it back.",
      "After 3 minutes, or the time on your plan, press \"Finish now\".",
    ],
    right: [
      "Most of the time you see two lights at once: one cyan and one red.",
      "The two lights stay side by side inside the frame.",
      "You answer honestly, also when one light has gone.",
      "Your eyes feel easy, with no pulling or strain.",
    ],
    measures: [
      auto(
        "both_pct", "Checks where both lights were seen", "%",
        "The screen measures this. Each time it asks \"How many lights?\" it keeps your answer. This is the share of your answers that were two.",
        100, 1, "higher",
      ),
      auto(
        "checks", "Checks answered", "",
        "The screen measures this. It counts how many times it asked \"How many lights?\" and you answered in this session.",
        500, 1, "none",
      ),
    ],
    stop: [...STOP, DRIFT],
    mistakes: [
      "Answering two because it feels like the right answer. Only what you see counts.",
      "Closing one eye to check. Keep both eyes open.",
      "Glasses the wrong way round. The cyan lens belongs over the weaker eye.",
      MORE,
    ],
    tool: { kind: "drill" },
    evidence: "One small trial of supervised clinic therapy that included drills of this kind found better control of intermittent squint than watching and waiting. " + EVIDENCE_TAIL,
    sources: [CLINIC_TRIAL, COCHRANE],
  },
  {
    slug: "distance-fusion-hold",
    what: "A slow drill for keeping the two eyes together while looking far away. Through red-cyan glasses each eye sees its own ring on the TV, and you hold the two as one ring while it slowly gets harder. For intermittent squint, on a counsellor's plan.",
    need: [
      "Red-cyan glasses, worn over your own glasses if you have them.",
      "A TV that can open Eyes Opener, and a seat about 3 metres from it.",
      "A remote or a keyboard within reach.",
      PLAN,
    ],
    setup: [
      AS_SHOWN,
      "Measure 3 metres from the TV with a tape, or take four long steps. Put the seat there, facing the middle of the screen.",
      LENS,
      "Press Start.",
    ],
    steps: [
      "Look at the ring. You should see one ring with a dot at the top and a dot at the bottom.",
      "Know what the dots mean: the top dot is the left eye's and the bottom dot is the right eye's. Both dots mean both eyes are working together.",
      "Hold it as one ring. After every 20 seconds you hold it, it gets a little harder.",
      "Keep looking calmly at the ring. Breathe and blink as usual.",
      "If the ring splits into two, press Down, or tap \"It split\" in the corner. The screen eases off, gives you a rest and starts again.",
      "If a dot goes missing, one eye has switched off. Blink gently and wait for it to come back.",
      "After 5 minutes, or the time on your plan, press \"Finish now\".",
    ],
    right: [
      "You see one ring with both dots for most of the session.",
      "You press \"It split\" as soon as you see two rings. Nothing is lost by saying so.",
      "You stay in the seat at 3 metres, with your head upright.",
    ],
    measures: [
      auto(
        "hold_s", "Time held as one ring", "seconds",
        "The screen measures this. It adds up all the seconds in this session that you held the ring as one, without pressing \"It split\".",
        3600, 1, "higher",
      ),
      auto(
        "hold_pd", "Highest demand held", "prism dioptres",
        "The screen measures this. It is the furthest the two rings were pulled apart while you still held one ring. A prism dioptre is the unit for how far the eyes must turn.",
        40, 0.5, "higher",
      ),
    ],
    stop: [...STOP, DRIFT],
    mistakes: [
      "Carrying on with two rings and not pressing \"It split\". The screen cannot see your eyes: it relies on you.",
      "Sitting closer than 3 metres. This drill is for looking far away.",
      "Staring hard or holding your breath to keep the ring together.",
      MORE,
    ],
    tool: { kind: "drill" },
    evidence: "One small trial of supervised clinic therapy that included fusion drills found better distance control of intermittent squint than watching and waiting. " + EVIDENCE_TAIL,
    sources: [CLINIC_TRIAL, COCHRANE],
  },
], GUIDE_WORDS);
