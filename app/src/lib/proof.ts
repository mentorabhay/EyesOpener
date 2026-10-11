// Eyes Opener: Proof of Help: what a shared idea has done, said in words the numbers support and no more.
/**
 * Proof of Help: what a shared idea has done, said in words the numbers support and no more.
 * Pure functions, tested in proof.test.ts. src/lib/proof-data.ts reads the rows.
 *
 * The rules, in one place:
 * 1. Standing belongs to an idea, never to a person. Nothing here ranks members, and there is nothing to press:
 *    no likes, no followers, no thanks button. The only thing counted is members who tried the idea.
 * 2. Head counts (joined, finished) are counts and may be shown at any size, as the idea's own page shows them.
 * 3. A result is said only when both groups hold the minimum the experiments code enforces (`enough`), whatever a
 *    stored row says. Below that there is no word about whether the idea helps.
 * 4. The words follow `lean`: "better" only when the whole likely range of the gap is on the good side of zero.
 *    A result that reaches zero is said to be unclear, however many members tried the idea.
 * 5. No member's own result is ever read here. Only group sizes and the range of the gap come in.
 * 6. Nobody is named to another household. A household sees its own ideas; everyone sees ideas, not authors.
 */
import { enough, lean, type Lean } from "@/lib/experiments";

/** The six steps of the trust ladder, bottom first. */
export type Step = "story" | "protocol" | "experiment" | "signal" | "reviewed" | "trialled";
export type ProofStage = "waiting" | "not_published" | "published" | "being_tested" | "result";

export interface IdeaFacts {
  /** The idea's publication status: draft, in_review, published, blocked or archived. */
  status: string;
  step: Step;
  /** Members in its experiment who have not left. */
  joined: number;
  /** Members with a counted pair of check-ups, in each group. */
  finishedTried: number;
  finishedControl: number;
  /** The stored pooled result, when there is one. */
  signal: { nTried: number; nControl: number; low: number; high: number } | null;
  /** From the check-up the idea should move. Null when that check-up is not known: then no result is said. */
  lowerIsBetter: boolean | null;
}

export interface Proof {
  stage: ProofStage;
  joined: number;
  finished: { tried: number; control: number };
  /** Set only at stage "result": the group sizes behind the result and what the range of the gap supports. */
  result: { tried: number; control: number; lean: Lean } | null;
  /** An eye-care professional has read it. A person sets this step, never the numbers. */
  reviewed: boolean;
  trialled: boolean;
}

const count = (n: number) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

/** What may be said about one idea. */
export function proofOf(f: IdeaFacts): Proof {
  const published = f.status === "published";
  const joined = published ? count(f.joined) : 0;
  const finished = { tried: published ? count(f.finishedTried) : 0, control: published ? count(f.finishedControl) : 0 };
  const steps = { reviewed: published && (f.step === "reviewed" || f.step === "trialled"), trialled: published && f.step === "trialled" };
  if (!published) return { stage: f.status === "in_review" ? "waiting" : "not_published", joined, finished, result: null, ...steps };
  const s = f.signal;
  if (s && f.lowerIsBetter !== null && enough(s.nTried, s.nControl)) {
    return { stage: "result", joined, finished, result: { tried: s.nTried, control: s.nControl, lean: lean(s, f.lowerIsBetter) }, ...steps };
  }
  return { stage: joined > 0 ? "being_tested" : "published", joined, finished, result: null, ...steps };
}

export interface Standing {
  /** Ideas that are published. */
  ideas: number;
  /** Members who joined their experiments and have not left. */
  joined: number;
  /** Members who tried the ideas and are counted in a result. Null while no idea has a result: there is nothing to add up. */
  tried: number | null;
}

/** A household's ideas added up. It adds head counts only: there is no score, and nothing to compare with another household. */
export function standingOf(proofs: readonly Proof[]): Standing {
  const live = proofs.filter((p) => p.stage !== "waiting" && p.stage !== "not_published");
  const results = live.flatMap((p) => (p.result ? [p.result] : []));
  return { ideas: live.length, joined: live.reduce((n, p) => n + p.joined, 0), tried: results.length ? results.reduce((n, r) => n + r.tried, 0) : null };
}

const RANK: Record<Step, number> = { story: 0, protocol: 1, experiment: 2, signal: 3, reviewed: 4, trialled: 5 };

/**
 * The order of the list everyone sees: the step on the trust ladder, highest first, then the newest.
 * Never by the size of a result and never by head count, so nobody gains from a bigger number.
 */
export function byLadder<T extends { step: Step; publishedAt: Date | null }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => RANK[b.step] - RANK[a.step] || (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));
}
