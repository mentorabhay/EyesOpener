// Eyes Opener: Guides for the monitoring group: the weekly grid check and the routine for prescribed daily eye drops.
/**
 * Guides for the monitoring group: the weekly grid check and the routine for prescribed daily eye drops.
 * Neither treats anything. The grid check looks for change between eye examinations; the drop routine keeps a record
 * of drops an eye doctor prescribed, and never sets or changes them.
 */
import type { Guide, Measure, Source } from "./types";
import { textsEach } from "@/i18n/texts";
import { GUIDE_WORDS } from "./words";

/* ── sources ── */

const GRID_HOW: Source = {
  label: "American Academy of Ophthalmology: Have AMD? Save your sight with an Amsler grid",
  url: "https://www.aao.org/eye-health/tips-prevention/facts-about-amsler-grid-daily-vision-test",
};
const GRID_ACCURACY: Source = {
  label: "Faes and others, 2014, Eye: pooled studies of how well the Amsler grid finds wet macular degeneration",
  url: "https://www.nature.com/articles/eye2014104",
};
const GRID_NORMAL: Source = {
  label: "US National Library of Medicine, MedlinePlus Medical Encyclopedia: Home vision tests",
  url: "https://medlineplus.gov/ency/article/003446.htm",
};
const REMINDERS: Source = {
  label: "Boland and others, 2014, JAMA Ophthalmology: automated reminders and once-daily glaucoma drops, a randomised trial",
  url: "https://pubmed.ncbi.nlm.nih.gov/24831037/",
};
const HOW_TO_DROPS: Source = {
  label: "American Academy of Ophthalmology: How to put in eye drops",
  url: "https://www.aao.org/eye-health/treatments/how-to-put-in-eye-drops",
};

/* ── shared lines ── */

const STOP = ["Double vision that stays after a short rest", "A headache", "Eye pain", "Feeling dizzy or sick"];

/** The grid's two numbers differ only in the eye. The published "normal" is a grid with no bent or missing lines. */
const marks = (eye: "right" | "left"): Measure => ({
  key: `${eye}_marks`,
  label: `Squares marked, ${eye} eye`,
  unit: "",
  how: `The screen measures this. It counts the squares you tapped while your ${eye} eye looked at the dot and the other eye was covered.`,
  from: "auto",
  min: 0, max: 400, step: 1,
  better: "lower",
  usual: { text: "0 for an eye with healthy central sight: every line looks straight and whole. If you already have marks, compare with your own earlier weeks.", source: 2 },
});
const typed = (key: string, label: string, how: string, better: Measure["better"]): Measure =>
  ({ key, label, unit: "", how, from: "typed", min: 0, max: 12, step: 1, better });

