/**
 * Training sessions: the dose check, the session row and the day's Train ring.
 * Server only. Limits come from the engine; numbers sent by the browser are clamped, never trusted.
 */
import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { exerciseBySlug, gameBySlug, gameLevel, programmeBySlug } from "@/data";
import { db, schema } from "@/db";
import { canStart, MAX_DAILY_MINUTES, ringFor, type DoseBlock, type DoseDecision, type StopSymptom } from "@/engine";
import { readStatuses } from "@/lib/catalogue";
import { todayKey, type Member } from "@/lib/session";
import { cleanDetail, type Detail, type PastSession } from "@/lib/detail";
import { isListed, statusOf, type Status } from "@/lib/status";

export { bestOf, cleanDetail, DETAIL_MAX_KEYS, type Detail, type PastSession } from "@/lib/detail";

export const TRAIN_KINDS = ["game", "exercise", "film"] as const;
export type TrainKind = (typeof TRAIN_KINDS)[number];
export const END_REASONS = ["done", "daily_cap", "stop_rule", "left"] as const;
export type EndReason = (typeof END_REASONS)[number];
/** Every film session carries this slug. The film is the member's own file and its name never leaves the device. */
export const CINEMA = "two-eye-cinema";

/**
 * The engine's decision, plus the reasons this app adds: a seat that may look but not train, an item staff have set
 * as counsellor-led, and an item staff have switched off.
 */
export type TrainDose = Omit<DoseDecision, "reason"> & { reason: DoseBlock | "guardian_only" | "counsellor_plan" | "not_offered" | null };
export type StartResult = { ok: true; sessionId: string; minutes: number } | { ok: false; reason: NonNullable<TrainDose["reason"]> | "unknown_item" };
/** `counted` is false for a care routine: it is kept as a record and adds nothing to the day's training minutes. */
export type FinishResult = { ok: true; minutes: number; endReason: EndReason; score: number | null; detail: Detail | null; counted: boolean } | { ok: false };

const S = schema.session;
const D = schema.daySummary;

const inLibrary = (kind: TrainKind, slug: string) =>
  kind === "game" ? !!gameBySlug(slug) : kind === "exercise" ? !!exerciseBySlug(slug) : slug === CINEMA;

async function trainedToday(profileId: string) {
  const [day] = await db.select({ minutes: D.trainMinutes }).from(D).where(and(eq(D.profileId, profileId), eq(D.day, todayKey())));
  return day?.minutes ?? 0;
}

/**
 * Routines of care away from the screen (patch time, glasses wear, drops, daylight, break habits, monitoring) are kept
 * as a record but are not training: they never use up the day's training minutes and the programme's dose never closes them.
 */
const CARE_MECHANISMS = ["patch", "glasses", "drops", "atropine", "light", "habit", "near", "monitor"];
export const isCareRoutine = (kind: TrainKind, slug?: string) =>
  kind === "exercise" && !!slug && CARE_MECHANISMS.includes(exerciseBySlug(slug)?.mechanism ?? "");

const decide = (m: Member, kind: TrainKind, minutesToday: number, slug?: string) =>
  canStart({ kind: isCareRoutine(kind, slug) ? "outdoor" : kind, minutesToday, ...m.dose });

/**
 * An item staff have set as counsellor-led opens for a member a counsellor is working with.
 * A level 2 game (squint, after concussion, after stroke) also needs the member to be on the matching programme;
 * the dose check then asks for the counsellor's minutes. Any other item needs a linked counsellor.
 */
export const onCounsellorPlan = (m: { enrolment: { programme: string } | null; linked: boolean }, kind: TrainKind, slug: string) => {
  const g = kind === "game" ? gameBySlug(slug) : undefined;
  if (g && gameLevel(g) >= 2) {
    const p = m.enrolment ? programmeBySlug(m.enrolment.programme) : undefined;
    return p?.level === 2 && g.tags.includes(p.tag);
  }
  return m.linked;
};

/** The status staff gave an item (see status.ts). */
export const statusFor = async (kind: TrainKind, slug: string): Promise<Status> => statusOf(await readStatuses(), kind, slug);

/**
 * May this person start this kind of session for the active profile now, and for how many minutes?
 * Pass the item's slug when there is one: its status is checked too. A staff tester passes every status.
 */
