// Eyes Opener: Unit and regression test suite verifying discovery functionality.
import { describe, expect, it } from "vitest";
import {
  ANSWER_MIN_MEMBERS, answerProblem, creditedOf, dueToClose, MIN_VOTES_TO_SHOW, promiseWording, ROUND_MAX_DAYS, roundProblem, roundState, tally, voteRefusal,
  type AnswerInput, type VoteInput,
} from "./discovery";
import { MIN_FINISHED_PER_GROUP } from "./experiments";
import { SPONSOR_MIN_GROUP } from "./roles";

const TODAY = "2026-10-05";

describe("a round", () => {
  it("is open through its closing day and closed from the next day on, with or without the job", () => {
    expect(roundState({ closesOn: "2026-10-05", closedAt: null }, TODAY)).toBe("open");
    expect(roundState({ closesOn: "2026-10-31", closedAt: null }, TODAY)).toBe("open");
    expect(roundState({ closesOn: "2026-10-04", closedAt: null }, TODAY)).toBe("closed");
  });
  it("is closed the moment staff close it, whatever its closing day", () => {
    expect(roundState({ closesOn: "2026-10-31", closedAt: new Date() }, TODAY)).toBe("closed");
  });
  it("is closed by the job only when its day is behind it and it is still marked open", () => {
    const rounds = [
      { id: "past", closesOn: "2026-10-04", closedAt: null },
      { id: "today", closesOn: "2026-10-05", closedAt: null },
      { id: "done", closesOn: "2026-09-01", closedAt: new Date() },
    ];
    expect(dueToClose(rounds, TODAY).map((r) => r.id)).toEqual(["past"]);
    expect(dueToClose(rounds, "2026-10-06").map((r) => r.id)).toEqual(["past", "today"]);
  });
  it("can be opened only when none is open, with a closing day from tomorrow to about three months on", () => {
    expect(roundProblem({ closesOn: "2026-10-31", today: TODAY, openRounds: 0 })).toBeNull();
    expect(roundProblem({ closesOn: "2026-10-31", today: TODAY, openRounds: 1 })).toBe("one_at_a_time");
    expect(roundProblem({ closesOn: "2026-10-06", today: TODAY, openRounds: 0 })).toBeNull();
    for (const closesOn of ["2026-10-05", "2026-10-01", "2026-02-30", "soon", ""]) expect(roundProblem({ closesOn, today: TODAY, openRounds: 0 })).toBe("bad_day");
    const far = new Date(Date.parse(`${TODAY}T00:00:00Z`) + (ROUND_MAX_DAYS + 1) * 86_400_000).toISOString().slice(0, 10);
    expect(roundProblem({ closesOn: far, today: TODAY, openRounds: 0 })).toBe("bad_day");
  });
});

describe("a vote", () => {
  const ok: VoteInput = { canShare: true, tester: false, profileKind: "adult", consented: false, state: "open", question: { roundId: "r1", withdrawnAt: null }, roundId: "r1" };
  it("is taken from a guardian for the active profile", () => {
    expect(voteRefusal(ok)).toBeNull();
    expect(voteRefusal({ ...ok, profileKind: "child", consented: true })).toBeNull();
  });
  it("is refused for a cheer seat and for a device in child mode", () => {
    expect(voteRefusal({ ...ok, canShare: false })).toBe("not_allowed");
  });
  it("is refused for a staff test household, which is in no count", () => {
    expect(voteRefusal({ ...ok, tester: true })).toBe("tester");
  });
  it("is refused for a child while consent does not stand", () => {
    expect(voteRefusal({ ...ok, profileKind: "child", consented: false })).toBe("needs_consent");
  });
  it("cannot be given or changed once the round has closed", () => {
    expect(voteRefusal({ ...ok, state: "closed" })).toBe("closed");
  });
  it("must be for a question that is on this round's list", () => {
    expect(voteRefusal({ ...ok, question: null })).toBe("not_listed");
    expect(voteRefusal({ ...ok, question: { roundId: "r2", withdrawnAt: null } })).toBe("not_listed");
    expect(voteRefusal({ ...ok, question: { roundId: "r1", withdrawnAt: new Date() } })).toBe("not_listed");
  });
});

