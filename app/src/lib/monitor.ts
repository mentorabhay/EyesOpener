// Eyes Opener: The workday monitor on the server: who may use it, camera consent, runs, one-minute samples, breaks, and what.
/**
 * The workday monitor on the server: who may use it, camera consent, runs, one-minute samples, breaks, and what
 * the member sees afterwards. The rules themselves are in monitor-rules.ts and are tested without a database.
 *
 * What reaches this file from a member's device is numbers only: one measured minute at a time, and the time of a
 * break. No picture and no face point is ever sent, and `minuteInput` refuses anything that is not one of the
 * numbers. Every read and write is for the active profile of the household of the person signed in.
 *
 * Who sees the numbers: the grown-ups of the household, on the monitor's own page. Nothing here is read by the
 * sponsor, counsellor or staff areas, and there is no employer of any kind in the data model.
 */
import { and, asc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { canStart } from "@/engine";
import { addToDay, BREAK_KINDS, breakCounts, lockDay } from "@/lib/care";
import { isGuardianSeat } from "@/lib/roles";
import { lastDays, todayKey, type Member } from "@/lib/session";
import {
  breakInput, breakInTime, CAMERA_CONSENT, CAMERA_CONSENT_VERSION, dayBins, dayKeyOf, dayTotals, isAdultProfile, minuteInput, minuteInTime,
  MONITOR_SLUG, ringDecision, RULE, type BreakRow, type LoggedBreak, type SampleRow,
} from "./monitor-rules";

const S = schema.session, M = schema.monitorSample, L = schema.careLog, D = schema.daySummary, C = schema.consent;
const DAY_MS = 86_400_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ───────────── who ───────────── */

/**
 * The page is for the grown-ups who decide in the household (guardian and co-guardian). A cheer seat is a relative
 * who looks and encourages: a worker's own monitor is not theirs to see, and they get "not found".
 */
export const maySeeMonitor = (m: Pick<Member, "seat">) => isGuardianSeat(m.seat);

export type MonitorUse = "ok" | "child" | "look_only";
/**
 * May the monitor run for the active profile? Never for a child's profile: it watches a person for hours, and the
 * law in India bans behavioural monitoring of anyone under 18. It is built for a worker at a desk.
 */
export function monitorUse(m: Pick<Member, "profile" | "age" | "can" | "childMode">): MonitorUse {
  if (!isAdultProfile(m.profile, m.age)) return "child";
  return m.can("train") && !m.childMode ? "ok" : "look_only";
}

/* ───────────── camera consent ───────────── */

const liveConsent = (m: Member) => and(eq(C.profileId, m.profile.id), eq(C.accountId, m.account.id), eq(C.kind, CAMERA_CONSENT), isNull(C.revokedAt));

/** The camera consent in force for the active profile, or null. */
export async function cameraConsent(m: Member): Promise<{ at: Date; by: string | null } | null> {
  const [row] = await db.select({ at: C.grantedAt, by: schema.appUser.displayName }).from(C)
    .leftJoin(schema.appUser, eq(schema.appUser.id, C.userId)).where(liveConsent(m)).orderBy(asc(C.grantedAt)).limit(1);
  return row ?? null;
}

/** A guardian or co-guardian says yes to the camera for the active grown-up profile. Recorded once. */
export async function giveCameraConsent(m: Member): Promise<"done" | "not_allowed"> {
  if (!maySeeMonitor(m) || !m.can("consent") || monitorUse(m) !== "ok") return "not_allowed";
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`consent:${m.profile.id}:${CAMERA_CONSENT}`}))`);
    const [live] = await tx.select({ id: C.id }).from(C).where(liveConsent(m)).limit(1);
    if (!live) await tx.insert(C).values({ profileId: m.profile.id, accountId: m.account.id, userId: m.user.id, kind: CAMERA_CONSENT, textVersion: CAMERA_CONSENT_VERSION });
  });
  return "done";
}

/** Consent taken back. A run that is open ends, so nothing more is stored. */
export async function withdrawCameraConsent(m: Member): Promise<"done" | "not_allowed"> {
  if (!maySeeMonitor(m) || !m.can("consent")) return "not_allowed";
  const now = new Date();
  await db.update(C).set({ revokedAt: now }).where(liveConsent(m));
  await endOpenRuns(m.profile.id, now);
  return "done";
}

/* ───────────── runs ───────────── */

export type Refused = "not_allowed" | "consent" | "ended" | "bad" | "late";
const refuse = <R extends Refused>(why: R) => ({ ok: false as const, why });

/** Everything a write needs to be true of the person and the profile, checked on every call. */
async function mayRun(m: Member): Promise<"not_allowed" | "consent" | null> {
  if (!maySeeMonitor(m) || monitorUse(m) !== "ok") return "not_allowed";
  /* monitor time is screen time, never training: the dose check only keeps the under-4 rule in one place */
  if (!canStart({ kind: "monitor", minutesToday: 0, ...m.dose }).ok) return "not_allowed";
  return (await cameraConsent(m)) ? null : "consent";
}

const openRun = (m: Member, runId: string) => and(eq(S.id, runId), eq(S.profileId, m.profile.id), eq(S.kind, "monitor"), isNull(S.endedAt));

/** Ends every run this profile left open (a closed tab, another computer). A run that stored nothing leaves no row. */
async function endOpenRuns(profileId: string, now: Date) {
  const open = and(eq(S.profileId, profileId), eq(S.kind, "monitor"), isNull(S.endedAt));
  await db.delete(S).where(and(open, eq(S.minutes, 0)));
  await db.update(S).set({ endedAt: now, endReason: "left" }).where(open);
}

/**
 * Starts a run. One profile has one run at a time: a run left open in another tab or on another computer ends here,
 * and that page is told so the next time it tries to store a minute. `now` lets the page set its clock by the server's.
 */
export async function startRun(m: Member, now = new Date()): Promise<{ ok: true; runId: string; now: number } | { ok: false; why: "not_allowed" | "consent" }> {
  const no = await mayRun(m);
  if (no) return refuse(no);
  await endOpenRuns(m.profile.id, now);
  const [row] = await db.insert(S).values({ profileId: m.profile.id, deviceId: m.device?.id, kind: "monitor", itemSlug: MONITOR_SLUG, ring: "rest", startedAt: now }).returning({ id: S.id });
  return { ok: true, runId: row.id, now: now.getTime() };
}

export async function endRun(m: Member, runId: string, now = new Date()): Promise<boolean> {
  if (!UUID.test(runId) || !maySeeMonitor(m)) return false;
  /* a run that stored nothing (the camera was refused, or it was stopped in its first minute) leaves no row */
  const [empty] = await db.delete(S).where(and(openRun(m, runId), eq(S.minutes, 0))).returning({ id: S.id });
  if (empty) return true;
  const [closed] = await db.update(S).set({ endedAt: now, endReason: "done" }).where(openRun(m, runId)).returning({ id: S.id });
  return !!closed;
}

/**
 * One measured minute. Stored only when every number is in range, the run is this profile's and still open, and the
 * minute is over and recent. A profile has at most one row for a clock minute. The seconds a face was in view are
 * added to the day's screen time; nothing is added to training minutes.
 */
export async function saveMinute(m: Member, runId: string, input: unknown, now = new Date()): Promise<{ ok: true; stored: boolean } | { ok: false; why: Refused }> {
  const no = await mayRun(m);
  if (no) return refuse(no);
  const parsed = minuteInput.safeParse(input);
  if (!UUID.test(String(runId)) || !parsed.success) return refuse("bad");
  const f = parsed.data;
  const [run] = await db.select({ startedAt: S.startedAt }).from(S).where(openRun(m, runId));
  if (!run) return refuse("ended");
  if (!minuteInTime(f.at, now.getTime(), run.startedAt.getTime())) return refuse("late");

  const takenAt = new Date(f.at), day = todayKey(takenAt), screen = f.faceSeconds / 60;
  return db.transaction(async (tx) => {
    await lockDay(tx, m.profile.id, day, "monitor");
    const [dup] = await tx.select({ id: M.id }).from(M).where(and(eq(M.profileId, m.profile.id), eq(M.takenAt, takenAt))).limit(1);
    if (dup) return { ok: true as const, stored: false };
    await tx.insert(M).values({
      profileId: m.profile.id, takenAt, distanceCm: f.distanceCm, blinksPerMin: f.blinksPerMin, halfBlinksPerMin: f.halfBlinksPerMin,
      posture: f.posture, minutesSinceBreak: f.minutesSinceBreak, faceSeconds: f.faceSeconds, prompt: f.prompt,
    });
    await tx.update(S).set({ minutes: sql`${S.minutes} + ${screen}` }).where(openRun(m, runId));
    await tx.insert(D).values({ profileId: m.profile.id, day, trainGoal: m.enrolment?.dailyMinutes ?? 0, screenMinutes: screen })
      .onConflictDoUpdate({ target: [D.profileId, D.day], set: { screenMinutes: sql`least(${D.screenMinutes} + ${screen}, 1440)` } });
    return { ok: true as const, stored: true };
  });
}

/**
 * A break the monitor saw, or timed. It goes into the care log beside the companions' breaks. An earned break
 * (one for every 20 minutes of screen work) moves the Rest ring by the same rule the companions use (twelve a day),
 * with two more so one look-away is never counted twice: see `ringDecision`. It takes the same lock as a companion's break, so the two cannot both slip under a limit.
 */
export async function saveBreak(m: Member, runId: string, input: unknown, now = new Date()): Promise<{ ok: true; kept: boolean; counted: boolean; today: number } | { ok: false; why: Refused }> {
  const no = await mayRun(m);
  if (no) return refuse(no);
  const parsed = breakInput.safeParse(input);
  if (!UUID.test(String(runId)) || !parsed.success) return refuse("bad");
  const f = parsed.data;
  const [run] = await db.select({ startedAt: S.startedAt }).from(S).where(openRun(m, runId));
  if (!run) return refuse("ended");
  if (!breakInTime(f.at, now.getTime(), run.startedAt.getTime())) return refuse("late");

  const day = todayKey(new Date(f.at));
  return db.transaction(async (tx) => {
    await lockDay(tx, m.profile.id, day, "break");
    const rows = await tx.select({ count: L.count, slug: L.itemSlug, data: L.data }).from(L)
      .where(and(eq(L.profileId, m.profile.id), inArray(L.kind, BREAK_KINDS), eq(L.day, day)));
    const before = rows.reduce((sum, r) => sum + r.count, 0);
    const others: LoggedBreak[] = rows.flatMap((r) => {
      const at = Number((r.data as { startedAt?: unknown } | null)?.startedAt);
      return Number.isFinite(at) ? [{ at, monitor: r.slug === MONITOR_SLUG, counted: r.count > 0 }] : [];
    });
    const decision = ringDecision(f.at, others);
    if (decision === "same") return { ok: true as const, kept: false, counted: false, today: before };
    /* a break that was not earned (too little screen work behind it) is kept for the member's own record and moves nothing */
    const counted = f.earned && decision === "count" && breakCounts(before);
    await tx.insert(L).values({ profileId: m.profile.id, day, kind: "far", itemSlug: MONITOR_SLUG, count: counted ? 1 : 0, data: { startedAt: f.at, seen: f.seen, due: f.due } });
    if (counted) await addToDay(tx, m, day, { rest: 1 });
    return { ok: true as const, kept: true, counted, today: before + (counted ? 1 : 0) };
  });
}

/* ───────────── what the member sees afterwards ───────────── */

const DAYS_SHOWN = 7;

/**
 * The active profile's own numbers: one day in ten-minute bins, and the last seven days. Nobody else's are read.
 * `day` picks the day shown in detail; anything that is not one of the last seven days is ignored. With no day asked
 * for, it is today when today has numbers, and otherwise the latest day that has.
 */
export async function monitorView(m: Member, day?: string) {
  const span = lastDays(DAYS_SHOWN), today = span[span.length - 1].key;
  /* a little before the first day shown, then sorted into days by the time in India */
  const since = new Date(Date.now() - (DAYS_SHOWN + 1) * DAY_MS);
  const [rows, logged, [ring]] = await Promise.all([
    db.select({ at: M.takenAt, distanceCm: M.distanceCm, blinksPerMin: M.blinksPerMin, halfBlinksPerMin: M.halfBlinksPerMin, posture: M.posture, faceSeconds: M.faceSeconds, prompt: M.prompt })
      .from(M).where(and(eq(M.profileId, m.profile.id), gte(M.takenAt, since))).orderBy(asc(M.takenAt)),
    db.select({ day: L.day, count: L.count, data: L.data }).from(L)
      .where(and(eq(L.profileId, m.profile.id), eq(L.itemSlug, MONITOR_SLUG), inArray(L.kind, BREAK_KINDS), gte(L.day, span[0].key))),
    db.select({ rest: D.restBreaks, goal: D.restGoal }).from(D).where(and(eq(D.profileId, m.profile.id), eq(D.day, today))),
  ]);
  const samples: SampleRow[] = rows.map((r) => ({ ...r, at: r.at.getTime() }));
  const breaks: (BreakRow & { day: string })[] = logged.flatMap((r) => {
    const d = (r.data ?? {}) as { startedAt?: unknown; due?: unknown; seen?: unknown };
    const at = Number(d.startedAt);
    return Number.isFinite(at) ? [{ at, day: r.day, counted: r.count > 0, due: d.due === true, seen: d.seen === true }] : [];
  });
  const of = (day: string) => ({ samples: samples.filter((s) => dayKeyOf(s.at) === day), breaks: breaks.filter((b) => b.day === day) });
  const now = of(today);
  const days = span.map(({ key, label }) => { const d = of(key); return { key, label, totals: dayTotals(d.samples, d.breaks) }; });
  const latest = [...days].reverse().find((d) => d.totals.measured > 0)?.key;
  const shownKey = day && days.some((d) => d.key === day) ? day : now.samples.length ? today : latest ?? today;
  const shown = of(shownKey);
  return {
    today: { key: today, totals: dayTotals(now.samples, now.breaks), ring: ring ?? { rest: 0, goal: 6 } },
    /** The day shown in ten-minute steps. */
    shown: { key: shownKey, isToday: shownKey === today, measured: shown.samples.length, ...dayBins(shown.samples, shown.breaks) },
    days,
    /** True when this profile has any sample at all in the days shown. */
    any: samples.length > 0,
  };
}
export type MonitorView = Awaited<ReturnType<typeof monitorView>>;

/**
 * The member deletes the monitor's numbers for the active profile: every one-minute sample and every run.
 * Breaks already added to the Rest ring stay in the care log, and the day totals stay.
 */
export async function forgetMonitor(m: Member): Promise<{ ok: boolean; samples: number }> {
  if (!maySeeMonitor(m) || !m.can("data")) return { ok: false, samples: 0 };
  return db.transaction(async (tx) => {
    const gone = await tx.delete(M).where(eq(M.profileId, m.profile.id)).returning({ id: M.id });
    await tx.delete(S).where(and(eq(S.profileId, m.profile.id), eq(S.kind, "monitor")));
    return { ok: true, samples: gone.length };
  });
}

/* ───────────── the daily job ───────────── */

/** Samples taken before this moment are removed. */
export const sampleCutoff = (now: Date) => new Date(now.getTime() - RULE.keepDays * DAY_MS);
/** A run still open this long after it began was left by a closed tab. */
export const staleRunBefore = (now: Date) => new Date(now.getTime() - DAY_MS);

/** Removes samples older than the keeping time and closes runs left open. Safe to run twice. Counts only. */
export async function trimMonitor(now: Date): Promise<{ samples: number; runs: number }> {
  const gone = await db.delete(M).where(lt(M.takenAt, sampleCutoff(now)));
  const stale = and(eq(S.kind, "monitor"), isNull(S.endedAt), lt(S.startedAt, staleRunBefore(now)));
  const empty = await db.delete(S).where(and(stale, eq(S.minutes, 0)));
  const closed = await db.update(S).set({ endedAt: now, endReason: "left" }).where(stale);
  return { samples: gone.rowCount ?? 0, runs: (empty.rowCount ?? 0) + (closed.rowCount ?? 0) };
}
