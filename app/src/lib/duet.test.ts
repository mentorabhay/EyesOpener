// Eyes Opener: Unit and regression test suite verifying duet functionality.
import { describe, expect, it } from "vitest";
import {
  didPart, duetDays, generations, GENERATION_GAP_YEARS, maySeeDuet, OPEN_DAYS_A_WEEK, pairProblem, pairState, partnerDays, partnerKey, partOfProfile, PERSON_PART, streakOf,
  type Partner, type PartnerRecord, type PartState,
} from "./duet";

const child = (id = "c", birthYear: number | null = 2020): Partner => ({ kind: "profile", id, profileKind: "child", birthYear });
const adult = (id = "a", birthYear: number | null = 1958): Partner => ({ kind: "profile", id, profileKind: "adult", birthYear });
const person = (id = "u"): Partner => ({ kind: "person", id });
const free = { consented: () => true, paired: new Set<string>() };

/* 2026-09-28 is a Monday. */
const MON = "2026-09-28", TUE = "2026-09-29", WED = "2026-09-30", THU = "2026-10-01", FRI = "2026-10-02", SAT = "2026-10-03", SUN = "2026-10-04", MON2 = "2026-10-05", TUE2 = "2026-10-06";
const record = (asked: number, done: string[], excused: string[] = []): PartnerRecord => ({ asked, done: new Set(done), excused: new Set(excused) });
const states = (r: PartnerRecord, from: string, today: string) => [...partnerDays(r, from, today).values()];

describe("two people of different generations", () => {
  it("takes a child and a grown-up, whatever is known of the grown-up's year of birth", () => {
    expect(generations(child(), adult())).toBe("ok");
    expect(generations(adult("a", null), child())).toBe("ok");
    expect(generations(child("c", null), adult("a", null))).toBe("ok");
  });
  it("refuses two children, and a child and a grown-up whose years of birth are close", () => {
    expect(generations(child("c1", 2014), child("c2", 2020))).toBe("same_generation");
    expect(generations(child("c", 2009), adult("a", 2007))).toBe("same_generation");
    expect(generations(child("c", 2009), adult("a", 2009 - GENERATION_GAP_YEARS))).toBe("ok");
  });
  it("takes two grown-ups only when both years are known and far enough apart", () => {
    expect(generations(adult("a", 1958), adult("b", 1988))).toBe("ok");
    expect(generations(adult("a", 1980), adult("b", 1988))).toBe("same_generation");
    expect(generations(adult("a", 1958), adult("b", null))).toBe("cannot_tell");
  });
  it("pairs a grown-up who has no profile with a child and with nobody else", () => {
    expect(generations(child(), person())).toBe("ok");
    expect(generations(person(), child())).toBe("ok");
    expect(generations(adult(), person())).toBe("cannot_tell");
    expect(generations(person("u1"), person("u2"))).toBe("cannot_tell");
  });
});

describe("who may start a duet", () => {
  it("starts one for a child and a grandparent", () => {
    expect(pairProblem(child(), adult(), free)).toBeNull();
    expect(pairProblem(child(), person(), free)).toBeNull();
  });
  it("needs a profile as the first partner, and two different people", () => {
    expect(pairProblem(person(), child(), free)).toBe("first_not_profile");
    expect(pairProblem(child("x"), child("x"), free)).toBe("same_person");
  });
  it("keeps each person in one duet at a time", () => {
    expect(pairProblem(child(), adult(), { ...free, paired: new Set([partnerKey(child())]) })).toBe("already_paired");
    expect(pairProblem(child(), person(), { ...free, paired: new Set([partnerKey(person())]) })).toBe("already_paired");
    /* a profile and a person with the same id are not the same partner */
    expect(pairProblem(child("same"), adult(), { ...free, paired: new Set([partnerKey(person("same"))]) })).toBeNull();
  });
  it("leaves a child out while a guardian's consent does not stand, whichever side the child is on", () => {
    const none = { ...free, consented: () => false };
    expect(pairProblem(child(), adult(), none)).toBe("needs_consent");
    expect(pairProblem(adult(), child(), none)).toBe("needs_consent");
    /* consent is only asked about children */
    expect(pairProblem(adult("a", 1958), adult("b", 1990), none)).toBeNull();
  });
  it("passes on what the generations say", () => {
    expect(pairProblem(child("c1"), child("c2"), free)).toBe("same_generation");
    expect(pairProblem(adult(), person(), free)).toBe("cannot_tell");
  });
});

