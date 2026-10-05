/** Words for the counsellor portal. */
import { MAX_DAILY_MINUTES } from "@/engine";
import { texts } from "@/i18n/texts";

export const day = (d: Date) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(d);
/** "4 Oct" from a stored day key (YYYY-MM-DD). */
export const shortDay = (key: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(key + "T00:00:00Z"));

export const counsellor = texts("copy/counsellor", "counsellor", () => ({
  area: "Counsellor portal",
  role: "Counsellor",
  nav: { title: "Your work", members: "Members", profile: "Your details", other: "Your other areas", family: "Family app", admin: "Admin console", sponsor: "Sponsor portal" },
  age: (age: number | null) => (age === null ? "Adult" : `${age} years old`),

  home: {
    title: "Members",
    sub: "A family asks to link a member to you. You see that member's results only after you accept.",
    stats: { linked: "linked members", waiting: "requests waiting" },
    requests: {
      title: "Requests waiting",
      about: "Until you accept, you see the request and nothing else.",
      none: "No requests are waiting.",
      line: (household: string, asked: string) => `${household} · asked on ${asked}`,
      accept: "Accept",
      decline: "Decline",
      acceptOf: (name: string) => `Accept the request for ${name}`,
      declineOf: (name: string) => `Decline the request for ${name}`,
    },
    linked: {
      title: "Linked members",
      none: { title: "No linked members yet", body: "When you accept a request, the member shows here." },
      programme: (name: string, week: number) => `${name} programme, week ${week}`,
      noProgramme: "Not on a programme",
      practised: (n: number) => `Practised on ${n} of the last 7 days`,
      practisedLabel: "Days practised in the last 7 days",
      open: "Open",
      openOf: (name: string) => `Open ${name}`,
    },
  },

  member: {
    crumb: "Members",
    sub: "You see this member because the family asked to link with you and you accepted.",
    about: {
      title: "About this member",
      rows: { name: "Name", age: "Age", level: "Access level", since: "Asked to link on" },
      levels: ["Open to everyone", "Named condition", "Linked to a counsellor"],
    },
    eye: {
      title: "Eye settings now",
      rows: { weak: "Weaker eye", contrast: "Stronger-eye contrast", letter: "Two-eye letter size", target: "Smallest game target", text: "App text size", measured: "Measured on" },
      name: { left: "Left", right: "Right" },
      noWeak: "None found",
      fromStart: "Starting level until the balance test is done",
      fromBalance: "From the balance test",
      mm: (cm: number) => `${(cm * 10).toFixed(1)} mm`,
      px: (n: number) => `${n} px`,
      none: { title: "No eye settings yet", body: "This member has not finished onboarding." },
    },
    results: {
      title: "Check-up results",
      about: "The first result of each test is the one every later result is compared with.",
      cols: { test: "Test", eye: "Eye", first: "First result", last: "Latest result", change: "Change" },
      eye: { left: "Left", right: "Right", both: "Both" },
      notMeasured: "Not measured yet",
      once: "One result so far",
      change: { better: "Better", worse: "Worse", same: "Same" },
      units: { arcsec: "arc seconds", prism_dioptre: "prism dioptres", cm: "cm", score: "points" } as Record<string, string>,
    },
    practice: {
      title: "Practice in the last 14 days",
      note: "Minutes of practice each day. Hatching is a day with none.",
      total: (days: number, minutes: number) => `Practised on ${days} of 14 days, ${minutes} minutes in all.`,
      bar: (dayText: string, minutes: number) => (minutes ? `${dayText}: ${minutes} minutes` : `${dayText}: none`),
    },
    stops: {
      title: "Sessions stopped by a symptom",
      about: "A session ends at once when the member reports one of these.",
      none: "No session was stopped by a symptom.",
      symptom: { double_vision: "Seeing double", headache: "Headache", eye_pain: "Eye pain", dizzy: "Dizzy", sick: "Feeling sick" } as Record<string, string>,
      unknown: "Symptom not recorded",
      kind: { game: "Game", exercise: "Exercise", film: "Two-eye cinema", test: "Check-up", monitor: "Workday monitor", outdoor: "Outdoor time" } as Record<string, string>,
      line: (item: string, when: string, minutes: number) => `${item} · ${when} · after ${minutes} minutes`,
    },
    dose: {
      title: "Dose",
      about: "Only a linked counsellor sets the dose for this programme. Nobody else and no AI can change it.",
      programme: (name: string, week: number) => `${name} programme, week ${week}`,
      now: (minutes: number, days: number) => `${minutes} minutes a day, ${days} days a week`,
      rows: { programme: "Programme", now: "Dose now", by: "Set by" },
      notSet: "No dose set yet",
      byYou: "You",
      byOther: "Another counsellor",
      byNobody: "Nobody yet",
      minutes: "Minutes a day",
      minutesHint: `From 1 to ${MAX_DAILY_MINUTES}`,
      days: "Days a week",
      daysHint: "From 1 to 7",
      save: "Save dose",
      result: {
        done: "Dose saved.",
        invalid: `Minutes must be a whole number from 1 to ${MAX_DAILY_MINUTES}. Days must be from 1 to 7.`,
        trial_dose: "This dose comes from published trials. A counsellor cannot change it.",
        no_enrolment: "This member is no longer on that programme.",
        not_found: "This link is no longer active.",
      },
      none: "This member is not on a programme where a counsellor sets the dose.",
      trial: (name: string) => `The ${name} programme uses a dose from published trials. A counsellor cannot change it.`,
    },
    notes: {
      title: "Your notes",
      family: "The family can read these notes: they are part of the copy of its data a guardian can download. They are deleted if the family deletes this profile.",
      label: "New note",
      add: "Save note",
      none: "No notes yet.",
      result: { done: "Note saved.", invalid: "Write a note of up to 2,000 letters.", not_found: "This link is no longer active." },
    },
    end: {
      title: "End this link",
      about: "After you end the link you no longer see this member. The family can ask again.",
      ask: "End link",
      warn: "You will stop seeing this member's results and practice. Your notes stay saved.",
      yes: "Yes, end the link",
    },
  },

  profile: {
    title: "Your details",
    sub: "What the IOpener team holds about you as a counsellor.",
    rows: { name: "Name", email: "Email", verified: "Checked by the IOpener team on" },
    about: "Families find you by this email when they ask to link a member.",
    change: "To change your name or email, write to the IOpener team.",
  },
}));
