/**
 * Game guides for the vergence games: games that train how the two eyes turn in together.
 * Tunnel Glide is the reference guide: copy its shape for a new one.
 *
 * Sources: each was opened and read for the exercise guides in `src/data/guides/convergence.ts`; the figures used here are the same.
 */
import type { Source } from "@/data/guides/types";
import { frame, fusion, hud, key, splitBox, tap, words } from "./cue";
import type { GameGuide } from "./types";

/** 221 children; weekly therapy with home practice 73% succeeded or improved, home push-ups 43%, home computer drills 33%, placebo therapy 35%. */
const CITT: Source = {
  label: "Convergence Insufficiency Treatment Trial Study Group, 2008, Archives of Ophthalmology: four treatments compared in 221 children aged 9 to 17",
  url: "https://pubmed.ncbi.nlm.nih.gov/18852411/",
};
const REVIEW: Source = {
  label: "Scheiman, Kulp, Cotter, Lawrenson, Wang and Li, 2020, Cochrane Database of Systematic Reviews: treatments for convergence insufficiency compared",
  url: "https://pubmed.ncbi.nlm.nih.gov/33263359/",
};

/** What stops every game that asks the eyes to turn in. */
const STOP = [
  "Double vision that stays after you look far away and blink",
  "A headache",
  "Eye pain",
  "Feeling dizzy or sick",
  "A pulling or aching feeling round the eyes that is still there after a minute of looking far away",
];

/** The tunnel of Tunnel Glide, as a few faint lines. */
const tunnel = () => [
  frame(),
  { t: "box" as const, x: 22, y: 22, w: 116, h: 46, ink: "dim" as const },
  { t: "box" as const, x: 52, y: 34, w: 56, h: 22, ink: "dim" as const },
  { t: "line" as const, x1: 22, y1: 22, x2: 52, y2: 34, ink: "dim" as const, w: 0.8 },
  { t: "line" as const, x1: 138, y1: 22, x2: 108, y2: 34, ink: "dim" as const, w: 0.8 },
  { t: "line" as const, x1: 22, y1: 68, x2: 52, y2: 56, ink: "dim" as const, w: 0.8 },
  { t: "line" as const, x1: 138, y1: 68, x2: 108, y2: 56, ink: "dim" as const, w: 0.8 },
];

