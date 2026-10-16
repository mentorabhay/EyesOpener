// Eyes Opener: Words for First Depth Day. They say what a check-up found, never why, and never that it will stay. .
/** Words for First Depth Day. They say what a check-up found, never why, and never that it will stay. */
import { texts } from "@/i18n/texts";

const many = (n: number, one: string, more: string) => `${n} ${n === 1 ? one : more}`;
const step = (arcsec: number) => String(Math.round(arcsec * 10) / 10);

export const depthDay = texts("copy/depth-day", "depthDay", () => ({
  untested: {
    title: "No Depth check-up yet",
    body: "The Depth check-up shows four rings and asks which one floats nearer. It needs the red-cyan glasses and takes a few minutes.",
    cta: "Take the Depth check-up",
  },
  notYet: {
    title: "No check-up has found depth so far",
    taken: (n: number, date: string) => `${many(n, "Depth check-up", "Depth check-ups")} taken, the last on ${date}. ${n === 1 ? "It did not find" : "None found"} a ring that floats.`,
    common: "Many people with a lazy eye or a squint do not see this kind of depth. Some come to see it and some do not. Eyes Opener cannot tell which.",
    notAMark: "It is not a mark against anyone, and it does not mean the practice was done wrong.",
    kept: "If a check-up does find depth one day, the date is kept on this page.",
    every: (days: number) => `The Depth check-up comes round every ${days} days.`,
    cta: "Open the Depth check-up",
  },
  fromStart: {
    title: "Depth was there from the first check-up",
    body: (date: string, arcsec: number) => `Your first Depth check-up, on ${date}, already found depth at ${step(arcsec)} arc seconds.`,
    noDay: "So there is no first day to keep. The depth was there before Eyes Opener measured anything.",
    scene: "You can still watch the scene.",
  },
  first: {
    head: "First Depth Day",
    stat: "The day",
    found: (before: number) => `On this day a Depth check-up found a ring that floats, for the first time. ${many(before, "earlier check-up", "earlier check-ups")} had not.`,
    foundPlain: "On this day a Depth check-up found a ring that floats, for the first time.",
    step: (arcsec: number) => `It found depth at ${step(arcsec)} arc seconds.`,
    careful: "A check-up measures one day on one screen. It does not say why a result changed, and Eyes Opener does not claim to have caused it. An eye test can say more.",
    since: {
      none: "No Depth check-up has been taken since.",
      some: (checks: number, found: number) => `${many(checks, "check-up", "check-ups")} since then. ${found === checks ? (checks === 1 ? "It found depth too." : "All of them found depth too.") : `${found} of them found depth.`}`,
      latestNot: "The latest one did not find it. Results move from day to day, and one check-up is one day.",
    },
    kept: (next: string) => `The date is kept. On ${next} the Today page will remember it.`,
    years: (n: number) => `${many(n, "year", "years")} ago today.`,
  },

  scene: {
    title: "The scene",
    how: "Put the glasses on and press Play. Your hero floats in front of the screen. The stars sit far behind it.",
    play: "Play the scene",
    again: "Play it again",
    stop: "Stop the scene",
    ownHero: "This is the hero you made in Draw Your Hero.",
    noHero: "This is Eyes Opener's own figure. Make a hero in Draw Your Hero and the scene uses it.",
    heroLink: "Draw Your Hero",
    flat: "If it looks flat or doubled, that is all right. Rest your eyes and try another day.",
    stopIf: "Stop if you see double for more than a moment, or get a headache, eye pain, or feel dizzy or sick.",
    underAge: "No screen scenes under age 4. The date is kept all the same.",
    noEye: "This profile has no eye settings yet, so the scene uses standard sizes.",
    label: "A scene in depth: a figure in front, lanterns in the middle and stars far behind. It shows through red-cyan glasses.",
    /** Drawn inside the scene. */
    words: { title: "First Depth Day", noDay: "The depth scene" },
  },

  today: {
    fresh: (name: string, date: string) => `On ${date} a Depth check-up found depth for ${name} for the first time.`,
    freshLink: "See First Depth Day",
    years: (name: string, n: number) => `${many(n, "year", "years")} ago today, a Depth check-up first found depth for ${name}.`,
    yearsLink: "Open the day",
  },
}));
