import { describe, expect, it } from "vitest";
import { SPONSOR_MIN_GROUP } from "./roles";
import {
  cleanHour, dayIn, DEFAULT_HOUR, HOUR_MAX, HOUR_MIN, hourAt, isHourSetting, LANTERN_MAX, lanterns, lastHour, LIGHTS_MIN,
  occurrenceOn, previewFor, shownHouseholds, untilParts, weekdayOf, worldSightDay,
} from "./lights-on";

/** A moment given as India wall time. */
const india = (day: string, time: string) => new Date(`${day}T${time}:00+05:30`);
const SUNDAY_6PM = DEFAULT_HOUR;

describe("World Sight Day", () => {
  it("is the second Thursday of October, worked out for any year", () => {
    /* the dates the day was held on, or is announced for */
    expect(worldSightDay(2023)).toBe("2023-10-12");
    expect(worldSightDay(2024)).toBe("2024-10-10");
    expect(worldSightDay(2025)).toBe("2025-10-09");
    expect(worldSightDay(2026)).toBe("2026-10-08");
    expect(worldSightDay(2027)).toBe("2027-10-14");
  });
  it("is always a Thursday between the 8th and the 14th", () => {
    for (let year = 2020; year <= 2100; year++) {
      const day = worldSightDay(year), date = Number(day.slice(8));
      expect(weekdayOf(day), day).toBe(4);
      expect(date >= 8 && date <= 14, day).toBe(true);
    }
  });
});

describe("the setting staff keep", () => {
  it("is Sunday at 6 in the evening until staff set it, and whenever the stored row is odd", () => {
    expect(DEFAULT_HOUR).toEqual({ weekday: 0, hour: 18 });
    for (const odd of [undefined, null, "sunday", 7, [], {}, { weekday: 7, hour: 18 }, { weekday: 1, hour: 23 }, { weekday: 1.5, hour: 18 }, { weekday: "1", hour: "18" }]) {
      expect(cleanHour(odd), JSON.stringify(odd)).toEqual(DEFAULT_HOUR);
    }
    expect(cleanHour({ weekday: 6, hour: 17, extra: "dropped" })).toEqual({ weekday: 6, hour: 17 });
  });
  it("takes only a weekday and an hour that ends by 9 in the evening", () => {
    expect(isHourSetting({ weekday: 0, hour: HOUR_MIN })).toBe(true);
    expect(isHourSetting({ weekday: 6, hour: HOUR_MAX })).toBe(true);
    expect(isHourSetting({ weekday: 3, hour: HOUR_MAX + 1 })).toBe(false);
    expect(isHourSetting({ weekday: 3, hour: HOUR_MIN - 1 })).toBe(false);
    expect(isHourSetting({ weekday: -1, hour: 18 })).toBe(false);
  });
});

