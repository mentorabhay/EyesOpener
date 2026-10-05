/**
 * Discovery Board: members vote on the next question the pooled records should answer. The rules, pure.
 * Tested in discovery.test.ts; src/lib/discovery-data.ts reads and writes.
 *
 * The rules, in one place:
 * 1. Questions come from a list staff keep. A member never types one in this version, so nothing a member
 *    writes can appear here.
 * 2. A round is open until its closing day ends (India time) or staff close it. One vote per profile per round.
 *    A vote can be changed until the round closes, and never after.
 * 3. Who votes: a guardian or co-guardian, for the profile that is active. Not a cheer seat, not a device in child
 *    mode. A child profile only while a guardian's consent stands; if consent is taken back later, the child's
 *    vote is left out of the count and of the credit until it returns. A staff test household never votes: it
 *    is left out of every count.
 * 4. Numbers are shown when a round has closed and at least MIN_VOTES_TO_SHOW votes were given. While a round
 *    is open nobody sees how the others voted, so nobody is led by the crowd.
 * 5. An answer is written by staff from the pooled records, for a question of a closed round. It must rest on the
 *    records of at least ANSWER_MIN_MEMBERS members (the smallest group a pooled result may show), must say
 *    what it rests on, and must not promise anything (`promiseWording`). It never holds one member's result.
 * 6. Everyone who voted in the round is credited, each household privately. Nobody's name is shown to another
 *    household, and people are never ranked.
 */
import { MIN_FINISHED_PER_GROUP } from "@/lib/experiments";
import { SPONSOR_MIN_GROUP } from "@/lib/roles";

/** Votes a closed round needs before its numbers are shown: the smallest group anything is shown for. */
export const MIN_VOTES_TO_SHOW = SPONSOR_MIN_GROUP;
/** Members whose records an answer must rest on: the smallest group a pooled result may show. */
export const ANSWER_MIN_MEMBERS = MIN_FINISHED_PER_GROUP;
/** Questions one round can hold. A longer list is not read. */
export const ROUND_MAX_QUESTIONS = 8;
/** A round must stay open at least until tomorrow, and at most this many days. */
export const ROUND_MAX_DAYS = 92;

export const LIMITS = { title: { min: 3, max: 60 }, question: { min: 10, max: 160 }, why: { min: 10, max: 300 }, answer: { min: 20, max: 900 }, basis: { min: 10, max: 300 } } as const;

/* ───────────── rounds ───────────── */

export type RoundState = "open" | "closed";
export interface RoundDates { closesOn: string; closedAt: Date | null }

/** A round is closed once staff or the daily job closed it, and also from the day after its closing day, job or no job. */
export const roundState = (r: RoundDates, today: string): RoundState => (r.closedAt || today > r.closesOn ? "closed" : "open");

/** Rounds the daily job must close: still marked open, with the closing day behind them. */
export const dueToClose = <T extends RoundDates>(rounds: readonly T[], today: string): T[] => rounds.filter((r) => !r.closedAt && today > r.closesOn);

const DAY_MS = 86_400_000;
const daysFrom = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
const isDay = (key: string) => /^\d{4}-\d{2}-\d{2}$/.test(key) && !Number.isNaN(Date.parse(`${key}T00:00:00Z`)) && new Date(`${key}T00:00:00Z`).toISOString().slice(0, 10) === key;

export type RoundProblem = "one_at_a_time" | "bad_day";
/** Why staff cannot open this round, or null. One round is open at a time. */
export function roundProblem(i: { closesOn: string; today: string; openRounds: number }): RoundProblem | null {
  if (i.openRounds > 0) return "one_at_a_time";
  if (!isDay(i.closesOn)) return "bad_day";
  const days = daysFrom(i.today, i.closesOn);
  return days >= 1 && days <= ROUND_MAX_DAYS ? null : "bad_day";
}

/* ───────────── voting ───────────── */

export type VoteRefusal = "not_allowed" | "tester" | "needs_consent" | "closed" | "not_listed";

