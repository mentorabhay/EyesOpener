// Eyes Opener: Unit and regression test suite verifying proof functionality.
import { describe, expect, it } from "vitest";
import { MIN_FINISHED_PER_GROUP } from "./experiments";
import { byLadder, proofOf, standingOf, type IdeaFacts } from "./proof";

const MIN = MIN_FINISHED_PER_GROUP;
const idea = (over: Partial<IdeaFacts> = {}): IdeaFacts => ({
  status: "published", step: "experiment", joined: 0, finishedTried: 0, finishedControl: 0, signal: null, lowerIsBetter: true, ...over,
});
/* a check-up where lower is better: a gap wholly below zero is "better" */
const better = { nTried: MIN + 4, nControl: MIN + 1, low: -7.9, high: -1.9 };

describe("what may be said about an idea", () => {
  it("says nothing is counted while a person is still reading it, and nothing for an idea that was not published", () => {
    expect(proofOf(idea({ status: "in_review", joined: 9, finishedTried: 5, signal: better }))).toMatchObject({ stage: "waiting", joined: 0, finished: { tried: 0, control: 0 }, result: null });
    for (const status of ["blocked", "archived", "draft"]) expect(proofOf(idea({ status, joined: 3 })).stage).toBe("not_published");
  });

  it("is only published until somebody joins, and being tested from the first member on", () => {
    expect(proofOf(idea()).stage).toBe("published");
    expect(proofOf(idea({ joined: 1 }))).toMatchObject({ stage: "being_tested", joined: 1, result: null });
  });

  it("gives head counts at any size, and no result below the minimum in either group", () => {
    const small = proofOf(idea({ joined: 12, finishedTried: 4, finishedControl: 2 }));
    expect(small).toMatchObject({ stage: "being_tested", joined: 12, finished: { tried: 4, control: 2 }, result: null });
    /* a stored row that is too small is never shown, whatever it holds */
    for (const signal of [{ ...better, nTried: MIN - 1 }, { ...better, nControl: MIN - 1 }, { ...better, nTried: 0, nControl: 0 }]) {
      expect(proofOf(idea({ joined: 80, signal })).result).toBeNull();
      expect(proofOf(idea({ joined: 80, signal })).stage).toBe("being_tested");
    }
  });

  it("says better only when the whole likely range is on the good side of zero", () => {
    expect(proofOf(idea({ joined: 70, signal: better })).result).toEqual({ tried: MIN + 4, control: MIN + 1, lean: "better" });
    expect(proofOf(idea({ joined: 70, signal: { ...better, low: -7.9, high: 0.4 } })).result?.lean).toBe("unclear");
    expect(proofOf(idea({ joined: 70, signal: { ...better, low: 0, high: 3 } })).result?.lean).toBe("unclear");
    expect(proofOf(idea({ joined: 70, signal: { ...better, low: 1.1, high: 6 } })).result?.lean).toBe("worse");
    /* the same numbers read the other way for a check-up where higher is better */
    expect(proofOf(idea({ joined: 70, signal: better, lowerIsBetter: false })).result?.lean).toBe("worse");
  });

  it("says no result when the check-up the idea names is not known", () => {
    expect(proofOf(idea({ joined: 70, signal: better, lowerIsBetter: null }))).toMatchObject({ stage: "being_tested", result: null });
  });

  it("takes the two steps a person sets from the ladder, never from the numbers", () => {
    expect(proofOf(idea({ step: "signal", joined: 70, signal: better }))).toMatchObject({ reviewed: false, trialled: false });
    expect(proofOf(idea({ step: "reviewed", joined: 70, signal: better }))).toMatchObject({ reviewed: true, trialled: false });
    expect(proofOf(idea({ step: "trialled", joined: 70, signal: better }))).toMatchObject({ reviewed: true, trialled: true });
    expect(proofOf(idea({ step: "reviewed", status: "in_review" }))).toMatchObject({ reviewed: false, trialled: false });
  });

  it("never lets a broken count through", () => {
    expect(proofOf(idea({ joined: -3, finishedTried: Number.NaN, finishedControl: 2.9 }))).toMatchObject({ joined: 0, finished: { tried: 0, control: 2 } });
  });
});

describe("a household's standing", () => {
  it("adds up head counts of published ideas only, and has no number for results until one exists", () => {
    const none = standingOf([proofOf(idea({ joined: 4 })), proofOf(idea({ status: "in_review", joined: 9 })), proofOf(idea({ status: "blocked" }))]);
    expect(none).toEqual({ ideas: 1, joined: 4, tried: null });
    const some = standingOf([proofOf(idea({ joined: 70, signal: better })), proofOf(idea({ joined: 2 })), proofOf(idea({ joined: 66, signal: { ...better, nTried: MIN, low: -1, high: 1 } }))]);
    expect(some).toEqual({ ideas: 3, joined: 138, tried: MIN + 4 + MIN });
  });

  it("is empty for a household that shared nothing", () => {
    expect(standingOf([])).toEqual({ ideas: 0, joined: 0, tried: null });
  });
});

describe("the list everyone sees", () => {
  it("is ordered by the step on the ladder and then by date, never by a number", () => {
    const rows = [
      { id: "old-signal", step: "signal" as const, publishedAt: new Date("2026-01-01"), tried: 900 },
      { id: "new-signal", step: "signal" as const, publishedAt: new Date("2026-06-01"), tried: 31 },
      { id: "reviewed", step: "reviewed" as const, publishedAt: new Date("2025-01-01"), tried: 30 },
      { id: "undated", step: "signal" as const, publishedAt: null, tried: 5000 },
    ];
    expect(byLadder(rows).map((r) => r.id)).toEqual(["reviewed", "new-signal", "old-signal", "undated"]);
    expect(rows[0].id).toBe("old-signal");
  });
});
