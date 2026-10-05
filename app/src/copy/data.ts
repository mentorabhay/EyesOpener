/**
 * Words for a family's copy of its data and for deletion: the data section of Settings, the printable summary,
 * the text written inside the file itself, and the staff room that watches the requests.
 */
import { COPY_DAYS, WAIT_DAYS, type RequestState } from "@/lib/data/state";
import type { PartKey } from "@/lib/data/tables";

const zone = "Asia/Kolkata";
/** A date as the member reads it, for example 4 Oct 2026. */
export const day = (d: Date) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: zone }).format(d);
/** A date with the time, for example 4 Oct 2026, 9:12 am. */
export const dayTime = (d: Date) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: zone }).format(d);
const many = (n: number, one: string, more: string) => `${n} ${n === 1 ? one : more}`;

/** Why a request was refused, in the member's words. */
export type Refusal = "not_allowed" | "not_yours" | "already" | "last_one" | "all_going" | "not_found";

export const data = {
  title: "Your data",
  guardianOnly: "A guardian asks for a copy or for deletion.",
  demo: "This is the demo family, so you can try every step. Nothing is deleted in the demo: when the day comes, the request is closed instead.",
  tester: "This is your staff test household. A copy holds only what you made while testing. If you delete it, a new empty test household is made the next time you open the app.",
  askedBy: (name: string) => `Asked by ${name}.`,

  copy: {
    title: "A copy of your data",
    what: "One file with everything IOpener stores about this family, and a summary you can read and print.",
    ask: "Make a copy",
    again: "Make a new copy",
    ready: (until: string) => `Your copy is ready. You can download it until ${until}.`,
    downloaded: (on: string) => `Last downloaded on ${on}.`,
    download: "Download the file",
    summary: "Read the summary",
    asked: (on: string) => `Asked on ${on}. It will be ready within a day.`,
    note: `The file is made fresh each time you download it. IOpener keeps no copy of it. After ${COPY_DAYS} days, ask again.`,
    keepSafe: "The file holds your family's eye data. Keep it somewhere safe.",
  },

  all: {
    title: "Delete everything",
    what: "Delete this family's account, every profile in it and everything the family shared.",
    ask: "Delete everything",
    warn: `Nothing is deleted for ${WAIT_DAYS} days, and a guardian can cancel in that time. After that everything is removed for good: profiles, eye settings, results, practice, care logs, and the stories, ideas and notes you shared. It cannot be brought back. Make a copy first if you want to keep one.`,
    yes: `Yes, delete everything in ${WAIT_DAYS} days`,
    waiting: (date: string) => `Everything will be deleted on ${date}. You can cancel until then.`,
    due: "The waiting time is over. Everything is deleted within a day. You can still cancel now.",
    asked: (on: string) => `Deletion was asked for on ${on}. The date will be set within a day. You can cancel.`,
    cancel: "Cancel the deletion",
    cancelled: (on: string) => `The deletion was cancelled on ${on}. Nothing was deleted.`,
    look: (date: string) => `A guardian asked for everything to be deleted on ${date}.`,
  },

  one: {
    title: "Delete one profile",
    what: "Remove one family member's profile and everything kept about them. The rest of the family stays.",
    ask: "Delete a profile",
    pick: "Which profile?",
    choose: "Choose a profile",
    warn: `Nothing is deleted for ${WAIT_DAYS} days, and a guardian can cancel in that time. After that the profile and everything kept about it are removed for good: eye settings, results, practice, care logs, and what that family member shared. It cannot be brought back.`,
    yes: `Yes, delete this profile in ${WAIT_DAYS} days`,
    waiting: (name: string, date: string) => `${name}'s profile will be deleted on ${date}. You can cancel until then.`,
    due: (name: string) => `The waiting time is over. ${name}'s profile is deleted within a day. You can still cancel now.`,
    cancel: "Cancel",
    cancelOf: (name: string) => `Cancel the deletion of ${name}'s profile`,
    cancelled: (on: string) => `A profile deletion was cancelled on ${on}. Nothing was deleted.`,
    deleted: (on: string) => `A profile was deleted on ${on}.`,
    onlyOne: "This family has one profile. To remove it, delete everything instead.",
    allGoing: "Everything is set to be deleted, every profile included.",
    someone: "A family member",
  },

  result: {
    copyReady: "Your copy is ready.",
    allSet: (date: string) => `Everything will be deleted on ${date}. You can cancel until then.`,
    oneSet: (name: string, date: string) => `${name}'s profile will be deleted on ${date}. You can cancel until then.`,
    cancelled: "Cancelled. Nothing was deleted.",
    refused: {
      not_allowed: "A guardian asks for a copy or for deletion.",
      not_yours: "That profile is not in this family.",
      already: "A deletion is already waiting for this.",
      last_one: "At least one profile must stay. To remove every profile, delete everything instead.",
      all_going: "Everything is already set to be deleted, this profile included.",
      not_found: "That request is no longer open.",
    } satisfies Record<Refusal, string>,
  },

  /* ───────────── the printable summary ───────────── */
  summary: {
    title: "Summary of your data",
    sub: (family: string, made: string) => `What IOpener stores about ${family}, as it was on ${made}.`,
    back: "Settings",
    print: "Print this page",
    download: "Download the file",
    lead: "This page is the short form. The file holds every row behind each number here.",
    notMedical: "These are home measurements and your family's own records. They are not a diagnosis.",
    household: {
      title: "The household",
      name: "Name", language: "Language", languages: { en: "English" } as Record<string, string>, since: "Opened on", exitPin: "PIN to leave child mode",
      set: "Set", notSet: "Not set", screens: "Screens measured", groups: "Sponsor groups joined", invites: "Invite codes made",
    },
    people: {
      title: "Grown-ups who sign in", none: "Nobody signs in to this household.", hidden: "Email shown only to that person",
      line: (seat: string, email: string, since: string) => `${seat}. ${email}. Since ${since}.`,
    },
    seat: { guardian: "Guardian", co_guardian: "Co-guardian", circle: "Cheer seat", none: "No seat" } as Record<string, string>,
    profile: {
      kind: { adult: "Adult", child: "Child" } as Record<string, string>,
      born: (year: number | null) => (year ? `born ${year}` : "year of birth not given"),
      archived: "archived",
      rows: {
        programme: "Programmes", eye: "Eye settings", checkUps: "Check-up results", sessions: "Sessions", minutes: "Minutes practised",
        stopped: "Sessions stopped by a symptom", days: "Days with a ring record", care: "Care log entries", plans: "Care plans from an eye doctor",
        monitor: "Workday monitor samples", counsellors: "Counsellor links", notes: "Counsellor notes", shared: "Shared in Together", mail: "Notes and lights",
        consent: "Consent on record", safety: "Safety questions answered",
      },
      none: "None",
      programme: (name: string, status: string, week: number) => `${name} (${({ active: "on it now", paused: "paused", finished: "finished" } as Record<string, string>)[status] ?? status}, week ${week})`,
      counsellor: (name: string, status: string) => `${name}: ${({ pending: "waiting for the counsellor", active: "linked", ended: "ended" } as Record<string, string>)[status] ?? status}`,
      checkUp: (name: string, measured: string) => `${name}: ${measured}`,
      measured: (n: number, first: string, last: string) => (n === 1 ? `1, on ${first}` : `${n}, from ${first} to ${last}`),
      eye: (weak: string | null, contrast: string, on: string) => `${weak ? `Weaker eye: ${weak}` : "No weaker eye found"}. Stronger-eye contrast ${contrast}. Measured on ${on}.`,
      shared: (stories: number, ideas: number, notes: number) => [many(stories, "story", "stories"), many(ideas, "idea", "ideas"), many(notes, "note for a later week", "notes for later weeks")].join(", "),
      mail: (mail: number, lights: number) => [many(mail, "note", "notes"), many(lights, "light", "lights")].join(", "),
      consent: (n: number, live: number) => `${many(n, "record", "records")}, ${live} in force`,
      eyeName: { left: "left", right: "right" } as Record<string, string>,
    },
    notes: { title: "What a counsellor wrote", by: (name: string, on: string) => `${name}, ${on}` },
    parts: { title: "What is in the file", count: (n: number) => many(n, "row", "rows"), total: (n: number) => `${many(n, "row", "rows")} in all.` },
    leftOut: { title: "What is not in the file" },
  },

  /* ───────────── the words written inside the file ───────────── */
  file: {
    name: (date: string) => `iopener-family-data-${date}.json`,
    readme: {
      what: "This file is a copy of everything IOpener stores about your household, as it was at the moment in madeAt. It is yours to keep, to read, or to show an eye doctor.",
      read: [
        "The file is in JSON, a plain-text format. A text editor can open it, and so can most programs that work with data.",
        "data holds the parts. Each part is a list of rows. README.parts says in plain words what each part is and what its numbers mean.",
        "A time is written in Coordinated Universal Time (UTC), like 2026-10-05T04:30:00.000Z. India time is 5 hours 30 minutes ahead of it. A day written like 2026-10-05 is a calendar day in India.",
        "Every row keeps the id IOpener uses for it. A profileId points at a row in profiles, a deviceId at a row in screens, and the id of a grown-up at a row in people.",
        "A person or a family member outside your household is given by name only, never by id.",
        "names explains the short codes: which game or exercise an itemSlug is, what each number kept by a session means, which programme is which, and what each check-up measures.",
      ],
      leftOut: [
        "PINs. Only a scrambled form is stored, so the file says only whether a PIN is set.",
        "Camera pictures and photos. IOpener never stores them, so there are none to give.",
        "What other families shared, and pooled results that mix the numbers of many families.",
        "The staff record of what staff, counsellors and sponsors did in their own areas.",
      ],
      notMedical: "These are home measurements and a family's own records. They are not a diagnosis.",
    },
    outside: "A person at IOpener",
    counsellor: (name: string) => `${name} (counsellor)`,
    otherFamily: "A member of another family",
    kinds: { game: "Game", exercise: "Exercise", film: "Two-eye cinema", monitor: "Habit coaching by camera" } as Record<string, string>,
    measure: (label: string, unit: string) => (unit ? `${label} (${unit})` : label),
    cinema: "Two-eye cinema",
    monitor: "Workday monitor",
    /** A number every game keeps that the results screen does not label: the level the game stood at when the session ended. */
    level: "Level when the session ended (of 10)",
    parts: {
      household: { title: "Household", what: "The household's name and language, and whether a PIN to leave child mode is set." },
      people: { title: "Grown-ups who sign in", what: "Each grown-up who signs in to this household. Your own row is complete: name, email, seat (guardian, co_guardian or circle, the cheer seat) and any other role you hold. For the others the file gives the name, the seat and the day they joined, which is what the Family page shows you." },
      invites: { title: "Invites", what: "Codes a guardian made so another grown-up could join, and whether each was used." },
      profiles: { title: "Profiles", what: "Each family member: name, adult or child, the year of birth for a child, and the access level (0 everyone, 1 a named condition, 2 with a counsellor)." },
      consent: { title: "Consent", what: "The agreement a guardian gave for a child, who gave it, when, and when it was taken back if it was." },
      safetyAnswers: { title: "Safety questions", what: "Each time the six safety questions were answered: the answers, whether any was yes, and what followed." },
      screens: {
        title: "Screens", what: "Each screen the family measured.",
        units: { pxPerCm: "screen dots in one centimetre", distanceCm: "centimetres from the eyes to the screen", gamma: "the screen's brightness curve (2.2 is usual)", channelLeak: "share of each colour that leaks through the wrong lens, from 0 to 1", leakRedLens: "share of the blue-green ink that gets through the red lens, from 0 to 1 (empty until it is measured)", leakCyanLens: "share of the red ink that gets through the blue-green lens, from 0 to 1 (empty until it is measured)", inkBalance: "log10 of how much brighter the blue-green ink looks through its lens than the red ink through its lens (empty until it is measured)", colourRaw: "the matches a grown-up made by eye when measuring this screen's colours" },
      },
      onboardingRuns: { title: "Onboarding runs", what: "Each run of onboarding: the four yes or no answers for each eye, and the time each eye took.", units: { leftSeconds: "seconds", rightSeconds: "seconds" } },
      eyeSettings: {
        title: "Eye settings", what: "Every set of eye settings a profile has had. isCurrent marks the one in use.",
        units: {
          strongContrast: "contrast shown to the stronger eye, from 0.05 to 1 (1 is full contrast)", balanceLogRatio: "log10 of red contrast over blue-green contrast at balance",
          letterCm: "centimetres on the screen", targetCm: "centimetres on the screen", appTextPx: "pixels", cyanEye: "the eye behind the blue-green lens",
        },
      },
      checkUps: {
        title: "Check-up results", what: "The number each check-up measured, for which eye, and when. Each row names its own unit.",
        units: { value: "in the unit the row names: logMAR, logCS, log_ratio, arcsec (seconds of arc), prism_dioptre, cm or score", note: "floor means the screen could show nothing smaller; worse means below the largest step shown" },
      },
      programmes: { title: "Programmes", what: "Each programme a profile is on or was on, with its dose and week.", units: { dailyMinutes: "minutes a day", daysPerWeek: "days a week", week: "the week of the programme" } },
      sessions: {
        title: "Sessions", what: "Every sitting of a game, an exercise, a film or a check-up: what, when, for how long, the score, what was measured, and why it ended.",
        units: {
          minutes: "minutes", strongContrast: "contrast shown to the stronger eye, from 0.05 to 1", score: "points",
          detail: "the numbers the session kept, by key. names.items explains each key for each game and exercise",
          endReason: "done, daily_cap (the daily limit was reached), stop_rule (a symptom was reported) or left", ring: "the ring the minutes counted for: rest, train or light",
        },
      },
      days: { title: "Days", what: "The three rings for each day.", units: { restBreaks: "breaks taken", restGoal: "breaks", trainMinutes: "minutes", trainGoal: "minutes", lightMinutes: "minutes outdoors", lightGoal: "minutes", screenMinutes: "minutes" } },
      carePlans: { title: "Care plans", what: "What an eye doctor prescribed away from the screen, as a guardian typed it in. IOpener never sets or changes it.", units: { perDay: "hours a day for a patch or glasses; 1 for a day with drops", days: "days of the week, 0 Sunday to 6 Saturday; empty means every day" } },
      careLog: { title: "Care log", what: "The family's own log of patch time, glasses wear, drops, outdoor time and breaks.", units: { minutes: "minutes", count: "times" } },
      monitorSamples: { title: "Workday monitor", what: "One-minute numbers from the workday monitor. No picture is ever stored.", units: { distanceCm: "centimetres from the screen", blinksPerMin: "blinks a minute, full and half blinks together", halfBlinksPerMin: "of those, half blinks a minute (a rough figure)", posture: "share of the minute with the head level and not leaning in, from 0 to 1", minutesSinceBreak: "minutes of screen work since the last break", faceSeconds: "seconds of the minute with a face in view", prompt: "what fell due or was shown in that minute: break, close, blink or tilt", takenAt: "the start of the minute that was measured" } },
      streaks: { title: "Streaks", what: "Days in a row with practice, the longest run, and lights left to give.", units: { current: "days", longest: "days", lights: "lights" } },
      counsellorLinks: { title: "Counsellor links", what: "Each link between a profile and a counsellor, by the counsellor's name, and whether it is pending, active or ended." },
      counsellorNotes: { title: "Counsellor notes", what: "The notes a linked counsellor wrote about the member. linkId points at a row in counsellorLinks." },
      stories: { title: "Stories", what: "Stories a family member shared in Together, and whether each was published." },
      ideas: { title: "Ideas", what: "Ideas a family member wrote down as steps for others to try.", units: { weeks: "weeks" } },
      experiments: { title: "Experiments on your ideas", what: "The experiment that tests each of this family's ideas: whether it is open and when it closes. The pooled result is not here, because it mixes many families' numbers." },
      experimentPlaces: { title: "Places in experiments", what: "Each experiment a profile joined, by the idea's name: the group it was put in (tried or control) and which of its own check-ups were tied to it." },
      review: { title: "Review of what you shared", what: "Each time something this family shared waited for a person at IOpener to review it, why, and what was decided. refId is the id of the story, idea, note or mail." },
      lights: { title: "Lights", what: "Lights given and received, each with its short note. A light from or to another family names that family member only." },
      weekNotes: { title: "Notes for later weeks", what: "Notes a family member left for families who reach a later week of a programme." },
      mail: { title: "Mail", what: "Short notes sent inside the household, from a grown-up or a family member to a profile." },
      wallTiles: { title: "Tiles on the shared picture", what: "The tiles a profile sharpened on a month's shared picture." },
      gallery: { title: "Gallery", what: "Gallery pictures a profile unlocked." },
      glassesJourney: { title: "Travelling glasses", what: "This family's time with a pair of travelling glasses: the first name, city and note it left." },
      heroes: { title: "Drawn heroes", what: "The outline a child traced for Draw Your Hero. The photograph itself was never stored." },
      teams: { title: "Teams", what: "The league teams a profile is in." },
      teamMoves: { title: "Team changes", what: "Each time a profile joined, left or changed team." },
      sponsorGroups: { title: "Sponsor groups", what: "The sponsor groups this household joined. A sponsor sees counts for a group, never a household." },
      pushTokens: { title: "Phones that get messages", what: "The address each phone gave so the app can send it a message." },
      enquiries: { title: "Messages you sent from the site", what: "Messages sent from the forms on the public site with the email address you sign in with. Messages another grown-up of the household sent are not here: each person gets their own." },
      dataRequests: { title: "Data requests", what: "Every request for a copy or for deletion, this one included." },
      duets: { title: "Duet streaks", what: "Each duet a guardian set up: the two people who keep one streak and the day it started. The streak itself is not stored: it is counted from the days and notes in the other parts." },
      discoveryVotes: { title: "Discovery Board votes", what: "The question each profile voted for in a round of the Discovery Board, by the round's name and the question's words." },
      mapPlaces: { title: "Place on the map", what: "The household's place on the map, if a guardian joined it: the first three digits of the PIN code, the day it joined and the key of the welcome line it chose. The full PIN code was never asked for." },
      classMissions: { title: "Class missions", what: "Each class mission a guardian gave a child: the day it was given and the day it was run. Nothing about the class, the school or the classmates was ever stored." },
      wishes: { title: "Wishes for a game", what: "Each wish a guardian wrote for a child in Wish Jam: what the child loves, the short line, where the wish stands, and the name the child gave the game. code is the short code shown on the public wish list." },
      depthDays: { title: "First Depth Day", what: "The day a profile's Depth check-up first found depth after an earlier check-up had not, what that check-up found, and when the scene was first played.", units: { arcsec: "seconds of arc" } },
      keeperWelcomes: { title: "Welcomes you left", what: "The welcome a guardian left for a new family when a profile finished a course: the programme, the key of the line chosen from a fixed list, whether it has been given, and the key of the thank-you line that came back. Nothing says which family received it." },
      keeperAsks: { title: "Welcomes you asked for", what: "Each time a guardian asked for a welcome from a family that finished the same programme: the key of the line that was received and the key of the thank-you line sent back. Nothing says which family left it." },
      clipRuns: { title: "Clips finished", what: "Each clip a profile finished: the clip's code in the catalogue (C01 to C30 check the screen and the glasses, M01 to M70 measure the eyes), how it came out, the first number it stored and what it recorded on the way. A measurement a clip took is also in the check-up results, under its own key. No picture was ever stored.", units: { value: "in the unit the row names", outcome: "saved means a result or a screen value was stored; pass, note and fail say how a check of the screen came out; na means it did not apply to this screen", setKey: "the set it was played in: screen, weekly or visit; empty when it was run on its own" } },
    } satisfies Record<PartKey, { title: string; what: string; units?: Record<string, string> }>,
  },
};

