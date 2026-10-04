/**
 * Guides for the care companions: logs the family keeps about care away from the screen. They have no game scene,
 * no glasses and no score: a page with buttons and boxes, and a ring on Today that fills. Their pictures show the
 * page's buttons, simplified.
 *
 * Sources: the school trials were opened and read for `src/data/guides/child-myopia.ts`, the break and blink studies
 * for `src/data/guides/screen-strain.ts`. The blink app trial and the laboratory study of breaks are the ones on the
 * evidence page (`src/copy/site.ts`); both were read again for this file.
 */
import type { Source } from "@/data/guides/types";
import { tap, words } from "./cue";
import type { GameGuide, Shape } from "./types";

const GUANGZHOU: Source = {
  label: "He and others, 2015, JAMA: cluster randomised trial of one added 40-minute outdoor class a day in 12 primary schools in Guangzhou",
  url: "https://pubmed.ncbi.nlm.nih.gov/26372583/",
};
const TAIWAN_TRIAL: Source = {
  label: "Wu and others, 2018, Ophthalmology: myopia prevention and outdoor light intensity in a school-based cluster randomised trial in Taiwan",
  url: "https://pubmed.ncbi.nlm.nih.gov/29371008/",
};
const BLINK_STUDY: Source = {
  label: "Kim and others, 2021, Contact Lens and Anterior Eye: therapeutic benefits of blinking exercises in dry eye disease",
  url: "https://pubmed.ncbi.nlm.nih.gov/32409236/",
};
/** 40 students with dry eye, half given an app that prompted blinks for four hours a day or more, 30 days: symptoms and tear stability improved against no change in the others; part of the gain was lost by day 60. */
const BLINK_APP: Source = {
  label: "Xu and others, 2025, npj Digital Medicine: a smartphone blink-training app for dry eye, a randomised trial in 40 university students",
  url: "https://www.nature.com/articles/s41746-025-02053-8",
};
const BREAKS_STUDY: Source = {
  label: "Talens-Estarelles and others, 2023, Contact Lens and Anterior Eye: the effects of breaks on digital eye strain, dry eye and binocular vision, testing the 20-20-20 rule",
  url: "https://pubmed.ncbi.nlm.nih.gov/35963776/",
};
/** 30 adults, a 40-minute reading task on a tablet, 20-second far looks every 5, 10 or 20 minutes or none: the breaks made no significant difference to symptoms. */
const BREAKS_LAB: Source = {
  label: "Johnson and Rosenfield, 2023, Optometry and Vision Science: 20-second breaks during a 40-minute screen task in 30 adults (report by Healio)",
  url: "https://www.healio.com/news/optometry/20230120/study-provides-little-or-no-support-that-20second-breaks-alleviate-digital-eye-strain",
};
const AOA_SCREENS: Source = {
  label: "American Optometric Association: computer vision syndrome (screen position, lighting and rest breaks)",
  url: "https://www.aoa.org/healthy-eyes/eye-and-vision-conditions/computer-vision-syndrome",
};

const NOT_A_REMOTE = "This page is made for a phone or a computer, not for a TV remote.";
const REST_RING = "One finished break is one step on today's Rest ring. Up to 12 breaks a day count, blink sets and far looks together.";

/* ── pictures of a page: a button, a box to tick, a line of words ── */

const button = (x: number, y: number, w: number, s: string): Shape[] => [
  { t: "box", x, y, w, h: 16, ink: "both" },
  { t: "text", x: x + 8, y: y + 10.8, s, ink: "both", size: 7.5 },
];
const tickBox = (x: number, y: number, s: string, ticked: boolean): Shape[] => [
  { t: "box", x, y, w: 8, h: 8, ink: "both" },
  ...(ticked ? [{ t: "line", x1: x + 1.8, y1: y + 4.2, x2: x + 3.4, y2: y + 6.2, ink: "both", w: 1.3 } as Shape, { t: "line", x1: x + 3.4, y1: y + 6.2, x2: x + 6.4, y2: y + 1.8, ink: "both", w: 1.3 } as Shape] : []),
  { t: "text", x: x + 16, y: y + 6.8, s, ink: "both", size: 7 },
];
const note = (s: string, y = 82): Shape => words(s, y, 6.5, "dim");

