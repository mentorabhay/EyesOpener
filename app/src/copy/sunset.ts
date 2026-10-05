/** Words for the Sunset Rule: what the family reads when the day's practice is done. */
import { texts } from "@/i18n/texts";

export const sunset = texts("copy/sunset", "sunset", () => ({
  set: {
    title: "The sun has set on today's practice",
    done: "Today's practice minutes are used. The session ended by itself, and no new one starts until tomorrow.",
    cap: "The daily limit of 90 minutes is reached. No new session starts until tomorrow.",
    noMore: "There is no more to earn today: no points, no minutes and no place in the league.",
    league: "The league counts a finished day once. Staying longer adds nothing.",
    tomorrow: "Practice opens again tomorrow.",
  },
  outside: {
    go: (left: number) => (left > 0 ? `It may still be light out. The Light ring has ${left} ${left === 1 ? "minute" : "minutes"} open today. Go outside.` : "It may still be light out. Go outside."),
    full: "The Light ring is full too. The rest of the day is yours.",
    tomorrow: "It is late now. Daylight can wait for tomorrow.",
    hunt: "Start a sky hunt",
    log: "Log time outside",
  },
  rule: {
    title: "How the day closes",
    points: [
      "Each day has a set number of practice minutes. A programme sets them. With no programme the limit is 90 minutes.",
      "When they are used, the session ends by itself. No new one starts until tomorrow.",
      "Nothing rewards staying longer. The league counts a finished day once and never counts minutes.",
      "A day stopped with \"Stop, I feel unwell\" gets no sunset. That day is for rest.",
      "Time outside is never closed. It fills the Light ring.",
    ],
  },
  now: {
    title: "Today",
    open: (left: number) => `The sun is still up. ${left} ${left === 1 ? "minute" : "minutes"} of today's practice ${left === 1 ? "is" : "are"} left.`,
    tester: "This is a staff test household. The daily limits are off here, so no day closes and the sun does not set.",
    closed: "Practice is closed today for another reason, so there is no sunset.",
    start: "Go to today's practice",
  },
  stats: { minutes: "Practice minutes today", light: "Minutes outside today" },
  alt: {
    set: "The sun going down behind far hills.",
    up: (percent: number) => (percent <= 0 ? "The sun high in the sky over far hills." : `The sun in the sky over far hills, ${percent} percent of the way down.`),
  },
}));
