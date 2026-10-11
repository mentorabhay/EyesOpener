// Eyes Opener: Guides for the child myopia group (myopia is short sight: far things look blurred).
/**
 * Guides for the child myopia group (myopia is short sight: far things look blurred).
 * Four of the five are ways of reaching the daily outdoor time, logged in the outdoor log, which fills the Light ring.
 * The fifth is a reading-distance check done by hand. Nothing here is measured by a camera, a watch or a light sensor.
 */
import type { Guide, Source, Tool } from "./types";
import { textsEach } from "@/i18n/texts";
import { GUIDE_WORDS } from "./words";

/* ── sources ── */

const GUANGZHOU: Source = {
  label: "He and others, 2015, JAMA: cluster randomised trial of one added 40-minute outdoor class a day in 12 primary schools in Guangzhou",
  url: "https://pubmed.ncbi.nlm.nih.gov/26372583/",
};
const TAIWAN_TRIAL: Source = {
  label: "Wu and others, 2018, Ophthalmology: myopia prevention and outdoor light intensity in a school-based cluster randomised trial in Taiwan",
  url: "https://pubmed.ncbi.nlm.nih.gov/29371008/",
};
const TAIWAN_RECESS: Source = {
  label: "Wu and others, 2013, Ophthalmology: outdoor activity during class recess reduces myopia onset and progression in school children",
  url: "https://pubmed.ncbi.nlm.nih.gov/23462271/",
};
const SYDNEY: Source = {
  label: "Ip and others, 2008, Investigative Ophthalmology and Visual Science: role of near work in myopia, findings in a sample of Australian school children",
  url: "https://pubmed.ncbi.nlm.nih.gov/18579757/",
};
const NEAR_WORK_REVIEW: Source = {
  label: "Huang, Chang and Wu, 2015, PLoS One: the association between near work activities and myopia in children, a systematic review and meta-analysis",
  url: "https://pubmed.ncbi.nlm.nih.gov/26485393/",
};

/* ── shared lines ── */

const STOP = ["Double vision that stays after a short rest", "A headache", "Eye pain", "Feeling dizzy or sick"];
const HEAT = "A child who feels too hot, or skin that is turning red. Go into the shade and drink water.";
const SUN = "Never look straight at the sun.";
const OUTDOOR_STOP = [...STOP, HEAT, SUN];
const SUN_CARE = "Sun care for your weather: a hat with a brim, water, and shade in the hottest hours.";
const BY_HAND = "A phone or a watch to time the minutes. You type them into the log yourself: nothing is measured by a watch or a light sensor.";
const LOG: Tool = { kind: "companion", game: "sky-spotter" };
const SAVE = "Open the log on this page, type the minutes outside and press \"Save the hunt\". One entry holds 5 to 180 minutes.";
const RING = "The minutes fill today's Light ring. The daily goal is 40 minutes or more.";
const NOT_INDOORS = "Counting time in a car, a bus or a room with big windows. Only time outdoors counts.";
const GUESSED = "Guessing the minutes at the end of the week. Time them and log them on the day.";
const GUANGZHOU_RESULT = "one added 40-minute outdoor class a day lowered new short sight over three years from 39.5% of children to 30.4%";

