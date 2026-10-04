import { EYE_NAME, other, type Derived, type Eye } from "@/engine";

const eye = (e: Eye) => EYE_NAME[e].toLowerCase();
export const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export const onboarding = {
  title: "Onboarding",
  sub: "Do this once on each screen. Each eye gets two minutes on its own, then both eyes take the balance test through the glasses. The results set the contrast and sizes for every game.",
  blocked: {
    seat: "Your seat can look and cheer. A guardian runs onboarding.",
    under_age: "No screen sessions under age 4, and onboarding is a screen session. Off-screen exercises are open.",
  },
  deviceLabel: "This screen",
  steps: { screen: ["Screen", "30 s"], L: ["Onboarding left eye", "2 min"], R: ["Onboarding right eye", "2 min"], both: ["Both eyes", "1 min"], done: ["Settings", ""] },
  stepsLabel: "Onboarding steps",

  intro: {
    title: "Five minutes, once on each screen",
    body: "Onboarding measures each eye on its own, then both together. Nothing is typed in. You answer by pointing the way a letter faces.",
    list: [
      ["Screen, 30 seconds.", "A bank card sets the true size of this screen. The seat distance sets how big a letter looks."],
      ["Onboarding left eye, 2 minutes.", "Right eye covered. Four questions, then the smallest letter and the faintest letter this eye can read."],
      ["Onboarding right eye, 2 minutes.", "The same, with the left eye covered."],
      ["Both eyes, 1 minute.", "Red-cyan glasses on. The balance test finds how far the stronger eye must be dimmed for the two eyes to pull equally."],
    ],
    ready: "Have ready: a bank card, your own glasses if you wear them, and red-cyan glasses for the last step.",
    start: "Start onboarding",
    again: "Run onboarding again",
  },

  screen: {
    title: "Set up this screen",
    card: ["Hold the ", "short edge", " of a bank card upright against the bar. Drag until the bar is exactly as tall as the card."],
    bar: "Bar height",
    distance: "How far are your eyes from this screen?",
    distanceGroup: "Viewing distance",
    distances: [[40, "Phone, 40 cm"], [60, "Laptop, 60 cm"], [100, "1 m"], [200, "TV, 2 m"]] as [number, string][],
    measures: (ppc: number, dist: number, smallest: string) => `This screen measures ${ppc.toFixed(1)} px per cm. Smallest letter it can show at ${dist} cm: ${smallest}.`,
    further: " Sit further back for a finer result.",
    next: "Next: Onboarding left eye",
  },

  eyeTitle: (e: Eye) => `Onboarding ${eye(e)} eye`,
  timer: (seconds: number) => `${clock(seconds)} of about 2:00`,
  questions: [
    "Do you wear glasses or contact lenses for this eye?",
    "Has this eye ever been called lazy, or been patched?",
    "Does this eye turn in or out, even sometimes?",
    "In the last month: pain, flashes, a sudden change or new double vision in this eye?",
  ],
  answer: (n: number) => `Answer ${n}`,
  no: "No",
  yes: "Yes",
  startLetters: "Start the letter test",

  eyeDone: {
    title: (e: Eye, seconds: number) => `${EYE_NAME[e]} eye done in ${clock(seconds)}`,
    smallest: "Smallest letter read",
    smallestFloor: "That is the smallest letter this screen can show at this distance",
    smallestAt: (dist: number) => `Read at ${dist} cm`,
    faintest: "Faintest letter read",
    faintestFloor: "That is the faintest step an ordinary screen can show",
    faintestHow: "Large letter, dark on grey",
    sudden: "You reported a recent sudden change in this eye. See an eye doctor before training.",
    next: (e: Eye) => (e === "L" ? "Next: Onboarding right eye" : "Next: both eyes together"),
  },

  both: {
    title: "Both eyes together",
    time: "about 1:00",
    skip: "No glasses here: use the starting level",
  },

  done: {
    saving: "Saving your settings.",
    saveError: "The settings could not be saved. Nothing was changed.",
    retry: "Try again",
    title: "Settings saved for this screen",
    weak: (e: Eye, contrast: string) => `The ${eye(e)} eye is the weaker one. The stronger eye is shown at ${contrast} contrast.`,
    equal: "The two eyes pull equally, so both get full contrast.",
    everywhere: " Every two-eye scene now draws from these settings.",
    swap: (e: Eye) => `The balance test found the ${eye(e)} eye weaker than the letter test suggested. Turn the glasses round: cyan lens over the ${eye(e)} eye.`,
    skipped: (level: string) => `The balance test was skipped, so the stronger eye starts at ${level}, the starting level used in the Luminopia trial. `,
    skippedCta: "Take the balance test with glasses to replace it.",
    links: [["/today", "Today", "the day's practice uses these settings."], ["/train", "Games", "the red ink and the target sizes follow them."], ["/test", "Check-ups", "repeat the tests each week and the settings move as the eyes change."]],
  },

  settings: {
    title: "What the engine sets",
    none: { title: "Nothing measured yet", body: "Every scene uses the default: equal contrast for both eyes and standard sizes." },
    doctorFirst: "Pain, flashes, a sudden change or new double vision in the last month needs an eye doctor before any training.",
    weak: "Weaker eye",
    noWeak: "None found",
    weakFrom: "Letter test on each eye, then the balance test",
    lens: "Lenses",
    lensWhere: (weak: Eye | null) => (weak ? `Cyan over the ${eye(weak)} eye, red over the ${eye(other(weak))} eye` : "Either way round"),
    lensFrom: "The weaker eye always gets the cyan lens",
    lensOwn: "Worn over your own glasses. The weaker eye always gets the cyan lens",
    contrast: "Stronger-eye contrast",
    contrastFrom: {
      balance: "From the balance test",
      balance_equal: "Balance test: both eyes pull equally",
      starting_level: "Starting level until the balance test is done",
      equal: "The two eyes read the same",
      default: "Default until onboarding is done",
    } satisfies Record<Derived["conSource"], string>,
    letter: "Two-eye letter size",
    letterFrom: (times: number) => `${times} times the smallest letter read by the eye that read less well`,
    target: "Game target size",
    targetFrom: (times: number) => `${times} times that letter, the smallest a target may be`,
    text: "App text size",
    textFrom: "From the better eye's letter test and the viewing distance",
    faint: "Faint text",
    faintOn: "Raised contrast",
    faintOff: "Standard",
    faintFrom: "From the better eye's faint-letter test",
    opens: "Opens with",
    programme: {
      doctor_first: ["Eye doctor first", "A recent sudden change was reported. Training stays locked; check-ups still run."],
      counsellor: ["Level 2, with a counsellor", "An eye turn was reported. Squint games open once a counsellor is linked."],
      lazy_eye: ["Lazy-eye programme, level 1", "Two-eye films and games at the trial dose. Children need a caregiver."],
      eye_fitness: ["Eye fitness, level 0", "Tracker, breaks, outdoor time and check-ups."],
    } satisfies Record<Derived["opens"], [string, string]>,
  },
};
