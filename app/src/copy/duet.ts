// Eyes Opener: Words for Duet Streak: two people of different generations keep one streak.
/**
 * Words for Duet Streak: two people of different generations keep one streak.
 * A missed day is never blamed on anyone: no line here says who missed, and a day the stop rule ended is
 * called a rest day like any other. Nothing here promises a result.
 */
import { texts } from "@/i18n/texts";

const days = (n: number) => (n === 1 ? "1 day" : `${n} days`);

export const duet = texts("copy/duet", "duet", () => ({
  rule: "The streak grows on a day when both did their part. A rest day changes nothing. A day without both parts ends the run quietly, and what you reached stays.",

  stats: { current: "Days in a row now", longest: "Longest run", kept: "Days kept in all" },
  days,

  pair: (a: string, b: string) => `${a} and ${b}`,
  since: (day: string) => `Together since ${day}.`,

  today: {
    title: "Today",
    kept: "Today is kept. Both did their part.",
    open: "Today is still open.",
    rest: "Today is a rest day. The streak waits.",
    /* a day cannot be missed while it is still going */
    missed: "Today is still open.",
  },
  state: { done: "Done today", open: "Still to do today", rest: "Rest day", missed: "Still to do today" },

  /** What each one's part is, in one sentence. */
  part: {
    practice: (name: string, minutes: number) => `${name}: finish the day's practice (${minutes} minutes).`,
    care: (name: string) => `${name}: log one care routine, one break, or some time outdoors.`,
    note: (name: string, partner: string) => `${name}: send ${partner} one note.`,
  },
  noRecord: (name: string) => `${name} has no profile, so IOpener keeps no eye record for ${name}. A note is the part ${name} can do.`,
  go: { practice: "Open today's practice", care: "Open the exercises", note: "Send a note" },

  strip: {
    title: (n: number) => `The last ${days(n)}`,
    label: (kept: number, of: number) => `${kept} of the last ${days(of)} were kept`,
    key: "Filled: both did their part. Dashed: a rest day. Empty: a day without both parts. Ringed: today.",
    state: { kept: "kept", rest: "rest day", missed: "not kept", open: "today, still open" },
  },
  restart: (kept: number) => `A new run starts on the next day you both do your part. Your ${days(kept)} together stay.`,
  first: "The first day counts when both have done their part.",

  waits: (name: string) => `Permission for ${name} has been taken back. The duet waits, and nothing is counted, until a parent gives permission again on the Family page.`,

  none: {
    title: "No duet yet",
    guardian: "Choose two people of your family below. One of them is usually a child, the other a parent or a grandparent.",
    nobody: "A duet needs two people of different generations, such as a child and a grandparent. Add a profile on the Family page, or invite a grandparent to a cheer seat.",
    other: "A parent or guardian sets up a duet.",
  },

  how: {
    title: "How a duet works",
    points: [
      "Two people of different generations keep one streak. Each has a part of their own.",
      "Someone on a programme: the day's practice. Someone with a profile and no programme: a care routine, a break or time outdoors. A grown-up with no profile: one note to their partner.",
      "Rest days do not end the streak. A programme asks for some days a week; everyone else has one rest day a week.",
      "When a day is not kept, the page does not say why, and it never says whose part was missing.",
    ],
  },

  start: {
    title: "Start a duet",
    first: "First person",
    firstHint: "Someone with a profile in your family.",
    second: "Second person",
    secondHint: "Another profile, or a grown-up who signs in to your family and has no profile.",
    profiles: "Family profiles",
    people: "Grown-ups who sign in, with no profile",
    kind: { child: "child", adult: "grown-up", guardian: "guardian", co_guardian: "co-guardian", circle: "cheer seat" } as Record<string, string>,
    option: (name: string, kind: string) => `${name} (${kind})`,
    taken: (name: string, kind: string) => `${name} (${kind}), already in a duet`,
    submit: "Start the duet",
    started: (a: string, b: string) => `${a} and ${b} now keep one streak. It starts today.`,
    refused: {
      not_allowed: "Only a parent or guardian can set up a duet.",
      unknown: "Choose two people from the lists.",
      first_not_profile: "The first person needs a profile in your family.",
      same_person: "Choose two different people.",
      already_paired: "One of them is already in a duet. A person keeps one duet at a time.",
      needs_consent: "A child takes part only with a parent's permission. A parent can give it on the Family page.",
      same_generation: "A duet is for two people of different generations, such as a child and a grandparent. These two are about the same age.",
      cannot_tell: "IOpener cannot tell that these two are of different generations. Pair a child with a grown-up.",
    },
  },

  end: {
    open: "End this duet",
    warn: "The duet and its streak are removed. The days each of you did stay in your own records.",
    submit: "End the duet",
    done: "The duet has ended.",
    gone: "That duet could not be found.",
  },
}));
