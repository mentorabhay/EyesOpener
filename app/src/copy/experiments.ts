/**
 * Words for community experiments: joining, the check-up before, the weeks, the check-up after, and the result.
 * A result from members is a signal, never proof, and nothing here may promise that an idea helps.
 * "Comparison group" is the group that carries on as usual. The words "control", "arm" and "baseline" stay in the code.
 */
import { texts } from "@/i18n/texts";

const weeksText = (n: number) => (n === 1 ? "1 week" : `${n} weeks`);
const daysText = (n: number) => (n === 1 ? "1 day" : `${n} days`);
const people = (n: number) => (n === 1 ? "1 member" : `${n} members`);

export const experiments = texts("copy/experiments", "experiments", () => ({
  title: "My experiments",
  sub: (name: string) => `The experiments ${name} has joined. Each one tests a member's idea with a check-up before and a check-up after.`,
  crumb: { href: "/together/experiments", label: "My experiments" },
  /** The card on the Together page. */
  hub: { name: "My experiments", what: "The experiments you joined: the check-up before, the weeks, and the check-up after." },
  stats: { running: "Running now", todo: "Check-ups to take" },
  none: { title: "No experiments yet", body: "Open an idea on the Together page and join its experiment. It will show here.", cta: "See the ideas" },
  honest: "An experiment tests an idea. It is not a treatment and it does not replace what your eye doctor asked for.",

  group: {
    label: "Your group",
    tried: { name: "Trying the idea", meaning: "You do what the idea says. The check-ups show what changed." },
    control: { name: "Carrying on as usual", meaning: "You do not start the idea. Your check-ups show what changes without it, so there is something to compare with." },
  },

  stage: {
    needs_before: "Before check-up needed",
    practising: (week: number, weeks: number) => `Week ${week} of ${weeks}`,
    after_due: "After check-up due",
    missed: "After check-up missed",
    finished: "Finished",
    left: "Left",
  },

  /** The four steps of every experiment. */
  step: { before: "Check-up before", weeks: "The weeks", after: "Check-up after", end: "The end" },
  stepState: { done: "Done", now: "Now", next: "Later" },

  /** A stored check-up, as one line. */
  result: (test: string, reading: string) => `${test}: ${reading}`,
  takenOn: (day: string) => `Taken on ${day}.`,
  eyeCounts: (eye: string) => `${eye}. This eye counts for the experiment, because it read worse at this check-up.`,

  before: {
    why: "The check-up before shows where you start. Take it before you change anything.",
    take: (test: string) => `Take the ${test} check-up. Then come back to this page.`,
    takeNow: "Take the check-up now",
    again: "Take it again",
    found: (test: string, day: string, reading: string) => `You took the ${test} check-up on ${day}. Result: ${reading}.`,
    use: "Use it as my check-up before",
    problem: {
      none: "",
      too_old: (test: string, days: number) => `Your last ${test} check-up is more than ${daysText(days)} old. Take it again, so that "before" means now.`,
      one_eye: "Your last check-up has a result for one eye only. Take it again for both eyes.",
      at_limit: (name: string) => `The last result is at the limit of what this screen can show. A change could not be seen from there, so it cannot be the check-up before. This experiment may not be able to measure a change for ${name} on this screen.`,
      screen_unknown: "The screen was measured again after your last check-up, or the check-up was taken on another screen. Take the check-up once more on this screen.",
    },
    noScreen: "This check-up is drawn on the screen, so the screen has to be measured first. Onboarding does that.",
    onboarding: "Start onboarding",
    added: "Added. The weeks start today.",
    refused: "That check-up cannot be used. Look at the note on the page and take the check-up again.",
  },

  weeks: {
    notStarted: "The weeks start on the day your check-up before is added.",
    tried: { doWhat: "What to do", howMuch: "How much" },
    control: "Carry on as you do now. Do not start the idea yet. It is yours to try when your check-up after is done.",
    day: (n: number, total: number) => `Day ${n} of ${total}`,
    progress: "Days of the experiment done",
    started: (day: string) => `Started on ${day}.`,
    done: (weeks: number) => `${weeksText(weeks)} done.`,
  },

  after: {
    notYet: (due: string, last: string) => `Due on ${due}. You can take it until ${last}.`,
    waits: "It opens when the weeks are done.",
    take: (test: string, last: string) => `Take the ${test} check-up by ${last}. Then come back to this page.`,
    sameScreen: "Use the same screen as before, and sit the same distance away.",
    first: "The first check-up you take from the due day on is the one that counts.",
    found: (test: string, day: string, reading: string) => `You took the ${test} check-up on ${day}. Result: ${reading}.`,
    use: "Use it as my check-up after",
    changed: "This check-up was taken with a different screen set-up from the check-up before.",
    distance: (then: number, now: number) => `You sat ${then} cm from the screen then, and ${now} cm now.`,
    size: "The screen itself measured a different size.",
    notComparable: "The two results may not be comparable, so the pair would not be counted in the group result.",
    retake: (last: string) => `If you can, measure the screen again the way it was, and take the check-up once more by ${last}.`,
    anyway: "Use it anyway. It will not be counted",
    screenUnknown: "The screen was measured again after your check-up, or the check-up was taken on another screen. Take the check-up once more on this screen.",
    missed: (last: string, name: string) => `The check-up after had to be taken by ${last}. It was not, so this experiment has ended for ${name} and nothing of it is counted.`,
    added: "Added. This experiment is finished.",
    refused: "That check-up cannot be used. Look at the note on the page.",
  },

  end: {
    waits: "After the check-up after, you see both results side by side.",
    before: "Before",
    after: "After",
    chance: "One person's change can be chance: a check-up varies a little from day to day. That is why everyone's results are added up.",
    counted: "Your two check-ups are counted in the group result. Nobody else sees your own numbers.",
    notCounted: {
      left: "",
      not_finished: "",
      result_gone: "One of the two check-ups is no longer stored, so this pair is not counted in the group result.",
      screen_changed: "The screen set-up changed between the two check-ups, so they may not be comparable. This pair is not counted in the group result.",
      no_consent: (name: string) => `Permission for ${name} has been taken back, so this pair is not counted in the group result.`,
    },
    yourTurn: "Now the idea is yours to try",
    yourTurnNote: "You carried on as usual so that others had something to compare with. Thank you. What you do now is not part of the experiment and is not counted.",
    seeResult: "See the result so far",
    seeIdea: "Open the idea",
  },

  closed: "This experiment has closed. Its result is final, so check-ups can no longer be added.",
  child: "A grown-up adds check-ups to an experiment and decides about leaving. You can still take the check-up.",
  consentGone: (name: string) => `Permission for ${name} has been taken back. ${name}'s check-ups are not counted, and none can be added, until a parent gives permission again on the Family page.`,
  family: "Open Family",
  blocked: { seat: "Your seat can look. A guardian takes the check-ups.", under_age: "No screen check-ups under age 4." },

  leave: {
    open: "Leave this experiment",
    what: "You can leave at any time, for any reason. Your check-ups stay in your own history. They are taken out of the group result at once and are not used again. You cannot join this same experiment a second time.",
    submit: "Leave the experiment",
    done: "You have left. Your check-ups were taken out of the group result.",
    left: (day: string) => `You left on ${day}. Your check-ups were taken out of the group result. The idea is still there to read.`,
    gone: "This experiment could not be found.",
  },

  /** Joining, on the idea's page. */
  join: {
    pick: "Choose your group",
    tried: {
      label: "Try the idea",
      hint: (test: string, weeks: number) => `Do what the idea says for ${weeksText(weeks)}. Take the ${test} check-up before and after.`,
    },
    control: {
      label: "Carry on as usual",
      hint: (test: string, weeks: number) =>
        `Do not start the idea. Carry on as you do now for ${weeksText(weeks)}, and take the ${test} check-up before and after. When your check-up after is done, the idea is yours to try.`,
    },
    why: "The second group matters. Check-up results often get better just because people take them twice. Only a group that did not try the idea can show how much.",
    choice: "You choose your own group. Nobody is put in a group by chance.",
    privacy: "Your two results are added to the group result without your name. Nobody else sees your own numbers. You can leave at any time, and your numbers are taken out.",
    submit: "Join the experiment",
    pickFirst: "Choose a group first.",
    joined: "You have joined. The next step is the check-up before.",
    already: "You have already joined this experiment.",
    leftBefore: "You left this experiment, so you cannot join it again. You can still read the idea and use it.",
    joinedAs: (day: string, group: string) => `You joined on ${day}. Your group: ${group}.`,
    needsConsent: (name: string) => `${name} is a child profile. A parent has to give permission before a child can join an experiment. A parent can do that on the Family page.`,
    open: "Open My experiments",
  },

  /** The pooled result, on the idea's page. */
  pooled: {
    title: "The result so far",
    none: "No number to show yet",
    noneWhy: (min: number) =>
      `A result is shown when ${people(min)} in each group have finished with two check-ups that can be compared. Until then there is no number: with few members, one or two could turn the result around.`,
    finished: "Finished so far",
    of: (n: number, min: number) => `${n} of ${min}`,
    tried: "Tried the idea",
    control: "Carried on as usual",
    now: "Taking part now",
    out: "Left, missed the check-up after, or not comparable",
    people,
    lean: {
      better: "Members who tried the idea changed for the better by more than members who carried on as usual. The whole likely range of the gap is on that side of zero.",
      unclear: "There is no clear difference between the two groups so far. The likely range of the gap reaches zero, so the true gap could be nothing at all.",
      worse: "Members who tried the idea did worse than members who carried on as usual. The whole likely range of the gap is on that side of zero. A person has been asked to look at this idea again.",
    },
    ownChoice: "Members chose their own group, so the two groups may differ in ways that have nothing to do with the idea.",
    spread: "How much members differed",
    method: "How this was worked out",
    steps: [
      "Each member has one number: the check-up after minus the check-up before. For a check-up that measures each eye, it is the eye that read worse at the start.",
      "Both check-ups must come from the same screen, the same distance away. A pair that does not is left out. So is anyone who left or missed the check-up after.",
      "The change is averaged in each group. The gap is the average of the group that tried the idea minus the average of the group that carried on as usual.",
      "The likely range is a 95% confidence interval for the gap (Welch's method). \"How much members differed\" is the standard deviation of the changes in each group.",
    ],
    unit: (unit: string) => `The numbers are in ${unit}.`,
    units: {
      logMAR: "the letter chart's unit: 0.1 is one line of the chart",
      logCS: "log units of contrast",
      log_ratio: "points of stronger-eye contrast, out of 100",
      arcsec: "arc seconds",
      prism_dioptre: "prism dioptres",
      cm: "centimetres",
      score: "points",
    } as Record<string, string>,
    computed: (day: string) => `Worked out on ${day}. It is worked out again every day.`,
  },

  /** For staff: the scheduled job and the note it leaves for a reviewer. */
  job: {
    what: "Works out the pooled result of every open experiment from the members who finished, and takes a result down when too few members are left.",
    note: "Pooled results worked out.",
    review: "The pooled result leans the wrong way: members who tried this idea did worse than the comparison group. Please look at the idea again.",
  },
}));
