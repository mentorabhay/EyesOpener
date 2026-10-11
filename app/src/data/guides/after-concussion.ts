// Eyes Opener: Guides for the after-concussion group: three routines that join eye work with movement.
/**
 * Guides for the after-concussion group: three routines that join eye work with movement.
 * All three are counsellor-led: done as the counsellor showed, slowly, and stopped when symptoms rise by 2 points
 * or more on a 0 to 10 score. The score is the one the Vestibular/Ocular Motor Screening uses: headache, dizziness,
 * feeling sick and a foggy head, each from 0 (none) to 10.
 */
import type { Guide, Measure, Source } from "./types";
import { textsEach } from "@/i18n/texts";
import { GUIDE_WORDS } from "./words";

/* ── sources ── */

const CONCUSS: Source = {
  label: "Alvarez and others, 2025, British Journal of Sports Medicine: CONCUSS randomised clinical trial of vergence and accommodative therapy with movement for concussion-related convergence insufficiency",
  url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12591301/",
};
const VOMS: Source = {
  label: "Mucha and others, 2014, American Journal of Sports Medicine: a brief Vestibular/Ocular Motor Screening (VOMS) assessment to evaluate concussions",
  url: "https://pubmed.ncbi.nlm.nih.gov/25106780/",
};
const VESTIBULAR_TRIAL: Source = {
  label: "Schneider and others, 2014, British Journal of Sports Medicine: cervicovestibular rehabilitation in sport-related concussion, a randomised controlled trial",
  url: "https://pubmed.ncbi.nlm.nih.gov/24855132/",
};

/* ── shared lines ── */

const STOP = [
  "Your symptom score goes up by 2 points or more. Stop for today and tell your counsellor.",
  "Double vision that stays after a short rest",
  "A headache that is new or clearly worse",
  "Eye pain",
  "Feeling dizzy or sick, or unsteady on your feet. Sit down at once.",
  "Symptoms that are still up the next morning. Tell your counsellor before you do the routine again.",
];
const AS_SHOWN = "Do this as your counsellor showed you, at the speed and for the time they set. Where this page gives a speed or a count, the counsellor's figure comes first.";
const PLAN = "Your counsellor's plan: which days, how many sets, how fast.";
const HELPER = "Someone nearby for the first few times, in case you feel unsteady.";
const OWN_GLASSES = "Wear the glasses your counsellor told you to use for this.";
const LEVEL = "Your symptom score at the end is the same as before, or 1 point higher at most.";
const MORE = "Doing extra on a good day. Keep to the number on your plan.";
const CONCUSS_RESULT = "symptoms improved in 79% after six weeks of sessions with a therapist, against 13% of those still waiting";

const SCORE = "think of your headache, dizziness, sick feeling and foggy head. Score the worst of them from 0 (none) to 10 (as bad as it can be)";
const before: Measure = {
  key: "symptoms_before", label: "Symptom score before", unit: "of 10",
  how: `Before you begin, ${SCORE}.`,
  from: "typed", min: 0, max: 10, step: 1, better: "lower",
};
const after: Measure = {
  key: "symptoms", label: "Symptom score after", unit: "of 10",
  how: "Straight after the routine, score the same four things again from 0 to 10 and type the worst. If it is 2 or more above your score before, stop for today.",
  from: "typed", min: 0, max: 10, step: 1, better: "lower",
};

