// Eyes Opener: Words for the public site and for the enquiries room in the admin console.
/**
 * Words for the public site and for the enquiries room in the admin console.
 *
 * Rules for every line here:
 * - Plain words a school student can follow. One idea in each line.
 * - Nothing here promises a result. IOpener does not diagnose, treat or cure, and no line may suggest it does.
 * - A number about IOpener is never typed in: the page works it out from `@/data` and `@/engine` and passes it in.
 * - The only typed-in figures are trial results in `evidence.trials`, quoted from the evidence framework, each with its link.
 * - Nothing about money beyond "free" and "open source".
 */
import type { EvidenceKey } from "@/data";
import { WAIT_DAYS } from "@/lib/data/state";
import type { EnquiryField, EnquiryKind, EnquiryStatus } from "@/lib/site";
import { texts } from "@/i18n/texts";

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
/** A small count as a word: 3 reads "three". Larger counts stay as digits. */
export const word = (n: number) => WORDS[n] ?? String(n);
export const Word = (n: number) => { const w = word(n); return w[0].toUpperCase() + w.slice(1); };
const many = (n: number, one: string, more: string) => `${n} ${n === 1 ? one : more}`;
/** A list in a sentence: "a, b and c". */
export const listed = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

const zone = "Asia/Kolkata";
export const day = (d: Date) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: zone }).format(d);
export const dayTime = (d: Date) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: zone }).format(d);

export interface Trial { name: string; who: string; found: string; limit?: string; href: string; source: string; more?: { label: string; href: string } }

