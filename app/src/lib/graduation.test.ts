// Eyes Opener: Unit and regression test suite verifying graduation functionality.
import { describe, expect, it } from "vitest";
import type { DayRow } from "./gallery";
import {
  CEREMONY_MAX_LANTERNS, NEW_FAMILY_WEEKS, THANKS_KEYS, WELCOME_KEYS,
  askRefusal, isThanksKey, isWelcomeKey, journeyOf, lanternsFor, lastDayOf, leaveRefusal, mayMeet, stopAskingRefusal, takeBackRefusal, thanksRefusal,
} from "./graduation";
import { graduation as copy } from "@/copy/graduation";

const guardian = { canShare: true, tester: false, child: false, parental: true };
const day = (d: string, trainMinutes: number, trainGoal = 15): DayRow => ({ day: d, trainMinutes, trainGoal });

describe("a welcome is a line from a fixed list", () => {
  it("knows its own lines and no others", () => {
    for (const k of WELCOME_KEYS) expect(isWelcomeKey(k)).toBe(true);
    for (const v of ["", "hello", "first_weeks ", "<b>hi</b>", 3, null, undefined, {}]) expect(isWelcomeKey(v)).toBe(false);
    for (const k of THANKS_KEYS) expect(isThanksKey(k)).toBe(true);
    for (const v of ["", "thanks", 1, null]) expect(isThanksKey(v)).toBe(false);
  });

  it("has words for every line, and none of them names a person, a place, a cure or a result", () => {
    for (const k of WELCOME_KEYS) {
      const line = copy.keeper.lines[k];
      expect(line.length, k).toBeGreaterThan(20);
      expect(line, k).not.toMatch(/cure|cured|heal|fix|better vision|will improve|improved|guarantee|doctor said|my (son|daughter|child)'s name/i);
    }
    for (const k of THANKS_KEYS) expect(copy.keeper.thanks[k].length, k).toBeGreaterThan(8);
  });
});

describe("who may leave a welcome", () => {
  const ok = { ...guardian, graduate: true, left: false, line: "first_weeks" };
  it("lets a guardian of a graduate leave one line from the list, once", () => {
    expect(leaveRefusal(ok)).toBeNull();
    expect(leaveRefusal({ ...ok, left: true })).toBe("already");
    expect(leaveRefusal({ ...ok, line: "Call me on 98..." })).toBe("bad_line");
    expect(leaveRefusal({ ...ok, line: "" })).toBe("bad_line");
  });
  it("needs a course that ran its weeks", () => {
    expect(leaveRefusal({ ...ok, graduate: false })).toBe("not_graduate");
  });
  it("refuses a cheer seat and a child in child mode, a staff test household, and a child with no parental consent", () => {
    expect(leaveRefusal({ ...ok, canShare: false })).toBe("not_allowed");
    expect(leaveRefusal({ ...ok, tester: true })).toBe("tester");
    expect(leaveRefusal({ ...ok, child: true, parental: false })).toBe("consent");
    expect(leaveRefusal({ ...ok, child: true, parental: true })).toBeNull();
  });
  it("lets it be taken back only while no family has received it", () => {
    expect(takeBackRefusal({ canShare: true, left: true, given: false })).toBeNull();
    expect(takeBackRefusal({ canShare: true, left: true, given: true })).toBe("given");
    expect(takeBackRefusal({ canShare: true, left: false, given: false })).toBe("nothing");
    expect(takeBackRefusal({ canShare: false, left: true, given: false })).toBe("not_allowed");
  });
});

describe("who may ask for a welcome", () => {
  const ok = { ...guardian, onCourse: true, week: 2, asked: false };
  it("lets a guardian of a family new to a course ask, once", () => {
    expect(askRefusal(ok)).toBeNull();
    expect(askRefusal({ ...ok, asked: true })).toBe("already");
  });
  it("is for the first weeks only", () => {
    expect(askRefusal({ ...ok, week: NEW_FAMILY_WEEKS })).toBeNull();
    expect(askRefusal({ ...ok, week: NEW_FAMILY_WEEKS + 1 })).toBe("not_new");
  });
  it("needs a running course, a guardian, a real household and, for a child, consent", () => {
    expect(askRefusal({ ...ok, onCourse: false })).toBe("not_on_course");
    expect(askRefusal({ ...ok, canShare: false })).toBe("not_allowed");
    expect(askRefusal({ ...ok, tester: true })).toBe("tester");
    expect(askRefusal({ ...ok, child: true, parental: false })).toBe("consent");
  });
  it("lets the family stop waiting only while nothing has come", () => {
    expect(stopAskingRefusal({ canShare: true, asked: true, received: false })).toBeNull();
    expect(stopAskingRefusal({ canShare: true, asked: true, received: true })).toBe("given");
    expect(stopAskingRefusal({ canShare: true, asked: false, received: false })).toBe("nothing");
    expect(stopAskingRefusal({ canShare: false, asked: true, received: false })).toBe("not_allowed");
  });
});

describe("the thank-you line", () => {
  const ok = { canShare: true, received: true, thanked: false, line: "thank_you" };
  it("is one line from the list, once, for a welcome that was received", () => {
    expect(thanksRefusal(ok)).toBeNull();
    expect(thanksRefusal({ ...ok, thanked: true })).toBe("already");
    expect(thanksRefusal({ ...ok, received: false })).toBe("nothing");
    expect(thanksRefusal({ ...ok, line: "Where do you live?" })).toBe("bad_line");
    expect(thanksRefusal({ ...ok, canShare: false })).toBe("not_allowed");
  });
});

describe("who may meet", () => {
  const w = { accountId: "A", programme: "lazy-eye", given: false }, a = { accountId: "B", programme: "lazy-eye", received: false };
  it("joins a waiting welcome and a waiting ask of the same programme", () => {
    expect(mayMeet(w, a)).toBe(true);
  });
  it("never joins a household with itself, two programmes, or a row that has already met", () => {
    expect(mayMeet(w, { ...a, accountId: "A" })).toBe(false);
    expect(mayMeet(w, { ...a, programme: "convergence" })).toBe(false);
    expect(mayMeet({ ...w, given: true }, a)).toBe(false);
    expect(mayMeet(w, { ...a, received: true })).toBe(false);
  });
});

describe("the journey of a course", () => {
  const start = "2026-07-06";
  it("ends on the seventh day of its last week", () => {
    expect(lastDayOf(start, 12)).toBe("2026-09-27");
    expect(lastDayOf(start, 1)).toBe("2026-07-12");
  });

  it("counts days with practice and days on which the day's practice was done, week by week", () => {
    const j = journeyOf({
      startDay: start, weeks: 2, daysPerWeek: 5, stopDays: [],
      days: [day("2026-07-06", 15), day("2026-07-07", 6), day("2026-07-08", 0), day("2026-07-13", 15), day("2026-07-19", 15)],
    });
    expect(j.byWeek).toEqual([{ week: 1, practised: 2, finished: 1 }, { week: 2, practised: 2, finished: 2 }]);
    expect(j).toMatchObject({ practised: 4, finished: 3, weeksWithPractice: 2, weeks: 2, lastDay: "2026-07-19" });
  });

  it("leaves out days before the course and after its last week", () => {
    const j = journeyOf({ startDay: start, weeks: 1, daysPerWeek: 5, stopDays: ["2026-07-05", "2026-07-08", "2026-07-08", "2026-07-20"], days: [day("2026-07-05", 15), day("2026-07-12", 15), day("2026-07-13", 15)] });
    expect(j.practised).toBe(1);
    expect(j.stopDays).toBe(1);
  });

  it("counts a long day as one day, and nothing for the extra minutes", () => {
    const usual = journeyOf({ startDay: start, weeks: 1, daysPerWeek: 5, stopDays: [], days: [day("2026-07-06", 15)] });
    const long = journeyOf({ startDay: start, weeks: 1, daysPerWeek: 5, stopDays: [], days: [day("2026-07-06", 90)] });
    expect(long.practised).toBe(usual.practised);
    expect(long.finished).toBe(usual.finished);
  });

  it("is all zeros, with every week still listed, for a course with no practice at all", () => {
    const j = journeyOf({ startDay: start, weeks: 6, daysPerWeek: 5, stopDays: [], days: [] });
    expect(j.byWeek.length).toBe(6);
    expect(j).toMatchObject({ practised: 0, finished: 0, weeksWithPractice: 0 });
  });
});

describe("the ceremony", () => {
  it("lights one lantern for each week, and never more than fit across the scene", () => {
    expect(lanternsFor(12)).toBe(12);
    expect(lanternsFor(6)).toBe(6);
    expect(lanternsFor(2)).toBe(2);
    expect(lanternsFor(40)).toBe(CEREMONY_MAX_LANTERNS);
    expect(lanternsFor(0)).toBe(1);
  });
});
