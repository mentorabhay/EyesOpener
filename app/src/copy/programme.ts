/**
 * Words for the weekly plan: the week screen, today's practice on the Today page, the end of a programme,
 * On screen a day's guided set is "today's practice". The word "chapter" is kept for one stretch of play or film
 * between two eye breaks (the cinema and the catalogue use it that way); in code the day's set is still `chapters`.
 * and the counsellor's view of a member's week.
 * The keys under `chapters` and `parts` are the keys of src/data/programme-plans.ts; a test checks they match.
 * Figures in `basis` come from the sources each plan lists in that file.
 */
import type { DayState } from "@/lib/programme-rules";
import { texts } from "@/i18n/texts";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const whole = (n: number) => Math.round(n);
/** "Mon 5 Oct" from a stored day key (YYYY-MM-DD). */
export const dayLabel = (key: string) => new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${key}T00:00:00Z`));
/** "5 Oct 2026" from a date, in the member's calendar. */
export const dateLabel = (d: Date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(d);

export const programme = texts("copy/programme", "programme", () => ({
  title: "This week",
  crumb: "Today",
  sub: (name: string) => `${name} programme.`,
  cinema: "Two-eye cinema",

  stats: {
    week: "Week",
    weekOf: (week: number, weeks: number | null) => (weeks === null ? String(week) : `${week} of ${weeks}`),
    days: "Practice days this week",
    daysOf: (done: number, want: number) => `${done} of ${want}`,
    habitDays: "Days with something logged",
  },

  /* today's chapter */
  today: {
    title: "Today's practice",
    minutes: (done: number, goal: number) => `${whole(done)} of ${plural(goal, "minute")}`,
    progress: "Today's practice",
    partMinutes: (done: number, goal: number) => `${whole(done)} of ${goal} min`,
    breaks: (done: number, goal: number) => `${done} of ${plural(goal, "break")}`,
    outside: (done: number, goal: number) => `${whole(done)} of ${goal} min outside`,
    logged: "Logged today",
    notLogged: "Not logged today",
    done: "Done",
    start: "Start",
    goOn: "Carry on",
    startOf: (part: string) => `Start: ${part}`,
    openLog: "Open the log",
    or: "Or choose:",
    needs: (gear: string) => `You need: ${gear.charAt(0).toLowerCase()}${gear.slice(1)}.`,
    finished: { title: "Today's practice is done", body: "That is all for today. Rest your eyes. The next day's practice opens tomorrow." },
    rest: { title: "Today is a rest day", body: "You have done this week's practice days. Nothing to do today." },
    habitsDone: { title: "Today's habits are done", body: "The rings for today are closed." },
    empty: { title: "Nothing in the library fits this profile yet", body: "The items of this programme are for other ages, or staff have closed them for now. Check-ups still work." },
    waiting: { title: "Waiting for your counsellor", body: "Your counsellor sets the minutes and the days. Until then this is what a day may hold. Nothing can be started yet." },
    suggestion: "This plan is a suggestion. Your counsellor can see it, and your counsellor sets the minutes and the days.",
    care: "Away from the screen",
    careNote: "These do not use up training minutes.",
    cannotTrain: "You can look at the plan. A guardian or the member starts the practice.",
    instead: "Seeing a therapist? Do the list they gave you instead. The time counts as today's practice.",
    insteadLink: "Open the homework timer",
  },

  /* the seven days */
  week: {
    title: (week: number) => `Week ${week}, day by day`,
    state: {
      done: "Done", part: "Some practice", open: "Today", rest: "Rest day", none: "No practice",
      ahead: "Coming up", rest_ahead: "Rest day", waiting: "Not set yet",
    } satisfies Record<DayState, string>,
    habitNone: "Nothing logged",
    habitPart: "Partly done",
    today: "Today",
    minutes: (done: number, goal: number) => `${whole(done)} of ${goal} min`,
    calm: "A day with no practice is just a day off. There is nothing to catch up.",
    habitCalm: "A day with nothing logged is just a day. There is nothing to catch up.",
    rule: "Minutes are never carried over to another day. The plan never asks for more than today's minutes.",
    restRule: (days: number) => (days >= 7 ? "Practice is set for every day of the week."
      : days === 6 ? "6 practice days a week. The first day with no practice is the rest day."
        : `${plural(days, "practice day")} a week. The first ${7 - days} days with no practice are the rest days.`),
  },

  /* check-ups and the visit */
  checks: {
    title: "Check-ups this week",
    none: "No check-up is set for this week.",
    done: "Done this week",
    due: "Due this week",
    late: (week: number) => `Due since week ${week}`,
    take: "Take it",
    glasses: "Needs red-cyan glasses",
    note: "A check-up is not practice. It uses no training minutes.",
    all: "All check-ups",
  },
  visit: {
    title: "A good week for an eye test",
    mid: (week: number, weeks: number) => `Week ${week} is the halfway point of the ${weeks} weeks. Book an eye test, so an eye doctor checks both eyes. Take the summary of your home check-ups with you.`,
    summary: "Open the summary",
  },

  /* next week */
  next: {
    title: "Next week",
    week: (week: number, weeks: number | null) => (weeks === null ? `Week ${week}.` : `Week ${week} of ${weeks}.`),
    same: (chapters: string) => `The same kind of day: ${chapters}.`,
    newStage: (chapters: string) => `A new stage begins: ${chapters}.`,
    checks: (names: string) => `Check-ups: ${names}.`,
    noChecks: "No check-up is set.",
    visit: "It is a good week for an eye test.",
    last: "It is the last week of the programme.",
    ends: {
      eye_test: (weeks: number) => `This is the last of the ${weeks} weeks. After it the programme ends and asks you to book an eye test.`,
      counsellor: (weeks: number) => `This is the last of the ${weeks} weeks of this block. After it your counsellor decides what comes next.`,
    },
  },

  /* where the plan comes from */
  basis: {
    title: "Where this plan comes from",
    dose: "The minutes and the days",
    sources: "Sources",
    text: {
      "lazy-eye": [
        "The trial behind this programme set one hour of two-eye film a day, six days a week, for 12 weeks. The hour could be split through the day, so the plan has three sittings.",
        "Games are tested less well than film. So at least two of the three sittings are film, and the third can always be film too.",
        "Another study found that most of the gain from patching came in the first six weeks. That is why the plan asks for an eye test in week 6.",
      ],
      convergence: [
        "The trial behind this programme set 15 minutes of home practice a day, five days a week, for 12 weeks. It also set a visit to a therapist every week.",
        "Home practice with no therapist did no better than pretend therapy. This plan is the home half. It is not the whole treatment.",
        "The drills come in the order the trial's therapy used them: first the string and a near target, then cards and a wider range, then quick changes.",
      ],
      depth: [
        "The evidence for depth practice is limited, and no trial sets how long to do it.",
        "So IOpener keeps this programme short: six weeks of short sets, then an eye test.",
      ],
      squint: [
        "The trial behind this practice was done in a clinic with a therapist present. Nobody has tested it done alone at home.",
        "So your counsellor sets the minutes and the days. A block lasts six weeks. Then your counsellor looks again.",
      ],
      "after-concussion": [
        "In the trial behind this practice, people had six weeks of sessions with a therapist.",
        "So a block lasts six weeks, and your counsellor sets the minutes and the days.",
      ],
      "after-stroke": [
        "In the study behind the search practice, people did 800 searches over 11 days. So a block lasts two weeks.",
        "Your counsellor sets the minutes and the days, and decides whether another block follows.",
      ],
      "eye-fitness": [
        "This programme has no training minutes. It keeps the breaks and the time outside going, and reminds you of check-ups.",
        "In one study, break reminders eased screen strain within two weeks, for as long as the reminders went on.",
      ],
      "screen-strain": [
        "In one study, break reminders eased screen strain within two weeks. The gain had gone a week after the reminders stopped.",
        "So this programme has no end, and no training minutes.",
      ],
      "child-myopia": [
        "In a school trial, 40 more minutes outdoors on every school day meant fewer children became short-sighted over three years.",
        "So this programme has no end, and no training minutes. Outdoor time lowers the chance of short sight. It does not rule it out.",
      ],
    } as Record<string, string[]>,
  },

  /* the end of a course */
  end: {
    title: { eye_test: (weeks: number) => `The ${weeks} weeks are done`, counsellor: "This block is done" },
    ended: (name: string, date: string) => `The ${name} programme ended on ${date}.`,
    body: {
      eye_test: (weeks: number) => `This programme has run its ${weeks} weeks. That is as long as the plan behind it goes. IOpener cannot tell you what has changed in your eyes. An eye test can.`,
      counsellor: (weeks: number) => `This block has run its ${weeks} weeks. Your counsellor reads what was done and decides what comes next. IOpener cannot tell you what has changed in your eyes.`,
    },
    nextTitle: "What to do next",
    steps: {
      eye_test: [
        "Book an eye test with an eye doctor.",
        "Take the summary of your home check-ups with you. It has every result and the days you practised.",
        "Ask what comes next. If the eye doctor says to go on, a guardian can start the programme again in Settings.",
      ],
      counsellor: [
        "Talk to your counsellor about how the block went.",
        "Share the summary of your home check-ups if they ask for it.",
        "If another block is wanted, a guardian starts the programme again in Settings. Training stays closed until your counsellor sets the minutes.",
      ],
    },
    summary: "Open the summary",
    settings: "Open Settings",
    checkups: "Check-ups still work",
    rings: "Breaks and time outside still count on the Today page.",
    todayNote: (name: string) => `The ${name} programme has run its weeks.`,
    todayLink: "See what to do next",
  },

  /* no programme */
  none: {
    title: "Not on a programme",
    body: "A programme gives each day its practice and each week a check-up. Without one, the Today page still tracks breaks and time outside.",
    guardian: "Pick a programme in Settings",
    other: "A guardian picks a programme in Settings.",
  },

  /* the Today page */
  card: {
    start: "Start today's practice",
    goOn: "Carry on with today's practice",
    plan: "This week's plan",
    weekOf: (name: string, week: number, weeks: number | null) => (weeks === null ? `${name} programme, week ${week}.` : `${name} programme, week ${week} of ${weeks}.`),
    next: (n: number, total: number, part: string) => `Part ${n} of ${total}: ${part}.`,
    finished: "Today's practice is done.",
    rest: "Today is a rest day. Nothing to do.",
    habits: "Today's habits are done.",
    openPlan: "See the plan",
  },

  /* the counsellor's view */
  counsellor: {
    title: "This week's plan",
    about: "What the member's week holds, as the member sees it. You can read it here. You cannot change it.",
    suggestion: "For a counsellor-led programme this plan is a suggestion: the minutes and the days are yours to set, in the dose card above.",
    none: "This member is not on a programme.",
    over: (weeks: number) => `The ${weeks} weeks of this programme have passed. It closes when the member next opens the app.`,
    week: (name: string, week: number, weeks: number | null) => (weeks === null ? `${name}, week ${week}` : `${name}, week ${week} of ${weeks}`),
    chapter: "Today's practice",
    notSet: "Minutes not set yet. This is the suggested shape of a day.",
    part: (name: string, minutes: number) => (minutes > 0 ? `${name}, ${minutes} min` : name),
    days: "The week so far",
    checks: "Check-ups due this week",
    noChecks: "None due this week.",
    checkDone: "taken", checkDue: "not taken yet",
  },

  /* the daily job, as staff read it */
  job: {
    what: "Moves each active programme on to its calendar week, and closes a programme that has run all its weeks.",
    done: "done",
  },

  /* chapters: one day's guided set */
  chapters: {
    "film-day": { name: "Three film sittings", about: "Watch a film in the two-eye cinema in three sittings. Look far away for a moment between them." },
    "film-and-play": { name: "Two sittings and play", about: "Two film sittings, then a game where the weaker eye has the key part. Choose the film again if you like." },
    "first-drills": { name: "First drills", about: "A string, a near target and a slow pull on screen. They practise turning both eyes in together." },
    "wider-range": { name: "A wider range", about: "A ring card, the slow pull both ways and a game. Go only as far as the picture stays one." },
    "quick-changes": { name: "Quick changes", about: "Jumps between near and far, sudden changes on screen, and joining two rings with no glasses." },
    "depth-sets": { name: "Three short sets", about: "Three short sets of depth play, with a rest between them." },
    "both-eyes-on": { name: "Both eyes on", about: "Slow drills for noticing both eyes at once and for holding one picture far away." },
    "steady-with-movement": { name: "Steady with movement", about: "Short drills that keep a letter single and sharp while you move." },
    "search-and-read": { name: "Search and read", about: "Practice at finding things on your hard side, then at keeping your place on a line." },
    "eye-day": { name: "The eye day", about: "Breaks while you use a screen, and time outside for children. No training minutes." },
    "desk-week": { name: "Set up your desk", about: "Check your desk once this week. Then take breaks and keep the screen at arm's length." },
    "work-day": { name: "A working day", about: "Look-away breaks through the day, and a quick check of how far you sit." },
    "outside-day": { name: "Time outside", about: "Daylight outside every day, and reading held far enough from the eyes." },
  } as Record<string, { name: string; about: string }>,

  /* parts of a chapter */
  parts: {
    "film-1": { name: "First sitting", how: "Glasses on, blue-green lens over the weaker eye. Press play." },
    "film-2": { name: "Second sitting", how: "The same film, or the next part of the story." },
    "film-3": { name: "Third sitting", how: "The last sitting of the day." },
    "balanced-play": { name: "Play", how: "A game that needs both eyes. The weaker eye has the key part." },
    glasses: { name: "Glasses", how: "Only if an eye doctor prescribed glasses: note today's wear." },
    patch: { name: "Patch", how: "Only if an eye doctor prescribed a patch: note today's patch time. IOpener never sets it." },
    string: { name: "String", how: "Look from bead to bead. The string shows where your eyes are aiming." },
    "near-letter": { name: "Near target", how: "Keep a near target as one while your eyes turn in." },
    "smooth-pull": { name: "Slow pull on screen", how: "Keep the two rings as one while they drift apart slowly." },
    card: { name: "Card", how: "Join the pictures on the card into one, then make it sharp." },
    "both-ways": { name: "Slow pull, both ways", how: "One day turning the eyes in, the next day letting them out." },
    "vergence-play": { name: "Play", how: "A game where you keep one picture while the pull changes." },
    jumps: { name: "Near and far jumps", how: "Jump your eyes between a near target and a far one." },
    "quick-switch": { name: "Sudden changes", how: "The pull changes in jumps. Bring the rings back into one each time." },
    "join-pairs": { name: "Joining pairs", how: "Join two rings into a third one, with no glasses." },
    "depth-1": { name: "First set", how: "A short set of depth play. Rest when it ends." },
    "depth-2": { name: "Second set", how: "The same again, after a rest." },
    "depth-3": { name: "Third set", how: "The last set of the day." },
    "both-lights": { name: "Both lights", how: "A slow drill for noticing both eyes at once." },
    "far-hold": { name: "Far hold", how: "Hold the two rings as one while looking far away." },
    "squint-play": { name: "Play", how: "A slow game from your counsellor's plan." },
    "walk-in": { name: "Walk in", how: "Walk slowly towards a letter and keep it single." },
    "head-turn": { name: "Head turns", how: "Keep a letter sharp while you turn your head slowly." },
    "near-far-move": { name: "Near and far, moving", how: "Switch focus between near and far while you step from side to side." },
    "recovery-play": { name: "Play", how: "A short, slow game from your counsellor's plan." },
    search: { name: "Search", how: "Find the dot. It comes more often on your hard side." },
    "line-reading": { name: "Line reading", how: "Read one line at a time between the two bars." },
    breaks: { name: "Breaks", how: "Every 20 minutes at a screen, look far away for 20 seconds. Blink fully." },
    outside: { name: "Time outside", how: "Daylight outside. Log the minutes when you come in." },
    desk: { name: "Desk check", how: "Once this week: screen height, distance, glare and brightness." },
    distance: { name: "Screen distance", how: "Put the screen back at about an arm's length." },
    "reading-distance": { name: "Reading distance", how: "Hold the page a forearm's length from the eyes." },
  } as Record<string, { name: string; how: string }>,
}));
