/**
 * Reading and writing the Discovery Board. Server only.
 * A member's vote is always for the active profile, found on the server; the browser names only a question, and
 * that question is looked up again inside the open round. Counts come back through `tally` (./discovery.ts), which
 * gives no number while a round is open or when too few voted. Credit is worked out from the household's own
 * profile ids only, so no other household can be named.
 * Staff writes return what was changed, and the action that calls them writes the audit line.
 */
import { and, asc, desc, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { screenHazards } from "@/lib/community";
import {
  answerProblem, creditedOf, dueToClose, promiseWording, ROUND_MAX_QUESTIONS, roundProblem, roundState, tally, voteRefusal,
  type AnswerProblem, type RoundProblem, type RoundState, type Tally, type VoteRefusal,
} from "@/lib/discovery";
import { todayKey, type Member } from "@/lib/session";

const R = s.discoveryRound, Q = s.discoveryQuestion, V = s.discoveryVote;
/**
 * A vote that counts: an adult's, or a child's while a guardian's consent stands. When consent is taken back the
 * child's vote stays stored but is left out of every count and of the credit, and comes back if consent returns.
 * Use it on a query that joins `discovery_vote` to `profile`.
 */
const counts = () => or(
  eq(s.profile.kind, "adult"),
  inArray(V.profileId, db.select({ id: s.consent.profileId }).from(s.consent).where(and(eq(s.consent.kind, "parental"), isNull(s.consent.revokedAt)))),
);
/** Closed rounds one page holds. */
const PAST_ROUNDS = 12;

export type Round = typeof R.$inferSelect;
export type Question = typeof Q.$inferSelect;

/* ───────────── what a member sees ───────────── */

export interface BoardQuestion {
  id: string;
  question: string;
  why: string;
  /** Null while the round is open or too few voted. */
  votes: number | null;
  top: boolean;
  answer: { text: string; basis: string; members: number; answeredAt: Date; sample: boolean } | null;
}

export interface BoardRound {
  id: string;
  title: string;
  closesOn: string;
  state: RoundState;
  /** Votes in the round, or null when too few to show. */
  total: number | null;
  counted: boolean;
  questions: BoardQuestion[];
  /** The question the active profile voted for, if any. */
  mine: string | null;
  /** The household's own profiles that voted in this round. Their names never leave the household. */
  credited: { id: string; name: string }[];
}

const answerOf = (q: Question): BoardQuestion["answer"] =>
  q.answer && q.answerBasis && q.answerMembers && q.answeredAt ? { text: q.answer, basis: q.answerBasis, members: q.answerMembers, answeredAt: q.answeredAt, sample: q.isSample } : null;

/** The newest rounds as a member may see them, newest first. Withdrawn questions are left out. */
export async function roundsFor(m: Member, today = todayKey()): Promise<BoardRound[]> {
  const rounds = await db.select().from(R).orderBy(desc(R.closesOn), desc(R.createdAt)).limit(PAST_ROUNDS + 1);
  if (!rounds.length) return [];
  const ids = rounds.map((r) => r.id), household = m.profiles.map((p) => p.id);
  const [questions, votes, ours] = await Promise.all([
    db.select().from(Q).where(and(inArray(Q.roundId, ids), isNull(Q.withdrawnAt))).orderBy(asc(Q.position), asc(Q.createdAt)),
    /* votes are read as (round, question) pairs only: no profile comes out of this query */
    db.select({ roundId: V.roundId, questionId: V.questionId }).from(V).innerJoin(s.profile, eq(s.profile.id, V.profileId)).where(and(inArray(V.roundId, ids), counts())),
    db.select({ roundId: V.roundId, questionId: V.questionId, profileId: V.profileId }).from(V).innerJoin(s.profile, eq(s.profile.id, V.profileId))
      .where(and(inArray(V.roundId, ids), inArray(V.profileId, household), counts())),
  ]);
  const shape = (r: Round): BoardRound => {
    const state = roundState(r, today), mine = questions.filter((q) => q.roundId === r.id);
    const count: Tally = tally(mine, votes.filter((v) => v.roundId === r.id), state);
    const voters = new Set(ours.filter((v) => v.roundId === r.id).map((v) => v.profileId));
    return {
      id: r.id, title: r.title, closesOn: r.closesOn, state, total: count.total, counted: count.counted,
      questions: mine.map((q) => {
        const row = count.rows.find((x) => x.id === q.id);
        return { id: q.id, question: q.question, why: q.why, votes: row?.votes ?? null, top: row?.top ?? false, answer: state === "closed" ? answerOf(q) : null };
      }),
      mine: ours.find((v) => v.roundId === r.id && v.profileId === m.profile.id)?.questionId ?? null,
      credited: creditedOf(m.profiles.map((p) => ({ id: p.id, name: p.displayName })), voters),
    };
  };
  return rounds.map(shape);
}

/**
 * The board for a member: the open round (staff keep one at a time) and the closed rounds, newest first.
 * A round with no questions left on its list is not shown.
 */
export async function boardFor(m: Member, today = todayKey()): Promise<{ open: BoardRound | null; closed: BoardRound[] }> {
  const all = (await roundsFor(m, today)).filter((r) => r.questions.length > 0);
  return { open: all.find((r) => r.state === "open") ?? null, closed: all.filter((r) => r.state === "closed").slice(0, PAST_ROUNDS) };
}

/** A child profile votes only while a guardian's consent stands. */
async function consentStands(m: Member) {
  if (m.profile.kind !== "child") return true;
  const [row] = await db.select({ id: s.consent.id }).from(s.consent)
    .where(and(eq(s.consent.profileId, m.profile.id), eq(s.consent.accountId, m.account.id), eq(s.consent.kind, "parental"), isNull(s.consent.revokedAt))).limit(1);
  return !!row;
}

/** Why the active profile cannot vote in an open round, whatever the question. Null when it can. For the page. */
export async function cannotVote(m: Member): Promise<VoteRefusal | null> {
  return voteRefusal({ canShare: m.can("share"), tester: m.tester, profileKind: m.profile.kind, consented: await consentStands(m), state: "open", question: { roundId: "any", withdrawnAt: null }, roundId: "any" });
}

/**
 * Gives or changes the active profile's vote. The round is the one the question is in; the vote is one row per
 * profile and round, so a second vote replaces the first and never adds one.
 */
export async function castVote(m: Member, questionId: string, now = new Date()): Promise<{ ok: true; changed: boolean } | { ok: false; why: VoteRefusal }> {
  const consented = await consentStands(m);
  return db.transaction(async (tx) => {
    const [found] = await tx.select({ question: Q, round: R }).from(Q).innerJoin(R, eq(R.id, Q.roundId)).where(eq(Q.id, questionId)).for("share");
    const why = voteRefusal({
      canShare: m.can("share"), tester: m.tester, profileKind: m.profile.kind, consented,
      /* a question that is not there is "not on the list", whatever round was meant */
      state: found ? roundState(found.round, todayKey(now)) : "open",
      question: found ? { roundId: found.question.roundId, withdrawnAt: found.question.withdrawnAt } : null, roundId: found?.round.id ?? "",
    });
    if (why || !found) return { ok: false as const, why: why ?? "not_listed" };
    const [old] = await tx.select({ questionId: V.questionId }).from(V).where(and(eq(V.roundId, found.round.id), eq(V.profileId, m.profile.id)));
    await tx.insert(V).values({ roundId: found.round.id, profileId: m.profile.id, questionId, votedAt: now })
      .onConflictDoUpdate({ target: [V.roundId, V.profileId], set: { questionId, votedAt: now } });
    return { ok: true as const, changed: !!old && old.questionId !== questionId };
  });
}

/* ───────────── staff ───────────── */

export interface StaffRound { round: Round; state: RoundState; questions: (Question & { votes: number })[]; votes: number }

/** Every round with its questions and vote counts, newest first. Counts only: staff never see who voted. */
export async function staffBoard(today = todayKey()): Promise<StaffRound[]> {
  const rounds = await db.select().from(R).orderBy(desc(R.closesOn), desc(R.createdAt)).limit(PAST_ROUNDS + 1);
  if (!rounds.length) return [];
  const ids = rounds.map((r) => r.id);
  const [questions, votes] = await Promise.all([
    db.select().from(Q).where(inArray(Q.roundId, ids)).orderBy(asc(Q.position), asc(Q.createdAt)),
    db.select({ questionId: V.questionId }).from(V).innerJoin(s.profile, eq(s.profile.id, V.profileId)).where(and(inArray(V.roundId, ids), counts())),
  ]);
  const n = (id: string) => votes.filter((v) => v.questionId === id).length;
  return rounds.map((round) => {
    const mine = questions.filter((q) => q.roundId === round.id).map((q) => ({ ...q, votes: n(q.id) }));
    return { round, state: roundState(round, today), questions: mine, votes: mine.filter((q) => !q.withdrawnAt).reduce((sum, q) => sum + q.votes, 0) };
  });
}

/** Opens a round. One round is open at a time. */
export async function openRound(staffId: string, title: string, closesOn: string, today = todayKey()): Promise<Round | RoundProblem> {
  return db.transaction(async (tx) => {
    /* one writer at a time, so two staff cannot each open a round */
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('discovery:rounds'))`);
    const rounds = await tx.select({ closesOn: R.closesOn, closedAt: R.closedAt }).from(R).where(isNull(R.closedAt));
    const problem = roundProblem({ closesOn, today, openRounds: rounds.filter((r) => roundState(r, today) === "open").length });
    if (problem) return problem;
    const [made] = await tx.insert(R).values({ title, closesOn, createdBy: staffId }).returning();
    return made;
  });
}

export type QuestionProblem = "no_open_round" | "full" | "hazard" | "promise";

/** Adds a question to an open round. The words pass the same hazard list as anything a member shares, and may not promise a result. */
export async function addQuestion(staffId: string, roundId: string, question: string, why: string, today = todayKey()): Promise<Question | QuestionProblem> {
  if (promiseWording(`${question}\n${why}`)) return "promise";
  if ((await screenHazards(`${question}\n${why}`)).length) return "hazard";
  return db.transaction(async (tx) => {
    const [round] = await tx.select().from(R).where(eq(R.id, roundId)).for("update");
    if (!round || roundState(round, today) !== "open") return "no_open_round";
    const listed = await tx.select({ position: Q.position }).from(Q).where(and(eq(Q.roundId, roundId), isNull(Q.withdrawnAt)));
    if (listed.length >= ROUND_MAX_QUESTIONS) return "full";
    const all = await tx.select({ position: Q.position }).from(Q).where(eq(Q.roundId, roundId));
    const [made] = await tx.insert(Q).values({ roundId, question, why, position: Math.max(-1, ...all.map((q) => q.position)) + 1, createdBy: staffId }).returning();
    return made;
  });
}

/**
 * Takes a question off the list of an open round. Votes for it are removed at the same moment, so the members
 * who gave them can vote again. A question of a closed round stays as it was voted on.
 */
export async function withdrawQuestion(questionId: string, now = new Date()): Promise<{ question: Question; votesRemoved: number } | null> {
  return db.transaction(async (tx) => {
    const [found] = await tx.select({ question: Q, round: R }).from(Q).innerJoin(R, eq(R.id, Q.roundId)).where(eq(Q.id, questionId)).for("update");
    if (!found || found.question.withdrawnAt || roundState(found.round, todayKey(now)) !== "open") return null;
    const [question] = await tx.update(Q).set({ withdrawnAt: now }).where(eq(Q.id, questionId)).returning();
    const gone = await tx.delete(V).where(eq(V.questionId, questionId)).returning({ profileId: V.profileId });
    return { question, votesRemoved: gone.length };
  });
}

/** Closes one open round now. Votes are final from this moment. */
export async function closeRound(roundId: string, now = new Date()): Promise<Round | null> {
  const [closed] = await db.update(R).set({ closedAt: now }).where(and(eq(R.id, roundId), isNull(R.closedAt))).returning();
  return closed ?? null;
}

/** Marks as closed every round whose closing day is behind it. For the daily job: safe to run twice, counts only. */
export async function closeDueRounds(now = new Date()): Promise<number> {
  const open = await db.select({ id: R.id, closesOn: R.closesOn, closedAt: R.closedAt }).from(R).where(isNull(R.closedAt));
  const due = dueToClose(open, todayKey(now)).map((r) => r.id);
  if (!due.length) return 0;
  const closed = await db.update(R).set({ closedAt: now }).where(and(inArray(R.id, due), isNull(R.closedAt))).returning({ id: R.id });
  return closed.length;
}

export type AnswerRefusal = AnswerProblem | "gone" | "hazard";

/** Publishes the answer to a question of a closed round. It is never marked as sample data: only the demo seed does that. */
export async function answerQuestion(staffId: string, questionId: string, a: { answer: string; basis: string; members: number }, now = new Date()): Promise<Question | AnswerRefusal> {
  if ((await screenHazards(`${a.answer}\n${a.basis}`)).length) return "hazard";
  return db.transaction(async (tx) => {
    const [found] = await tx.select({ question: Q, round: R }).from(Q).innerJoin(R, eq(R.id, Q.roundId)).where(eq(Q.id, questionId)).for("update");
    if (!found) return "gone";
    const problem = answerProblem({ state: roundState(found.round, todayKey(now)), question: found.question, members: a.members, text: `${a.answer}\n${a.basis}` });
    if (problem) return problem;
    const [saved] = await tx.update(Q).set({ answer: a.answer, answerBasis: a.basis, answerMembers: a.members, answeredAt: now, answeredBy: staffId, isSample: false }).where(eq(Q.id, questionId)).returning();
    return saved;
  });
}

/** Takes an answer down again, for an answer that turned out wrong. The question stays; the credit goes with the answer. */
export async function retractAnswer(questionId: string): Promise<Question | null> {
  const [saved] = await db.update(Q).set({ answer: null, answerBasis: null, answerMembers: null, answeredAt: null, answeredBy: null, isSample: false })
    .where(and(eq(Q.id, questionId), isNotNull(Q.answeredAt))).returning();
  return saved ?? null;
}