export const guides: Guide[] = textsEach("data/guides/child-myopia", () => [
  {
    slug: "outdoor-light-time",
    what: "Time outdoors in daylight every day: 40 minutes or more. In school trials, children who were given more time outdoors became short-sighted (far things look blurred) less often.",
    need: [
      "Daylight and somewhere outdoors: a yard, a street, a park, a playground or an open roof terrace.",
      SUN_CARE,
      BY_HAND,
    ],
    setup: [
      "Pick the times that fit the day: before school, break time, the way home, play after school.",
      "Dress the child for the weather and the sun.",
      "Note the time when the child goes out.",
    ],
    steps: [
      "Go outside. Indoors beside a window is not outdoors.",
      "Stay out for 40 minutes or more over the day. Two or three shorter visits add up.",
      "Do anything out there: play, sport, a walk, a meal. The trials counted the time outdoors, whatever the children did.",
      "Note the time when the child comes back in. The difference is the minutes for that visit.",
      SAVE,
      "Log every visit on the day it happens. " + RING,
      "Reach the goal every day: school days, weekends and holidays.",
    ],
    right: [
      "The child is under the open sky, or in open shade outdoors, for the minutes that are logged.",
      "The minutes are timed, not guessed.",
      "It happens on most days of the week, not in one long block.",
    ],
    measures: [],
    stop: OUTDOOR_STOP,
    mistakes: [
      NOT_INDOORS,
      GUESSED,
      "Skipping cloudy days. The trials counted time outdoors, not hours of sunshine.",
      "Treating outdoor time as a reward to be earned. It is part of every day.",
    ],
    tool: LOG,
    evidence: `In a trial in 12 primary schools in Guangzhou, ${GUANGZHOU_RESULT}. Outdoor time lowers the chance of short sight. It does not rule it out.`,
    sources: [GUANGZHOU, TAIWAN_TRIAL],
  },
  {
    slug: "arm-s-length-reading",
    what: "A check that a child reads and writes with the page far enough from the eyes: about the length of the forearm, 30 cm or more. A grown-up measures the distance and reminds the child.",
    need: [
      "A ruler or a tape measure.",
      "A table and chair that fit the child, and good light on the page.",
      "The camera that nudges a child who leans in is not built yet. For now a grown-up checks the distance by hand.",
    ],
    setup: [
      "Sit the child at the table with both feet on the floor or on a box, and the book on the table.",
      "Place the light so that it falls on the page and the child's head does not shade it.",
      "Teach the elbow rule: fist under the chin, elbow on the table. The book sits at the elbow.",
    ],
    steps: [
      "Let the child read or write for five minutes without watching closely.",
      "Then, without a warning, measure from the outer corner of one eye straight to the middle of the page.",
      "Type that distance in centimetres. It is today's number.",
      "Ask the child to do the elbow check: fist under the chin, elbow down on the table beside the page.",
      "If the page is nearer than the elbow, the child sits back until the page is at the elbow.",
      "Carry on reading. Each time the child leans in, say one quiet word, such as \"elbow\".",
      "After about 30 minutes of reading, stop for a few minutes and look at something far away.",
      "Save. Measure again on another day, at another time of day.",
    ],
    right: [
      "The page stays at the elbow or farther for most of the reading.",
      "The child sits upright, not curled over the page.",
      "After some days the child checks the elbow without being asked.",
    ],
    measures: [
      {
        key: "distance_cm", label: "Distance from eye to page", unit: "cm",
        how: "Do this while the child is reading, before you remind them. Measure with a ruler or tape from the outer corner of one eye straight to the middle of the page. Type the centimetres.",
        from: "typed", min: 5, max: 80, step: 1, better: "higher",
        usual: { text: "Aim for 30 cm or more. In a study of 2,339 twelve-year-olds in Sydney, those who read closer than 30 cm were more often short-sighted. That is a link, not proof of a cause.", source: 0 },
      },
    ],
    stop: [
      ...STOP,
      "A child who cannot read in comfort at this distance, or who always holds things very close. Book an eye test: glasses may be needed.",
    ],
    mistakes: [
      "Measuring when the child knows and is sitting up specially.",
      "Reading lying on a bed or the floor, where the book creeps closer.",
      "Dim light, which makes a child lean in.",
      "Nagging. One calm word works better than a telling-off.",
    ],
    tool: { kind: "log" },
    evidence: "Reading distance is less well tested than outdoor time. Surveys and follow-up studies link close, long reading with more short sight. It is not known whether sitting farther back lowers the chance.",
    sources: [SYDNEY, NEAR_WORK_REVIEW],
  },
  {
    slug: "class-outdoor-period",
    what: "One added 40-minute period outdoors on every school day, for the whole class. This is what the school trial in Guangzhou did.",
    need: [
      "A teacher or a school that agrees to hold one period outdoors on each school day.",
      "An outdoor space: a playground, a field, a yard or a roof terrace, with shade close by.",
      "A shared class log is not built yet. Each family logs its own child's period in the outdoor log on this page.",
    ],
    setup: [
      "Agree a fixed place in the timetable, so the period does not depend on anyone remembering it.",
      "Choose the outdoor space, and make a plan for rain and for the hottest weeks.",
      "Tell the parents which period it is, so they can log 40 minutes for each school day it was held.",
    ],
    steps: [
      "At the set time the whole class goes outside. Nobody stays in the classroom.",
      "Stay outdoors for the full 40 minutes.",
      "Fill the time with outdoor activities, as the trial did: games, sport, a nature walk, gardening.",
      "Go back in when the 40 minutes are over.",
      "After school, a parent opens the log on this page, types 40 minutes and presses \"Save the hunt\".",
      "Do this on every school day. For a day the period was missed, log nothing.",
      "At weekends and in holidays the family keeps the outdoor time going. The trial asked parents for this too.",
    ],
    right: [
      "Every child in the class is outside for the whole period.",
      "It happens on every school day, in the same place in the timetable.",
      "The minutes logged at home match the days the period really took place.",
    ],
    measures: [],
    stop: OUTDOOR_STOP,
    mistakes: [
      "Using the period as a reward that can be taken away. It is for every child, every day.",
      "Holding it in a hall or a gym. Indoors is not outdoors.",
      "Swapping it for the usual break times. The trial added the period to the school day.",
      "Logging 40 minutes for a day when the class stayed in.",
    ],
    tool: LOG,
    evidence: `This is the routine the Guangzhou trial tested, in 12 primary schools with children aged about 6: ${GUANGZHOU_RESULT}.`,
    sources: [GUANGZHOU, TAIWAN_RECESS],
  },
  {
    slug: "walk-to-school-log",
    what: "Walking or cycling part of the way to school and back. It puts 20 to 40 minutes of the daily outdoor time into the school run, so less is left to find later.",
    need: [
      "A route that is safe to walk or cycle, and an adult with any child too young to cross roads alone.",
      "A helmet for cycling.",
      BY_HAND,
    ],
    setup: [
      "Choose the part of the journey to walk or cycle: all of it, or from a drop-off point 10 to 20 minutes from school.",
      "Do the route once with the child and time it.",
      "Set the leaving time early enough to walk without rushing.",
    ],
    steps: [
      "Note the time when you set off on foot or by bicycle.",
      "Walk or cycle the chosen part. Time in a car, a bus or a train does not count.",
      "Note the time when you arrive. The difference is the minutes for that journey.",
      "Do the same on the way home.",
      "Add the two journeys together.",
      SAVE,
      "These minutes count towards the daily goal of 40 or more. " + RING,
    ],
    right: [
      "The child is outdoors in daylight on the journey, both ways, on most school days.",
      "The minutes logged are the minutes on foot or on the bicycle, timed.",
      "The child looks up and around on the way, not down at a phone.",
    ],
    measures: [],
    stop: [
      ...STOP,
      "Traffic, darkness or weather that makes the route unsafe. Safety on the road comes first.",
      HEAT,
      SUN,
    ],
    mistakes: [
      "Logging the whole journey when most of it was in a vehicle.",
      "Counting a walk in the dark. Only daylight minutes count.",
      "Reading a phone while walking. It is unsafe, and it is close work.",
      GUESSED,
    ],
    tool: LOG,
    evidence: `No trial tested the walk to school by itself. It is one way to reach the outdoor time that school trials tested: in Guangzhou, ${GUANGZHOU_RESULT}.`,
    sources: [GUANGZHOU, TAIWAN_TRIAL],
  },
  {
    slug: "weekend-outdoor-block",
    what: "A planned hour or more outdoors on Saturday and again on Sunday, as a family. A weekend day can slip by indoors, so the outdoor time is planned ahead.",
    need: [
      "A plan for each weekend day: where you will go and when.",
      SUN_CARE,
      "A phone to time the outing and to log it. You type the minutes yourself.",
    ],
    setup: [
      "On Friday, agree what you will do on each weekend day and at what time.",
      "Pick a time outside the hottest hours: the morning or the late afternoon.",
      "Pack water and hats.",
    ],
    steps: [
      "Go out together at the agreed time.",
      "Note the time when you step outside.",
      "Stay outdoors for one hour or more: a park, a walk, a market, a game, a picnic.",
      "Play the hunt if you like: the log lists ten far-off things to find, and the list changes every day.",
      "Note the time when you go back in.",
      "For each child who came, switch to that child's profile, open the log on this page, type the minutes and press \"Save the hunt\".",
      "One entry holds up to 180 minutes. Log a longer outing as two entries.",
      "Do the same on the other weekend day.",
    ],
    right: [
      "Both weekend days have an outdoor block, not only one of them.",
      "Each block is an hour or more in daylight.",
      "Each child who came has the minutes in their own log.",
    ],
    measures: [],
    stop: OUTDOOR_STOP,
    mistakes: [
      "Leaving it unplanned, so that the day ends before anyone has gone out.",
      "An hour in a shopping centre or in the car. Indoors does not count.",
      "One very long Saturday and nothing on Sunday.",
      GUESSED,
    ],
    tool: LOG,
    evidence: "No trial tested a weekend block by itself. In the Guangzhou school trial, parents were also asked to take their children outdoors at weekends and in holidays, and the benefit was measured for the whole plan.",
    sources: [GUANGZHOU, TAIWAN_TRIAL],
  },
], GUIDE_WORDS);