describe("the count", () => {
  const qs = [{ id: "a", withdrawnAt: null }, { id: "b", withdrawnAt: null }, { id: "c", withdrawnAt: null }];
  const votes = (...ids: string[]) => ids.map((questionId) => ({ questionId }));

  it("uses the smallest group anything is shown for", () => {
    expect(MIN_VOTES_TO_SHOW).toBe(SPONSOR_MIN_GROUP);
  });
  it("gives no number of any question while the round is open", () => {
    const t = tally(qs, votes("a", "a", "a", "b", "b", "c"), "open");
    expect(t).toMatchObject({ counted: false, total: 6 });
    expect(t.rows).toEqual([{ id: "a", votes: null, top: false }, { id: "b", votes: null, top: false }, { id: "c", votes: null, top: false }]);
  });
  it("gives the numbers once the round has closed, and marks the question with the most votes", () => {
    const t = tally(qs, votes("a", "a", "a", "b", "b", "c"), "closed");
    expect(t).toMatchObject({ counted: true, total: 6 });
    expect(t.rows).toEqual([{ id: "a", votes: 3, top: true }, { id: "b", votes: 2, top: false }, { id: "c", votes: 1, top: false }]);
  });
  it("lets level questions share the mark", () => {
    expect(tally(qs, votes("a", "a", "b", "b", "c"), "closed").rows.map((r) => r.top)).toEqual([true, true, false]);
  });
  it("gives no number at all when too few votes were given, open or closed", () => {
    for (const state of ["open", "closed"] as const) {
      const t = tally(qs, votes("a", "a", "b", "c"), state);
      expect(t).toMatchObject({ counted: false, total: null });
      expect(t.rows.every((r) => r.votes === null && !r.top)).toBe(true);
    }
    expect(tally(qs, [], "closed")).toMatchObject({ counted: false, total: null });
  });
  it("leaves out a question that was taken off the list, and any vote still pointing at it", () => {
    const withdrawn = [qs[0], { id: "b", withdrawnAt: new Date() }, qs[2]];
    const t = tally(withdrawn, votes("a", "a", "a", "a", "b", "b", "b", "c", "x"), "closed");
    expect(t.total).toBe(5);
    expect(t.rows).toEqual([{ id: "a", votes: 4, top: true }, { id: "c", votes: 1, top: false }]);
  });
});

describe("an answer", () => {
  const ok: AnswerInput = { state: "closed", question: { withdrawnAt: null, answeredAt: null }, members: ANSWER_MIN_MEMBERS, text: "Members who took the check-up at the same hour had steadier results. It does not prove why." };
  it("needs the smallest group a pooled result may show", () => {
    expect(ANSWER_MIN_MEMBERS).toBe(MIN_FINISHED_PER_GROUP);
    expect(answerProblem(ok)).toBeNull();
    for (const members of [ANSWER_MIN_MEMBERS - 1, 1, 0, -5, 30.5, Number.NaN]) expect(answerProblem({ ...ok, members })).toBe("too_few_members");
  });
  it("is only for a question of a closed round that is on the list and has no answer yet", () => {
    expect(answerProblem({ ...ok, state: "open" })).toBe("round_open");
    expect(answerProblem({ ...ok, question: { withdrawnAt: new Date(), answeredAt: null } })).toBe("withdrawn");
    expect(answerProblem({ ...ok, question: { withdrawnAt: null, answeredAt: new Date() } })).toBe("already");
  });
  it("is refused when it claims a cure or a sure result", () => {
    for (const text of ["This cures lazy eye.", "Daily practice heals the weaker eye.", "Results are guaranteed in four weeks.", "A miracle for tired eyes.", "It restores your sight.", "Practice restored vision in most."]) {
      expect(answerProblem({ ...ok, text }), text).toBe("promise");
    }
  });
  it("lets careful words through, and does not trip on words that only look alike", () => {
    for (const text of ["It does not prove why.", "The check-up was more accurate at one distance.", "Keep the screen secure and steady.", "Members treated every day the same way.", "A healthy habit, the numbers say no more."]) {
      expect(promiseWording(text), text).toBeNull();
    }
    expect(promiseWording("It CURED nothing")).toBe("CURED");
  });
});

describe("credit", () => {
  it("names only the household's own profiles that voted in the round", () => {
    const household = [{ id: "aarav", name: "Aarav" }, { id: "priya", name: "Priya" }, { id: "dadi", name: "Dadi" }];
    expect(creditedOf(household, new Set(["priya", "aarav", "someone-else"]))).toEqual([household[0], household[1]]);
    expect(creditedOf(household, new Set(["someone-else"]))).toEqual([]);
  });
});
