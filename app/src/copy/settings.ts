import type { Blocked, LinkResult, TriageKey } from "@/lib/family";

/** A date as the member reads it, for example 4 Oct 2026. */
export const day = (d: Date) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(d);

export const settings = {
  title: "Settings",
  sub: (name: string) => `These are ${name}'s settings. Switch profile to see another family member.`,
  guardianOnly: "You can look at these settings. A guardian makes the changes.",

  eye: {
    title: "Eye settings",
    again: "Run onboarding again",
    empty: { title: "No eye settings yet", body: "Onboarding takes about five minutes and sets the contrast and sizes for every game.", cta: "Start onboarding" },
    rows: {
      weak: "Weaker eye", lens: "Glasses", contrast: "Stronger-eye contrast", letter: "Two-eye letter size",
      target: "Smallest game target", text: "App text size", faint: "Faint text", measured: "Measured on",
    },
    name: { left: "Left", right: "Right" },
    noWeak: "None found",
    lens: (cyan: "left" | "right") => `Blue-green lens over the ${cyan} eye, red lens over the ${cyan === "left" ? "right" : "left"} eye`,
    mm: (cm: number) => `${(cm * 10).toFixed(1)} mm`,
    px: (n: number) => `${n} pixels`,
    faint: { on: "Shown darker, so it is easier to read", off: "Shown as usual" },
  },

  family: {
    title: "Family profiles",
    add: "Add a profile",
    kind: { adult: "Adult", child: "Child" },
    line: (kind: string, age: number | null, level: number) => `${kind}, ${age === null ? "age not given" : `age ${age}`}, level ${level}`,
    active: "Active",
    switch: "Switch",
    switchTo: (name: string) => `Switch to ${name}`,
    under4: "Screen sessions stay closed until age 4.",
  },

  programme: {
    title: "Programme",
    rows: { name: "Programme", minutes: "Minutes a day", days: "Days a week", week: "Week", basis: "Where the dose comes from" },
    minutes: (n: number) => (n ? `${n} minutes` : "No training minutes"),
    waiting: "Waiting for your counsellor to set the dose",
    notSet: "Not set yet",
    leave: { ask: "Leave this programme", warn: "Your sessions and check-up results are kept. The week count starts again at week 1 if you come back.", yes: "Yes, leave" },
    pick: "Not on a programme yet. Pick one to start.",
    none: "Not on a programme yet.",
    levels: [
      { name: "Open to everyone", what: "Tracking, breaks, outdoor time and check-ups." },
      { name: "For a named condition", what: "Uses the dose from a published trial. A child needs a parent or guardian." },
      { name: "With a counsellor", what: "Your counsellor sets the dose. The app never sets it." },
    ],
    start: "Start",
    startOf: (name: string) => `Start ${name}`,
    blocked: {
      needs_consent: "A parent or guardian has not agreed to this profile yet.",
      needs_triage: "Answer six safety questions before starting one of these.",
      doctor_first: "See an eye doctor before training. Check-ups, breaks and outdoor time still work.",
      needs_counsellor: "Ask a counsellor to link first. These open when the counsellor accepts.",
    } satisfies Record<Blocked, string>,
    triageLink: "Safety questions",
  },

  counsellor: {
    title: "Counsellor",
    about: "A counsellor sets the dose for the squint, after-concussion and after-stroke programmes.",
    none: "No counsellor linked yet.",
    status: { pending: "Waiting for the counsellor", active: "Linked", ended: "Ended" },
    email: "Your counsellor's email",
    ask: "Ask to link",
    invalid: "Type a full email address.",
    result: {
      done: "Request sent. The link opens when the counsellor accepts.",
      counsellor_not_found: "No counsellor uses that email. Check the spelling with your counsellor.",
      already_linked: "There is already a link or a request with this counsellor.",
      not_yours: "That profile is not in this family.",
    } satisfies Record<LinkResult, string>,
  },

  devices: {
    title: "Devices",
    empty: { title: "No screen measured yet", body: "Onboarding measures your screen and how far you sit from it." },
    kind: { web: "Computer", phone: "Phone", tv: "TV" },
    line: (kind: string, pxPerCm: number, cm: number, date: string) => `${kind}. ${pxPerCm} dots per cm, viewed from ${cm} cm. Measured on ${date}.`,
  },

  data: {
    title: "Your data",
    export: { what: "An export asks for a copy of everything stored for this family; the request stays open here until the copy is ready.", ask: "Ask for an export" },
    delete: {
      what: "Deletion asks for this account and every profile in it to be removed for good; nothing is removed until the request is handled.",
      ask: "Ask for deletion", warn: "Deletion cannot be undone once it is handled.", yes: "Yes, ask for deletion",
    },
    open: (date: string) => `Asked on ${date}. Still open.`,
    guardianOnly: "A guardian asks for an export or for deletion.",
  },

  newProfile: {
    title: "Add a family profile",
    sub: "Each family member gets their own eye settings, programme and history. A child's profile lives inside your account, with no email of its own.",
    name: "Name",
    kind: "Who is this profile for?",
    birthYear: "Year of birth",
    birthYearNote: "Only the year is stored.",
    under4: "Screen sessions stay closed until age 4. You can still add the profile now.",
    consent: "I am this child's parent or guardian, and I agree to this child using IOpener.",
    save: "Add profile",
    cancel: "Cancel",
    errors: {
      name: "Type a name of up to 40 letters.",
      kind: "Choose adult or child.",
      birthYear: "Type the child's year of birth. A child profile is for someone under 18.",
      consent: "A parent or guardian must tick the box before a child's profile is added.",
    },
  },

  triage: {
    title: "Safety questions",
    guardianOnly: "A guardian answers the safety questions.",
    sub: (name: string) => `Answer for ${name}. A yes to any question means an eye doctor comes before training.`,
    lead: "Is any of these true right now?",
    again: "Answer again",
    againNote: "Answer again when something changes, or after an eye doctor has seen you.",
    questions: {
      sudden_change: "A sudden loss of vision, or a sudden change in vision",
      double_vision: "Double vision that is new",
      eye_pain: "Pain in an eye",
      flashes_curtain: "Flashes of light, or a shadow like a curtain over part of the vision",
      white_pupil: "A pupil that looks white in photos",
      head_injury: "A recent head injury, with changes in vision since",
    } satisfies Record<TriageKey, string>,
    yes: "Yes",
    no: "No",
    save: "Save answers",
    answered: (date: string) => `Answered on ${date}`,
    doctor: {
      title: "See an eye doctor first",
      body: "At least one answer was yes. That needs an eye doctor to look at it before any training. This is not a diagnosis: only a doctor can say what it means.",
      urgent: "If the change was sudden, or the pain is strong, get medical help today.",
      still: "Training programmes stay closed for now. Check-ups, breaks and outdoor time still work.",
      checkups: "Go to check-ups",
    },
    proceed: {
      title: "You can choose a programme",
      body: "Every answer was no, so a programme can start. These questions are not an eye test: regular visits to an eye doctor still matter.",
      cta: "Choose a programme",
    },
  },
};