export const guides: Guide[] = textsEach("data/guides/monitoring", () => [
  {
    slug: "weekly-grid-check",
    what: "A two-minute check of the centre of your sight, one eye at a time, with a square grid (called an Amsler grid). You mark any place where the lines look bent, blurred or missing. It can show a change between eye examinations.",
    need: [
      "A phone or tablet with this page, or the printed grid card.",
      "The glasses you read with, if you have them.",
      "Good, even light with nothing reflected in the screen.",
    ],
    setup: [
      "Put your reading glasses on.",
      "Hold the screen or the card 30 to 38 cm from your face, about where you would hold a book.",
      "Pick one day of the week and keep to it. If your eye doctor asked for a daily check, do it daily.",
    ],
    steps: [
      "Cover one eye with the palm of your hand. Do not press on it.",
      "With the open eye, look only at the dot in the middle. Keep looking at the dot the whole time.",
      "Without moving your eye from the dot, notice the lines around it. Are any bent, wavy, blurred, dark or missing?",
      "Tap every square where the lines look wrong. If every line is straight and whole, tap nothing.",
      "Swap hands and do the same with the other eye when the screen asks.",
      "Save the check. The screen keeps the number of marked squares for each eye.",
      "Compare with last week. For any new mark, or a marked area that has grown, contact an eye doctor promptly, within the same week.",
    ],
    right: [
      "Your eye stays on the dot. You notice the lines without looking straight at them.",
      "Each eye is checked alone, with the other one fully covered.",
      "The distance, the glasses and the light are the same every week.",
    ],
    measures: [marks("right"), marks("left")],
    stop: [
      ...STOP,
      "A sudden change in sight: a new dark patch, a shadow or curtain, flashes of light or many new floating specks. Get urgent eye care the same day.",
    ],
    mistakes: [
      "Checking with both eyes open. The stronger eye hides what the other one misses.",
      "Letting the eye wander over the grid. Keep it on the dot.",
      "Leaving off the reading glasses, or holding the grid at a different distance each week.",
      "Treating a clear grid as an all-clear. The grid misses some changes, so keep your eye examinations.",
    ],
    tool: { kind: "grid" },
    print: "grid",
    evidence: "The grid is a long-used home check, but it misses some changes: in pooled small studies it picked up about 78 in 100 eyes with wet macular degeneration. It does not replace eye examinations.",
    sources: [GRID_HOW, GRID_ACCURACY, GRID_NORMAL],
  },
  {
    slug: "drop-reminder-routine",
    what: "A fixed routine for eye drops an eye doctor prescribed for every day: an alarm at drop time, the drop, and a quick record. Each week it adds up the doses taken against the doses planned. Eyes Opener never sets or changes the drops.",
    need: [
      "The drops, and the eye doctor's written plan: which eye, how many times a day, what time.",
      "A phone alarm for each drop time. Eyes Opener does not send reminders yet.",
      "Clean hands and a tissue.",
    ],
    setup: [
      "Count the doses the plan asks for in one day. One drop at night is 1. A drop in the morning and one at night is 2.",
      "Set a daily phone alarm for each drop time. Tie it to something you already do, such as brushing your teeth.",
      "Keep the bottle where you will see it at drop time, stored as the label says.",
    ],
    steps: [
      "When the alarm goes, wash your hands.",
      "Tilt your head back and look up. Pull the lower lid down with one finger to make a small pocket.",
      "Squeeze the drop into the pocket. Do not let the tip touch the eye, the lid or the lashes.",
      "Close the eye gently and press on its inner corner, by the nose, for one to two minutes.",
      "If you use a second kind of drop, wait 3 to 5 minutes before putting it in.",
      "After the last dose of the day, type the doses taken and the doses planned on this page, and save. It takes about 10 seconds.",
      "Once a week add up the seven days: doses taken out of doses planned. Take the tally to your next visit.",
    ],
    right: [
      "The drop lands in the eye, not on the cheek.",
      "Each dose is taken at about the same time every day.",
      "The tally is honest. A missed dose is written as missed.",
    ],
    measures: [
      typed(
        "doses_taken", "Doses taken today",
        "Count each time today that the drops went in as the plan says. A dose that was missed is not counted.",
        "higher",
      ),
      typed(
        "doses_planned", "Doses planned today",
        "The number of doses the eye doctor's plan asks for in one day. Read it from the written plan or the label.",
        "none",
      ),
    ],
    stop: [
      ...STOP,
      "A red, sore, itchy or swollen eye or eyelid after the drops. Tell your eye doctor the same day.",
      "A sudden loss of sight, or a very painful red eye. Get urgent eye care at once.",
    ],
    mistakes: [
      "Stopping the drops because the eyes feel fine. Many eye conditions cannot be felt. Only the eye doctor stops a drop.",
      "Taking two doses close together to make up for a missed one. Ask your eye doctor or pharmacist what to do about a missed dose.",
      "Letting the bottle run out. Get the next one while a week of drops is still left.",
      "Touching the eye with the tip of the bottle. That can carry germs into the bottle.",
    ],
    tool: { kind: "log" },
    evidence: "In a trial of 70 people with glaucoma who often missed their drops, daily phone or text reminders raised the typical share of doses taken from 53% to 64%. A group with no reminders did not change. No trial tested this routine itself.",
    sources: [REMINDERS, HOW_TO_DROPS],
  },
], GUIDE_WORDS);
