// Eyes Opener: Words for the landing page.
/**
 * Words for the landing page.
 * Plain words a school student can follow. One idea per line. Read only the headings and they tell the story.
 * Every number is passed in by the page, which reads it from src/data and src/engine.
 * Evidence labels and their meanings are never written here: they come from the catalogue.
 * Nothing here may promise to treat or cure.
 */

import { texts } from "@/i18n/texts";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const landing = texts("copy/landing", "landing", () => ({
  meta: {
    title: "Two eyes. One picture.",
    description:
      "IOpener is a free fitness app for your eyes, with an open-source core. Track how you use them, check them at home and practise with games. The web app works today.",
  },

  hero: {
    line1: "Two eyes.",
    line2: "One picture.",
    lead: "IOpener is a fitness app for your eyes. It tracks how you use them, checks them at home and trains them with games.",
    start: "Start the two-minute check",
    how: "See how it works",
    note: "Free. Open-source core. No ads.",
    chips: {
      strong: "The stronger eye sees red",
      weak: "The weaker eye sees cyan",
      both: "Together they see one picture",
    },
  },

  reveal: {
    title: "Each eye gets half the picture.",
    lead: "Red-cyan glasses send one picture to each eye. The game only works when the brain joins the two. That is the practice: using both eyes together.",
    tags: {
      strong: "Stronger eye",
      weak: "Weaker eye",
      both: "Both eyes together",
    },
    legend: {
      strong: { title: "Red, turned down", body: "Only the stronger eye sees the crates. Their red is turned down until both eyes pull equally." },
      weak: { title: "Cyan, at full strength", body: "Only the weaker eye sees the runner and the coins." },
      both: { title: "White, for both", body: "Both eyes see the ground and the lights. The brain joins it all into one game." },
    },
    caption: (game: string) => `A scene from ${game}, one of the two-eye games. These games need red-cyan glasses.`,
    art: {
      strong: "The stronger eye's picture: crates in dim red, with the ground and a string of lights.",
      weak: "The weaker eye's picture: a runner and four coins in cyan, with the ground and a string of lights.",
      glasses: "Red-cyan glasses",
    },
  },

  spaces: {
    title: "It works like a fitness app, for your eyes.",
    lead: "Four spaces, like the ones in a step counter or a workout plan.",
    track: { head: "See how you use your eyes", body: "Three rings for the day: screen breaks, today's practice and time in daylight." },
    test: {
      head: "Check your eyes at home",
      body: (checkups: number) => `${plural(checkups, "check-up", "check-ups")} on a schedule. Each result is set beside your own earlier ones.`,
    },
    train: {
      head: "Practise with games",
      body: (games: number, exercises: number) => `${plural(games, "game", "games")} and ${plural(exercises, "exercise", "exercises")}, set to your own eye profile.`,
    },
    together: { head: "Keep going together", body: "A family board, cheers from the people who care, and ideas from other members, tested in the open." },
    loop: "Track and Test give you numbers. Train and Together help you keep going.",
    example: "Example screens. The family and the numbers in them are made up.",
    shots: {
      track: {
        title: "Today",
        who: "Aarav",
        rest: "Rest", restValue: "4 of 5 breaks",
        train: "Train", trainValue: "20 of 30 min",
        light: "Light", lightValue: "45 of 90 min",
        week: "This week",
        days: ["M", "T", "W", "T", "F", "S", "S"],
        alt: "Example of the Today screen: three rings for rest, practice and daylight, and one bar for each day of the week. One day is hatched: no practice that day.",
      },
      test: {
        title: "Letter size",
        when: "Every week",
        left: "Left eye",
        right: "Right eye",
        none: "Not measured yet",
        alt: "Example of a check-up: a chart of letters that get smaller, and a line for each eye over six weeks. The weeks still to come are hatched.",
      },
      train: {
        time: "6 of 10 min",
        stop: "Stop",
        alt: "Example of a game: a runner and coins in cyan, crates in dim red and the ground in white on a black field, with a stop button below.",
      },
      together: {
        title: "Family board",
        sub: "Days practised this week",
        rows: [
          { name: "Aarav", days: 5 },
          { name: "Priya", days: 4 },
          { name: "Dadi", days: 3 },
        ],
        of: (days: number) => `${days} of 7`,
        cheer: "Nani sent a cheer",
        alt: "Example of a family board: three family members and the days each one practised this week, and a cheer from a grandparent.",
      },
    },
  },

  flow: {
    title: "A two-minute check for each eye shows where to start.",
    steps: [
      { head: "Check each eye", body: "Cover one eye. Read the smallest letter and the faintest letter you can. Then swap." },
      { head: "Get your eye profile", body: "It sets the contrast and the sizes for every game, so each game fits your eyes." },
      { head: "Start the right programme", body: "Pick the one that fits. Some of them open only with a linked counsellor." },
    ],
    check: { title: "The check", body: "Two minutes for each eye. Then one minute with the glasses on." },
    perEye: (names: string[]) => names.map((n, i) => (i === 0 ? n : n.toLowerCase())).join(" and "),
    profile: { title: "Your eye profile", body: "The weaker eye, the letter sizes and the balance between the eyes." },
    open: "Open after the safety questions",
    gate: { title: "A linked counsellor", body: "An eye-care professional sets the plan." },
    gated: "Open with a counsellor",
    dose: (minutes: number, days: number) => `${minutes} min a day, ${days} days a week`,
    habits: "Daily habits, no set minutes",
    counsellorDose: "Minutes set by the counsellor",
    everyone: (name: string) => `No eye condition? ${name} is for everyone: breaks, daylight and check-ups.`,
    art: "A tree: the check leads to your eye profile, and the profile leads to the programmes.",
  },

  evidence: {
    title: "Every game says how strong its proof is.",
    lead: (games: number, exercises: number) =>
      `${plural(games, "game", "games")} and ${plural(exercises, "exercise", "exercises")}. Each one carries a label. When the proof is thin, the label says so.`,
    count: (games: number, exercises: number) =>
      [games ? plural(games, "game", "games") : "", exercises ? plural(exercises, "exercise", "exercises") : ""].filter(Boolean).join(", "),
    samples: "Three games from the library, each with its label.",
    link: "Read the evidence",
    art: (label: string, total: number) => `${label}: ${plural(total, "game or exercise", "games and exercises")}`,
  },

  safety: {
    title: "Safety comes before training.",
    lead: "These rules are built in. No reward and no setting can stretch them.",
    questions: { head: "Questions come first", body: "Warning-sign questions run before any training, and again when a new symptom shows up." },
    cap: { head: (minutes: number) => `Never more than ${minutes} minutes a day`, body: "The daily limit holds for every programme and every person." },
    age: { head: (age: number) => `No screen sessions under age ${age}`, body: "Younger children get off-screen exercises only." },
    stop: { head: "A stop button on every session", body: "Double vision, a headache or strain: one press ends the session at once." },
    doctor: { head: "Something is wrong? See an eye doctor first.", body: "When an answer points to a warning sign, training stays closed. IOpener never says all clear." },
    session: {
      title: "Today's practice",
      closed: "Closed until the checks pass",
      open: "Ready to start",
      meter: (minutes: number) => `0 of ${minutes} minutes used today`,
      stop: "Stop",
      alt: "Drawing of a practice session: it opens only after the four checks pass, it shows the daily limit and it has a stop button.",
    },
  },

  family: {
    title: "Made for the whole family.",
    lead: "One household account. Each person gets the seat that fits.",
    core: { title: "One family account", body: "A child is a profile inside the parent's account. A child never needs an email address." },
    seats: {
      child: { name: "Child mode", verb: "Plays", body: "The child plays and does check-ups. Everything else stays behind a grown-up's PIN." },
      guardian: { name: "Guardian", verb: "Decides", body: "A parent or guardian runs the account and gives consent." },
      cheer: { name: "Cheer seat", verb: "Cheers", body: "For grandparents and others who care. They see progress and send cheers. Nothing more." },
      counsellor: { name: "Counsellor", verb: "Sets the plan", body: "An eye-care professional you link. They can set the plan and the daily minutes." },
    },
    art: "Four seats around one family account: child mode, guardian, cheer seat and counsellor.",
  },

  screens: {
    title: "On the screens you already have.",
    lead: "IOpener is made for the browser, the phone and the TV. Here is what exists today.",
    web: { name: "Web app", state: "Works today", body: "Open it in a browser on a laptop, a tablet or a phone." },
    phone: { name: "Phone app", state: "Being built", body: "Until it is ready, the web app opens in the phone's browser." },
    tv: { name: "TV app", state: "Being built", body: "For Android TV, played with the remote." },
    hatch: "Hatching means not built yet.",
    art: {
      web: "A browser window showing a game.",
      phone: "A phone with a hatched screen: not built yet.",
      tv: "A TV with a hatched screen: not built yet.",
    },
  },

  not: {
    title: "What IOpener is not.",
    lines: ["It is not a medical device.", "It does not diagnose, treat or cure any condition.", "It does not replace your eye doctor."],
    is: "It supports the plan your eye doctor sets.",
  },

  closing: {
    title: "Start with the two-minute check.",
    lead: "Two minutes for each eye. Then one minute with the glasses on.",
    start: "Start the two-minute check",
    note: "Free. Open-source core. No ads.",
    more: "Or read more first",
    links: [
      { href: "/stories", label: "Stories" },
      { href: "/evidence", label: "Evidence" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/for-counsellors", label: "For counsellors" },
      { href: "/for-sponsors", label: "For sponsors and schools" },
    ],
  },
}));
