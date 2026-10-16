// Eyes Opener: Words for Lights On Hour: one fixed hour a week when households practise at the same time.
/**
 * Words for Lights On Hour: one fixed hour a week when households practise at the same time.
 * The hour is company, not a reward: no line here offers points, extra minutes or a place in a list.
 * Nobody is named, and a small number of households is never shown.
 */
import { texts } from "@/i18n/texts";

const zone = "Asia/Kolkata";
const many = (n: number, one: string, more: string) => `${n} ${n === 1 ? one : more}`;
const households = (n: number) => many(n, "household", "households");

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/** "6:00 pm" for a starting hour of 18. */
export const clockHour = (hour: number) => `${hour % 12 === 0 ? 12 : hour % 12}:00 ${hour < 12 ? "am" : "pm"}`;
/** "Thursday 8 October 2026", for a moment or a YYYY-MM-DD day, read in India. */
export const longDay = (d: Date | string) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: zone }).format(typeof d === "string" ? new Date(`${d}T12:00:00+05:30`) : d).replace(",", "");

export const lightsOn = texts("copy/lights-on", "lightsOn", () => ({
  stats: {
    weekly: "Every week, India time",
    now: "Households practising now",
    until: "Until the next hour",
    tooFew: "Too few households are practising to show a number",
  },
  weekly: (weekday: number, hour: number) => `${WEEKDAYS[weekday]} ${clockHour(hour)}`,
  /** "3 days and 7 hours", "7 hours and 39 minutes", "12 minutes". Minutes are left out while it is more than a day away. */
  until: (p: { days: number; hours: number; minutes: number }) => {
    const parts = p.days > 0 ? [many(p.days, "day", "days"), ...(p.hours ? [many(p.hours, "hour", "hours")] : [])]
      : p.hours > 0 ? [many(p.hours, "hour", "hours"), ...(p.minutes ? [many(p.minutes, "minute", "minutes")] : [])]
      : [many(Math.max(1, p.minutes), "minute", "minutes")];
    return parts.join(" and ");
  },
  /** The short form for the big number at the top of the page. */
  untilShort: (p: { days: number; hours: number; minutes: number }) =>
    p.days > 0 ? `${p.days} d ${p.hours} h` : p.hours > 0 ? `${p.hours} h ${p.minutes} min` : `${Math.max(1, p.minutes)} min`,

  sky: {
    title: "The sky",
    on: "The hour is on",
    festivalOn: "The World Sight Day hour is on",
    waiting: "The sky is dark until the hour starts.",
    startsIn: (left: string) => `The next hour starts in ${left}.`,
    festivalNext: "The next hour is the World Sight Day festival.",
    count: (n: number) => `${households(n)} are practising in this hour.`,
    countOne: "A lantern is up for each of them.",
    more: (drawn: number) => `The sky shows ${drawn} lanterns. The number above counts them all.`,
    tooFew: (min: number) => `Other lanterns are shown once ${households(min)} are practising. Until then there is no number and no lantern but your own.`,
    yours: "The ringed lantern is your household's.",
    notYet: "Your household's lantern goes up when someone at home starts a practice session in this hour.",
    label: {
      waiting: "A dark sky with one unlit lantern on the ground. The hour has not started.",
      on: (n: number, own: boolean) => `A night sky with ${many(n, "lantern", "lanterns")}, one for each household practising now.${own ? " One of them is ringed: it is your household's." : ""}`,
      own: "A night sky with one lantern: your household's. Other lanterns are not shown yet.",
      empty: "A night sky with no lantern shown yet.",
      festival: "A string of small lights hangs across the top for World Sight Day.",
    },
    preview: "Staff look at the scene: these are sample lanterns. They are not a count of anybody.",
  },

  when: {
    title: "When it is",
    every: "Every week",
    everyValue: (weekday: number, hour: number) => `${WEEKDAYS[weekday]}, ${clockHour(hour)} to ${clockHour(hour + 1)}, India time`,
    next: "The next hour",
    nextValue: (day: string, hour: number) => `${day}, ${clockHour(hour)}`,
    nowValue: (hour: number) => `Now, until ${clockHour(hour + 1)}`,
    festival: "World Sight Day festival",
    festivalValue: (day: string, hour: number) => `${day}, ${clockHour(hour)}`,
    festivalNote: "World Sight Day is the second Thursday of October. The hour runs on that day too, at the same time, with a festival sky.",
    setBy: "The Eyes Opener team sets the hour. It is the same for every household.",
  },

  own: {
    title: "Your household",
    up: "Your lantern is up.",
    notUp: "Your lantern is not up yet.",
    wait: "Come back when the hour starts. Any practice session started or finished inside the hour puts your lantern up.",
    go: "Go to today's practice",
    lookOnly: "A lantern goes up when a family member practises. From this seat you can watch the sky.",
    doseNote: "Practise only what today's plan holds. If today's minutes are already used, watch the sky: the hour never adds minutes.",
  },

  what: {
    title: "What the hour is",
    points: [
      "One fixed hour a week when everyone who wants to practises at the same time.",
      "It is company. A shared appointment is easier to keep than a private one.",
      "It gives nothing extra: no points, no extra minutes, no streak and no place in a list.",
      "Missing it costs nothing. Practice on any other day counts exactly the same.",
    ],
  },

  shows: {
    title: "What the sky shows, and what it never shows",
    points: (min: number, seconds: number) => [
      "A number of households and one lantern for each. Never a name, a place or a result.",
      `Nothing at all while fewer than ${households(min)} are practising, except your own household's lantern.`,
      "A lantern is read from practice sessions that already exist. Taking part stores nothing new.",
      `The page asks again every ${seconds} seconds while the hour is on. Nothing flashes: a lantern rises once and stays.`,
    ],
    last: "Last time",
    lastValue: (day: string, n: number) => `${day}: ${households(n)} practised in the hour.`,
    lastFew: (day: string, min: number) => `${day}: fewer than ${households(min)} practised in the hour, so there is no number.`,
    lastFestival: "It was the World Sight Day hour.",
  },

  /** The staff side, in the moderation room. */
  staff: {
    title: "Lights On Hour",
    now: (weekday: number, hour: number) => `The hour is ${WEEKDAYS[weekday]}, ${clockHour(hour)} to ${clockHour(hour + 1)}, India time.`,
    isDefault: "This is the starting value. Nobody has changed it.",
    changed: (when: string) => `Last changed ${when}.`,
    weekday: "Day of the week",
    hour: "Starts at (India time)",
    hint: (from: number, to: number) => `From ${clockHour(from)} to ${clockHour(to)}, so that the hour ends by ${clockHour(to + 1)}.`,
    submit: "Set the hour",
    saved: "The hour is set. Every household sees the new time.",
    same: "That is the hour already.",
    invalid: "Choose a day of the week and a starting hour from the lists.",
    note: "Changing the hour changes it for everyone at once. Households are not sent a message about it.",
    festival: (day: string) => `The World Sight Day hour is worked out by the app: ${day}, at the same time of day.`,
    preview: "Look at the scene",
    previewFestival: "Look at the festival scene",
    previewNote: "The two looks open in your staff test household, with sample lanterns.",
  },
}));