export async function doseFor(m: Member, kind: TrainKind, slug?: string): Promise<TrainDose> {
  if (!m.can("train")) return { ok: false, minutes: 0, reason: "guardian_only" };
  if (slug && !m.tester) {
    const status = await statusFor(kind, slug);
    if (!isListed(status, false)) return { ok: false, minutes: 0, reason: "not_offered" };
    if (status === "counsellor" && !onCounsellorPlan(m, kind, slug)) return { ok: false, minutes: 0, reason: "counsellor_plan" };
  }
  return decide(m, kind, await trainedToday(m.profile.id), slug);
}

export async function startSession(m: Member, { kind, itemSlug }: { kind: TrainKind; itemSlug: string }): Promise<StartResult> {
  if (!inLibrary(kind, itemSlug)) return { ok: false, reason: "unknown_item" };
  const dose = await doseFor(m, kind, itemSlug);
  if (!dose.ok) return { ok: false, reason: dose.reason! };
  /* One person trains in one place at a time: a session left open by a closed tab ends here with no minutes. */
  await db.update(S).set({ endReason: "left", endedAt: new Date() })
    .where(and(eq(S.profileId, m.profile.id), inArray(S.kind, TRAIN_KINDS), isNull(S.endedAt)));
  const [row] = await db.insert(S)
    .values({ profileId: m.profile.id, deviceId: m.device?.id, kind, itemSlug, ring: isCareRoutine(kind, itemSlug) ? "rest" : ringFor(kind), strongContrast: m.eye?.strongContrast })
    .returning({ id: S.id });
  return { ok: true, sessionId: row.id, minutes: dose.minutes };
}

export async function finishSession(m: Member, f: { sessionId: string; minutes: number; score?: number; detail?: unknown; endReason: EndReason }): Promise<FinishResult> {
  if (!m.can("train")) return { ok: false };
  const open = and(eq(S.id, f.sessionId), eq(S.profileId, m.profile.id), inArray(S.kind, TRAIN_KINDS), isNull(S.endedAt));
  const [row] = await db.select({ kind: S.kind, slug: S.itemSlug, startedAt: S.startedAt }).from(S).where(open);
  if (!row) return { ok: false };

  const care = isCareRoutine(row.kind as TrainKind, row.slug);
  const before = await trainedToday(m.profile.id);
  const sinceStart = (Date.now() - row.startedAt.getTime()) / 60_000;
  const minutes = Math.max(0, Math.min(f.minutes, sinceStart, decide(m, row.kind as TrainKind, before, row.slug).minutes));
  const endReason = !care && f.endReason === "done" && before + minutes >= MAX_DAILY_MINUTES ? "daily_cap" : f.endReason;

  /* The "still open" test is repeated in the update, so two finishes for one session cannot both count. */
  const detail = cleanDetail(f.detail);
  const [closed] = await db.update(S).set({ minutes, score: f.score, detail, endReason, endedAt: new Date() }).where(open).returning({ id: S.id });
  if (!closed) return { ok: false };
  if (care) return { ok: true, minutes, endReason, score: f.score ?? null, detail, counted: false };

  const trainGoal = m.enrolment?.dailyMinutes ?? 0;
  await db.insert(D).values({ profileId: m.profile.id, day: todayKey(), trainMinutes: minutes, trainGoal })
    .onConflictDoUpdate({ target: [D.profileId, D.day], set: { trainMinutes: sql`least(${D.trainMinutes} + ${minutes}, ${MAX_DAILY_MINUTES})`, trainGoal } });
  return { ok: true, minutes, endReason, score: f.score ?? null, detail, counted: true };
}

/** The active profile's latest finished sessions of one item, newest first. */
export async function pastSessions(m: Member, kind: TrainKind, slug: string, limit = 8): Promise<PastSession[]> {
  const rows = await db.select({ id: S.id, at: S.startedAt, minutes: S.minutes, score: S.score, detail: S.detail, endReason: S.endReason }).from(S)
    .where(and(eq(S.profileId, m.profile.id), eq(S.kind, kind), eq(S.itemSlug, slug), isNotNull(S.endedAt)))
    .orderBy(desc(S.startedAt)).limit(limit);
  return rows.map((r) => ({ ...r, detail: cleanDetail(r.detail) }));
}

/** Record what the member felt, on a session of theirs that the stop rule ended. */
export async function saveStopSymptom(m: Member, sessionId: string, symptom: StopSymptom) {
  if (!m.can("train")) return;
  await db.update(S).set({ stopSymptom: symptom }).where(and(eq(S.id, sessionId), eq(S.profileId, m.profile.id), eq(S.endReason, "stop_rule")));
}