export const guides: GameGuide[] = [
  {
    slug: "sky-spotter",
    what: "An outdoor scavenger hunt and a log. Every day brings a list of ten far-off things to find outside in daylight. Afterwards you tick what you found and type how many minutes you were outside.",
    helps:
      "It is a reason to go outside and look far. More time outdoors in daylight lowered the chance of a child becoming short-sighted (far things look blurred) in school trials: " +
      "in one, an added 40 minutes outdoors a day lowered new short sight over three years from 39.5% of children to 30.4%. The trials counted the time outdoors, whatever the children did there. The hunt itself is untested, and the evidence is about short sight starting, not about glasses a child already wears.",
    need: [
      "Daylight and somewhere outdoors: a yard, a street, a park or an open roof terrace.",
      "A phone or a watch to time the visit. Nothing is measured for you: you type the minutes yourself.",
      "Sun care for your weather: a hat with a brim, water, and shade in the hottest hours.",
    ],
    see: [
      "A picture of a wide sky with ten lights. One light comes on for each thing found today.",
      "Today's list of ten far-off things, each with a box to tick. The list changes every day, and things already found today are marked \"found\".",
      "A box named \"Minutes outside\" and the button \"Save the hunt\".",
      "Under the picture, the minutes outside that are logged for today.",
    ],
    play: [
      "Open Sky Spotter and read today's list of ten far-off things.",
      "Go outside in daylight and note the time.",
      "Look far: rooftops, treetops, the end of the road, the sky. Find what you can from the list. Never look straight at the sun.",
      "When you come back in, tick each thing you found.",
      "Type the minutes you were outside. One visit holds 5 to 180 minutes.",
      "Press \"Save the hunt\". The page answers \"Saved\" and the minutes go to today's Light ring.",
      "Go out again later if you like. Each visit is saved on its own, and a day holds up to 10 hours.",
    ],
    controls: {
      touch: "Tick the boxes of the things you found, tap the \"Minutes outside\" box and type the number, then press \"Save the hunt\". There is no game scene to tap.",
      keys: `Tab moves from box to box, Space ticks a box, the number keys type the minutes and Enter saves. ${NOT_A_REMOTE}`,
    },
    cues: [
      {
        title: "Today's list, after you come back in",
        then: "Tick each far-off thing you really found outside.",
        tone: "go",
        shapes: [...tickBox(14, 14, "A kite in the sky", true), ...tickBox(14, 30, "A flag on a pole", false), ...tickBox(14, 46, "The farthest rooftop", true), tap(18, 34), note("tick what you found", 74)],
      },
      {
        title: "The box \"Minutes outside\" and the button",
        then: "Type the minutes you were outside, from 5 to 180, then press \"Save the hunt\".",
        tone: "go",
        shapes: [
          { t: "text", x: 14, y: 20, s: "Minutes outside", ink: "both", size: 7 },
          { t: "box", x: 14, y: 25, w: 40, h: 15, ink: "both" }, { t: "text", x: 20, y: 35.5, s: "40", ink: "both", size: 8 },
          ...button(14, 50, 96, "Save the hunt"), tap(96, 58), note("the minutes are what count", 80),
        ],
      },
    ],
    success: [
      "Success is the time outdoors, not the number of things found. The school trial behind this added 40 minutes a day.",
      "\"Saved. 40 minutes added to the Light ring.\" means the visit is logged. The Light ring on Today shows the day's total.",
      "A good week: outdoors on most days, with the minutes timed and logged on the day itself.",
    ],
    measures: [],
    stop: [
      "A child who feels too hot, or skin that is turning red. Go into the shade and drink water.",
      "Never look straight at the sun.",
      "Eye pain, a headache, or feeling dizzy or sick. Go indoors and rest.",
    ],
    mistakes: [
      "Counting time in a car, a bus or a room with big windows. Only time outdoors counts.",
      "Guessing the minutes at the end of the week. Time them and log them on the day.",
      "Ticking things seen from indoors or on a screen.",
      "Going back in once the ten are found. The minutes are what matter.",
    ],
    evidence: "No trial tested this hunt. In a trial in 12 primary schools in Guangzhou, one added 40-minute outdoor class a day lowered new short sight over three years from 39.5% of children to 30.4%. Outdoor time lowers the chance of short sight. It does not rule it out.",
    sources: [GUANGZHOU, TAIWAN_TRIAL],
  },
  {
    slug: "blink-garden",
    what: "A one-minute routine of ten slow, full blinks, led by words and a bar on the page. Every finished set grows one leaf on the plant in the garden.",
    helps:
      "At a screen many blinks are half blinks, where the lids do not meet. A full blink spreads the tears over the eye again. In one study, 41 people with dry eye who did a short blink routine every 20 minutes for four weeks had lower symptom scores and fewer half blinks than at their own start. " +
      "In a trial of 40 students, an app that prompted blinks for hours a day eased symptoms in 30 days; part of the gain was lost a month later. The camera that would count blinks is not built: the page leads and you do the blinking.",
    need: [
      "No gear. A chair and one minute.",
      "A phone that can buzz helps: it gives a short buzz when it is time to open your eyes. On a computer you count instead.",
    ],
    see: [
      "Before you start: the button \"Begin\".",
      "While it runs: \"Blink 1 of 10\" up to ten, one instruction in large words (\"Close your eyes gently\", \"Keep them closed\", \"Squeeze softly\", \"Open and relax\") and a bar that fills once for each blink.",
      "Your eyes are closed for most of every blink, so you cannot read along. Learn the four parts first, then count.",
      "At the end: \"Done. One break added to your Rest ring.\" and one more leaf on the plant. The plant shows this week's leaves.",
    ],
    play: [
      "Sit back from the screen and let your shoulders drop.",
      "Press \"Begin\".",
      "Close both eyes gently, so that the lids touch all the way along.",
      "Keep them closed for a slow count of two.",
      "Still closed, squeeze the lids softly for a slow count of two.",
      "Open and relax. A phone gives a short buzz when it is time to open. Then close again for the next blink.",
      "After ten blinks, which is one minute, the set saves itself. Press nothing.",
    ],
    controls: {
      touch: "Press \"Begin\" once. Nothing else needs pressing: the set ends and saves by itself. \"Stop\" gives the set up, and nothing is saved.",
      keys: `Tab to "Begin" and press Enter or Space. "Stop" works the same way. ${NOT_A_REMOTE}`,
    },
    cues: [
      {
        title: "The button \"Begin\"",
        then: "Press it once, then take your hands off. The page runs ten blinks by itself.",
        tone: "go",
        shapes: [{ t: "text", x: 14, y: 26, s: "Ten full blinks", ink: "both", size: 8 }, ...button(14, 40, 60, "Begin"), tap(60, 48), note("one press, one minute", 78)],
      },
      {
        title: "A blink number, an instruction and a bar",
        then: "Do what the words say: close, keep closed, squeeze softly, open. Each part lasts a second and a half. Count with your eyes closed.",
        tone: "wait",
        shapes: [
          { t: "text", x: 80, y: 20, s: "Blink 3 of 10", ink: "dim", size: 7, anchor: "middle" },
          words("Keep them closed", 40, 10),
          { t: "box", x: 20, y: 50, w: 120, h: 7, ink: "both" }, { t: "box", x: 20, y: 50, w: 54, h: 7, ink: "both", fill: true },
          note("eyes shut: count, do not read", 74),
        ],
      },
      {
        title: "\"Done\" and a new leaf",
        then: "The set is saved. One leaf grows, and today's Rest ring moves on one step.",
        tone: "wait",
        shapes: [
          words("Done. One break added", 22, 7.5), words("to your Rest ring.", 32, 7.5),
          { t: "poly", pts: [[68, 70], [92, 70], [88, 84], [72, 84]], ink: "both" },
          { t: "line", x1: 80, y1: 70, x2: 80, y2: 42, ink: "both", w: 1.6 },
          { t: "poly", pts: [[80, 60], [66, 54], [70, 62]], ink: "both" },
          { t: "poly", pts: [[80, 52], [95, 45], [91, 54]], ink: "both" },
        ],
      },
    ],
    success: [
      "Success is ten blinks in which the lids really met. The leaf only records that a set was finished.",
      REST_RING,
      "The page runs a one-minute clock and cannot see your eyes. Letting it run without blinking grows a leaf and does nothing for your eyes.",
    ],
    measures: [],
    stop: [
      "Eyes that sting, burn or stay red. Dry eyes that go on for weeks need an eye care professional.",
      "Eye pain",
      "A headache",
    ],
    mistakes: [
      "Squeezing hard. A light squeeze is enough; a hard one only tires the lids.",
      "Quick fluttering blinks. Each blink here is slow and has four parts.",
      "Peeping at the words with half-open eyes. Close them fully and count.",
      "Pressing \"Stop\" near the end. The set saves itself when the tenth blink is over.",
    ],
    evidence: "No trial tested this page. In one study, 41 people with dry eye did a ten-second blink routine every 20 minutes for four weeks: symptom scores fell and half blinks became fewer, measured against their own start. They practised far more often than once an hour.",
    sources: [BLINK_STUDY, BLINK_APP],
  },
  {
    slug: "far-window",
    what: "A timed 20-second look at something far away, to rest the eyes during screen work. Afterwards you tick three far-off things you found, and the break is logged.",
    helps:
      "Up close, the muscles that focus and aim the eyes work without pause; looking 6 metres away or more lets them let go. In one study, 29 people with screen strain who got break reminders for two weeks had fewer symptoms than at their own start, and the gain had gone a week after the reminders stopped. " +
      "In a laboratory study of 30 adults, 20-second breaks made no difference over a 40-minute task. So the benefit is modest and lasts only while the habit does. The camera check is not built: you report the break yourself.",
    need: [
      "Something to look at 6 metres away or more: out of a window, down a corridor, across the road. Six metres is about eight normal steps.",
      "A timer of your own that rings every 20 minutes of screen work. The page does not remind you.",
      "A phone that can buzz helps: it buzzes when the 20 seconds are over.",
    ],
    see: [
      "Before you start: the button \"Begin\".",
      "While it runs: the words \"Keep looking far away. Count slowly to twenty.\", a large number counting down from 20, and a row of twenty small bars filling up. You are not meant to watch them.",
      "Then a list of nine far-off things with boxes to tick, the count \"0 of 3 ticked\", and the button \"Finish the break\", which can be pressed once exactly three are ticked.",
      "At the end: \"Done. One break added to your Rest ring.\"",
    ],
    play: [
      "When your 20-minute timer rings, take your eyes off your work.",
      "Press \"Begin\".",
      "Look up at once at something 6 metres away or more. Let your eyes rest on it; do not stare hard.",
      "Count slowly to twenty, blinking fully a few times. On a phone, wait for the buzz.",
      "Look back at the page and tick three far-off things you found.",
      "Press \"Finish the break\".",
      "Go back to work and let your timer run again.",
    ],
    controls: {
      touch: "Press \"Begin\", look away for 20 seconds, tick three boxes, then press \"Finish the break\". \"Stop\" gives the break up, and nothing is saved.",
      keys: `Tab moves between the buttons and the boxes, Space ticks a box and Enter presses a button. ${NOT_A_REMOTE}`,
    },
    cues: [
      {
        title: "The button \"Begin\"",
        then: "Press it, then look up and far away at once.",
        tone: "go",
        shapes: [{ t: "text", x: 14, y: 26, s: "A 20-second look far away", ink: "both", size: 7.5 }, ...button(14, 40, 60, "Begin"), tap(60, 48), note("then eyes off the screen", 78)],
      },
      {
        title: "A large number counting down from 20",
        then: "Do not watch it. Keep your eyes on something far away until the phone buzzes or you have counted to twenty.",
        tone: "wait",
        shapes: [
          words("Keep looking far away.", 22, 7.5), words("14", 50, 22),
          ...Array.from({ length: 20 }, (_, n): Shape => ({ t: "box", x: 21 + n * 6, y: 58, w: 4, h: 6, ink: "both", fill: n < 6 })),
          note("look far, not at the count", 78),
        ],
      },
      {
        title: "A list of far-off things: tick three",
        then: "Tick three things you found, then press \"Finish the break\".",
        tone: "go",
        shapes: [
          ...tickBox(14, 12, "A tree", true), ...tickBox(14, 26, "A rooftop", true), ...tickBox(14, 40, "A cloud", false), tap(18, 44),
          { t: "text", x: 150, y: 46.8, s: "2 of 3 ticked", ink: "dim", size: 6.5, anchor: "end" },
          ...button(14, 60, 110, "Finish the break"),
        ],
      },
    ],
    success: [
      "Success is 20 full seconds with your eyes on something far away. The three ticks only show that you looked.",
      REST_RING,
      "A good day at a screen: a break about every 20 minutes, not several saved up for the evening.",
    ],
    measures: [],
    stop: [
      "Sight that stays blurred after the break, or eyes that are sore on most days. Book an eye test.",
      "Eye pain",
      "A headache",
    ],
    mistakes: [
      "Watching the countdown. Your eyes must leave the screen.",
      "Looking at a phone, or at a wall 2 metres away. The far thing must be 6 metres off or more.",
      "Ticking three things without having looked. The log then records a break that did not happen.",
      "Switching your timer off when work gets busy. That is when breaks are missed most.",
    ],
    evidence: "No trial tested this page. In one study, 29 people with screen strain got break reminders for two weeks: strain and dry-eye symptoms eased against their own start, and the gain had gone a week after the reminders stopped. A laboratory study found no effect of 20-second breaks.",
    sources: [BREAKS_STUDY, BREAKS_LAB, AOA_SCREENS],
  },
];
