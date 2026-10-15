import { describe, expect, it } from "vitest";
import { canStart } from "@/engine";
import { LIGHT_FROM_HOUR, LIGHT_UNTIL_HOUR, canBeLight, dayMinutes, isDayDone, sunHeight, sunsetOf, type SunsetIn } from "./sunset";

const base: SunsetIn = { reason: null, tester: false, stoppedToday: false, minutes: 0, dailyMinutes: 60, light: { done: 20, goal: 90 }, hour: 16 };
const dose = { age: 6, dailyMinutes: 60, stopFlag: false };
const reasonAt = (minutesToday: number, extra: Partial<Parameters<typeof canStart>[0]> = {}) => canStart({ kind: "game", minutesToday, ...dose, ...extra }).reason;

describe("the sun sets only when the day's minutes are truly done", () => {
  it("is still up while practice is open, and stands lower the more of the day is used", () => {
    expect(sunsetOf({ ...base, minutes: 0 })).toEqual({ state: "open", share: 0, left: 60 });
    expect(sunsetOf({ ...base, minutes: 45 })).toEqual({ state: "open", share: 0.75, left: 15 });
    expect(sunHeight(sunsetOf({ ...base, minutes: 45 }))).toBeCloseTo(0.25);
    expect(sunHeight(sunsetOf({ ...base, minutes: 0 }))).toBe(1);
  });

  it("sets when the engine says the programme's minutes for today are used", () => {
    expect(reasonAt(60)).toBe("programme_done");
    expect(sunsetOf({ ...base, reason: reasonAt(60), minutes: 60 })).toEqual({ state: "set", cap: false, outside: "go", lightLeft: 70 });
    expect(sunHeight(sunsetOf({ ...base, reason: reasonAt(60), minutes: 60 }))).toBe(0);
  });

  it("does not set one minute early", () => {
    expect(reasonAt(59)).toBeNull();
    expect(sunsetOf({ ...base, reason: reasonAt(59), minutes: 59 }).state).toBe("open");
  });

  it("sets at the daily limit for a member with no programme", () => {
    const reason = reasonAt(90, { dailyMinutes: 0 });
    expect(reason).toBe("daily_cap");
    expect(sunsetOf({ ...base, dailyMinutes: 0, reason, minutes: 90 })).toMatchObject({ state: "set", cap: true });
    expect(dayMinutes(0)).toBe(90);
    expect(dayMinutes(200)).toBe(90);
    expect(sunsetOf({ ...base, dailyMinutes: 0, minutes: 30 })).toEqual({ state: "open", share: 30 / 90, left: 60 });
  });

  it("knows which reasons mean the day is done, and that no other reason does", () => {
    expect(isDayDone("programme_done")).toBe(true);
    expect(isDayDone("daily_cap")).toBe(true);
    for (const r of ["doctor_first", "needs_consent", "awaiting_counsellor", "under_age", "guardian_only", "not_offered", "", null, undefined]) expect(isDayDone(r)).toBe(false);
  });
});

describe("the sun does not set for a day that ended another way", () => {
  it("shows rest, not a sunset, on a day a session was stopped for feeling unwell", () => {
    expect(sunsetOf({ ...base, stoppedToday: true, reason: "programme_done", minutes: 60 })).toEqual({ state: "rest", dayDone: true });
    expect(sunsetOf({ ...base, stoppedToday: true, minutes: 20 })).toEqual({ state: "rest", dayDone: false });
  });

  it("shows no sunset when practice is closed for a safety reason", () => {
    for (const why of ["doctor_first", "needs_consent", "awaiting_counsellor", "under_age"] as const) {
      expect(sunsetOf({ ...base, reason: why, minutes: 60 })).toEqual({ state: "closed", why });
    }
    /* the engine puts those reasons before the end of the day, so a child whose consent was withdrawn sees no sunset */
    expect(reasonAt(60, { consentMissing: true })).toBe("needs_consent");
    expect(reasonAt(60, { stopFlag: true })).toBe("doctor_first");
  });

  it("never sets in a staff test household, where no day closes", () => {
    expect(canStart({ kind: "game", minutesToday: 500, ...dose, tester: true }).ok).toBe(true);
    expect(sunsetOf({ ...base, tester: true, reason: "programme_done", minutes: 60 })).toEqual({ state: "tester" });
  });
});

describe("the invitation outside follows the Light ring and the clock", () => {
  const set = { ...base, reason: "programme_done" as const, minutes: 60 };
  it("invites outside while it can be light and the ring has room", () => {
    expect(sunsetOf({ ...set, hour: 9 })).toMatchObject({ outside: "go", lightLeft: 70 });
    expect(sunsetOf({ ...set, hour: LIGHT_UNTIL_HOUR - 1 })).toMatchObject({ outside: "go" });
  });
  it("waits for tomorrow late in the evening and at night", () => {
    expect(sunsetOf({ ...set, hour: LIGHT_UNTIL_HOUR })).toMatchObject({ outside: "tomorrow" });
    expect(sunsetOf({ ...set, hour: 23 })).toMatchObject({ outside: "tomorrow" });
    expect(sunsetOf({ ...set, hour: LIGHT_FROM_HOUR - 1 })).toMatchObject({ outside: "tomorrow" });
    expect(canBeLight(6)).toBe(true);
    expect(canBeLight(5)).toBe(false);
  });
  it("says the ring is full when it is, at any hour, and never counts below zero", () => {
    expect(sunsetOf({ ...set, light: { done: 95, goal: 90 }, hour: 22 })).toMatchObject({ outside: "full", lightLeft: 0 });
    expect(sunsetOf({ ...set, light: { done: 89.2, goal: 90 } })).toMatchObject({ outside: "go", lightLeft: 1 });
  });
  it("does not call a ring with no goal full", () => {
    expect(sunsetOf({ ...set, light: { done: 0, goal: 0 } })).toMatchObject({ outside: "go", lightLeft: 0 });
  });
});