export const guides: GameGuide[] = [
  {
    slug: "tunnel-glide",
    what: "A ring flies toward you down a tunnel. The screen draws it twice, once for each eye, a little apart. Your job is to pull the two into one ring with your eyes, and say so when the ring reaches the tunnel mouth.",
    helps: "Each ring is drawn a little further apart than the last, so your eyes must turn in a little more to join it. That is the turning-in practice used in therapy for convergence insufficiency, where the eyes tire or drift when working up close. Therapy with a therapist every week helped most children in trials; computer practice at home alone did no better than pretend therapy, so treat this as practice, not as treatment.",
    need: [
      "Red-cyan glasses. Without them the game cannot work: you will always see two rings, one red and one cyan.",
      "A tablet, computer or TV. A wider screen lets the rings go further apart.",
      "A seat square to the screen, at the distance this screen was measured for in onboarding.",
    ],
    see: [
      "On the screen there are always two rings: a cyan one and a red one. That is how it is meant to be.",
      "Through the glasses each eye gets one ring. When your eyes turn in by the right amount, your brain joins them: you see ONE ring, with a dot at the top and a dot at the bottom.",
      "Two rings through the glasses means your eyes have not joined them yet, or have let go.",
      "One ring with only one dot means one eye has switched off. Blink and look again.",
    ],
    play: [
      "Put the glasses on, cyan lens over the eye your eye settings name, and press Start.",
      "Watch the ring come toward you from the far end of the tunnel. Keep looking at the ring, not at the walls.",
      "Let your eyes pull the two rings together until you see one ring with both dots.",
      "When the tunnel mouth lights up (its outline turns thick) and you still see one ring with both dots, tap the scene or press Space.",
      "The next ring starts far away and asks for a little more. Keep going.",
      "If the ring doubles and will not come back, tap It split or press Down. The game eases off and the ring goes back a little.",
      "After 5 minutes press Finish now, then look across the room for a minute.",
    ],
    controls: {
      touch: "Tap anywhere in the scene for \"it is one ring\". Tap the It split box in the corner when it doubles.",
      keys: "Space, Enter or OK on a TV remote for \"it is one ring\". Down for \"it split\". Esc or Back moves to the Stop button.",
    },
    cues: [
      {
        title: "Two rings, ring still coming",
        then: "Wait. Keep looking at the ring and let your eyes pull the two together.",
        tone: "wait",
        shapes: [...tunnel(), ...fusion(80, 45, 9, 14), hud("Rings 3 · Reach 4"), ...splitBox()],
      },
      {
        title: "One ring with both dots, tunnel mouth lit",
        then: "Now: tap the scene or press Space. That ring counts.",
        tone: "go",
        shapes: [
          frame(), { t: "box", x: 22, y: 22, w: 116, h: 46, ink: "both" }, { t: "box", x: 52, y: 34, w: 56, h: 22, ink: "dim" },
          ...fusion(80, 45, 17, 0), hud("Rings 3 · Reach 4"), ...splitBox(), tap(40, 58), key(40, 76, "Space"),
        ],
      },
      {
        title: "It doubled and will not join",
        then: "Tap It split or press Down. The game eases off. This is not a failure.",
        tone: "stop",
        shapes: [...tunnel(), ...fusion(80, 45, 15, 30), hud("Rings 3 · Reach 4"), ...splitBox(true), key(92, 76, "Down")],
      },
      {
        title: "One ring, but one dot is missing",
        then: "One eye has switched off. Blink, look far away, then look again. Do not press yet.",
        tone: "wait",
        shapes: [...tunnel(), ...fusion(80, 45, 17, 0, "left"), words("bottom dot missing", 80, 6.5, "dim"), hud("Rings 3 · Reach 4")],
      },
    ],
    success: [
      "One point is one ring that you passed while it was truly one ring with both dots.",
      "\"Reach\" on the top line is the largest pull at which you passed a ring. A good session is one where Reach climbs by a step or two and you rarely need It split.",
      "The game only knows what you tell it. Pressing when you still see two rings raises the numbers and trains nothing.",
      "Needing It split is normal. It tells the game where your limit is today.",
    ],
    measures: [
      { key: "score", label: "Rings passed as one", unit: "", how: "Each press at the tunnel mouth while you saw one ring with both dots adds one.", better: "higher" },
      { key: "conv", label: "Furthest turned in", unit: "prism dioptres", how: "The largest pull the screen drew this session. One prism dioptre means aiming 1 cm to the side at a distance of 1 metre. A small screen cannot draw as far as a large one.", better: "higher" },
      { key: "splits", label: "Times it split in two", unit: "", how: "How often you pressed It split. Fewer at the same Reach means the pull is getting easier to hold.", better: "lower" },
      { key: "top", label: "Highest level", unit: "of 10", how: "Three rings in a row raise the level, and the steps between rings grow. Two splits in a row lower it.", better: "higher" },
    ],
    stop: [...STOP, "One of the two dots keeps going missing: one eye is switching off"],
    mistakes: [
      "Playing without the glasses, or with them the wrong way round. Close your right eye: the dot you still see should be the top one.",
      "Pressing because the tunnel mouth lit up, while you still see two rings.",
      "Leaning toward the screen when it gets hard. Stay at your set distance.",
      "Carrying on with one dot missing.",
    ],
    joined: true,
    evidence: "No trial tested this game. In the trial behind it, weekly therapy with a therapist plus home practice helped 73 in 100 children, while computer practice at home alone helped 33 in 100, about the same as pretend therapy.",
    sources: [CITT, REVIEW],
  },
];
