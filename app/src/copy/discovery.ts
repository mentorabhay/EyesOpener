// Eyes Opener: Words for the Discovery Board: members vote on the next question the pooled records should answer.
/**
 * Words for the Discovery Board: members vote on the next question the pooled records should answer.
 * An answer says what the records showed and no more. It is a signal from members, never proof, and nothing here
 * may promise a result. Nobody is named to another family, and people are never ranked.
 */
import { texts } from "@/i18n/texts";

const votes = (n: number) => (n === 1 ? "1 vote" : `${n} votes`);
const members = (n: number) => (n === 1 ? "1 member" : `${n} members`);
const list = (names: string[]) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);

export const discovery = texts("copy/discovery", "discovery", () => ({
  stats: { rounds: "Rounds held", answered: "Questions answered" },
  votes,

  open: {
    title: (round: string) => `Vote now: ${round}`,
    closes: (day: string) => `You can vote or change your vote until the end of ${day}.`,
    pick: "Which question should the pooled records answer next?",
    votingAs: (name: string) => `You are voting as ${name}. Each profile has one vote.`,
    submit: "Vote",
    change: "Change my vote",
    yours: "Your vote",
    hidden: "The numbers are shown when the round has closed. Until then nobody sees how the others voted.",
    soFar: (n: number) => `${votes(n)} so far.`,
    none: { title: "No round is open", body: "The next round opens when new questions are ready. Earlier rounds are below." },
    saved: "Your vote is in. You can change it until the round closes.",
    changed: "Your vote was changed.",
    pickFirst: "Choose one question first.",
  },

  refused: {
    not_allowed: "Only a parent or guardian can vote. Each profile has one vote.",
    tester: "A staff test household does not vote, so the count stays the members' own.",
    needs_consent: (name: string) => `${name} is a child profile. A parent has to give permission before a child can take part. A parent can do that on the Family page.`,
    closed: "This round has closed. Votes can no longer be given or changed.",
    not_listed: "That question is not on the list of this round.",
  },

  how: {
    title: "How the board works",
    points: [
      "The IOpener team lists questions that the pooled records could answer. Members do not write questions in this version.",
      "Each profile has one vote in a round. You can change it until the round closes.",
      "After a round, the team works out the answer to the question with the most votes, if the records are enough.",
      "A question the records cannot answer stays unanswered. No answer is made up.",
      "Everyone who voted in the round is thanked for it. Nobody is named to another family.",
    ],
  },

  past: {
    title: "Earlier rounds",
    none: "No round has closed yet.",
    closed: (day: string) => `Closed on ${day}.`,
    total: (n: number) => `${votes(n)} in this round.`,
    tooFew: "Too few votes were given in this round to show numbers.",
    top: "Most votes",
    waiting: "Not answered yet. An answer comes only when the pooled records are enough to give one.",
    notAnswered: "Not answered.",
  },

  answer: {
    title: "What was found",
    sample: "Sample data",
    sampleNote: "This answer is sample data for the demo. It was not worked out from members' records and it is not a finding.",
    basis: "What it rests on",
    members: (n: number) => `The records of ${members(n)}.`,
    on: (day: string) => `Answered on ${day}.`,
    honest: "An answer from pooled records is a signal, not proof. It says what was seen across many members, not what will happen for one.",
  },

  credit: {
    you: "You helped find this.",
    /* for a cheer seat, and for a profile that did not vote itself */
    family: "Your family helped find this.",
    who: (names: string[]) => `${list(names)} voted in this round.`,
    round: (names: string[]) => `${list(names)} voted in this round. When its question is answered, you will be thanked here.`,
  },

  /* ───────────── staff: /admin/moderation/discovery ───────────── */
  staff: {
    title: "Discovery Board questions",
    link: "Discovery Board questions",
    sub: "Open a round, list the questions members can vote on, close it, and publish an answer worked out from the pooled records. Every change is written to the audit log.",
    back: "Back to moderation",
    stats: { open: "Rounds open", waiting: "Questions waiting for an answer" },
    counts: "You see how many votes each question has, never who voted.",

    newRound: {
      title: "Open a round",
      name: "Name of the round",
      nameHint: "Members see it. For example: October 2026",
      closesOn: "Last day to vote",
      submit: "Open the round",
      saved: "The round is open. Add its questions next.",
      invalid: "Give the round a name of 3 to 60 letters and a last day to vote.",
      one_at_a_time: "A round is already open. Close it before opening another.",
      bad_day: "The last day to vote must be between tomorrow and about three months from now.",
    },
    round: {
      open: (day: string) => `Open. Last day to vote: ${day}.`,
      closed: (day: string) => `Closed. Last day to vote was ${day}.`,
      votes: (n: number) => votes(n),
      noQuestions: "This round has no questions yet. Members see a round once it has one.",
      closing: "Closing the round",
      closesItself: (day: string) => `The round closes by itself at the end of ${day}. Close it by hand only to end it early.`,
      close: "Close the round now",
      closeWarn: "Votes become final at once and cannot be changed. A closed round cannot be opened again.",
      closeYes: "Close it",
    },
    question: {
      cols: { question: "Question", votes: "Votes", state: "State", action: "Action" },
      listed: "On the list",
      withdrawn: "Taken off",
      answered: "Answered",
      top: "Most votes",
      withdraw: "Take off the list",
      withdrawOf: (q: string) => `Take off the list: ${q}`,
      withdrawWarn: "Votes for this question are removed, and the members who gave them can vote again.",
      withdrawYes: "Take it off",
    },
    add: {
      title: "Add a question",
      question: "The question",
      questionHint: "One plain question the pooled records could answer. 10 to 160 letters.",
      why: "Why it is worth asking",
      whyHint: "One or two sentences, and which records could answer it. 10 to 300 letters.",
      submit: "Add the question",
      saved: "The question is on the list.",
      invalid: "The question needs 10 to 160 letters and the reason 10 to 300.",
      no_open_round: "This round is not open, so its list cannot be changed.",
      full: "This round already holds the most questions a round can have.",
      hazard: "These words are on the hazard list, so the question was not saved.",
      promise: "A question may not promise a result. Take out words such as cure, heal and guarantee.",
    },
    answer: {
      title: "Publish an answer",
      text: "What the records showed",
      textHint: "Plain words, 20 to 900 letters. Say what was seen and what it cannot tell. No cure wording.",
      basis: "What the answer rests on",
      basisHint: "Which records, from when to when.",
      members: "How many members' records",
      membersHint: (min: number) => `At least ${min}. An answer from fewer members is not published.`,
      submit: "Publish the answer",
      saved: "The answer is published. Everyone who voted in the round is thanked on their own page.",
      invalid: "The answer needs 20 to 900 letters, what it rests on 10 to 300, and a whole number of members.",
      gone: "That question could not be found.",
      round_open: "The round is still open. An answer is published after it has closed.",
      withdrawn: "This question was taken off the list.",
      already: "This question already has an answer. Take it down first to change it.",
      too_few_members: (min: number) => `An answer must rest on the records of at least ${min} members. With fewer, one or two members could turn it around.`,
      promise: "An answer may not claim a cure or a sure result. Take out words such as cure, heal and guarantee, and say only what the numbers showed.",
      hazard: "These words are on the hazard list, so the answer was not saved.",
      retract: "Take the answer down",
      retractOf: (q: string) => `Take the answer down: ${q}`,
      retractWarn: "The answer disappears for everyone at once. The question stays and can be answered again.",
      retractYes: "Take it down",
    },
    none: { title: "No rounds yet", body: "Open the first round below." },
  },

  /** For staff: the daily job. */
  job: {
    what: "Closes every Discovery Board round whose last day to vote has passed.",
    note: "Rounds checked.",
  },
}));
