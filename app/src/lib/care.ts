/**
 * Care away from the screen: the family's own log of time outdoors and of short breaks, and the Light and Rest rings.
 *
 * The rules, enforced here and not only in the pages:
 * - One outdoor entry is 5 to 180 minutes and a day holds at most 600.
 * - At most 12 blink and far breaks a day count, and a break counts only when its timer ran.
 * - Every read and write is scoped to the active profile (`m.profile.id`).
 *
 * The first half is pure (tested in care.test.ts). The second half reads and writes.
 * Day keys are passed in so this file does not read the clock or the request.
 */
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Member } from "@/lib/session";

/* ════════════════════════ pure rules ════════════════════════ */

/* ───────────── days and weeks (date keys are YYYY-MM-DD) ───────────── */

const DAY_MS = 86_400_000;
const utc = (key: string) => new Date(`${key}T00:00:00Z`);
const keyOf = (d: Date) => d.toISOString().slice(0, 10);

/** True for a real calendar day written as YYYY-MM-DD. */
export const isDayKey = (key: string) => /^\d{4}-\d{2}-\d{2}$/.test(key) && !Number.isNaN(utc(key).getTime()) && keyOf(utc(key)) === key;
export const addDays = (key: string, n: number) => keyOf(new Date(utc(key).getTime() + n * DAY_MS));
/** 0 Sunday to 6 Saturday. */
export const weekdayOf = (key: string) => utc(key).getUTCDay();
/** The Monday of the week a day is in. */
export const weekStart = (key: string) => addDays(key, -((weekdayOf(key) + 6) % 7));
/** Monday to Sunday of the week a day is in. */
export const weekDays = (key: string) => Array.from({ length: 7 }, (_, i) => addDays(weekStart(key), i));

/* ───────────── outdoor time ───────────── */

export const OUTDOOR_MIN = 5;
export const OUTDOOR_MAX = 180;
export const OUTDOOR_DAY_CAP = 600;
export const isOutdoorEntry = (minutes: number) => Number.isInteger(minutes) && minutes >= OUTDOOR_MIN && minutes <= OUTDOOR_MAX;
/** The minutes of one entry that still fit in the day. */
export const outdoorCounted = (minutes: number, loggedToday: number) =>
  isOutdoorEntry(minutes) ? Math.max(0, Math.min(minutes, OUTDOOR_DAY_CAP - Math.max(0, loggedToday))) : 0;

/* ───────────── breaks ───────────── */

export const BREAKS_A_DAY = 12;
export const breakCounts = (countedToday: number) => countedToday < BREAKS_A_DAY;

export const BREAK_KINDS = ["blink", "far"] as const;
export type BreakKind = (typeof BREAK_KINDS)[number];
export const BLINKS_IN_SET = 10;
/** One full blink, in order. Seconds for each part. */
export const BLINK_PARTS = [{ key: "close", seconds: 1.5 }, { key: "pause", seconds: 1.5 }, { key: "squeeze", seconds: 1.5 }, { key: "open", seconds: 1.5 }] as const;
export type BlinkPart = (typeof BLINK_PARTS)[number]["key"];
export const BLINK_SECONDS = BLINK_PARTS.reduce((sum, p) => sum + p.seconds, 0);
export const FAR_SECONDS = 20;
export const FAR_FINDS = 3;
/** How long each break takes when it is done as guided. */
export const breakSeconds = (kind: BreakKind) => (kind === "blink" ? BLINKS_IN_SET * BLINK_SECONDS : FAR_SECONDS);
/** A break counts only when its timer ran. A little slack covers a slow clock. */
export const ranLongEnough = (kind: BreakKind, elapsedMs: number) => elapsedMs >= breakSeconds(kind) * 1000 * 0.9;

/* ───────────── picking by date ───────────── */