export const site = texts("copy/site", "site", () => ({
  name: "Eyes Opener",
  logoLabel: "Eyes Opener, home",
  skip: "Skip to the page",

  /* ───────────── navigation and footer ───────────── */
  nav: {
    label: "Site",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/try", label: "Try a game" },
      { href: "/programmes", label: "Programmes" },
      { href: "/evidence", label: "Evidence" },
      { href: "/library", label: "Library" },
      { href: "/stories", label: "Stories" },
    ],
    signIn: "Log in",
    register: "Register",
    start: "Start the check",
    openApp: "Open the app",
    menu: "Menu",
    openMenu: "Open the menu",
    closeMenu: "Close the menu",
  },
  footer: {
    label: "Site map",
    about: "Eye care you can do at home, built on published research.",
    groups: [
      { title: "The app", links: [{ href: "/how-it-works", label: "How it works" }, { href: "/programmes", label: "Programmes" }, { href: "/library", label: "Library" }, { href: "/stories", label: "Stories" }] },
      { title: "Trust", links: [{ href: "/evidence", label: "Evidence" }, { href: "/safety", label: "Safety" }, { href: "/about", label: "About" }] },
      { title: "Take part", links: [{ href: "/for-counsellors", label: "For counsellors" }, { href: "/for-sponsors", label: "For sponsors and schools" }, { href: "/wish-jam", label: "Wish Jam for developers" }] },
      { title: "The small print", links: [{ href: "/privacy", label: "Privacy" }, { href: "/childrens-data", label: "Children's data" }, { href: "/terms", label: "Terms" }] },
    ],
    promises: ["Free", "Open-source core", "No ads"],
    free: "Free, with an open-source core. No ads, and nothing to buy.",
  },

  /* ───────────── shared ───────────── */
  cta: {
    title: "Start with the check.",
    body: "It measures each eye on its own, then both together. Everything else in IOpener is set from what it finds.",
    start: "Start the check",
    programmes: "See the programmes",
    evidence: "Read the evidence",
    safety: "Read the safety rules",
  },
  notBuilt: "Not built yet",
  beingBuilt: "Being built",
  worksToday: "Works today",
  example: "An example",
  level: {
    chip: ["Open to all", "For a named condition", "Only with a linked counsellor"],
    what: [
      "No diagnosis needed. Tracking, breaks, time outdoors and check-ups.",
      "For someone an eye doctor has told they have this condition. The dose comes from a published trial. A child needs a parent or guardian.",
      "Opens when a verified eye counsellor links to the member and sets the dose. The app never sets it.",
    ],
  },
  evidenceLabel: "Evidence",
  count: {
    games: (n: number) => many(n, "game", "games"),
    exercises: (n: number) => many(n, "exercise", "exercises"),
    checkups: (n: number) => many(n, "check-up", "check-ups"),
    programmes: (n: number) => many(n, "programme", "programmes"),
  },

  /* ───────────── /how-it-works ───────────── */
  how: {
    meta: { title: "How it works", description: "IOpener measures each eye at home, sets every game from what it measured, and shows what changed. Track, Test, Train, Together." },
    hero: {
      kicker: "How it works",
      title: "A fitness app, for your eyes.",
      lead: "IOpener measures each eye at home, sets every game from what it measured, and shows you what changed. It is free, and it works in a browser today.",
      points: ["Measure first", "Doses from trials", "Evidence on every label"],
    },
    spaces: {
      kicker: "The four spaces",
      title: (n: number) => `${Word(n)} spaces, one loop.`,
      lead: "Track and Test produce numbers. Train and Together try to move them. Then the numbers show what changed.",
      items: [
        { key: "track", name: "Track", line: "See how your eyes spend the day.", body: "Screen breaks taken, minutes of practice and time outdoors, drawn as rings on one screen.", stat: (rings: number) => `${Word(rings)} rings a day` },
        { key: "test", name: "Test", line: "Check your eyes at home.", body: "Each check-up is compared with your own earlier results, never with other people. A check-up measures. It never says your eyes are healthy.", stat: (n: number) => many(n, "check-up", "check-ups") },
        { key: "train", name: "Train", line: "Practise at a set dose.", body: "Games, exercises and two-eye video, grouped into programmes. Every one carries a label that says how strong the published evidence is.", stat: (g: number, e: number) => `${g} games, ${e} exercises` },
        { key: "together", name: "Together", line: "Do it as a family.", body: "A family shares one account. Members share what helped them, and each idea is tested in the open before it earns trust.", stat: (steps: number) => `${Word(steps)} steps from a story to a trial` },
      ],
    },
    path: {
      kicker: "From the check to a programme",
      title: "First it measures. Then it sets everything from that.",
      lead: "The check runs once on each screen you use. Nothing is typed in: you answer by pointing the way a letter faces.",
      steps: [
        { title: "Set up the screen", body: "Hold a bank card against a bar on the screen. That tells IOpener the true size of the screen, so a letter is the size it should be." },
        { title: "Check each eye on its own", body: (questions: number) => `Cover one eye. Answer ${word(questions)} short questions, then read the smallest letter and the faintest letter this eye can manage. Then the other eye.` },
        { title: "Check both eyes together", body: "Put on the red-cyan glasses. The balance test finds how far the stronger eye must be dimmed for the two eyes to pull equally." },
        { title: "Get your eye profile", body: "Which eye is weaker, how faint the stronger eye's picture should be, and how big letters and targets must be. Every game draws from it." },
        { title: "Choose a programme", body: (questions: number) => `Answer ${word(questions)} safety questions first. Then pick a programme. Its minutes come from a published trial or from a counsellor, never from AI.` },
      ],
      durations: "How long each part takes",
      profile: {
        title: "An example eye profile",
        note: "The values here are made up to show the layout. Hatching means not measured yet.",
        rows: { weak: "Weaker eye", contrast: "Stronger-eye contrast", letter: "Two-eye letter size", target: "Smallest game target" },
        weak: "Left",
        contrastFrom: "The starting level, until the balance test is done",
      },
    },
    glasses: {
      kicker: "The red-cyan glasses",
      title: "One screen, two pictures.",
      lead: "Each lens lets one colour through. So one screen can show each eye its own part of the same scene.",
      points: [
        { b: "Three inks on black.", t: "Cyan reaches only the eye behind the cyan lens. Red reaches only the eye behind the red lens. White reaches both." },
        { b: "The weaker eye gets the cyan lens.", t: "The thing you must find or steer is drawn for that eye, at full strength." },
        { b: "The stronger eye sees its part fainter.", t: "The balance test sets how faint, so the stronger eye cannot do the work alone." },
        { b: "Both eyes are needed to score.", t: "A two-eye game cannot be scored in with one eye alone, so playing and practising are the same act." },
      ],
      views: { none: "The scene on the screen", weak: "Through the cyan lens", strong: "Through the red lens" },
      sceneLabel: (view: string) => `A game scene of dots and diamonds inside a ring. ${view}.`,
      caption: "A game scene, as the screen shows it and as each eye sees it.",
    },
    day: {
      kicker: "A day with IOpener",
      title: (n: number) => `${Word(n)} rings to close.`,
      lead: "The Today screen shows the eye day as rings. Closing them is the whole daily habit.",
      rings: [
        { key: "rest", name: "Rest", body: "Closes when you took the look-away breaks that fell due during screen work." },
        { key: "train", name: "Train", body: "Closes when today's practice is done. It cannot be overfilled: more is not better." },
        { key: "light", name: "Light", body: "Closes when time outdoors in daylight reached the goal. Mostly for children." },
      ],
      noProgramme: "With no programme, the Rest and Light rings still count. The Train ring fills once a programme starts.",
      rhythm: (every: number[]) => `Check-ups come round every ${every.join(" or ")} days, so the settings move as the eyes change.`,
      drawing: "An example day. The Rest ring is over half closed, the Train ring is closed, and the Light ring is a third closed.",
    },
    devices: {
      kicker: "Where it runs",
      title: "One app today. Two more being built.",
      lead: "We say plainly what exists. A hatched card is not built yet.",
      items: [
        { key: "web", name: "Web app", built: true, body: "Runs in a browser on a laptop, a tablet or a phone. Nothing to install. This is the app you can open now." },
        { key: "phone", name: "Phone app", built: false, body: "For Android first, then iPhone. For near practice, check-ups and reminders." },
        { key: "tv", name: "TV app", built: false, body: "For Android TV. The big screen across the room is the training room, played with the remote." },
      ],
    },
  },

  /* ───────────── /programmes ───────────── */
  programmes: {
    meta: { title: "Programmes", description: "The IOpener programmes: who each one is for, where its dose comes from, the games and exercises in it, and what it does not do." },
    hero: {
      kicker: "Programmes",
      title: (n: number) => `${Word(n)} programmes. Each says where its dose comes from.`,
      lead: "A programme is a set of games, exercises and check-ups for one need. Some are open to everyone. Some are for a named condition. Some open only with a linked counsellor.",
    },
    levels: { kicker: "Three ways in", title: "Who can start what." },
    card: {
      dose: "Dose",
      open: "See the programme",
      openOf: (name: string) => `See the ${name} programme`,
      holds: (g: number, e: number) => (e ? `${many(g, "game", "games")} and ${many(e, "exercise", "exercises")}` : many(g, "game", "games")),
    },
    dose: {
      title: "The dose",
      set: (minutes: number, days: number) => `${minutes} minutes a day, ${days} days a week`,
      none: "No training minutes",
      counsellor: "Set by the linked counsellor",
      basis: "Where it comes from",
      cap: (max: number) => `Whatever a programme says, nobody trains for more than ${max} minutes in a day.`,
      ai: "AI never sets or changes a dose.",
      rows: { minutes: "Minutes a day", days: "Days a week", access: "Who can start it" },
      everyDay: "Every day",
      days: (n: number) => many(n, "day", "days"),
      minutes: (n: number) => many(n, "minute", "minutes"),
    },
    detail: {
      crumb: "Programmes",
      kicker: (level: string) => level,
      forWho: "Who it is for",
      games: { title: "The games in it", lead: "Each game carries the label of the method it uses. Opening one takes you into the app.", none: "No games in this programme." },
      exercises: { title: "The exercises in it", lead: (group: string) => `The ${group} group. Short routines with simple gear.`, none: "This programme has no exercise group of its own. Its practice is the games above." },
      tests: { title: "The check-ups that track it", lead: "A check-up measures. It does not train, and it never gives an all-clear.", every: (days: number) => `Every ${days} days`, glasses: "With red-cyan glasses", perEye: "Each eye on its own" },
      not: { title: "What it does not do", lead: "We would rather say this here than have you find out later." },
      evidenceMix: "The evidence labels in this programme",
      others: "The other programmes",
    },
    /** Who each programme is for, what it is, and what it does not do. Keyed by the programme's slug. */
    about: {
      "eye-fitness": {
        forWho: "Anyone who wants to look after their eyes. No diagnosis needed.",
        what: "Breaks, time outdoors and regular check-ups, with a few games for variety.",
        not: [
          "It does not train any condition, and it has no training dose.",
          "The eye-movement games are there for variety. Their label says so: no trial shows a benefit in healthy eyes.",
          "A check-up is not an eye exam. It never says your eyes are healthy.",
        ],
      },
      "screen-strain": {
        forWho: "People who work at a screen and end the day with tired or dry eyes.",
        what: "Look-away breaks and full, slow blinks through the working day.",
        not: [
          "It does not treat dry-eye disease or any other condition.",
          "Break habits help only while you keep them. In the trial behind this programme, the gain faded after the reminders stopped.",
          "It cannot tell whether you need new glasses. An eye exam can.",
        ],
      },
      "child-myopia": {
        forWho: "Children whose family wants to lower the chance of short sight starting.",
        what: "Time outdoors in daylight, counted on the Light ring, and a comfortable reading distance.",
        not: [
          "It does not lower the power of glasses a child already wears.",
          "No exercise here, or anywhere, is shown to remove the need for glasses.",
          "The trial evidence is for time outdoors. The reading-distance habit supports it and was not tested alone.",
        ],
      },
      "lazy-eye": {
        forWho: "Children and adults an eye doctor has told they have a lazy eye. A child needs a parent or guardian beside them.",
        what: "Two-eye video and games through red-cyan glasses. The weaker eye sees the full picture and the stronger eye sees it fainter, so both must work.",
        not: [
          "It does not replace glasses, a patch or drops an eye doctor prescribed. Glasses come first.",
          "It does not claim to work better than patching. Trials found the two about equal.",
          "The trials used their own equipment. IOpener's red-cyan version has not been through its own trial yet.",
          "The evidence is strongest for children. For adults it is smaller.",
        ],
      },
      convergence: {
        forWho: "People an eye doctor has told they have convergence insufficiency: eyes that struggle to turn in together for close work.",
        what: "Games and drills that ask the eyes to hold one picture while it moves closer or further apart.",
        not: [
          "Home practice alone is not proven. In the largest children's trial, home computer therapy did about as well as placebo therapy.",
          "What worked was weekly sessions with a therapist plus practice at home. This programme is the home part.",
          "It does not claim to improve reading.",
        ],
      },
      depth: {
        forWho: "People with reduced depth vision who already use both eyes together.",
        what: "Depth games that ask which shape floats nearer, in finer and finer steps.",
        not: [
          "The evidence is limited. It comes from pooled studies in adults, and not everyone improved.",
          "It does not promise depth vision to someone who has never had any.",
          "It never asks for a step finer than your screen can show.",
        ],
      },
      squint: {
        forWho: "People with a squint that comes and goes, working with a verified eye counsellor.",
        what: "Slow, uncluttered games that ask both eyes to stay switched on at once. The counsellor sets how much.",
        not: [
          "It does not straighten a squint that is always there. No exercise is shown to do that.",
          "It does not open without a counsellor. Done without supervision, this kind of training can cause lasting double vision.",
          "It does not replace surgery or any other care an eye doctor advises.",
        ],
      },
      "after-concussion": {
        forWho: "People with vision problems after a concussion, once a doctor has seen them, working with a verified eye counsellor.",
        what: "Slow tracking and focusing games with no time pressure. The counsellor sets how much.",
        not: [
          "It does not start before a doctor has seen the injury. New symptoms after a head injury need a doctor to look at them first.",
          "The trial evidence is for therapy with a supervisor. Home practice alone was not tested.",
          "It never says you are well again. Only a doctor can.",
        ],
      },
      "after-stroke": {
        forWho: "Adults who lost part of their side vision after a stroke, working with a verified eye counsellor.",
        what: "Search games that train the habit of looking into the side that is hard to see.",
        not: [
          "It does not bring back the lost part of vision. It trains searching.",
          "It does not open without a counsellor, and never before a diagnosis.",
          "No check-up here measures side vision. An eye clinic does that.",
        ],
      },
    } as Record<string, { forWho: string; what: string; not: string[] }>,
  },

  /* ───────────── /evidence ───────────── */
  evidence: {
    meta: { title: "Evidence", description: "How IOpener labels the evidence behind every game and exercise, how many carry each label, the trials behind them, and where the evidence is limited or unproven." },
    hero: {
      kicker: "Evidence",
      title: "Every game says how strong its evidence is.",
      lead: "IOpener grades the method behind each game and exercise against published research, and prints the grade on it. Some grades are low. We print those too.",
    },
    stats: { games: "games", exercises: "exercises", methods: "methods behind them", trials: "trials linked on this page" },
    labels: {
      kicker: "The labels",
      title: (n: number) => `${Word(n)} labels, and what each one means.`,
      lead: (g: number, e: number) => `All ${g} games and ${e} exercises carry one. The bars show how many carry each.`,
      games: "Games",
      exercises: "Exercises",
      bar: (label: string, g: number, e: number) => `${label}: ${many(g, "game", "games")} and ${many(e, "exercise", "exercises")}`,
      none: "None",
    },
    honest: {
      kicker: "Read the labels with care",
      title: "What a label does not say.",
      items: [
        { b: "A label grades the method, as trials tested it.", t: "It does not grade IOpener's own version. That has not been through its own trial yet." },
        { b: "A label is not a promise.", t: "Trials report averages. They cannot say what will happen for one person." },
        { b: "\"Strong with supervision\" means with a therapist.", t: "Home practice alone is not proven for those methods. The app says so on the label." },
        { b: "Low labels stay in view.", t: (n: number) => `${Word(n)} games and exercises carry the label Limited or Unproven. They stay in the library, and each one says what it is.` },
      ] as { b: string; t: string | ((n: number) => string) }[],
    },
    mechanisms: {
      kicker: "The methods",
      title: (n: number) => `The ${n} methods behind the library.`,
      lead: "A method is the idea a game or exercise is built on. The evidence belongs to the method, so every game built on it carries the same label.",
      cols: { method: "Method", label: "Label", basis: "What the label rests on", games: "Games", exercises: "Exercises" },
    },
    trials: {
      kicker: "The trials",
      title: "The research behind the labels, with links.",
      lead: "These are the trials the labels rest on, including the ones that found nothing. Each line gives who was studied, what was found and where to read it.",
      found: "Found",
      limit: "Limit",
      read: "Read the source",
      readOf: (name: string) => `Read the source for ${name}`,
      /* Quoted from refs/IOpener-evidence-framework.md and refs/IOpener-concept.md. Change a figure only with its source. */
      groups: [
        {
          title: "Lazy eye",
          items: [
            { name: "Luminopia trial", who: "Children aged 4 to 7 watched two-eye video for 1 hour a day, 6 days a week.", found: "At 12 weeks they had gained 1.8 lines on the letter chart, against 0.8 lines with glasses alone.", href: "https://cdn.clinicaltrials.gov/large-docs/17/NCT06380517/Prot_000.pdf", source: "Summarised in the PEDIG ATS23 protocol" },
            { name: "CureSight trial", who: "Children aged 4 to under 9 watched two-eye video through red-cyan glasses on an ordinary screen, 90 minutes a day, 5 days a week, against patching for 2 hours a day.", found: "At 16 weeks the two groups had improved by about the same amount. A later trial in 197 children confirmed it.", href: "https://www.aaojournal.org/article/S0161-6420(22)00835-1/fulltext", source: "Ophthalmology, 2023", more: { label: "The later trial", href: "https://www.nature.com/articles/s41598-026-60632-5" } },
            { name: "Pooled analysis of 14 trials", who: "Two-eye video against patching in 1,100 children.", found: "No significant difference between the two. Children who kept to the plan did better on two-eye video.", limit: "This shows the two are about equal. It does not show that video is better.", href: "https://www.sciencedirect.com/science/article/abs/pii/S0161642025006803", source: "Ophthalmology, 2025" },
            { name: "PEDIG falling-blocks game trial", who: "Children aged 5 to 12 played one two-eye game for 1 hour a day, against patching for 2 hours a day.", found: "At 16 weeks patching had done better: 1.35 lines against 1.05. Only 22% of children finished more than three-quarters of the play they were set.", limit: "This is why two-eye games carry a lower label than two-eye video. The method was the same; the children stopped playing.", href: "https://www.aao.org/eyenet/article/binocular-ipad-game-vs-part-time-patching-amblyopi", source: "PEDIG ATS18, summary" },
            { name: "BRAVO trial", who: "115 people aged 7 to 55 played the falling-blocks game or a placebo game for 6 weeks.", found: "No significant difference between the two games.", href: "https://jamanetwork.com/journals/jamaophthalmology/fullarticle/2666808", source: "JAMA Ophthalmology, 2018" },
            { name: "Glasses alone", who: "84 children aged 3 to 6 with a lazy eye wore their new glasses and did nothing else.", found: "They gained 2.9 lines on average, and 27% of them no longer had a lazy eye.", limit: "This is why glasses come first, before any training.", href: "https://www.sciencedirect.com/science/article/abs/pii/S016164200600385X", source: "PEDIG, Ophthalmology" },
            { name: "MOTAS patching study", who: "Children whose patching hours were measured by a sensor in the patch.", found: "They did about 48% of the hours they were set. Most of the gain came in the first 6 weeks, and more than 2 hours a day did no better.", href: "https://pubmed.ncbi.nlm.nih.gov/15326120/", source: "MOTAS dose-response study" },
            { name: "Training in adults, pooled trials", who: "Trials of perceptual learning and video-game training covering 422 adults with a lazy eye.", found: "Vision improved with training. Two-eye and one-eye training gained about the same.", href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12006629/", source: "Meta-analysis, 2025" },
          ],
        },
        {
          title: "Convergence",
          items: [
            { name: "CITT", who: "221 children aged 9 to 17 followed one of four plans for 12 weeks.", found: "Successful or improved: 73% with weekly therapist sessions plus home practice, 43% with pencil push-ups, 33% with home computer therapy and 35% with placebo therapy.", limit: "Home computer therapy on its own did no better than placebo. This is why the method is labelled strong only with supervision.", href: "https://pubmed.ncbi.nlm.nih.gov/18852411/", source: "Archives of Ophthalmology, 2008", more: { label: "Full text", href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2779032/" } },
            { name: "CINAPS", who: "50 adults aged 18 to 32 had 12 one-hour sessions with a therapist, or placebo therapy.", found: "The measured signs improved more with real therapy. Symptoms improved equally in both groups.", limit: "Shown for what was measured, not for how people felt.", href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7744390/", source: "CINAPS clinical outcomes, 2020" },
            { name: "Digital and virtual-reality training, pooled", who: "4 trials with 184 participants.", found: "A small change in one measure. No significant effect on near point or on fusion range.", limit: "Early evidence only.", href: "https://pubmed.ncbi.nlm.nih.gov/42042228/", source: "Meta-analysis, 2026" },
          ],
        },
        {
          title: "Squint, and recovery after injury",
          items: [
            { name: "Therapy for a squint that comes and goes", who: "36 children aged 6 to under 18 had therapy with a therapist, or were watched.", found: "Control of the squint at distance was better by 0.9 points on a scale of 0 to 5.", limit: "One small trial, with a therapist.", href: "https://pubmed.ncbi.nlm.nih.gov/38146812/", source: "Randomised trial, 2024" },
            { name: "CONCUSS", who: "106 people aged 11 to 25 with a vision problem after concussion.", found: "79% improved with six weeks of therapy with a therapist, against 13% of those waiting.", limit: "Supervised therapy. Home practice alone was not tested.", href: "https://www.aoa.org/news/clinical-eye-care/diseases-and-conditions/vision-therapy-yields-faster-recovery-from-concussion-related-eye-condition", source: "Trial summary, American Optometric Association", more: { label: "Full paper", href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12591301/" } },
            { name: "Eye-Search", who: "78 people with half-field loss after stroke used a free web therapy.", found: "Search into the blind side sped up by 24% after 800 trials over 11 days.", limit: "It trains searching. It does not bring back the lost field.", href: "https://discovery.ucl.ac.uk/1462660/", source: "University College London" },
          ],
        },
        {
          title: "Daily habits and check-ups",
          items: [
            { name: "Outdoor time and short sight", who: "1,903 children. Some classes had an extra 40 minutes outdoors each school day.", found: "Over three years, short sight started in 30.4% of them, against 39.5% of the others.", limit: "The evidence is for when short sight starts, not for glasses a child already wears.", href: "https://jamanetwork.com/journals/jama/fullarticle/2441261", source: "JAMA", more: { label: "Trial summary", href: "https://reviewofmm.com/effect-of-time-spent-outdoors-on-the-development-of-myopia/" } },
            { name: "Enforced screen breaks", who: "29 screen users with symptoms used software that made them take look-away breaks.", found: "Strain and dry-eye scores improved within two weeks.", limit: "The gains were gone a week after the reminders stopped. A lab study of 30 adults found that 20-second breaks made no difference over a 40-minute task.", href: "https://www.sciencedirect.com/science/article/pii/S1367048422001990", source: "Trial, 2023", more: { label: "The lab study", href: "https://www.healio.com/news/optometry/20230120/study-provides-little-or-no-support-that-20second-breaks-alleviate-digital-eye-strain" } },
            { name: "Blink training", who: "40 students used a blink-training app.", found: "Symptoms and tear stability improved at 30 days.", limit: "Part of the gain was lost by day 60.", href: "https://www.nature.com/articles/s41746-025-02053-8", source: "npj Digital Medicine" },
            { name: "Letter test on a phone", who: "233 people took a phone letter test and a clinic chart test.", found: "The two agreed to within one line.", limit: "That was a different app. IOpener's check-ups have not been compared with a clinic yet.", href: "https://peekvision.org/resources/research/validating-our-vision-test/", source: "Peek Vision" },
          ],
        },
      ] as { title: string; items: Trial[] }[],
    },
    refuse: {
      kicker: "What the evidence does not support",
      title: "Claims IOpener will not make.",
      lead: "Each of these is said somewhere about eye training. The trials do not back them.",
      items: [
        { claim: "Home software alone treats convergence insufficiency in children.", why: "In the CITT trial it did no better than placebo therapy. What worked was weekly sessions with a therapist plus home practice.", href: "https://pubmed.ncbi.nlm.nih.gov/18852411/" },
        { claim: "Eye-teaming therapy improves reading.", why: "A trial found no advantage over placebo therapy for reading comprehension.", href: "https://eyewiki.org/Convergence_Insufficiency" },
        { claim: "Two-eye therapy beats patching.", why: "The Cochrane review found one trial that qualified, and no difference.", href: "https://discovery.ucl.ac.uk/id/eprint/10144211/" },
        { claim: "Eye exercises remove the need for glasses.", why: "None of the trials on this page tested or supports this.", href: null },
        { claim: "Exercises straighten a squint that is always there.", why: "We found no trial showing that any exercise does this.", href: null },
      ] as { claim: string; why: string; href: string | null }[],
      source: "Source",
    },
  },

  /* ───────────── /library ───────────── */
  library: {
    meta: { title: "Library", description: "Every game and exercise in IOpener, each with its evidence label. Filter by programme and by evidence." },
    hero: {
      kicker: "Library",
      title: "The whole library, in the open.",
      lead: (g: number, e: number) => `${g} games and ${e} exercises. Each card says who it is for and how strong its evidence is. Opening one takes you into the app.`,
    },
    filters: {
      title: "Filter the library",
      tag: "Programme",
      evidence: "Evidence",
      kind: "Show",
      allEvidence: "All labels",
      kinds: { all: "Games and exercises", games: "Games", exercises: "Exercises" },
      clear: "Clear the filters",
    },
    games: { title: "Games", shown: (n: number, all: number) => `${n} of ${all} shown`, none: "No games match these filters." },
    exercises: { title: "Exercises", shown: (n: number, all: number) => `${n} of ${all} shown`, none: "No exercises match these filters.", noGroup: "This filter is for games. No exercise group carries it." },
    card: { for: "For", gear: "Gear", playsOn: "Plays on", session: "Session", dose: "Dose", thumb: (name: string) => `A scene from ${name}, drawn in cyan, red and white on black` },
    built: "Playable now",
    opensApp: "Cards open in the app. You may be asked to sign in.",
  },

  /* ───────────── /safety ───────────── */
  safety: {
    meta: { title: "Safety", description: "The rules IOpener enforces. Questions before training, an eye doctor first for warning signs, a daily limit, no screen sessions for the very young, a stop button, and no dose set by AI." },
    hero: {
      kicker: "Safety",
      title: "The rules the app will not bend.",
      lead: "These limits are built into the app. No setting, reward or AI can raise them.",
    },
    facts: {
      cap: { unit: "minutes a day, at most" },
      age: { unit: "no screen sessions under this age" },
      questions: { unit: "safety questions before training" },
      stop: { unit: "symptoms the stop button asks about" },
    },
    rules: {
      kicker: "The rules",
      title: "What the app checks, and what it refuses.",
    },
    questions: {
      title: "Questions before training",
      body: (n: number) => `Before any training programme starts, a guardian answers ${word(n)} safety questions. They are asked again whenever something changes.`,
      list: "The questions",
      yes: "A yes to any one means an eye doctor comes before training. Programmes stay closed. Check-ups, breaks and outdoor time still work.",
      never: "A no to all of them is not an all-clear. These questions are not an eye test.",
    },
    doctor: {
      title: "An eye doctor first",
      body: "Pain, flashes, a sudden change or new double vision needs an eye doctor before any training. The check asks about these for each eye.",
      urgent: "If the change was sudden, or the pain is strong, get medical help today.",
    },
    cap: {
      title: (max: number) => `Never more than ${max} minutes a day`,
      body: "Nobody trains for longer than this in one day, whatever the programme says. The Train ring closes when the day's practice is done and cannot be overfilled.",
      why: "More is not better. The trials set a dose, and nothing in IOpener rewards going past it.",
    },
    age: {
      title: (age: number) => `No screen sessions under ${age}`,
      body: "Games, two-eye video, check-ups and the check itself stay closed for the very young. Exercises away from the screen stay open, with a grown-up.",
    },
    stop: {
      title: "The stop button",
      body: "Every session screen has one button that ends the session at once. It does not wait for an answer.",
      asks: "Then it asks what you felt:",
      doctor: (symptoms: string) => `After ${symptoms}:`,
      or: " or ",
      rest: "After any of the others:",
      log: "The stop is recorded, and a linked counsellor can see it.",
    },
    flash: {
      title: "No flashing content",
      body: "Nothing in a game flashes, strobes or swaps a pattern back and forth. There are no full-screen flashes. This is a rule for every game in the library.",
    },
    counsellor: {
      title: "Counsellor-only programmes",
      body: (names: string) => `The ${names} programmes open only when a verified eye counsellor is linked to the member and has set the dose.`,
      why: "These can do harm without supervision. Training a squint alone can cause lasting double vision, and new symptoms after a head injury or a stroke need a doctor to look at them first.",
    },
    ai: {
      title: "AI never sets a dose",
      body: "Minutes come from the programme, which takes them from a published trial, or from a linked counsellor. Nothing else can change them.",
      never: ["AI never diagnoses.", "AI never says your eyes are healthy.", "AI never sets or changes a dose."],
    },
    consent: {
      title: "A child needs a guardian",
      body: "A child trains only after a parent or guardian has agreed, and that guardian can take the agreement back at any time. A child has no sign-in of their own.",
    },
    order: {
      kicker: "Before every session",
      title: "The order the app checks, every time you press Start.",
      lead: "The first check that fails stops the session, and the screen says why in one line.",
      steps: {
        under_age: "Is this person old enough for a screen session?",
        doctor_first: "Has a warning sign been reported? Then an eye doctor comes first.",
        needs_consent: "For a child: has a guardian agreed?",
        awaiting_counsellor: "For a counsellor-led programme: has the counsellor set the dose?",
        daily_cap: "Is the daily limit already reached?",
        programme_done: "Is today's practice for the programme already done?",
      },
      then: "Only then does the session start, for the minutes that are left.",
    },
    not: {
      title: "What IOpener is not",
      body: "IOpener is not a medical device. It does not diagnose, treat or cure any condition, and it does not replace an eye exam, glasses, a patch, drops or surgery.",
    },
  },

  /* ───────────── /for-counsellors and /for-sponsors ───────────── */
  counsellors: {
    meta: { title: "For counsellors", description: "For optometrists, orthoptists and ophthalmologists: what a linked counsellor sees in IOpener, what stays hidden, and how to take part." },
    hero: {
      kicker: "For eye counsellors",
      title: "Home practice you can set and review.",
      lead: "IOpener is free for families and free for you. A family asks to link one member to you. Once you accept, you see that member's results and set the dose for the programmes only a counsellor can open.",
      who: "For optometrists, orthoptists and ophthalmologists.",
      cta: "Write to us",
    },
    sees: {
      kicker: "What you see",
      title: "Linked members only.",
      can: {
        title: "You see",
        items: [
          "The members a family has linked to you, after you accept each request.",
          "That member's eye settings and check-up results, each compared with their own first result.",
          "The days they practised, and any session stopped by a symptom.",
          "Your own notes on that member.",
        ],
      },
      cannot: {
        title: "You do not see",
        items: [
          "Anyone who is not linked to you, including the rest of the same family.",
          "Anything about a member while a request is still waiting: only who is asking.",
          "Anything once the link has ended.",
          "Camera pictures. They never leave the family's device.",
        ],
      },
    },
    does: {
      kicker: "What you do",
      title: "Set the dose. Nobody else can.",
      items: [
        { b: "You set the minutes.", t: (max: number, names: string) => `For the ${names} programmes, you set the minutes a day and the days a week. The app will not accept more than ${max} minutes a day.` },
        { b: "Trial doses stay fixed.", t: "Where a programme takes its dose from a published trial, a counsellor cannot change it." },
        { b: "Every change is recorded.", t: "The app keeps a record of who set a dose and when." },
      ] as { b: string; t: string | ((max: number, names: string) => string) }[],
    },
    steps: {
      kicker: "How to take part",
      title: "Three steps.",
      items: [
        { title: "Write to us", body: "Use the form below. Tell us where you practise." },
        { title: "We check your registration", body: "A person on the IOpener team checks your professional registration before any family can link to you." },
        { title: "Families link to you", body: "A family types your email to ask for a link. You accept or decline each request." },
      ],
    },
    limits: {
      title: "Said plainly",
      items: [
        "IOpener is a practice and tracking tool. It is not a medical device and it does not diagnose.",
        "A check-up at home is not a clinic measure. Treat it as a trend, not a reading.",
        "IOpener's own version of these methods has not been through its own trial yet.",
      ],
    },
  },
  sponsors: {
    meta: { title: "For sponsors and schools", description: "For schools, clinics and community groups that support families: what a sponsor sees in IOpener (counts only), what it never sees, and how to take part." },
    hero: {
      kicker: "For sponsors and schools",
      title: "Support families. See counts, never people.",
      lead: "A school, an eye clinic or a community group can open groups for the families it supports and pass on red-cyan glasses. What comes back is counts: how many households joined and how many kept practising.",
      cta: "Write to us",
    },
    sees: {
      kicker: "What you see",
      title: (min: number) => `Counts only, and never under ${word(min)} households.`,
      can: {
        title: "You see",
        items: [
          "How many households joined each of your groups.",
          "How many were active in the last week, and on how many days they practised.",
          "Where each pair of glasses you gave is on its journey from child to child.",
        ],
      },
      cannot: {
        title: "You never see",
        items: [
          "A family's name, or a child's name.",
          "Any check-up result, eye setting or session.",
          (min: number) => `Any count that covers fewer than ${word(min)} households. It stays hidden, so no family can be picked out.`,
          "Advertising space. There is none in IOpener.",
        ] as (string | ((min: number) => string))[],
      },
      example: {
        title: "What a small group looks like",
        few: "Not enough families yet",
        fewBody: (min: number) => `Numbers show once ${word(min)} households have joined.`,
      },
    },
    steps: {
      kicker: "How to take part",
      title: "Three steps.",
      items: [
        { title: "Write to us", body: "Use the form below. Say who you are and which families you hope to support." },
        { title: "We check your organisation", body: "A person on the IOpener team approves each sponsor. Until then the portal shows your status and little else." },
        { title: "Open a group and share its code", body: "A group is a join code you give to families: a class, a camp or a year. A family types the code to join. Joining is their choice." },
      ],
    },
    schools: {
      kicker: "For schools",
      title: "A class can take part together.",
      items: [
        { b: "Outdoor time as a class.", t: "The child myopia programme counts daylight time outdoors. A class can log an outdoor period together." },
        { b: "Classes compared by counts.", t: (min: number) => `A class is compared with another only when it has at least ${word(min)} households, and only by totals and averages.` },
        { b: "No child is named.", t: "A teacher never sees one child's results, and children are never ranked by name." },
      ] as { b: string; t: string | ((min: number) => string) }[],
    },
  },
  enquiry: {
    kicker: "Get in touch",
    title: "Write to us",
    lead: "A person reads every message. We answer by email.",
    adults: (age: number) => `This form is for adults only. If you are under ${age}, please ask a parent or guardian to write.`,
    fields: { name: "Your name", organisation: "Organisation", organisationHint: "Optional", email: "Email", kind: "You are writing as", message: "Your message", adult: (age: number) => `I am ${age} or older.` },
    kinds: { counsellor: "An eye counsellor", sponsor: "A sponsor or community group", school: "A school", wish_jam: "A developer or student, about Wish Jam", other: "Someone else" } satisfies Record<EnquiryKind, string>,
    /** The hidden field. A person never sees or hears this label. */
    trap: "Leave this box empty",
    send: "Send",
    sending: "Sending",
    use: "We use what you write here only to answer you. It is kept with the IOpener team and is never shared or used for advertising.",
    result: {
      sent: "Thank you. Your message has reached the IOpener team, and a person will answer by email.",
      invalid: "Some things need another look:",
      limit: (n: number) => `This email has written ${word(n)} times today, which is the limit for one day. We have those messages. Please write again tomorrow.`,
      failed: "The message could not be sent. Nothing was saved. Please try again.",
    },
    problems: {
      name: (max: number) => `Type your name, up to ${max} letters.`,
      organisation: (max: number) => `Keep the organisation to ${max} letters.`,
      email: "Type a full email address.",
      kind: "Choose who you are writing as.",
      message: (max: number) => `Write a message, up to ${max.toLocaleString("en-IN")} letters.`,
      adult: (age: number) => `Tick the box to say you are ${age} or older.`,
    } satisfies Record<EnquiryField, string | ((max: number) => string)>,
  },

  /* ───────────── /about ───────────── */
  about: {
    meta: { title: "About", description: "Why IOpener exists: free, built on published research, open at its core, and private by design." },
    hero: {
      kicker: "About",
      title: "Eye care at home, for every family.",
      lead: "IOpener is a free app for looking after eyes at home, with an open-source core. It tracks, tests and trains, and it says plainly how strong the evidence is for everything in it.",
    },
    why: {
      kicker: "Why it exists",
      title: "The method is a way of drawing a picture.",
      body: [
        "The home eye training with the strongest trial evidence works by showing each eye its own part of one picture. That is a way of drawing. It needs a screen and a pair of red-cyan glasses.",
        "A way of drawing can be shared. So IOpener shares it: with every family, on the screens they already own.",
        "The hard part is keeping going. In the trials, the children who kept to the plan did better. So IOpener is built like a fitness app: rings to close, many games instead of one, and a family doing it together.",
      ],
    },
    pillars: {
      kicker: "What it stands on",
      title: (n: number) => `${Word(n)} things that will not change.`,
      items: [
        { title: "Free", body: "Free to use, for every family, for good. No ads, no shop, and nothing in the app to buy." },
        { title: "Open at the core", body: "The engine, the check-ups, the doses and the safety rules are open source. Any clinic or researcher can check them or improve them. Some games, the stories and the phone and TV apps are not open." },
        { title: "Built on published research", body: "Every game and exercise carries a label that says how strong the evidence is for its method. Low labels are printed too." },
        { title: "Privacy first", body: "Camera pictures never leave your device. A child is a profile inside a parent's account, with a birth year and no email. Sponsors see counts only." },
      ],
    },
    who: {
      kicker: "Who it is for",
      title: "Anyone with eyes, and the family around them.",
      body: (programmes: number, minAge: number) => `IOpener has ${word(programmes)} programmes, from everyday eye fitness to practice for a named condition. Some open only with an eye counsellor. Screen sessions start at age ${minAge}.`,
    },
    not: {
      kicker: "What it is not",
      title: "Not a doctor, and not a medical device.",
      items: [
        "IOpener does not diagnose, treat or cure any condition.",
        "It does not replace an eye exam, glasses, a patch, drops or surgery.",
        "A check-up at home never gives an all-clear. Regular visits to an eye doctor still matter.",
        "Its own version of these methods has not been through its own trial yet. The labels grade the methods as others tested them.",
      ],
    },
    open: {
      kicker: "Built in the open",
      title: "Still being built, and we say where.",
      body: "The web app works today. The phone app and the TV app are being built. On this site and in the app, hatching marks what is not built or not measured yet.",
    },
  },

  /* ───────────── legal drafts ───────────── */
  legal: {
    draft: "Draft. A lawyer must review this before launch.",
    updated: "This page describes what the app does today. Parts marked \"being built\" do not exist yet.",
    contents: "On this page",
    related: "Related pages",
    privacy: {
      meta: { title: "Privacy", description: "A plain-language draft of how IOpener handles your family's information: what is stored, what never leaves your device, and who can see what." },
      title: "Privacy",
      lead: "This page says what IOpener stores, what it never takes, and who can see what. It is written to match what the app really does today.",
      sections: [
        {
          id: "short", title: "The short version",
          list: [
            "Camera pictures and photos never leave your device. Only the numbers worked out from them are stored.",
            "A child is a profile inside a parent's account. A child has no email and no sign-in, and only the year of birth is stored.",
            "There is no advertising in IOpener, and no advertising data is collected.",
            "There are no analytics on child profiles.",
            "Sponsors see counts only. A linked counsellor sees only the member linked to them.",
            `A guardian can download a copy of the family's data, and can delete one profile or everything. A deletion waits ${WAIT_DAYS} days first, so that it can be cancelled.`,
          ],
        },
        {
          id: "stored", title: "What IOpener stores",
          body: ["IOpener stores what it needs to run the app for your family, and no more."],
          list: [
            "The household: its name, and the name and email of each grown-up who signs in.",
            "Profiles: a name, whether it is an adult or a child, and for a child the year of birth.",
            "Eye settings: which eye is weaker, the contrast for the stronger eye, and the letter and target sizes.",
            "Check-up results: the number each check-up measured, and when.",
            "Practice: which game or exercise was done, for how many minutes, the score, and whether the session was stopped by a symptom.",
            "The day's rings: breaks taken, minutes of practice, and minutes outdoors.",
            "Care away from the screen that a guardian logged: patch time, glasses wear, drops and time outdoors, and the plan an eye doctor gave.",
            "If your family links a counsellor: the link, and the notes the counsellor writes about the member.",
            "The screens you set up: the size of the screen and how far you sit from it.",
            "Answers to the safety questions, and the consent a guardian gave for a child.",
            "What you choose to share in Together: stories, notes and encouragement.",
            "If you write to us from this site: your name, organisation, email and message.",
          ],
        },
        {
          id: "device", title: "What never leaves your device",
          list: [
            "Camera pictures. Any step that uses the camera works on the device and keeps only numbers.",
            "Photos.",
            "Your own films in the two-eye cinema. A film plays from your device and is never uploaded.",
          ],
        },
        {
          id: "who", title: "Who can see what",
          list: [
            "Guardians in your household see every profile in it.",
            "A cheer seat, such as a grandparent, can look and encourage. It cannot change anything.",
            "A counsellor sees one member only after your family asks to link and the counsellor accepts, and only while the link is active.",
            "A sponsor sees counts for its groups. It never sees a name, a result or a session, and never a count that covers too few households to be safe.",
            "The IOpener ops team sees households by counts: the household's name, how many profiles and seats it has, when it was last active and any open request. It does not see check-up results, eye settings or session detail.",
            "Every change made by staff, a counsellor or a sponsor is recorded with who made it.",
          ],
        },
        {
          id: "not", title: "What IOpener does not do",
          list: [
            "It does not sell or rent your information.",
            "It does not show advertising, and it does not build advertising profiles.",
            "It does not run analytics on child profiles.",
            "It does not read stress or mood from a face.",
          ],
        },
        {
          id: "ai", title: "AI",
          body: [
            "IOpener plans to use an AI service to help turn a shared story into clear steps, and to screen shared text for harm. This is being built.",
            "It will see only text a grown-up chose to share. It will never see a camera picture. AI never diagnoses and never sets or changes a dose.",
          ],
        },
        {
          id: "rights", title: "A copy of your data, and deleting it",
          body: [
            "A guardian can get a copy of everything stored for the family in Settings: one file, and a summary to read and print. The file is made at the moment you download it, and IOpener keeps no copy of it. It includes the notes a linked counsellor wrote about a family member.",
            `A guardian can delete one profile, or the account and every profile in it. Nothing is deleted for ${WAIT_DAYS} days, and a guardian can cancel in that time. After that it is removed for good, together with what the family shared in Together, and it cannot be brought back.`,
            "What stays after a deletion is a count that a deletion happened, with no name in it. A grown-up who also signs in as a counsellor, for a sponsor or as staff keeps that sign-in and loses only the seat in the family.",
            "The IOpener team sees that a request was made and where it stands. It does not see what a copy holds.",
          ],
        },
        {
          id: "signin", title: "Signing in",
          body: ["Sign-in with Google or with email is being built. Until it opens, the public demo uses made-up people and a made-up family."],
        },
        {
          id: "law", title: "The standard we are building toward",
          body: [
            "India's Digital Personal Data Protection Act, 2023, sets rules for handling personal data. For children it asks for verifiable consent from a parent or guardian, and it bars tracking children and advertising aimed at them.",
            "IOpener is being built toward that standard. We do not claim to meet it yet. This page is a draft, and a lawyer must review it before launch.",
          ],
        },
        {
          id: "contact", title: "Questions",
          body: ["A contact address for privacy questions will be added here before launch."],
        },
      ],
    },
    children: {
      meta: { title: "Children's data", description: "A plain-language draft of how IOpener handles a child's information: a profile inside a parent's account, the year of birth only, no advertising and no analytics." },
      title: "Children's data",
      lead: "Children are the people IOpener is most careful with. This page says how a child uses the app and what is kept about them.",
      sections: [
        {
          id: "profile", title: "A child is a profile, not an account",
          list: [
            "A child has no email and no sign-in. A parent or guardian adds the child as a profile inside their own account.",
            "Only the year of birth is stored. A full date of birth is never asked for.",
            "A child uses the app in child mode on a guardian's device. The grown-up screens are sealed, and a guardian leaves child mode with a PIN.",
          ],
        },
        {
          id: "consent", title: "A guardian agrees first",
          body: [
            "When a child's profile is added, a parent or guardian ticks a box. It says they are the child's parent or guardian and agree to the child using IOpener. The app records who agreed and when.",
            "A child cannot train until that is done, and the guardian can take the agreement back.",
            "India's Digital Personal Data Protection Act, 2023, asks for verifiable consent from a parent before a child's data is handled. A stronger, verifiable consent step is being built toward that standard. We do not claim to meet it yet.",
          ],
        },
        {
          id: "kept", title: "What is kept about a child",
          list: [
            "The name the family typed and the year of birth.",
            "Eye settings and check-up results, as numbers.",
            "Practice: what was done, for how long, and any session stopped by a symptom.",
            "Care a guardian logged: patch time, glasses worn, drops given, time outdoors.",
          ],
        },
        {
          id: "never", title: "What never happens",
          list: [
            "No advertising is shown to a child, and none is aimed at a child.",
            "No analytics run on a child's profile.",
            "No camera picture or photo of a child leaves the device.",
            "No child has a public profile. In leagues and class tables a child is never ranked by name.",
            "No sponsor, school or teacher sees one child's results. They see counts for a group, and only when the group is large enough.",
          ],
        },
        {
          id: "limits", title: "Limits that protect a child",
          list: [] as string[],
          /** Filled by the page from the engine's limits. */
          limits: {
            age: (age: number) => `No screen sessions under age ${age}.`,
            cap: (max: number) => `Never more than ${max} minutes of training in a day.`,
            stop: "Every session has a stop button, and a reported symptom ends the session at once.",
            counsellor: "Some programmes open only with a verified eye counsellor.",
          },
        },
        {
          id: "rights", title: "Seeing and deleting a child's data",
          body: [
            "A guardian can see everything kept about a child: in the app, and in the copy of the family's data from Settings. The copy includes any notes a linked counsellor wrote about the child.",
            `A guardian can delete a child's profile on its own, or the whole account, in Settings. A deletion waits ${WAIT_DAYS} days so that it can be cancelled. After that it is for good.`,
          ],
        },
      ],
    },
    terms: {
      meta: { title: "Terms", description: "A plain-language draft of the terms for using IOpener: what it is, what it is not, and what we ask of you." },
      title: "Terms",
      lead: "These are the terms for using IOpener, in plain words.",
      sections: [
        {
          id: "what", title: "What IOpener is",
          body: ["IOpener is a free app for tracking, testing and training eyes at home. Its core is open source."],
          list: [
            "It is not a medical device.",
            "It does not diagnose, treat or cure any condition.",
            "It does not replace an eye exam, glasses, a patch, drops, surgery or the advice of an eye doctor.",
          ],
        },
        {
          id: "who", title: "Who can use it",
          list: [
            "Adults can make an account and add profiles for their family.",
            "A child uses IOpener only as a profile inside a parent's or guardian's account, with that guardian's agreement.",
            "Some programmes open only when a verified eye counsellor is linked to the member.",
          ],
        },
        {
          id: "you", title: "What we ask of you",
          list: [
            "Answer the safety questions truthfully, and again when something changes.",
            "See an eye doctor first if there is pain, flashes, a sudden change or new double vision.",
            "Keep wearing glasses, a patch or drops an eye doctor prescribed. Do not stop any care because of IOpener.",
            "Stay beside a child who is practising.",
            "Press the stop button if something feels wrong, and rest.",
          ],
        },
        {
          id: "limits", title: "Limits the app enforces",
          list: [] as string[],
          limits: {
            age: (age: number) => `No screen sessions under age ${age}.`,
            cap: (max: number) => `Never more than ${max} minutes of training in a day.`,
            stop: "A reported symptom ends a session at once.",
            counsellor: "AI never sets or changes a dose.",
          },
        },
        {
          id: "evidence", title: "What the labels mean",
          body: [
            "Every game and exercise carries a label that says how strong the published evidence is for its method. A label is not a promise of a result for any person.",
            "IOpener's own version of these methods has not been through its own trial yet.",
          ],
        },
        {
          id: "share", title: "What you share",
          list: [
            "Ideas shared in Together are personal experience, not medical advice. Each one is screened for harm before others see it.",
            "Do not share anything that tells people to look at the sun, to stop prescribed care, to put anything in the eye, or that promises a cure.",
          ],
        },
        {
          id: "open", title: "Free, with an open-source core",
          body: ["IOpener is free to use. The code of its core (the engine, the check-ups, the doses and the safety rules) is open source; some games and apps are not. The licence will be named here before launch."],
        },
        {
          id: "changes", title: "Changes to these terms",
          body: ["This is a draft. A lawyer must review it before launch, and the reviewed terms will replace this page."],
        },
      ],
    },
  },

  /* ───────────── the enquiries room in the admin console ───────────── */
  admin: {
    enquiries: {
      sub: "Messages sent from the forms on the public site. Answer by email, then mark the message here.",
      stat: "waiting for an answer",
      open: "Waiting for an answer",
      handled: "Answered or closed",
      emptyOpen: { title: "Nothing is waiting", body: "New messages from the public site show here." },
      emptyHandled: "Nothing has been answered or closed yet.",
      kind: { counsellor: "Counsellor", sponsor: "Sponsor", school: "School", wish_jam: "Wish Jam builder", other: "Other" } as Record<string, string>,
      status: { new: "New", answered: "Answered", closed: "Closed" } satisfies Record<EnquiryStatus, string>,
      from: (name: string, organisation: string) => (organisation ? `${name}, ${organisation}` : name),
      sent: (when: string) => `Sent ${when}`,
      by: (who: string | null) => (who ? `Handled by ${who}` : "Handled by someone who has left"),
      emailOf: (name: string) => `Write an email to ${name}`,
      noOrganisation: "No organisation given",
      mark: { answered: "Mark answered", closed: "Close" } satisfies Record<Exclude<EnquiryStatus, "new">, string>,
      markOf: { answered: (name: string) => `Mark the message from ${name} answered`, closed: (name: string) => `Close the message from ${name}` },
      note: "Marking a message changes its status here. It sends nothing to the person who wrote.",
      cols: { from: "From", kind: "Kind", message: "Message", status: "Status" },
    },
  },
}));

/** Words for one evidence label where a page needs a short tone, not the full meaning. */
export const evidenceTone = (key: EvidenceKey): "ok" | "plain" | "warn" | "none" =>
  key === "strong" || key === "sup" ? "ok" : key === "moderate" ? "plain" : key === "limited" ? "warn" : "none";
