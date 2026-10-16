// Eyes Opener: Localized strings, user interface copy, and text dictionary for family.
import type { GroupResult, JoinRefusal } from "@/lib/family";
import { texts } from "@/i18n/texts";

const SEAT = { guardian: "Guardian", co_guardian: "Co-guardian", circle: "Cheer seat" };

export const family = texts("copy/family", "family", () => ({
  title: "Family",
  sub: "The children in this household, the people who can sign in, child mode and sponsor groups.",
  notAllowed: "Only a guardian can do this.",

  children: {
    none: "No child profiles yet. Add one in Settings.",
    age: (n: number | null) => (n === null ? "Child" : `Age ${n}`),
    rings: (rest: number, restGoal: number, train: number, trainGoal: number, light: number, lightGoal: number) =>
      `Today: ${rest} of ${restGoal} breaks, ${train} of ${trainGoal} training minutes, ${light} of ${lightGoal} minutes outdoors.`,
    rows: { streak: "Streak", programme: "Programme", lastCheck: "Last check-up" },
    streak: (n: number) => (n === 1 ? "1 day in a row" : `${n} days in a row`),
    programme: (name: string, week: number) => `${name}, week ${week}`,
    noProgramme: "Not on a programme",
    noCheck: "No check-up yet",
    consentBy: (name: string | null, date: string) => `Consent given by ${name ?? "a guardian"} on ${date}`,
    noConsent: "No consent yet. Programmes and child mode stay closed for this child until a guardian gives it.",
    withdraw: { ask: "Withdraw consent", warn: "Programmes and child mode close for this child until a guardian gives consent again. Nothing is deleted.", yes: "Yes, withdraw" },
    confirm: "I am this child's parent or guardian, and I agree to this child using Eyes Opener.",
    give: "Give consent",
  },

  people: {
    title: "People in this household",
    seat: SEAT,
    you: "You",
    invites: "Open invites",
    noInvites: "No open invites.",
    inviteFor: (seat: string, date: string) => `${seat}, made on ${date}`,
    how: "Give the code to the person. They sign in and type it on the Join page. A code works once.",
    revoke: "Revoke",
    revokeOf: (code: string) => `Revoke invite ${code}`,
    newLabel: "Invite someone as",
    seatWhat: { co_guardian: "Co-guardian: manages the family with you", circle: "Cheer seat: can look and encourage, nothing else" },
    create: "Make an invite code",
    guardianOnly: "Only the guardian invites people.",
  },

  childMode: {
    title: "Child mode",
    about: "Child mode keeps this device on one child's games and check-ups. The family screens stay closed until a grown-up types the exit PIN.",
    pinSet: "An exit PIN is set.",
    pinMissing: "No exit PIN yet. Set one before handing the device to a child.",
    pinLabel: (set: boolean) => (set ? "New exit PIN, 4 to 6 digits" : "Exit PIN, 4 to 6 digits"),
    pinSave: (set: boolean) => (set ? "Change PIN" : "Set PIN"),
    pinSaved: "Exit PIN saved.",
    pinBad: "Type 4 to 6 digits.",
    forgot: "If the PIN is forgotten, child mode ends by itself after 12 hours.",
    guardianOnly: "Only the guardian sets the exit PIN.",
    hand: (name: string) => `Hand this device to ${name}`,
    needsConsent: (name: string) => `${name} needs a guardian's consent first.`,
  },

  sponsor: {
    title: "Sponsor group",
    about: "A sponsor is a school, clinic or charity that supports families. A sponsor sees counts only, such as how many families are in its group. It never sees names or results.",
    none: "This household is not in a sponsor group.",
    group: (sponsor: string, date: string) => `${sponsor}. Joined on ${date}.`,
    leave: "Leave",
    leaveOf: (name: string) => `Leave ${name}`,
    code: "Group code",
    join: "Join group",
    result: {
      done: "You joined the group.",
      group_not_found: "No open group uses that code. Check it with your sponsor.",
      already_in: "This household is already in that group.",
    } satisfies Record<GroupResult, string>,
  },
}));

export const circle = texts("copy/family", "circle", () => ({
  title: "Cheer seat",
  sub: "See how practice is going and send some encouragement.",
  none: "No child profiles in this family yet.",
  rows: { streak: "Streak", week: "This week", note: "Last note" },
  streak: (n: number) => (n === 1 ? "1 day in a row" : `${n} days in a row`),
  days: (n: number) => `Practised on ${n} of the last 7 days`,
  note: (from: string, date: string) => `From ${from} on ${date}`,
  noNote: "No note yet",
  mail: "Send a note",
  lights: "Give a light",
}));

export const leave = texts("copy/family", "leave", () => ({
  title: "Leave child mode",
  sub: "For grown-ups. Type the exit PIN to open the family screens again.",
  pin: "Exit PIN",
  submit: "Leave child mode",
  wrong: "That is not the PIN. Try again.",
  locked: (minutes: number) => `Too many wrong tries. Try again in ${minutes === 1 ? "1 minute" : `${minutes} minutes`}.`,
}));

export const join = texts("copy/family", "join", () => ({
  title: "Join a household",
  sub: "A guardian gives you an invite code. Type it here to join their family.",
  code: "Invite code",
  submit: "Join",
  already: (household: string) => `You are already in a household: ${household}. One person can be in one household.`,
  home: "Go to your home page",
  noCode: "No invite code?",
  startOwn: "Start a family space of your own",
  result: {
    invite_not_found: "No open invite uses that code. Ask the guardian for a new one.",
    has_household: "You are already in a household.",
  } satisfies Record<JoinRefusal, string>,
}));
