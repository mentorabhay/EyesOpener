// Eyes Opener: Reading for Proof of Help. Server only.
/**
 * Reading for Proof of Help. Server only.
 * A household's own ideas are found by its profile ids, never by an id from the browser. The list everyone sees
 * holds ideas and group numbers only: no author, no profile and no member's result is selected in this file.
 * What may be said about each idea is decided by the pure rules in ./proof.ts.
 */
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { testByKey } from "@/data";
import { db, schema as s } from "@/db";
import { progressOf } from "@/lib/experiment-data";
import { byLadder, proofOf, type Proof, type Step } from "@/lib/proof";
import type { Member } from "@/lib/session";

/** How many ideas one list holds. */
const LIST_MAX = 30;

export interface IdeaProof {
  id: string;
  title: string;
  step: Step;
  /** The profile of the viewer's own household that shared it. Null on the list everyone sees. */
  sharedBy: string | null;
  proof: Proof;
}

type Signal = { nTried: number; nControl: number; low: number; high: number };

/** The newest experiment of each idea, and the newest stored result of that experiment. */
async function newestOf(protocolIds: string[]) {
  const out = new Map<string, { experimentId: string; signal: Signal | null }>();
  if (!protocolIds.length) return out;
  const experiments = await db.select({ id: s.experiment.id, protocolId: s.experiment.protocolId }).from(s.experiment)
    .where(inArray(s.experiment.protocolId, protocolIds)).orderBy(desc(s.experiment.opensAt));
  for (const x of experiments) if (!out.has(x.protocolId)) out.set(x.protocolId, { experimentId: x.id, signal: null });
  const ids = [...out.values()].map((v) => v.experimentId);
  if (!ids.length) return out;
  const signals = await db.select({ experimentId: s.experimentSignal.experimentId, nTried: s.experimentSignal.nTried, nControl: s.experimentSignal.nControl, low: s.experimentSignal.low, high: s.experimentSignal.high })
    .from(s.experimentSignal).where(inArray(s.experimentSignal.experimentId, ids)).orderBy(desc(s.experimentSignal.computedAt));
  for (const v of out.values()) v.signal = signals.find((g) => g.experimentId === v.experimentId) ?? null;
  return out;
}

/** Members in each experiment who have not left. A head count only. */
async function joinedIn(experimentIds: string[]) {
  if (!experimentIds.length) return new Map<string, number>();
  const e = s.experimentEnrolment;
  const rows = await db.select({ experimentId: e.experimentId, n: count() }).from(e)
    .where(and(inArray(e.experimentId, experimentIds), isNull(e.leftAt))).groupBy(e.experimentId);
  return new Map(rows.map((r) => [r.experimentId, r.n]));
}

/**
 * The ideas shared by the profiles of the member's own household, newest first, with what each has done.
 * Published ideas, ideas still waiting for a person, and ideas a person did not publish.
 */
export async function householdProof(m: Member): Promise<IdeaProof[]> {
  const mine = m.profiles.map((p) => p.id);
  if (!mine.length) return [];
  const ideas = await db.select({ id: s.protocol.id, title: s.protocol.title, step: s.protocol.step, status: s.protocol.status, moves: s.protocol.moves, weeks: s.protocol.weeks, profileId: s.protocol.profileId })
    .from(s.protocol).where(and(inArray(s.protocol.profileId, mine), inArray(s.protocol.status, ["published", "in_review", "blocked"])))
    .orderBy(desc(s.protocol.createdAt)).limit(LIST_MAX);
  const live = ideas.filter((i) => i.status === "published");
  const newest = await newestOf(live.map((i) => i.id));
  const joined = await joinedIn([...newest.values()].map((v) => v.experimentId));
  const out: IdeaProof[] = [];
  for (const i of ideas) {
    const x = i.status === "published" ? newest.get(i.id) : undefined;
    /* counts of finished members in each group: the same numbers the idea's own page shows to everyone */
    const done = x ? await progressOf(x.experimentId, i.moves, i.weeks) : null;
    out.push({
      id: i.id, title: i.title, step: i.step,
      sharedBy: m.profiles.find((p) => p.id === i.profileId)?.displayName ?? null,
      proof: proofOf({
        status: i.status, step: i.step, joined: x ? joined.get(x.experimentId) ?? 0 : 0,
        finishedTried: done?.tried ?? 0, finishedControl: done?.control ?? 0,
        signal: x?.signal ?? null, lowerIsBetter: testByKey(i.moves)?.lowerIsBetter ?? null,
      }),
    });
  }
  return out;
}

/**
 * Every published idea that has a result, for everyone. Ordered by its step on the trust ladder and then by
 * date (`byLadder`). `mine` marks the viewer's own household's ideas; nothing about any other author is read.
 */
export async function ideasWithResult(m: Member): Promise<(IdeaProof & { mine: boolean })[]> {
  const own = new Set(m.profiles.map((p) => p.id));
  /* ideas that have a stored result at all; whether it may be shown is decided below, by the rules */
  const withResult = db.selectDistinct({ id: s.experiment.protocolId }).from(s.experimentSignal)
    .innerJoin(s.experiment, eq(s.experiment.id, s.experimentSignal.experimentId));
  const ideas = await db.select({ id: s.protocol.id, title: s.protocol.title, step: s.protocol.step, moves: s.protocol.moves, profileId: s.protocol.profileId, publishedAt: s.protocol.publishedAt })
    .from(s.protocol).where(and(eq(s.protocol.status, "published"), inArray(s.protocol.id, withResult)));
  const newest = await newestOf(ideas.map((i) => i.id));
  const joined = await joinedIn([...newest.values()].map((v) => v.experimentId));
  const rows = ideas.flatMap((i) => {
    const x = newest.get(i.id);
    const proof = proofOf({
      status: "published", step: i.step, joined: x ? joined.get(x.experimentId) ?? 0 : 0, finishedTried: 0, finishedControl: 0,
      signal: x?.signal ?? null, lowerIsBetter: testByKey(i.moves)?.lowerIsBetter ?? null,
    });
    return proof.result ? [{ id: i.id, title: i.title, step: i.step as Step, publishedAt: i.publishedAt, sharedBy: null, proof, mine: own.has(i.profileId) }] : [];
  });
  return byLadder(rows).slice(0, LIST_MAX).map((r) => ({ id: r.id, title: r.title, step: r.step, sharedBy: r.sharedBy, proof: r.proof, mine: r.mine }));
}