describe("what each one's part is", () => {
  it("is the day's practice for a profile whose programme sets minutes", () => {
    expect(partOfProfile({ dailyMinutes: 60, daysPerWeek: 6 })).toEqual({ kind: "practice", asked: 6, minutes: 60 });
    expect(partOfProfile({ dailyMinutes: 30, daysPerWeek: 9 }).asked).toBe(7);
  });
  it("is a care routine for a profile with no programme, a habit programme, or a counsellor-led one with no minutes yet", () => {
    for (const e of [null, { dailyMinutes: 0, daysPerWeek: 7 }, { dailyMinutes: 0, daysPerWeek: 0 }, { dailyMinutes: 20, daysPerWeek: 0 }]) {
      expect(partOfProfile(e)).toEqual({ kind: "care", asked: OPEN_DAYS_A_WEEK, minutes: 0 });
    }
  });
  it("is a note for a grown-up with no profile", () => {
    expect(PERSON_PART).toEqual({ kind: "note", asked: OPEN_DAYS_A_WEEK, minutes: 0 });
  });

  const day = (over: Partial<{ trainMinutes: number; trainGoal: number; restBreaks: number; lightMinutes: number }> = {}) => ({ trainMinutes: 0, trainGoal: 0, restBreaks: 0, lightMinutes: 0, ...over });
  it("needs the day's minutes on a day a programme set them, and a break does not stand in for them", () => {
    expect(didPart(day({ trainGoal: 60, trainMinutes: 60 }), false)).toBe(true);
    expect(didPart(day({ trainGoal: 60, trainMinutes: 59.96 }), false)).toBe(true);
    expect(didPart(day({ trainGoal: 60, trainMinutes: 40, restBreaks: 6, lightMinutes: 90 }), true)).toBe(false);
  });
  it("needs one thing for the eyes on any other day", () => {
    expect(didPart(undefined, false)).toBe(false);
    expect(didPart(day(), false)).toBe(false);
    expect(didPart(undefined, true)).toBe(true);
    expect(didPart(day({ restBreaks: 1 }), false)).toBe(true);
    expect(didPart(day({ lightMinutes: 15 }), false)).toBe(true);
    expect(didPart(day({ trainMinutes: 4 }), false)).toBe(true);
  });
});

describe("one partner's days", () => {
  it("counts a done day, and leaves today open until it is done", () => {
    expect(states(record(6, [MON, TUE]), MON, WED)).toEqual<PartState[]>(["done", "done", "open"]);
    expect(states(record(6, [MON, TUE, WED]), MON, WED)).toEqual<PartState[]>(["done", "done", "done"]);
  });
  it("gives the first day without the part to the week's rest day, and calls the next one missed", () => {
    expect(states(record(6, [MON, WED, FRI]), MON, SAT)).toEqual<PartState[]>(["done", "rest", "done", "missed", "done", "open"]);
  });
  it("has no rest day of its own when seven days are asked", () => {
    expect(states(record(7, [MON]), MON, WED)).toEqual<PartState[]>(["done", "missed", "open"]);
  });
  it("gives more rest days to a programme that asks for fewer days", () => {
    expect(states(record(3, [MON, THU]), MON, SUN)).toEqual<PartState[]>(["done", "rest", "rest", "done", "rest", "rest", "open"]);
    expect(states(record(3, [MON]), MON, SUN)).toEqual<PartState[]>(["done", "rest", "rest", "rest", "rest", "missed", "open"]);
  });
  it("rests for what is left of a week once the week's days are done, today included", () => {
    expect(states(record(6, [MON, TUE, WED, THU, FRI, SAT]), MON, SUN)).toEqual<PartState[]>(["done", "done", "done", "done", "done", "done", "rest"]);
    expect(states(record(3, [MON, TUE, WED]), MON, FRI)).toEqual<PartState[]>(["done", "done", "done", "rest", "rest"]);
  });
  it("starts every week afresh on Monday", () => {
    expect(states(record(6, [SAT, MON2]), SAT, TUE2)).toEqual<PartState[]>(["done", "rest", "done", "open"]);
    /* last week's rest day is not carried over, and neither is a missed one */
    expect(states(record(6, []), FRI, TUE2)).toEqual<PartState[]>(["rest", "missed", "missed", "rest", "open"]);
  });
  it("makes a day the stop rule ended a rest day that uses up no rest day", () => {
    expect(states(record(6, [MON], [TUE]), MON, THU)).toEqual<PartState[]>(["done", "rest", "rest", "open"]);
    expect(states(record(7, [MON], [TUE]), MON, WED)).toEqual<PartState[]>(["done", "rest", "open"]);
    /* a stopped day that was finished all the same is a done day */
    expect(states(record(7, [MON, TUE], [TUE]), MON, TUE)).toEqual<PartState[]>(["done", "done"]);
  });
  it("has no days when the first day is still to come", () => {
    expect(states(record(6, []), TUE, MON)).toEqual([]);
  });
});

