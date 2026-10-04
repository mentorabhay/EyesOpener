/** Words for the Train space: games, exercises, the two-eye cinema and the session clock. */
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export const train = {
  /* dose and session, shared by every activity */
  minutesLeft: (minutes: number) => `${plural(Math.ceil(minutes), "minute")} left today.`,
  noProgramme: "No programme sets your minutes, so the daily limit of 90 applies.",
  blocked: {
    under_age: "No screen sessions under age 4. Off-screen exercises are open.",
    doctor_first: "See an eye doctor before training. Check-ups still work.",
    daily_cap: "The daily limit of 90 minutes is reached. Come back tomorrow.",
    programme_done: "Today's practice is done. Come back tomorrow.",
    needs_consent: "A guardian needs to give consent before this child can train.",
    awaiting_counsellor: "Training opens when your linked counsellor sets the dose.",
    guardian_only: "Only a guardian or the member can start practice.",
    counsellor_plan: "This game is part of a counsellor's plan. It opens when a linked counsellor puts you on that programme.",
    unknown_item: "This activity is not in the library.",
    failed: "IOpener could not be reached. Check the connection and try again.",
  },
  clock: { left: "left", label: "Time left in this session" },
  score: "Score",
  starting: "Starting",
  saving: "Saving",
  finish: "Finish now",
  ended: {
    done: "Session finished. Well done.",
    daily_cap: "The daily limit of 90 minutes is reached.",
    stop_rule: "Stopped. Rest your eyes now.",
    left: "Finished early.",
  },
  saved: (seconds: number) => `${Math.floor(Math.round(seconds) / 60)} min ${Math.round(seconds) % 60} s added to today's practice.`,
  notSaved: "This session could not be saved, so it does not count toward today.",
  stop: {
    button: "Stop, I feel unwell",
    ask: "What did you feel?",
    symptoms: { double_vision: "Seeing double", headache: "Headache", eye_pain: "Eye pain", dizzy: "Dizzy", sick: "Feeling sick" },
    doctor: "Do not practise again today. See an eye doctor before the next session.",
    rest: "Do not practise again today. If it comes back in another session, tell an eye doctor.",
  },
  noEye: { body: "No eye settings yet, so this uses standard sizes and full contrast for both eyes.", cta: "Start onboarding" },

  /* game library */
  games: {
    title: "Games",
    sub: "Every game carries the evidence level of the method it uses. The strongest evidence comes first.",
    shown: "games shown",
    strong: "rest on strong evidence",
    evidence: [{ key: "strong", label: "Strong evidence" }, { key: "all", label: "All evidence levels" }],
    playable: "Playable",
    none: "No games match these filters.",
    showAll: "Show all evidence levels",
  },
  game: {
    crumb: "Games",
    kv: { play: "What you do", purpose: "Purpose", for: "Who it is for", playsOn: "Plays on", gear: "Gear", session: "Session" },
    evidence: "Evidence estimate",
    play: "Play",
    open: "Open",
    notBuilt: { title: "Not built yet", body: "This game is in the plan. It cannot be played yet." },
    start: "Start",
    again: "Play again",
  },

  /* exercises */
  exercises: {
    title: "Exercises",
    sub: "Short routines with simple gear. Each one says what it needs and how long it takes.",
    shown: "exercises shown",
    strong: "rest on strong evidence",
    allGroups: "All",
    labels: { for: "For", gear: "Gear", dose: "Dose" },
    none: "No exercises match these filters.",
  },
  exercise: {
    crumb: "Exercises",
    steps: "Steps",
    kv: { purpose: "Purpose", for: "Who it is for", gear: "Gear", dose: "Dose" },
    evidence: "Evidence estimate",
    timer: "Routine timer",
    timerNote: "Start the timer when you begin. Logging adds the timed minutes to today's practice.",
    elapsed: "Time on this routine",
    start: "Start timer",
    pause: "Stop timer",
    resume: "Start timer again",
    log: "Log this routine",
    again: "Do it again",
  },

  /* cinema */
  cinema: {
    title: "Two-eye cinema",
    sub: "Watch your own film through the red-cyan glasses. Both eyes see the picture; the stronger eye sees it fainter.",
    onDevice: "The film plays from this device and is never uploaded.",
    choose: "Choose a film from this device",
    none: "No film chosen yet.",
    film: "Your film, shown as a two-eye picture",
    contrast: "Stronger-eye contrast",
    fromProfile: "Set from your eye settings",
    standard: "Standard level until onboarding is done",
    watched: "Watched this session",
    clockNote: "The clock runs while the film plays. The film stops when today's minutes are used.",
  },
};