/* ───────────── the staff room ───────────── */

type StaffState = RequestState | "household_deleted" | "profile_deleted";

export const dataAdmin = {
  sub: `Families ask in Settings. A copy is ready at once and can be downloaded for ${COPY_DAYS} days. A deletion waits ${WAIT_DAYS} days, then the daily job carries it out. This room shows where each request stands. It never shows what a copy holds.`,
  stat: "Deletions waiting",
  job: {
    title: "The daily job",
    run: "Run it now",
    runLabel: "Run the data requests job now",
    warn: "This deletes every household and profile whose waiting time is over. It cannot be undone.",
    yes: "Yes, run it",
    last: (when: string, who: string | null) => `Last run ${when}${who ? ` by ${who}` : ", by the scheduler"}.`,
    never: "It has not run yet.",
    failed: "The last run reported a problem.",
    counts: {
      copiesReady: "Copies made ready", copiesClosed: "Copies closed after their days ran out", datesSet: "Deletions given a date",
      householdsDeleted: "Households deleted", profilesDeleted: "Profiles deleted", kept: "Deletions closed without deleting", failed: "Deletions that failed",
      signInsRemoved: "Sign-in accounts removed from the sign-in service", signInsLeft: "Sign-in accounts still waiting to be removed",
    } as Record<string, string>,
    nothing: "Nothing was due.",
  },
  list: {
    title: "Requests",
    line: (what: string, asked: string) => `Asked for: ${what}. Asked on ${asked}.`,
    what: { export: "a copy of their data", household: "everything deleted", profile: "one profile deleted" },
    empty: { title: "No requests", body: "A request shows up here as soon as a family asks." },
    test: "Staff test household",
    demo: "Demo family",
  },
  state: {
    asked: () => "Asked. The job has not picked it up yet",
    ready: (r) => `Ready. Not downloaded yet. Open until ${r.until}`,
    downloaded: (r) => `Downloaded on ${r.on}. Open until ${r.until}`,
    expired: () => "Closed. Its days ran out",
    waiting: (r) => `Waiting. Deletes on ${r.until}`,
    due: () => "Due. The next run of the job deletes it",
    cancelled: (r) => `Cancelled on ${r.on}. Nothing was deleted`,
    deleted: (r) => `Profile deleted on ${r.on}`,
    household_deleted: (r) => `Household deleted on ${r.on}`,
    profile_deleted: (r) => `Profile deleted on ${r.on}`,
  } satisfies Record<StaffState, (r: { on: string; until: string }) => string>,
  tone: { asked: "warn", ready: "ok", downloaded: "ok", expired: "plain", waiting: "risk", due: "danger", cancelled: "plain", deleted: "plain" } satisfies Record<RequestState, "ok" | "warn" | "risk" | "danger" | "plain">,
  gone: {
    title: "Deleted in the last 90 days",
    about: "After a household is deleted only counts are kept. Its name went with it.",
    cols: { when: "Deleted on", what: "What", counts: "Counts" },
    household: "A household",
    testHousehold: "A staff test household",
    profile: "One profile",
    counts: (c: { profiles?: number; people?: number; peopleKept?: number; rows?: number }) =>
      [
        c.profiles !== undefined ? many(c.profiles, "profile", "profiles") : null,
        c.people !== undefined ? many(c.people, "sign-in removed", "sign-ins removed") : null,
        c.peopleKept ? many(c.peopleKept, "person kept for another role", "people kept for another role") : null,
        c.rows !== undefined ? many(c.rows, "row", "rows") : null,
      ].filter(Boolean).join(", "),
    empty: "No household or profile was deleted in the last 90 days.",
  },
};