describe("one day of the duet", () => {
  it("is kept only when both did their part", () => {
    expect(pairState("done", "done")).toBe("kept");
    expect(pairState("done", "open")).toBe("open");
    expect(pairState("open", "open")).toBe("open");
  });
  it("waits on a rest day for either of them, whatever the other did or did not do", () => {
    for (const other of ["done", "open", "missed", "rest"] as const) {
      expect(pairState("rest", other)).toBe("rest");
      expect(pairState(other, "rest")).toBe("rest");
    }
  });
  it("is missed when both were asked and one part is missing, and does not say whose", () => {
    expect(pairState("missed", "done")).toBe("missed");
    expect(pairState("done", "missed")).toBe("missed");
    expect(pairState("missed", "missed")).toBe("missed");
    expect(pairState("missed", "done")).toEqual(pairState("done", "missed"));
  });
});

describe("the streak", () => {
  const all = [MON, TUE, WED, THU, FRI, SAT, SUN];
  it("grows only on days both did their part", () => {
    const days = duetDays(record(6, [MON, TUE, WED]), record(6, [MON, WED]), MON, WED);
    expect(days.map((d) => d.state)).toEqual(["kept", "rest", "kept"]);
    expect(streakOf(days)).toEqual({ current: 2, longest: 2, kept: 2 });
  });
  it("is not ended by a rest day the programme does not ask for", () => {
    const days = duetDays(record(6, [MON, TUE, WED, THU, FRI, SAT]), record(7, all), MON, SUN);
    expect(days.at(-1)).toEqual({ day: SUN, state: "rest" });
    expect(streakOf(days)).toEqual({ current: 6, longest: 6, kept: 6 });
  });
  it("is not ended by a day the stop rule ended, and that day looks like any rest day", () => {
    const stopped = duetDays(record(7, [MON, WED], [TUE]), record(7, [MON, TUE, WED]), MON, WED);
    const rested = duetDays(record(6, [MON, WED]), record(7, [MON, TUE, WED]), MON, WED);
    expect(stopped).toEqual(rested);
    expect(streakOf(stopped)).toEqual({ current: 2, longest: 2, kept: 2 });
  });
  it("ends quietly on a missed day, keeps what was reached, and starts again on the next kept day", () => {
    const days = duetDays(record(7, [MON, TUE, WED, FRI, SAT]), record(7, [MON, TUE, WED, THU, FRI, SAT]), MON, SAT);
    expect(days.map((d) => d.state)).toEqual(["kept", "kept", "kept", "missed", "kept", "kept"]);
    expect(streakOf(days)).toEqual({ current: 2, longest: 3, kept: 5 });
    const after = duetDays(record(7, [MON, TUE]), record(7, [MON, TUE, WED]), MON, THU);
    expect(streakOf(after)).toEqual({ current: 0, longest: 2, kept: 2 });
  });
  it("is the same whichever of the two missed", () => {
    const one = duetDays(record(7, [MON, WED]), record(7, [MON, TUE, WED]), MON, WED);
    const other = duetDays(record(7, [MON, TUE, WED]), record(7, [MON, WED]), MON, WED);
    expect(one).toEqual(other);
  });
  it("does not end while today is still open", () => {
    const days = duetDays(record(7, [MON, TUE]), record(7, [MON, TUE, WED]), MON, WED);
    expect(days.at(-1)?.state).toBe("open");
    expect(streakOf(days).current).toBe(2);
  });
  it("is zero for a duet with no days yet", () => {
    expect(streakOf([])).toEqual({ current: 0, longest: 0, kept: 0 });
  });
});

describe("who may see a duet", () => {
  const kidAndGran = { a: child("kid"), b: adult("gran") }, kidAndCheer = { a: child("kid"), b: person("nani") }, grownUps = { a: adult("gran", 1958), b: adult("mum", 1988) };
  const viewer = (over: Partial<Parameters<typeof maySeeDuet>[0]> = {}) => ({ seat: "guardian" as const, childMode: false, userId: "mum-user", activeProfileId: "kid", ...over });
  it("shows a guardian and a co-guardian every duet of the household", () => {
    for (const seat of ["guardian", "co_guardian"] as const) for (const d of [kidAndGran, kidAndCheer, grownUps]) expect(maySeeDuet(viewer({ seat }), d)).toBe(true);
  });
  it("shows a cheer seat its own duet and the duets of a child, and no duet of two grown-ups", () => {
    const nani = viewer({ seat: "circle", userId: "nani" });
    expect(maySeeDuet(nani, kidAndCheer)).toBe(true);
    expect(maySeeDuet(nani, kidAndGran)).toBe(true);
    expect(maySeeDuet(nani, grownUps)).toBe(false);
  });
  it("shows a device in child mode only the duets of the child it is handed to", () => {
    expect(maySeeDuet(viewer({ childMode: true }), kidAndGran)).toBe(true);
    expect(maySeeDuet(viewer({ childMode: true }), grownUps)).toBe(false);
    expect(maySeeDuet(viewer({ childMode: true, activeProfileId: "other-kid" }), kidAndGran)).toBe(false);
  });
});