export const guides: Guide[] = textsEach("data/guides/after-concussion", () => [
  {
    slug: "walk-in-target",
    what: "Walking slowly towards a letter on the wall while keeping it single and clear. The nearer you come, the more your two eyes must turn in together, and here they do it while you move.",
    need: [
      "The printed letter sheet from this page. Use the big letter first, and the row of small letters when the big one is easy.",
      "A clear, flat path of 3 metres to the wall, in good light, with nothing to trip on.",
      "A tape measure laid on the floor from the wall straight out to 3 metres.",
      HELPER,
      PLAN,
    ],
    setup: [
      AS_SHOWN,
      "Pin the sheet to a wall at the height of your eyes. Lay the tape on the floor with its zero at the wall.",
      OWN_GLASSES,
      "Stand at the 3 metre mark, facing the letter. Press \"Start timer\" and type your symptom score before you begin.",
    ],
    steps: [
      "Look at the letter from 3 metres. It should be one letter with sharp edges.",
      "Walk towards it slowly, about one small step each second, with your eyes on the letter all the way.",
      "If the letter doubles or blurs, stop walking and try to make it one clear letter again. If it clears, walk on.",
      "When it stays double or blurred, stop. Look down: the number on the tape at your toes is the distance for this walk.",
      "If the letter is still single and clear with your toes 20 cm from the wall, stop there. The distance for this walk is 20.",
      "Go back to the 3 metre mark and rest for a few breaths, looking at something far away.",
      "Do five walks in all.",
      "Type the smallest of your five distances and your symptom score now. Press \"Save this routine\".",
    ],
    right: [
      "The letter stays one letter with sharp edges for most of each walk.",
      "Your steps are slow and even, and you stay steady on your feet.",
      "You feel your eyes working as you come close, without pain.",
      LEVEL,
    ],
    measures: [
      {
        key: "nearest_cm", label: "Closest distance with the letter single and clear", unit: "cm",
        how: "On each walk, stop where the letter stays double or blurred and read the floor tape at your toes. Type the smallest of your five numbers. If you reached 20 cm with the letter still clear, type 20.",
        from: "typed", min: 20, max: 300, step: 1, better: "lower",
      },
      before,
      after,
    ],
    stop: STOP,
    mistakes: [
      "Walking fast. Speed brings symptoms on and hides the point where the letter doubles.",
      "Looking down at the tape while you walk. Look at the letter, and read the tape only after you stop.",
      "Pushing on with a double letter. The walk ends where it stays double.",
      MORE,
    ],
    tool: { kind: "timer" },
    print: "letter",
    evidence: `No trial tested this walk by itself. A clinic programme of eye-teaming and focusing therapy with movement was tested as a whole in people aged 11 to 25: ${CONCUSS_RESULT}.`,
    sources: [CONCUSS, VOMS],
  },
  {
    slug: "head-turn-letter-hold",
    what: "Keeping a letter sharp while you turn your head slowly from side to side. It practises holding your gaze steady when your head moves, which can bring on symptoms after a concussion.",
    need: [
      "The printed letter sheet from this page. Use the big letter first, and the row of small letters once the big one stays sharp in all three sets.",
      "A firm chair and a wall. Sit for this routine unless your counsellor told you to stand.",
      "Two small stickers or bits of tape for markers.",
      "A helper with a watch, if you can. Alone, you count your head turns.",
      PLAN,
    ],
    setup: [
      AS_SHOWN,
      "Pin the sheet at the height of your eyes when you sit. Place the chair so that your eyes are about 1 metre from the letter.",
      "Stick one marker 30 cm to the left of the letter and one 30 cm to the right. Your nose turns as far as each marker and no farther.",
      "Press \"Start timer\" and type your symptom score before you begin.",
    ],
    steps: [
      "Look at the letter and check that it is sharp.",
      "Keep your eyes on the letter and turn your head slowly to the left, until your nose points at the left marker.",
      "Turn slowly to the right marker, with your eyes still on the letter. One turn left and right takes about 2 seconds.",
      "Carry on for 1 minute. The helper watches the time. Alone, count the turns: 30 turns left and right make one minute.",
      "Notice the moment the letter first blurs, jumps or seems to slide. Say \"now\" to the helper, or remember your count: each turn is 2 seconds.",
      "Stop at 1 minute. Rest for 1 minute with your eyes closed or looking far away.",
      "Do three sets in all.",
      "Type the lowest seconds clear of the three sets and your symptom score now. Press \"Save this routine\".",
    ],
    right: [
      "The letter stays sharp and still while your head moves.",
      "Your eyes stay on the letter the whole time. Only your head turns.",
      "The turns are small, slow and even, like a slow \"no\".",
      LEVEL,
    ],
    measures: [
      {
        key: "seconds_clear", label: "Seconds the letter stayed clear", unit: "seconds",
        how: "In each one-minute set, note the second when the letter first blurred, jumped or slid. A set where it never did scores 60. Type the lowest of your three sets.",
        from: "typed", min: 0, max: 60, step: 1, better: "higher",
      },
      before,
      after,
    ],
    stop: STOP,
    mistakes: [
      "Turning fast. Start slowly; your counsellor says when to speed up.",
      "Big turns, past the markers. Your eyes cannot stay on the letter then.",
      "Letting your eyes travel with your head. The eyes stay on the letter.",
      "Holding your breath or clenching your jaw. Breathe as usual.",
    ],
    tool: { kind: "timer" },
    print: "letter",
    evidence: "No trial tested this drill by itself. Gaze exercises like it belong to balance-system (vestibular) therapy. In one small trial of that therapy with neck treatment, 73% were cleared for sport within 8 weeks, against 7% without it.",
    sources: [VESTIBULAR_TRIAL, VOMS],
  },
  {
    slug: "near-far-with-movement",
    what: "Switching focus between a small card held near and a letter chart on the far wall, while you step from side to side. It practises refocusing while your body moves.",
    need: [
      "The printed far chart and one near card from this page. Both carry the same letters in the same order.",
      "A clear floor 3 metres from a wall, with room for one step to each side.",
      "A helper to tap the counter, if you can. Alone, put this screen where your free hand can reach it.",
      HELPER,
      PLAN,
    ],
    setup: [
      AS_SHOWN,
      "Pin the far chart to the wall at the height of your eyes, in good light. Stand 3 metres from it and hold the near card 40 cm from your eyes, just below the chart in your view.",
      OWN_GLASSES,
      "Decide your symptom score before you begin and remember it. Then press \"Start the count\": the counter runs for 1 minute.",
    ],
    steps: [
      "Start stepping slowly: one step to the left, feet together, one step to the right, feet together. About one step every 2 seconds.",
      "Look at the first letter on the far chart. Wait until it is sharp, then read it aloud.",
      "Look at the same letter on the near card. Wait until it is sharp, then read it aloud.",
      "That is one pair. Tap the button once, or the helper taps it.",
      "Go on to the next letter: far, then near, then tap. Keep stepping all the while.",
      "Stop when the counter reaches zero. Stand still and rest for 1 minute.",
      "Type your symptom score from before and your score now. Press \"Save this routine\".",
      "The dose is 2 minutes. If your score has not gone up by 2, press \"Do it again\" for the second minute.",
    ],
    right: [
      "Each letter comes sharp within a second or two of your looking at it.",
      "Your feet keep moving while your eyes change focus.",
      "You read the right letters. The helper can check them against the chart.",
      LEVEL,
    ],
    measures: [
      {
        key: "cycles_per_min", label: "Near and far pairs in a minute", unit: "a minute",
        how: "The screen counts the taps in the 1-minute count. Tap once after each pair: one letter read sharp on the far chart and the same letter read sharp on the near card.",
        from: "auto", min: 0, max: 60, step: 1, better: "higher",
      },
      before,
      after,
    ],
    stop: STOP,
    mistakes: [
      "Racing for a high count. A letter counts only when it was sharp.",
      "Standing still to make it easier. The stepping is part of the routine.",
      "Letting the near card drift farther away than 40 cm.",
      MORE,
    ],
    tool: { kind: "count", seconds: 60, per: "minute", measure: "cycles_per_min", tap: "Tap after each near and far pair" },
    print: "letters",
    evidence: `No trial tested this routine by itself. It mixes focusing with movement, as the clinic therapy in one trial did. In that trial, of people aged 11 to 25, ${CONCUSS_RESULT}.`,
    sources: [CONCUSS, VOMS],
  },
], GUIDE_WORDS);