/** A number from a text, the same on every device (FNV-1a). */
export function seedOf(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/** `n` different items of a list, chosen and ordered by the seed alone. */
export function pickSeeded<T>(list: readonly T[], n: number, seed: string): T[] {
  let a = seedOf(seed);
  const next = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pool = [...list], take = Math.min(n, pool.length);
  for (let i = 0; i < take; i++) { const j = i + Math.floor(next() * (pool.length - i)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, take);
}

/* ════════════════════════ reading and writing ════════════════════════ */

const L = schema.careLog, D = schema.daySummary;
/** A transaction on the app's database. */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type Refusal = "not_allowed" | "already" | "nothing" | "too_soon" | "day_full";
/** What a write answers. `R` lists the reasons it may refuse for. */
export type CareResult<T = object, R extends string = Refusal> = ({ ok: true } & T) | { ok: false; reason: R };
export const refuse = <R extends string>(reason: R) => ({ ok: false as const, reason });
const no = (reason: Refusal) => refuse(reason);

/** One writer at a time for a profile's day, so two taps cannot both slip under a cap. Held until the transaction ends. */
export const lockDay = (tx: Tx, profileId: string, day: string, what: string) =>
  tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`care:${profileId}:${day}:${what}`}))`);

/** The active profile's entries of one kind, on one day when a day is given. */
export const mine = (m: Member, kind: string, day?: string) =>
  and(eq(L.profileId, m.profile.id), eq(L.kind, kind), ...(day ? [eq(L.day, day)] : []));

/* ───────────── outdoor time and the Light ring ───────────── */

/** Add to the day's rings. A new day row carries the Train goal, as the session code writes it. */
const addToDay = (tx: Tx, m: Member, day: string, add: { light: number } | { rest: number }) =>
  tx.insert(D).values({ profileId: m.profile.id, day, trainGoal: m.enrolment?.dailyMinutes ?? 0, ...("light" in add ? { lightMinutes: add.light } : { restBreaks: add.rest }) })
    .onConflictDoUpdate({
      target: [D.profileId, D.day],
      set: "light" in add ? { lightMinutes: sql`least(${D.lightMinutes} + ${add.light}, ${OUTDOOR_DAY_CAP})` } : { restBreaks: sql`${D.restBreaks} + ${add.rest}` },
    });

/** One visit outdoors. The minutes that fit in the day go to the Light ring; what was found is kept with the entry. */
export async function logOutdoor(m: Member, f: { day: string; slug: string; minutes: number; found: number; data: Record<string, unknown> }): Promise<CareResult<{ counted: number }>> {
  if (!m.can("train")) return no("not_allowed");
  if (!isOutdoorEntry(f.minutes)) return no("nothing");
  return db.transaction(async (tx) => {
    await lockDay(tx, m.profile.id, f.day, "outdoor");
    const [{ logged }] = await tx.select({ logged: sql<number>`coalesce(sum(${L.minutes}), 0)`.mapWith(Number) }).from(L).where(mine(m, "outdoor", f.day));
    const counted = outdoorCounted(f.minutes, logged);
    if (counted <= 0 && f.found <= 0) return no("day_full");
    await tx.insert(L).values({ profileId: m.profile.id, day: f.day, kind: "outdoor", itemSlug: f.slug, minutes: counted, count: f.found, data: f.data });
    if (counted > 0) await addToDay(tx, m, f.day, { light: counted });
    return { ok: true as const, counted };
  });
}

/** Outdoor entries of one companion between two days, oldest first. */
export const outdoorEntries = (m: Member, slug: string, from: string, to: string) =>
  db.select({ day: L.day, minutes: L.minutes, data: L.data }).from(L)
    .where(and(mine(m, "outdoor"), eq(L.itemSlug, slug), gte(L.day, from), lte(L.day, to))).orderBy(L.createdAt);

/** Outdoor minutes logged for a day, from every companion. */
export async function outdoorOn(m: Member, day: string) {
  const [row] = await db.select({ minutes: sql<number>`coalesce(sum(${L.minutes}), 0)`.mapWith(Number) }).from(L).where(mine(m, "outdoor", day));
  return row.minutes;
}

/* ───────────── breaks and the Rest ring ───────────── */

/** Breaks that counted today, blink sets that counted since a day, and far breaks today. */
export async function breaksOf(m: Member, day: string, since: string) {
  const rows = await db.select({ kind: L.kind, day: L.day, n: sql<number>`coalesce(sum(${L.count}), 0)`.mapWith(Number) }).from(L)
    .where(and(eq(L.profileId, m.profile.id), inArray(L.kind, BREAK_KINDS), gte(L.day, since < day ? since : day))).groupBy(L.kind, L.day);
  const sum = (kind: BreakKind | null, from: string) => rows.filter((r) => (!kind || r.kind === kind) && r.day >= from).reduce((s, r) => s + r.n, 0);
  return { today: sum(null, day), blinkSets: sum("blink", since), blinkToday: sum("blink", day), farToday: sum("far", day) };
}

/**
 * A finished break. `startedAt` comes from the signed ticket the server handed out when the break began,
 * so one ticket cannot be logged twice. The 13th break of a day is kept in the log but does not move the ring.
 */
export async function logBreak(m: Member, f: { kind: BreakKind; slug: string; day: string; startedAt: number; data: Record<string, unknown> }): Promise<CareResult<{ counted: boolean; today: number }>> {
  if (!m.can("train")) return no("not_allowed");
  return db.transaction(async (tx) => {
    await lockDay(tx, m.profile.id, f.day, "break");
    const today = await tx.select({ count: L.count, data: L.data }).from(L).where(and(eq(L.profileId, m.profile.id), inArray(L.kind, BREAK_KINDS), eq(L.day, f.day)));
    if (today.some((r) => (r.data as { startedAt?: unknown } | null)?.startedAt === f.startedAt)) return no("already");
    const before = today.reduce((s, r) => s + r.count, 0), counted = breakCounts(before);
    await tx.insert(L).values({ profileId: m.profile.id, day: f.day, kind: f.kind, itemSlug: f.slug, count: counted ? 1 : 0, data: { ...f.data, startedAt: f.startedAt } });
    if (counted) await addToDay(tx, m, f.day, { rest: 1 });
    return { ok: true as const, counted, today: before + (counted ? 1 : 0) };
  });
}
