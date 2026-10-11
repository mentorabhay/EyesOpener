// Eyes Opener: Unit and regression test suite verifying chapters functionality.
import { describe, expect, it } from "vitest";
import { exerciseBySlug, games } from "@/data";
import { guides } from "@/data/guides";
import { BREAK_METRES, BREAK_SECONDS, breakLeft, CHAPTER_SECONDS, chapterAt, clock, planFor, STANDARD_PLAN } from "./chapters";

describe("the standard plan", () => {
  it("is ten minutes of watching, then a look-away break", () => {
    expect(STANDARD_PLAN).toEqual({ chapterSeconds: 600, breakSeconds: 20, shortened: false });
    expect(CHAPTER_SECONDS).toBe(600);
  });

  it("uses the break the catalogue's look-away routine describes", () => {
    const how = exerciseBySlug("look-away-break")?.how ?? "";
    expect(how).toContain(`${BREAK_METRES} m away`);
    expect(how).toContain(`${BREAK_SECONDS} seconds`);
  });

  it("fits the daily hour the catalogue gives the cinema as whole chapters", () => {
    expect(exerciseBySlug("cinema-session")?.dose).toContain("60 min a day in chapters");
    expect((60 * 60) % CHAPTER_SECONDS).toBe(0);
  });

  it("is a chapter length the catalogue uses for two-eye screen sessions", () => {
    expect(games.some((g) => g.session === `${CHAPTER_SECONDS / 60} min chapters`)).toBe(true);
  });
});

describe("the cinema guides", () => {
  const steps = (slug: string) => (guides.find((g) => g.slug === slug)?.steps ?? []).join(" ");

  it("describe the chapter and the break the player really gives", () => {
    const session = steps("cinema-session");
    expect(session).toContain(`every ${CHAPTER_SECONDS / 60} minutes of watching`);
    expect(session).toContain(`${BREAK_METRES} metres or more`);
    expect(session).toContain(`at least ${BREAK_SECONDS} seconds`);
    expect(session).toContain(`${["", "One", "Two", "Three", "Four", "Five", "Six"][3600 / CHAPTER_SECONDS]} chapters make the daily hour`);
  });

  it("say where the break falls in a 20-minute sitting", () => {
    expect(steps("three-chapter-cinema-plan")).toContain(`after ${CHAPTER_SECONDS / 60} minutes, for a short eye break`);
  });
});

describe("planFor", () => {
  it("gives a family the standard plan whatever the address asks for", () => {
    expect(planFor(false, { chapter: "15", rest: "3" })).toEqual(STANDARD_PLAN);
    expect(planFor(false, { chapter: "0" })).toEqual(STANDARD_PLAN);
    expect(planFor(false)).toEqual(STANDARD_PLAN);
  });

  it("lets a staff test household shorten a chapter and a break", () => {
    expect(planFor(true, { chapter: "30", rest: "5" })).toEqual({ chapterSeconds: 30, breakSeconds: 5, shortened: true });
    expect(planFor(true, { chapter: "30" })).toEqual({ chapterSeconds: 30, breakSeconds: 20, shortened: true });
  });

  it("never makes a chapter or a break longer than the standard, and keeps a floor", () => {
    expect(planFor(true, { chapter: "9000", rest: "900" })).toEqual(STANDARD_PLAN);
    expect(planFor(true, { chapter: "1", rest: "0" })).toEqual({ chapterSeconds: 10, breakSeconds: 3, shortened: true });
  });

  it("ignores anything that is not a whole number of seconds", () => {
    for (const bad of ["", "abc", "-5", "1.5", "1e3", "999999", ["30"], 30, null, undefined]) expect(planFor(true, { chapter: bad, rest: bad })).toEqual(STANDARD_PLAN);
  });

  it("is the standard plan for a tester who asks for nothing", () => {
    expect(planFor(true)).toEqual(STANDARD_PLAN);
  });
});

