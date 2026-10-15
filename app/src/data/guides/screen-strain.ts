/**
 * Guides for the screen strain group: four habits for anyone who works at a screen.
 * None of them needs glasses or a counsellor. The camera features the catalogue mentions are not built,
 * so every routine here is done by hand: a timer, a tape measure, a list to tick.
 */
import type { Guide, Source } from "./types";
import { textsEach } from "@/i18n/texts";
import { GUIDE_WORDS } from "./words";

/* ── sources ── */

const BREAKS_STUDY: Source = {
  label: "Talens-Estarelles and others, 2023, Contact Lens and Anterior Eye: the effects of breaks on digital eye strain, dry eye and binocular vision, testing the 20-20-20 rule",
  url: "https://pubmed.ncbi.nlm.nih.gov/35963776/",
};
const AOA_SCREENS: Source = {
  label: "American Optometric Association: computer vision syndrome (screen position, lighting and rest breaks)",
  url: "https://www.aoa.org/healthy-eyes/eye-and-vision-conditions/computer-vision-syndrome",
};
const BLINK_STUDY: Source = {
  label: "Kim and others, 2021, Contact Lens and Anterior Eye: therapeutic benefits of blinking exercises in dry eye disease",
  url: "https://pubmed.ncbi.nlm.nih.gov/32409236/",
};
const OSHA_MONITORS: Source = {
  label: "Occupational Safety and Health Administration (United States): computer workstations, monitors",
  url: "https://www.osha.gov/etools/computer-workstations/components/monitors",
};
const OSHA_ROOM: Source = {
  label: "Occupational Safety and Health Administration (United States): computer workstations, lighting and glare in the room",
  url: "https://www.osha.gov/etools/computer-workstations/workstation-environment",
};
const HSE_POSTURE: Source = {
  label: "Health and Safety Executive (Great Britain): good posture when using display screen equipment",
  url: "https://www.hse.gov.uk/msd/dse/good-posture.htm",
};
const HSE_CHECKLIST: Source = {
  label: "Health and Safety Executive (Great Britain): display screen equipment workstation checklist",
  url: "https://www.hse.gov.uk/pubns/ck1.pdf",
};

/* ── shared lines ── */

const STOP = ["Double vision that stays after a short rest", "A headache", "Eye pain", "Feeling dizzy or sick"];
const OWN_GLASSES = "Wear the glasses you normally use for the screen.";

/** The eight checks of the desk set-up list. Each one can be checked in about ten seconds. */
const DESK_CHECKS = [
  "The top edge of the screen is at the height of my eyes, or just below.",
  "The screen is about an arm's length away: 50 cm or more.",
  "The screen is tilted so that I look squarely at it.",
  "No window or lamp is reflected in the screen.",
  "No bright window or lamp sits straight behind the screen.",
  "The screen is about as bright as the room.",
  "I can read the text with my back against the chair, without leaning in.",
  "The screen is clean: no dust and no fingerprints.",
];

