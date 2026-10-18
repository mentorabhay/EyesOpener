/**
 * Words of reminders and notifications (src/lib/notify): the kinds of reminder, the words a due reminder shows in the
 * app and in its email, the notification list (/today/notifications) and the reminders page (/settings/reminders).
 */
import { texts } from "@/i18n/texts";

export const notify = texts("copy/notify", "notify", () => ({
  kinds: {
    practice: { name: "Practice", title: (who: string) => `Time for ${who}'s practice`, body: "Put the glasses on and play today's game. The clock stops by itself when the time is done.", href: "/today" },
    break: { name: "Eye break", title: () => "Time for an eye break", body: "Look at something far away for 20 seconds. Blink a few times.", href: "/today" },
    outside: { name: "Time outside", title: (who: string) => `Time outside for ${who}`, body: "Daylight is good for growing eyes. Log the time when you come back in.", href: "/today" },
    checkup: { name: "Check-up", title: (who: string) => `A check-up is due for ${who}`, body: "A check-up takes a few minutes. It keeps the games set to the eyes as they are now.", href: "/test" },
    glasses: { name: "Glasses", title: (who: string) => `Glasses on for ${who}`, body: "Wear the glasses the eye doctor gave, for the time the doctor said.", href: "/today" },
    drops: { name: "Eye drops", title: (who: string) => `Eye drops for ${who}`, body: "Give the drops as the eye doctor said. Eyes Opener never changes that plan.", href: "/today" },
    custom: { name: "My own words", title: (note: string) => note, body: "A reminder you set in Eyes Opener.", href: "/today" },
  } as Record<string, { name: string; title: (who: string) => string; body: string; href: string }>,

  /** Notices about community things a person takes part in. Names are used only inside one household. */
  community: {
    mail: { title: (from: string, to: string) => `${from} sent ${to} a note`, body: "Open Fusion Mail to read it.", href: "/together/mail" },
    light: { title: (to: string) => `Someone gave ${to} a light`, body: "A light is a small cheer from someone who practises too.", href: "/together/lights" },
    duet: { title: (a: string, b: string) => `A duet started: ${a} and ${b}`, body: "Practise on the same day to keep the duet's streak going.", href: "/together/duet" },
    welcomeGiven: { title: () => "Your welcome reached a new family", body: "A family just starting the same programme received the welcome you left.", href: "/together/graduation" },
    welcomeGot: { title: () => "A welcome from a family who finished", body: "A family who finished this programme left a welcome for you.", href: "/together/graduation" },
    thanks: { title: () => "A family said thank you", body: "The family who received your welcome sent a thank-you line.", href: "/together/graduation" },
    answer: { title: () => "A question you voted for has an answer", body: "Read the answer on the Discovery Board.", href: "/together/discovery" },
    result: { title: () => "An experiment you are in has a pooled result", body: "Thirty members in each group have counted results. Read what they show.", href: "/together/experiments" },
  },

  bell: {
    label: (n: number) => (n ? `Notifications, ${n} new` : "Notifications"),
    title: "Notifications",
    none: "Nothing new.",
    all: "See all",
    readAll: "Mark all as read",
  },

  list: {
    title: "Notifications",
    lead: "Reminders that came due, and news from the community things your family takes part in.",
    none: "Nothing here yet. Reminders and community news show up here as they come.",
    unread: "New",
    read: "Mark as read",
    readAll: "Mark all as read",
    open: "Open",
    reminders: "Set reminders",
    browserOn: "Show them on this computer too",
    browserOnText: "Your browser asks once. Notifications then pop up while Eyes Opener is open in a tab.",
    browserOff: "Shown on this computer",
    browserBlocked: "This browser blocks notifications from Eyes Opener. Allow them in the browser's site settings to see them here.",
    browserNone: "This browser cannot show notifications.",
  },

  page: {
    title: "Reminders",
    crumb: "Settings",
    lead: "Choose what each person is reminded of, when, and how. A reminder comes once on each day you pick, to the household's grown-ups.",
    rule: "A guardian, a co-guardian or a linked counsellor sets reminders. For a child, or a grown-up ticked as needing help, they are kept between 7:00 and 20:30.",
    needsHelp: "Needs a grown-up's help with reminders",
    needsHelpText: "Tick this for an older person or anyone who wants a guardian or counsellor to set their reminders.",
    needsHelpSave: "Save",
    setBy: { guardian: "Set by a guardian", co_guardian: "Set by a co-guardian", counsellor: "Set by the counsellor", circle: "Set by a family member" } as Record<string, string>,
    for: (name: string) => `Reminders for ${name}`,
    none: "No reminders yet.",
    add: "Add a reminder",
    save: "Save",
    remove: "Remove",
    pause: "Pause",
    resume: "Turn back on",
    paused: "Paused",
    kind: "What for",
    note: "Your words",
    notePlaceholder: "For example: Water the plants, then practice",
    at: "Time",
    days: "Days",
    every: "Every day",
    dayNames: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    inApp: "In the app",
    email: "By email",
    emailTo: "To each grown-up's own email address",
    emailOff: "Email is not set up on this site yet, so for now these reminders come in the app only.",
    notAllowed: "Only a guardian, a co-guardian or a counsellor linked to this person can set their reminders.",
    badProfile: "That person is not in this household.",
    badKind: "Choose what the reminder is for.",
    badTime: "Choose a time of day.",
    badDays: "Choose at least one day.",
    badNote: "Write a few words, up to 80 letters.",
    saved: "Saved.",
    removed: "Removed.",
    when: (at: string, days: string) => `${at} · ${days}`,
  },

  email: {
    subject: (title: string) => `Reminder: ${title}`,
    footer: "You get this because you set a reminder in Eyes Opener. Change or stop it under Settings, Reminders.",
    open: "Open Eyes Opener",
  },
}));