describe("chapterAt", () => {
  it("calls no break before a chapter has been watched", () => {
    expect(chapterAt(0, 0)).toEqual({ chapter: 1, finished: 0, toBreak: 600, breakDue: false });
    expect(chapterAt(599, 0)).toEqual({ chapter: 1, finished: 0, toBreak: 1, breakDue: false });
  });

  it("calls a break when ten minutes have been watched", () => {
    expect(chapterAt(600, 0)).toEqual({ chapter: 1, finished: 1, toBreak: 0, breakDue: true });
    expect(chapterAt(604, 0).breakDue).toBe(true);
  });

  it("starts the next chapter once the break is taken", () => {
    expect(chapterAt(600, 1)).toEqual({ chapter: 2, finished: 1, toBreak: 600, breakDue: false });
    expect(chapterAt(900, 1)).toEqual({ chapter: 2, finished: 1, toBreak: 300, breakDue: false });
    expect(chapterAt(1200, 1)).toEqual({ chapter: 2, finished: 2, toBreak: 0, breakDue: true });
    expect(chapterAt(1200, 2).chapter).toBe(3);
  });

  it("calls a break every chapter across the daily hour: five breaks, the sixth chapter ends the session", () => {
    let taken = 0;
    const calls: number[] = [];
    for (let watched = 0; watched <= 3600; watched++) {
      if (chapterAt(watched, taken, STANDARD_PLAN, 3600).breakDue) { calls.push(watched); taken++; }
    }
    expect(calls).toEqual([600, 1200, 1800, 2400, 3000]);
  });

  it("calls no break when the allowed time ends at the same moment", () => {
    expect(chapterAt(600, 0, STANDARD_PLAN, 600).breakDue).toBe(false);
    expect(chapterAt(600, 0, STANDARD_PLAN, 601).breakDue).toBe(true);
  });

  it("follows a shortened plan", () => {
    const plan = planFor(true, { chapter: "15", rest: "4" });
    expect(chapterAt(14, 0, plan).breakDue).toBe(false);
    expect(chapterAt(15, 0, plan).breakDue).toBe(true);
    expect(chapterAt(15, 1, plan)).toEqual({ chapter: 2, finished: 1, toBreak: 15, breakDue: false });
  });

  it("is safe with numbers that make no sense", () => {
    expect(chapterAt(NaN, NaN)).toEqual({ chapter: 1, finished: 0, toBreak: 600, breakDue: false });
    expect(chapterAt(-50, -2).breakDue).toBe(false);
    expect(chapterAt(100, 9).breakDue).toBe(false);
    expect(chapterAt(100, 9).chapter).toBe(1);
    expect(chapterAt(700, 0, { chapterSeconds: 0, breakSeconds: 0, shortened: true }).breakDue).toBe(true);
  });
});

describe("breakLeft", () => {
  it("counts the break down in whole seconds and stops at nought", () => {
    expect(breakLeft(1000, 1000)).toBe(20);
    expect(breakLeft(1000, 1001)).toBe(20);
    expect(breakLeft(1000, 2000)).toBe(19);
    expect(breakLeft(1000, 20_999)).toBe(1);
    expect(breakLeft(1000, 21_000)).toBe(0);
    expect(breakLeft(1000, 90_000)).toBe(0);
  });

  it("never runs past the full break when the clock goes backwards", () => {
    expect(breakLeft(5000, 1000)).toBe(20);
  });

  it("counts a shortened break too", () => {
    expect(breakLeft(0, 0, 5)).toBe(5);
    expect(breakLeft(0, 4999, 5)).toBe(1);
    expect(breakLeft(0, 5000, 5)).toBe(0);
  });
});

describe("clock", () => {
  it("writes minutes and seconds, and hours for a long film", () => {
    expect(clock(0)).toBe("0:00");
    expect(clock(59.9)).toBe("0:59");
    expect(clock(760)).toBe("12:40");
    expect(clock(3725)).toBe("1:02:05");
    expect(clock(NaN)).toBe("0:00");
    expect(clock(-3)).toBe("0:00");
  });
});