describe("when the hour is", () => {
  it("falls on the set weekday at the set hour, in India time, and lasts 60 minutes", () => {
    /* 2026-10-04 is a Sunday */
    const hour = occurrenceOn("2026-10-04", SUNDAY_6PM)!;
    expect(hour.start.toISOString()).toBe("2026-10-04T12:30:00.000Z");
    expect(hour.end.toISOString()).toBe("2026-10-04T13:30:00.000Z");
    expect(hour.festival).toBe(false);
    expect(occurrenceOn("2026-10-05", SUNDAY_6PM)).toBeNull();
  });
  it("reads the India day, not the server's: late evening in India is still the same day", () => {
    expect(dayIn(new Date("2026-10-04T18:29:00Z"))).toBe("2026-10-04");
    expect(dayIn(new Date("2026-10-04T18:31:00Z"))).toBe("2026-10-05");
  });
  it("is on from the first minute to the last, and not a moment longer", () => {
    expect(hourAt(india("2026-10-04", "17:59"), SUNDAY_6PM)).toMatchObject({ on: false, hour: { day: "2026-10-04" } });
    expect(hourAt(india("2026-10-04", "18:00"), SUNDAY_6PM)).toMatchObject({ on: true, hour: { day: "2026-10-04" } });
    expect(hourAt(india("2026-10-04", "18:59"), SUNDAY_6PM)).toMatchObject({ on: true });
    /* at 19:00 it is over, and the next one is what the page counts down to */
    expect(hourAt(india("2026-10-04", "19:00"), SUNDAY_6PM)).toMatchObject({ on: false, hour: { day: "2026-10-08", festival: true } });
  });
  it("adds an hour on World Sight Day at the same time of day, with the festival look", () => {
    const thursday = occurrenceOn("2026-10-08", SUNDAY_6PM)!;
    expect(thursday).toMatchObject({ festival: true });
    expect(thursday.start.toISOString()).toBe("2026-10-08T12:30:00.000Z");
    expect(hourAt(india("2026-10-08", "18:30"), SUNDAY_6PM)).toMatchObject({ on: true, hour: { festival: true } });
    /* the weekly hour goes on as usual after it */
    expect(hourAt(india("2026-10-08", "19:30"), SUNDAY_6PM)).toMatchObject({ on: false, hour: { day: "2026-10-11", festival: false } });
  });
  it("is one hour, not two, when the weekly day is a Thursday", () => {
    const thursdays: typeof SUNDAY_6PM = { weekday: 4, hour: 17 };
    expect(occurrenceOn("2026-10-08", thursdays)).toMatchObject({ festival: true });
    expect(occurrenceOn("2026-10-15", thursdays)).toMatchObject({ festival: false });
    expect(hourAt(india("2026-10-08", "18:00"), thursdays)).toMatchObject({ on: false, hour: { day: "2026-10-15" } });
  });
  it("finds the next hour from any day of the week, within seven days", () => {
    for (let i = 0; i < 14; i++) {
      const now = new Date(india("2026-11-01", "07:00").getTime() + i * 86_400_000);
      const { hour } = hourAt(now, SUNDAY_6PM);
      expect(weekdayOf(hour.day)).toBe(0);
      expect(hour.end.getTime() - now.getTime()).toBeLessThanOrEqual(8 * 86_400_000);
      expect(hour.end.getTime()).toBeGreaterThan(now.getTime());
    }
  });
  it("knows the latest hour that has ended", () => {
    expect(lastHour(india("2026-10-05", "10:00"), SUNDAY_6PM)).toMatchObject({ day: "2026-10-04", festival: false });
    /* while this week's hour is still running, the last one is last week's */
    expect(lastHour(india("2026-10-04", "18:30"), SUNDAY_6PM)).toMatchObject({ day: "2026-09-27" });
    expect(lastHour(india("2026-10-04", "19:00"), SUNDAY_6PM)).toMatchObject({ day: "2026-10-04" });
    expect(lastHour(india("2026-10-09", "08:00"), SUNDAY_6PM)).toMatchObject({ day: "2026-10-08", festival: true });
  });
  it("counts down in days, hours and minutes, and never reads nought before the hour starts", () => {
    const start = india("2026-10-08", "18:00");
    expect(untilParts(india("2026-10-05", "10:21"), start)).toEqual({ days: 3, hours: 7, minutes: 39 });
    expect(untilParts(new Date(start.getTime() - 20_000), start)).toEqual({ days: 0, hours: 0, minutes: 1 });
    expect(untilParts(start, start)).toEqual({ days: 0, hours: 0, minutes: 0 });
    expect(untilParts(new Date(start.getTime() + 60_000), start)).toEqual({ days: 0, hours: 0, minutes: 0 });
  });
});

describe("what is shown", () => {
  it("shows no number below the smallest group the app shows a count for", () => {
    expect(LIGHTS_MIN).toBe(SPONSOR_MIN_GROUP);
    for (let n = 0; n < LIGHTS_MIN; n++) expect(shownHouseholds(n)).toBeNull();
    expect(shownHouseholds(LIGHTS_MIN)).toBe(LIGHTS_MIN);
    expect(shownHouseholds(240)).toBe(240);
  });
  it("draws one lantern for each household, up to a limit, each inside the sky", () => {
    expect(lanterns(0)).toEqual([]);
    expect(lanterns(-3)).toEqual([]);
    expect(lanterns(Number.NaN)).toEqual([]);
    expect(lanterns(7)).toHaveLength(7);
    expect(lanterns(5000)).toHaveLength(LANTERN_MAX);
    for (const l of lanterns(LANTERN_MAX)) {
      expect(l.x >= 0 && l.x <= 92, `x ${l.x}`).toBe(true);
      expect(l.y >= 0 && l.y <= 70, `y ${l.y}`).toBe(true);
      expect(l.size >= 0.7 && l.size <= 1.15).toBe(true);
      expect(l.delay >= 0 && l.delay <= 12).toBe(true);
    }
  });
  it("keeps every lantern in its place when one more household joins", () => {
    expect(lanterns(9).slice(0, 8)).toEqual(lanterns(8));
    expect(lanterns(8)).toEqual(lanterns(8));
  });
});

describe("the staff look at the scene", () => {
  it("is for a staff test household only: a family's address is never read", () => {
    expect(previewFor(true, "hour")).toBe("hour");
    expect(previewFor(true, ["festival", "hour"])).toBe("festival");
    expect(previewFor(true, "anything")).toBeNull();
    expect(previewFor(true, undefined)).toBeNull();
    expect(previewFor(false, "hour")).toBeNull();
    expect(previewFor(false, "festival")).toBeNull();
  });
});