export const guides: Guide[] = textsEach("data/guides/screen-strain", () => [
  {
    slug: "look-away-break",
    what: "A short rest for the eyes during screen work. Every 20 minutes you look at something 6 metres away or more for 20 seconds. The muscles that focus and aim your eyes up close can then let go.",
    need: [
      "A timer that can ring every 20 minutes: a phone alarm, a kitchen timer or a clock you can see.",
      "Something to look at 6 metres away or more: out of a window, down a corridor, across a large room.",
      "A grown-up at a computer can let the workday monitor time the breaks with the camera: open Today, then Workday monitor. Everyone else sets the timer and logs each break by hand, as below.",
    ],
    setup: [
      "Before you start work, pick your far thing: a tree, a rooftop, the end of a corridor. Six metres is about eight normal steps.",
      "Set the timer to ring every 20 minutes.",
      OWN_GLASSES,
    ],
    steps: [
      "Start your screen work and start the timer.",
      "When the timer rings, take your eyes off the screen at once. The sentence can wait.",
      "Open the log on this page and press Begin. It counts the 20 seconds for you.",
      "Look at your far thing. Let your eyes rest on it; do not stare hard.",
      "Keep looking far away until the 20 seconds are over. Blink fully a few times while you look.",
      "Tick three far-off things you found and press \"Finish the break\". The break is added to today's Rest ring.",
      "Go back to work and let the timer run again.",
      "Keep this up for as long as you are at the screen. Up to 12 breaks a day count towards the ring.",
    ],
    right: [
      "Your eyes really leave the screen: you look past it, not at a phone or another screen.",
      "The far thing is 6 metres away or more, and you look at it for the full 20 seconds.",
      "The breaks come about every 20 minutes. They are not saved up for the end of the day.",
    ],
    measures: [],
    stop: [
      ...STOP,
      "Sight that stays blurred after the break, or eyes that are sore on most days. Book an eye test.",
    ],
    mistakes: [
      "Looking at a phone during the break. A phone is close work too.",
      "Looking at a wall 2 metres away. The far thing must be at least 6 metres off.",
      "Cutting the look short after 5 seconds. Count slowly to twenty, or let the log count.",
      "Switching the timer off when work gets busy. That is when the breaks are missed most.",
    ],
    tool: { kind: "companion", game: "far-window" },
    evidence: "In one study, 29 people with screen strain got break reminders for two weeks. Strain and dry-eye symptoms eased, measured against their own start. The gain had gone a week after the reminders stopped, and eye-teaming tests barely changed.",
    sources: [BREAKS_STUDY, AOA_SCREENS],
  },
  {
    slug: "full-blink-drill",
    what: "Ten slow, full blinks. At a screen many blinks are only half blinks, where the lids do not meet. A full blink closes the eye all the way and spreads the tears over it again.",
    need: [
      "No gear. A chair and one minute.",
      "Counting blinks with the camera is not built yet. The log shows each part of the blink in words, with a slow bar to follow.",
    ],
    setup: [
      "Sit back from the screen and let your shoulders drop.",
      "Look straight ahead or a little down. Keep your face soft: no frown.",
      "Open the log on this page. On a phone that can buzz, you will feel a short buzz when it is time to open your eyes.",
    ],
    steps: [
      "Press Begin.",
      "Close both eyes gently, as if falling asleep. The lids touch all the way along.",
      "Keep them closed for a slow count of two.",
      "With your eyes still closed, squeeze the lids lightly for a slow count of two.",
      "Open your eyes and let them relax.",
      "Do this ten times. The log shows \"Blink 1 of 10\" up to ten, and the whole set takes one minute.",
      "Do one set in every hour of screen work. Each set grows one leaf in the garden.",
    ],
    right: [
      "The upper and lower lids meet fully on every blink.",
      "Only the eyelids work. Your forehead, cheeks and jaw stay loose.",
      "Afterwards your eyes feel moist, not tight.",
    ],
    measures: [],
    stop: [
      ...STOP,
      "Eyes that sting, burn or stay red. Dry eyes that go on for weeks need an eye care professional.",
    ],
    mistakes: [
      "Squeezing hard. A light squeeze is enough; a hard one only tires the lids.",
      "Quick fluttering blinks. Each blink here is slow and has four parts: close, keep closed, squeeze, open.",
      "Half blinks, where the lids do not meet.",
      "Rubbing your eyes afterwards.",
    ],
    tool: { kind: "companion", game: "blink-garden" },
    evidence: "In one study, 41 people with dry eye did a ten-second blink routine every 20 minutes for four weeks. Symptom scores fell and half blinks became fewer, measured against their own start. They practised far more often than once an hour.",
    sources: [BLINK_STUDY],
  },
  {
    slug: "distance-reset",
    what: "A 30-second check of how far your eyes are from the screen. People drift closer as they work. This routine measures the distance and puts the screen back at about an arm's length.",
    need: [
      "The laptop or desk screen you work at. The figures here are for a screen on a desk, not a phone held in the hand.",
      "A tape measure or ruler. With neither, a sheet of A4 paper: its long side is almost exactly 30 cm.",
      "A grown-up at a computer can let the workday monitor read this distance with the camera, once it has been set with a tape. Open Today, then Workday monitor. This routine is the check by hand.",
    ],
    setup: [
      "Sit the way you really sit when you work. Do not sit up straight just for the check.",
      OWN_GLASSES,
      "Keep the tape measure within reach, so you can measure without changing how you sit.",
    ],
    steps: [
      "Work for a few minutes. Then freeze where you are.",
      "Measure from the outer corner of one eye straight to the middle of the screen. A helper makes this easier.",
      "Type that distance in centimetres. This is the distance you had drifted to.",
      "Now sit back against the chair and reach out a straight arm. Your fingertips should just touch the screen.",
      "If the screen is nearer than that, move the screen or your chair back until it is 50 cm away or more.",
      "If you now have to lean in to read, make the text bigger. Do not come closer.",
      "Save. Do the check again whenever you catch yourself leaning in.",
    ],
    right: [
      "The number you type is the distance you found, before you moved anything.",
      "After the reset, a straight arm just reaches the screen with your back against the chair.",
      "You can read the text without leaning forward or screwing up your eyes.",
    ],
    measures: [
      {
        key: "distance_cm", label: "Distance from eye to screen", unit: "cm",
        how: "Before you move anything, measure with a tape from the outer corner of one eye straight to the middle of the screen. With no tape, count lengths of A4 paper: each long side is almost exactly 30 cm.",
        from: "typed", min: 20, max: 150, step: 1, better: "none",
        usual: { text: "50 to 100 cm is the preferred distance from eye to screen in the United States workplace guidance. The British guidance says about an arm's length.", source: 0 },
      },
    ],
    stop: [
      ...STOP,
      "Text that is blurred at arm's length even when you make it bigger. Book an eye test: you may need glasses for this distance.",
    ],
    mistakes: [
      "Sitting up straight for the measurement and slumping forward afterwards.",
      "Moving closer because the text is small. Make the text bigger.",
      "Measuring to the keyboard or the edge of the desk. Measure to the screen.",
    ],
    tool: { kind: "log" },
    evidence: "No trial tested this check on its own. The distance comes from workplace guidance for display screens, not from a trial of eye strain.",
    sources: [OSHA_MONITORS, HSE_POSTURE],
  },
  {
    slug: "desk-set-up-check",
    what: "A three-minute check of the desk you work at: screen height, distance, glare and brightness. You go through eight checks, change what is wrong and tick what is right.",
    need: [
      "The desk and screen you use most.",
      "A soft dry cloth for the screen.",
      "The guided check by laptop camera is not built yet. You go through the list yourself.",
    ],
    setup: [
      "Do the check at the time of day you usually work, with the lights and blinds as they usually are.",
      "Wipe the dust and fingerprints off the screen.",
      "Sit as you normally sit, with your back against the chair.",
      "Press \"Start the check\". The list of eight checks appears.",
    ],
    steps: [
      "Look straight ahead. Your eyes should meet the top edge of the screen or the space just above it. If not, raise the screen on books or lower it.",
      "Reach out a straight arm. Your fingertips should just touch the screen. If your palm can lie flat on it, move the screen back.",
      "Tilt the screen until you look squarely at it, as you would hold a book.",
      "Open a dark page, or switch the screen off for a moment. If you see a window or a lamp in the glass, turn the screen, close the blind or move the lamp.",
      "Look behind the screen. If a bright window or lamp is there, turn the desk so the window is to your side.",
      "Open a white page. If it glows like a lamp, turn the brightness down. If it looks grey and dull, turn it up.",
      "Read a line of normal text with your back against the chair. If you lean in, make the text bigger.",
      "Tick each line that is true now, after your changes. Then press \"Save this routine\".",
    ],
    right: [
      "You look at each thing before you tick it. Nothing is ticked from memory.",
      "Each tick is for something true right now, not for something you plan to change later.",
      "After the changes you can read with your back against the chair.",
    ],
    measures: [
      {
        key: "checks_passed", label: "Checks passed", unit: "of 8",
        how: "The screen counts the boxes you ticked. Tick a box only when that check is true at your desk right now.",
        from: "auto", min: 0, max: 8, step: 1, better: "higher",
      },
    ],
    stop: [
      ...STOP,
      "Neck or shoulder pain when you look at the screen. Move the screen up or down until your neck is straight.",
    ],
    mistakes: [
      "Ticking a line without looking.",
      "Checking at night when you work by day. Reflections move with the light.",
      "Raising a laptop on books and then typing with your arms lifted. Use a separate keyboard when the screen goes up.",
    ],
    tool: { kind: "checklist", items: DESK_CHECKS, measure: "checks_passed" },
    evidence: "No trial tested this list as a treatment for eye strain. Each check is taken from the display screen guidance of two workplace safety bodies.",
    sources: [HSE_CHECKLIST, OSHA_MONITORS, OSHA_ROOM],
  },
], GUIDE_WORDS);