export interface VoteInput {
  /** `m.can("share")`: a guardian seat, not in child mode. */
  canShare: boolean;
  /** A staff member's own test household. */
  tester: boolean;
  profileKind: "adult" | "child";
  /** For a child profile: a guardian's consent stands. */
  consented: boolean;
  state: RoundState;
  /** The question as the server found it in this round. Null when it is not there. */
  question: { roundId: string; withdrawnAt: Date | null } | null;
  roundId: string;
}

/** Why this vote is refused, or null when it may be given or changed. */
export function voteRefusal(i: VoteInput): VoteRefusal | null {
  if (!i.canShare) return "not_allowed";
  if (i.tester) return "tester";
  if (i.profileKind === "child" && !i.consented) return "needs_consent";
  if (i.state !== "open") return "closed";
  if (!i.question || i.question.roundId !== i.roundId || i.question.withdrawnAt) return "not_listed";
  return null;
}

/* ───────────── the count ───────────── */

export interface Tally {
  /** Votes for questions that are still on the list. Null when it may not be shown. */
  total: number | null;
  /** True when the numbers of each question may be shown. */
  counted: boolean;
  rows: { id: string; votes: number | null; top: boolean }[];
}

/**
 * The count of one round. While it is open, and when fewer than MIN_VOTES_TO_SHOW votes were given, no number of
 * any question is given back at all, so a page cannot show one. The question with the most votes is marked; level
 * questions share the mark.
 */
export function tally(questions: readonly { id: string; withdrawnAt: Date | null }[], votes: readonly { questionId: string }[], state: RoundState): Tally {
  const listed = questions.filter((q) => !q.withdrawnAt);
  const by = new Map(listed.map((q) => [q.id, 0]));
  for (const v of votes) if (by.has(v.questionId)) by.set(v.questionId, by.get(v.questionId)! + 1);
  const total = [...by.values()].reduce((a, b) => a + b, 0);
  const counted = state === "closed" && total >= MIN_VOTES_TO_SHOW;
  const most = Math.max(0, ...by.values());
  return {
    total: total >= MIN_VOTES_TO_SHOW ? total : null,
    counted,
    rows: listed.map((q) => ({ id: q.id, votes: counted ? by.get(q.id)! : null, top: counted && by.get(q.id) === most })),
  };
}

/* ───────────── answers ───────────── */

/**
 * Words that claim more than pooled records can show: a cure, healing, a guarantee, a miracle, sight given back.
 * An answer says what the numbers showed. This catches the plain cases only, and cannot tell "cures" from
 * "does not cure": staff write the answer without the word. Careful words such as "does not prove" pass.
 */
const PROMISE = /\b(cur(e|es|ed|ing)|heal(s|ed|ing)?|guarantee(s|d)?|miracle(s)?|restor(e|es|ed|ing) (your |their |the )?(sight|vision|eyesight))\b/i;
/** The first such word in a text, or null. */
export const promiseWording = (text: string): string | null => PROMISE.exec(text)?.[0] ?? null;

export type AnswerProblem = "round_open" | "withdrawn" | "already" | "too_few_members" | "promise";

export interface AnswerInput {
  state: RoundState;
  question: { withdrawnAt: Date | null; answeredAt: Date | null };
  members: number;
  /** The answer and what it rests on, as staff typed them. */
  text: string;
}

/** Why staff cannot publish this answer, or null. */
export function answerProblem(i: AnswerInput): AnswerProblem | null {
  if (i.question.withdrawnAt) return "withdrawn";
  if (i.state !== "closed") return "round_open";
  if (i.question.answeredAt) return "already";
  if (!Number.isInteger(i.members) || i.members < ANSWER_MIN_MEMBERS) return "too_few_members";
  return promiseWording(i.text) ? "promise" : null;
}

/* ───────────── credit ───────────── */

/**
 * Who of a household is credited for a round: its own profiles that voted in it, in the order of the household.
 * Only the household's own profile ids are ever passed in, so no other household can be named.
 */
export function creditedOf<P extends { id: string }>(household: readonly P[], voters: ReadonlySet<string>): P[] {
  return household.filter((p) => voters.has(p.id));
}
