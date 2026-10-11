// Eyes Opener: Lights On Hour: one fixed hour a week when households practise at the same time. The rules, pure.
/**
 * Lights On Hour: one fixed hour a week when households practise at the same time. The rules, pure.
 * Tested in lights-on.test.ts; src/lib/lights-on-data.ts reads and writes.
 *
 * The rules, in one place:
 * 1. Staff set one hour for everyone: a weekday and a starting hour, in India time. It lasts 60 minutes.
 *    Until staff set it, it is Sunday at 6 in the evening.
 * 2. Once a year the hour also runs on World Sight Day, the second Thursday of October, at the same time of day.
 *    That day is worked out here for any year. It is the same scene with a festival look, and nothing more.
 * 3. A household has a lantern when one of its profiles started or finished a practice session inside the hour.
 *    That is read from the sessions that already exist. Taking part writes nothing and gives nothing: no points,
 *    no extra minutes, no streak, no place in any list. The hour is company, not a reward.
 * 4. Nobody is named. The page shows a number and that many lanterns, and neither at all while fewer than
 *    LIGHTS_MIN households are practising (the smallest group the app shows a count for).
 * 5. No real-time service: the page asks again every REFRESH_SECONDS.
 * 6. Nothing flashes. A lantern rises once, slowly, and then stays.
 */
import { SPONSOR_MIN_GROUP } from "@/lib/roles";

/** Households that must be practising before a number or any lantern but one's own is shown. */
export const LIGHTS_MIN = SPONSOR_MIN_GROUP;
/** How often the page asks for the count again while the hour is on. */
export const REFRESH_SECONDS = 60;
/** The hour lasts this long. */
export const HOUR_MINUTES = 60;
/** The hour may start between these two clock hours (India time), so that it ends by 9 in the evening. */
export const HOUR_MIN = 6, HOUR_MAX = 20;

export interface HourSetting {
  /** 0 is Sunday, 6 is Saturday. */
  weekday: number;
  /** The clock hour it starts at, in India time, 0 to 23. */
  hour: number;
}

/**
 * Sunday at 6 in the evening, India time: a day with no school, after the daylight hours the Light ring asks
 * children to spend outdoors, and early enough to end before a school night's bedtime.
 */
export const DEFAULT_HOUR: HourSetting = { weekday: 0, hour: 18 };

const whole = (v: unknown, min: number, max: number): number | null => (typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : null);

/** True for a weekday and a starting hour that staff may set. */
export const isHourSetting = (v: { weekday: unknown; hour: unknown }): v is HourSetting => whole(v.weekday, 0, 6) !== null && whole(v.hour, HOUR_MIN, HOUR_MAX) !== null;

/** The stored setting, or the default when the row is missing or holds something odd. */
export function cleanHour(value: unknown): HourSetting {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_HOUR;
  const v = value as { weekday?: unknown; hour?: unknown };
  return isHourSetting({ weekday: v.weekday, hour: v.hour }) ? { weekday: v.weekday as number, hour: v.hour as number } : DEFAULT_HOUR;
}

/* ───────────── days, in India time ───────────── */

const DAY_MS = 86_400_000;
const indiaDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });
/** The day a moment falls on in India, as YYYY-MM-DD. */
export const dayIn = (at: Date) => indiaDay.format(at);
const utc = (day: string) => new Date(`${day}T00:00:00Z`);
const plus = (day: string, n: number) => new Date(utc(day).getTime() + n * DAY_MS).toISOString().slice(0, 10);
/** 0 is Sunday. */
export const weekdayOf = (day: string) => utc(day).getUTCDay();

/**
 * World Sight Day: the second Thursday of October, for any year. Worked out, never typed in.
 * The rule is the one the day's organisers use ("World Sight Day", https://en.wikipedia.org/wiki/World_Sight_Day ;
 * checked on 5 October 2026 against the date announced for 2026, Thursday 8 October).
 */
export function worldSightDay(year: number): string {
  const first = new Date(Date.UTC(year, 9, 1)).getUTCDay();
  const firstThursday = 1 + ((4 - first + 7) % 7);
  return `${year}-10-${String(firstThursday + 7).padStart(2, "0")}`;
}

/* ───────────── the hour ───────────── */

export interface Occurrence {
  /** The India day it falls on. */
  day: string;
  start: Date;
  end: Date;
  /** True on World Sight Day. */
  festival: boolean;
}

