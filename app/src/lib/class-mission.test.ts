// Eyes Opener: Unit and regression test suite verifying class-mission functionality.
import { describe, expect, it } from "vitest";
import { gameBySlug, gameLevel } from "@/data";
import {
  COVER_SECONDS, doneRefusal, giveRefusal, MISSION_SECONDS, MISSION_STEPS, missionState, SCREEN_GAME, STEP_KEYS, stepTimes, takeBackRefusal,
  type DoneInput, type GiveInput,
} from "./class-mission";

describe("the mission itself", () => {
  it("takes five minutes, every step counted", () => {
    expect(MISSION_SECONDS).toBe(300);
    expect(MISSION_STEPS.reduce((n, s) => n + s.seconds, 0)).toBe(MISSION_SECONDS);
    expect(MISSION_STEPS.map((s) => s.key)).toEqual([...STEP_KEYS]);
  });
  it("never keeps one eye covered for long: each covered step is two halves, one for each eye", () => {
    for (const s of MISSION_STEPS.filter((x) => x.covered)) expect(s.seconds / 2, s.key).toBeLessThanOrEqual(COVER_SECONDS);
    /* it starts and ends with both eyes open */
    expect(MISSION_STEPS[0].covered).toBe(false);
    expect(MISSION_STEPS.at(-1)!.covered).toBe(false);
  });
  it("says when each step starts", () => {
    expect(stepTimes().map((s) => s.from)).toEqual(["0:00", "0:30", "1:00", "2:30", "4:00"]);
  });
  it("puts on the class screen only a game the library gives to anyone, with no glasses", () => {
    const game = gameBySlug(SCREEN_GAME)!;
    expect(game).toBeDefined();
    expect(gameLevel(game)).toBe(0);
    expect(game.gear).toBe("None");
  });
});

describe("where a child stands", () => {
  it("is none, given or done; an open mission wins over an earlier one", () => {
    expect(missionState([])).toBe("none");
    expect(missionState([{ doneOn: null }])).toBe("given");
    expect(missionState([{ doneOn: "2026-09-01" }])).toBe("done");
    expect(missionState([{ doneOn: "2026-09-01" }, { doneOn: null }])).toBe("given");
  });
});

describe("who gives a mission", () => {
  const ok: GiveInput = { canManage: true, profile: { kind: "child" }, consented: true, open: false };
  it("is a guardian's decision, for a child of the household", () => {
    expect(giveRefusal(ok)).toBeNull();
  });
  it("is refused to a cheer seat and in child mode, whatever else is true", () => {
    expect(giveRefusal({ ...ok, canManage: false })).toBe("not_allowed");
    expect(giveRefusal({ canManage: false, profile: null, consented: false, open: true })).toBe("not_allowed");
  });
  it("is refused for a profile that is not in the household", () => {
    expect(giveRefusal({ ...ok, profile: null })).toBe("not_found");
  });
  it("is for a child only", () => {
    expect(giveRefusal({ ...ok, profile: { kind: "adult" } })).toBe("not_child");
  });
  it("waits while a guardian's consent for the child does not stand", () => {
    expect(giveRefusal({ ...ok, consented: false })).toBe("needs_consent");
  });
  it("is one at a time", () => {
    expect(giveRefusal({ ...ok, open: true })).toBe("already");
  });
});

describe("marking the day it was run", () => {
  const ok: DoneInput = { canManage: true, mission: { doneOn: null, givenOn: "2026-10-01" }, day: "2026-10-03", today: "2026-10-05" };
  it("takes a day from the day it was given up to today", () => {
    expect(doneRefusal(ok)).toBeNull();
    expect(doneRefusal({ ...ok, day: "2026-10-01" })).toBeNull();
    expect(doneRefusal({ ...ok, day: "2026-10-05" })).toBeNull();
  });
  it("refuses a day before it was given, a day that has not come, and a day that is not a day", () => {
    for (const day of ["2026-09-30", "2026-10-06", "2026-02-30", "3 October", "", "2026-10-3"]) expect(doneRefusal({ ...ok, day }), day).toBe("bad_day");
  });
  it("is a guardian's to mark, once, on a mission of the household", () => {
    expect(doneRefusal({ ...ok, canManage: false })).toBe("not_allowed");
    expect(doneRefusal({ ...ok, mission: null })).toBe("not_found");
    expect(doneRefusal({ ...ok, mission: { doneOn: "2026-10-02", givenOn: "2026-10-01" } })).toBe("already");
  });
});

describe("taking a mission back", () => {
  it("is for a guardian, and only before it was run", () => {
    expect(takeBackRefusal({ canManage: true, mission: { doneOn: null } })).toBeNull();
    expect(takeBackRefusal({ canManage: false, mission: { doneOn: null } })).toBe("not_allowed");
    expect(takeBackRefusal({ canManage: true, mission: null })).toBe("not_found");
    expect(takeBackRefusal({ canManage: true, mission: { doneOn: "2026-10-02" } })).toBe("already");
  });
});
