// Eyes Opener: Words for Keeper Graduation. Finishing means the weeks were kept. It never says what changed in the eyes. .
/** Words for Keeper Graduation. Finishing means the weeks were kept. It never says what changed in the eyes. */
import type { KeeperRefusal, ThanksKey, WelcomeKey } from "@/lib/graduation";
import { texts } from "@/i18n/texts";

const many = (n: number, one: string, more: string) => `${n} ${n === 1 ? one : more}`;

export const graduation = texts("copy/graduation", "graduation", () => ({
  stats: { weeks: "Weeks kept", days: "Days with practice" },
  fromWeek: "Open your graduation",

  done: {
    title: (name: string, programme: string) => `${name} finished the ${programme} programme`,
    when: (weeks: number, date: string) => `The ${weeks} weeks ended on ${date}.`,
    careful: "Finishing means the weeks were kept. It does not say what changed in the eyes. An eye test says that.",
    next: "What to do next",
  },

  none: {
    title: "No finished programme yet",
    body: "The ceremony, the journey book and the keeper's welcome open when a programme with a set number of weeks has run all of them.",
    course: (week: number, weeks: number) => `This programme is in week ${week} of ${weeks}.`,
  },

  ceremony: {
    title: "The ceremony",
    how: "One lantern for each week. Your hero walks past them, and each one lights as it is passed. No glasses are needed.",
    play: "Play the ceremony",
    again: "Play it again",
    stop: "Stop",
    label: (weeks: number) => `A row of ${weeks} lanterns over a path, with a figure walking past them.`,
    /** Drawn inside the scene. */
    words: { kept: (weeks: number) => `${weeks} weeks kept` },
  },

  book: {
    title: "The journey book",
    what: "A record of the programme to print and keep: its weeks, the days with practice and what each check-up measured.",
    open: "Open the journey book",
    print: "Print the book",
    back: "Back to the graduation",
    head: (name: string) => `${name}'s journey book`,
    course: (programme: string, from: string, to: string) => `The ${programme} programme, ${from} to ${to}.`,
    made: (date: string) => `Printed from IOpener on ${date}.`,
    numbers: "The programme in numbers",
    weeks: "Weeks of the programme",
    practised: "Days with practice",
    finished: "Days with the day's practice done",
    weeksWith: "Weeks with at least one day of practice",
    stops: (n: number) => `On ${many(n, "day", "days")} a session was stopped because someone felt unwell. Stopping was the right thing to do.`,
    byWeek: "Week by week",
    week: "Week",
    weekDays: (practised: number) => many(practised, "day", "days"),
    weekAlt: (week: number, practised: number) => `Week ${week}: ${many(practised, "day", "days")} with practice`,
    noPractice: "No practice was recorded in this programme's weeks.",
    checkups: "What the home check-ups measured",
    checkup: "Check-up",
    window: (from: string, to: string) => `Check-ups taken from ${from} to ${to}: the programme and two weeks either side of it.`,
    first: "First",
    last: "Latest",
    taken: "Times taken",
    onlyOne: "Taken once",
    noCheckups: "No check-up was taken during the programme.",
    honest: "These are home measurements on a home screen. They say what was measured on each day. They do not say why a number moved, and they are not an eye test.",
    hero: "The hero",
    noHero: "No hero was drawn. This is IOpener's own figure.",
    whatNext: "IOpener cannot tell you what has changed in the eyes. Take this book, or the check-up summary, to an eye doctor.",
  },

  keeper: {
    title: "Become a keeper",
    what: "A keeper leaves one welcome for one family that is just starting this programme.",
    rules: [
      "You pick one line from a short list. Nobody types anything.",
      "The new family sees the line, and that it comes from a family that finished this programme. It does not see your name, your child, your town or any result.",
      "You see when the welcome was read, and a thank-you line if they send one. You do not see who they are.",
      "It goes only to a family that asked for a welcome.",
      "Being a keeper gives nothing else: no rank, and no say over anyone.",
    ],
    pick: "Choose your welcome",
    submit: "Leave this welcome",
    left: "Your welcome was left.",
    leftAndRead: "Your welcome was left. A new family was waiting, and it has it now.",
    yours: "The welcome you left",
    waiting: "It is waiting for a new family to ask.",
    given: (date: string) => `A new family received it on ${date}.`,
    thanksBack: "They sent back:",
    noThanks: "They have not sent a line back. They do not have to.",
    takeBack: { open: "Take the welcome back", warn: "No family has received it. Taking it back deletes it.", submit: "Take it back", done: "Your welcome was taken back." },
    viewOnly: "Only a guardian can leave a welcome.",
    lines: {
      first_weeks: "The first weeks were the hardest for us. After that it found its place in the day.",
      split_it: "We split the practice into short parts through the day. That is what kept us going.",
      rest_days: "We missed days too. Nothing was owed for them, and we started again the next day.",
      glasses: "The glasses felt strange for the first week. After that nobody noticed them.",
      not_alone: "You are not doing this alone. Another family did these same weeks before you.",
      small_days: "Some days were short and some were grumpy. Showing up was what counted.",
    } satisfies Record<WelcomeKey, string>,
    thanks: {
      thank_you: "Thank you. We read it together.",
      it_helped: "Thank you. It helped to hear from a family who did these weeks.",
      we_will: "Thank you. We will leave one for the next family when our weeks are done.",
    } satisfies Record<ThanksKey, string>,
  },

  welcome: {
    title: "A welcome from a keeper",
    what: "A keeper is a family that finished this programme. You can ask for one welcome from one of them.",
    rules: [
      "You get one line, picked from a short list. You see nothing about the family that left it.",
      "They do not see who you are. If you like, you can send back one thank-you line from a short list.",
    ],
    ask: "Ask for a welcome",
    asked: "You asked for a welcome.",
    askedAndGot: "A keeper's welcome was waiting. It is yours now.",
    waiting: (date: string) => `You asked on ${date}. No keeper has a welcome waiting just now. It shows here when one does.`,
    stop: { open: "Stop waiting", warn: "Your ask is deleted. You can ask again while the programme is new.", submit: "Stop waiting", done: "You are no longer waiting for a welcome." },
    from: (programme: string) => `From a family that finished the ${programme} programme`,
    received: (date: string) => `Received on ${date}.`,
    thank: "Send one line back",
    thankSubmit: "Send this line",
    thanked: "Your line was sent.",
    youSent: "You sent back:",
    notNew: (weeks: number, week: number) => `A welcome can be asked for in the first ${weeks} weeks of a programme. This one is in week ${week}.`,
    viewOnly: "Only a guardian can ask for a welcome.",
  },

  refused: {
    not_allowed: "Only a guardian can do this, and not in child mode.",
    tester: "A staff test household does not take part.",
    consent: "A guardian needs to give consent for this child first.",
    not_graduate: "No programme of this family member has run all its weeks.",
    not_on_course: "This family member is not on a programme with a set number of weeks.",
    not_new: "A welcome can be asked for only in the first weeks of a programme.",
    already: "That was already done.",
    bad_line: "Pick one of the lines from the list.",
    nothing: "There is nothing to change.",
    given: "It has already reached a family, so it cannot be taken back.",
  } satisfies Record<KeeperRefusal, string>,
}));