/** The hour on this India day, or null when the day has none. India keeps one clock all year, five and a half hours ahead. */
export function occurrenceOn(day: string, setting: HourSetting): Occurrence | null {
  const festival = day === worldSightDay(Number(day.slice(0, 4)));
  if (!festival && weekdayOf(day) !== setting.weekday) return null;
  const start = new Date(`${day}T${String(setting.hour).padStart(2, "0")}:00:00+05:30`);
  return { day, start, end: new Date(start.getTime() + HOUR_MINUTES * 60_000), festival };
}

export type HourNow = { on: true; hour: Occurrence } | { on: false; hour: Occurrence };

/** The hour that is running now, or else the next one. One always comes within a week. */
export function hourAt(now: Date, setting: HourSetting): HourNow {
  const today = dayIn(now);
  for (let i = 0; i <= 7; i++) {
    const hour = occurrenceOn(plus(today, i), setting);
    if (hour && now.getTime() < hour.end.getTime()) return { on: now.getTime() >= hour.start.getTime(), hour };
  }
  /* cannot happen: a weekday comes round within seven days */
  throw new Error("no hour within a week");
}

/** The latest hour that has ended. */
export function lastHour(now: Date, setting: HourSetting): Occurrence {
  const today = dayIn(now);
  for (let i = 0; i <= 7; i++) {
    const hour = occurrenceOn(plus(today, -i), setting);
    if (hour && hour.end.getTime() <= now.getTime()) return hour;
  }
  throw new Error("no hour in the last week");
}

/** What is left until a moment, in whole days, hours and minutes. The minute in progress is counted, so it never reads 0 too early. */
export function untilParts(now: Date, then: Date): { days: number; hours: number; minutes: number } {
  const minutes = Math.max(0, Math.ceil((then.getTime() - now.getTime()) / 60_000));
  return { days: Math.floor(minutes / 1440), hours: Math.floor((minutes % 1440) / 60), minutes: minutes % 60 };
}

/* ───────────── what may be shown ───────────── */

/** A count of households, or null when it covers too few to show. */
export const shownHouseholds = (households: number, min = LIGHTS_MIN): number | null => (households >= min ? households : null);

/** Lanterns drawn at most. A larger number is still shown as a number. */
export const LANTERN_MAX = 60;

export interface Lantern {
  /** Left edge, as a share of the sky's width (0 to 100). */
  x: number;
  /** Where it comes to rest, as a share of the sky's height from the top (0 to 100). */
  y: number;
  /** 0.7 to 1.15: farther lanterns are smaller. */
  size: number;
  /** Seconds before it starts to rise, so they do not all move together. */
  delay: number;
}

const frac = (n: number) => n - Math.floor(n);

/**
 * Where each lantern sits. The same count always gives the same sky: places come from a fixed, evenly spread
 * sequence, not from chance, so nothing jumps when the page asks again, and a new lantern takes the next place.
 */
export function lanterns(count: number, max = LANTERN_MAX): Lantern[] {
  const n = Math.max(0, Math.min(max, Math.floor(Number.isFinite(count) ? count : 0)));
  return Array.from({ length: n }, (_, i) => ({
    /* the two numbers are the "plastic" pair, which spreads points evenly over a rectangle with no rows or lines */
    x: Number((4 + frac(0.5 + i * 0.7548776662) * 86).toFixed(2)),
    /* the top of the sky is left free for the words that stand over it */
    y: Number((18 + frac(0.5 + i * 0.5698402910) * 48).toFixed(2)),
    size: Number((0.7 + frac(i * 0.6180339887) * 0.45).toFixed(2)),
    delay: Number(((i % 12) * 0.5).toFixed(1)),
  }));
}

/* ───────────── a staff look at the scene ───────────── */

export type Preview = "hour" | "festival";
/** Lanterns a staff preview draws. They are sample lanterns, and the page says so. */
export const PREVIEW_LANTERNS = 23;

/**
 * The hour runs once a week, so staff need a way to look at its scene on any day. Only a staff test household may
 * ask for it (`?preview=hour` or `?preview=festival`); a family's page never reads the address for this.
 */
export function previewFor(tester: boolean, ask: unknown): Preview | null {
  if (!tester) return null;
  const v = Array.isArray(ask) ? ask[0] : ask;
  return v === "hour" || v === "festival" ? v : null;
}
