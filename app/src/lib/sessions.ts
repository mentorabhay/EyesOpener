/**
 * Training sessions: the dose check, the session row and the day's Train ring.
 * Server only. Limits come from the engine; numbers sent by the browser are clamped, never trusted.
 */
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { exerciseBySlug, gameBySlug, gameLevel, programmeBySlug } from "@/data";
import { db, schema } from "@/db";
import { canStart, MAX_DAILY_MINUTES, ringFor, type DoseBlock, type DoseDecision, type StopSymptom } from "@/engine";
import { todayKey, type Member } from "@/lib/session";

export const TRAIN_KINDS = ["game", "exercise", "film"] as const;
export type TrainKind = (typeof TRAIN_KINDS)[number];
export const END_REASONS = ["done", "daily_cap", "stop_rule", "left"] as const;
export type EndReason = (typeof END_REASONS)[number];
/** Every film session carries this slug. The film is the member's own file and its name never leaves the device. */
export const CINEMA = "two-eye-cinema";

/** The engine's decision, plus one more reason to refuse: this person holds a seat that may look but not train. */
export type TrainDose = Omit<DoseDecision, "reason"> & { reason: DoseBlock | "guardian_only" | "counsellor_plan" | null };
export type StartResult = { ok: true; sessionId: string; minutes: number } | { ok: false; reason: NonNullable<TrainDose["reason"]> | "unknown_item" };
export type FinishResult = { ok: true; minutes: number; endReason: EndReason; score: number | null } | { ok: false };

const S = schema.session;
const D = schema.daySummary;

const inLibrary = (kind: TrainKind, slug: string) =>
  kind === "game" ? !!gameBySlug(slug) : kind === "exercise" ? !!exerciseBySlug(slug) : slug === CINEMA;

async function trainedToday(profileId: string) {
  const [day] = await db.select({ minutes: D.trainMinutes }).from(D).where(and(eq(D.profileId, profileId), eq(D.day, todayKey())));
  return day?.minutes ?? 0;
}

const decide = (m: Member, kind: TrainKind, minutesToday: number) =>
  canStart({ kind, minutesToday, ...m.dose });

/**
 * A level 2 game (squint, after concussion, after stroke) opens only for a member who is on the matching
 * counsellor-led programme. The dose check then also needs the counsellor's minutes.
 */
const needsCounsellorPlan = (m: Member, kind: TrainKind, slug?: string) => {
  const g = kind === "game" && slug ? gameBySlug(slug) : undefined;
  if (!g || gameLevel(g) < 2) return false;
  const p = m.enrolment ? programmeBySlug(m.enrolment.programme) : undefined;
  return !(p?.level === 2 && g.tags.includes(p.tag));
};

/** May this person start this kind of session for the active profile now, and for how many minutes? Pass the game's slug when there is one. */
export const doseFor = async (m: Member, kind: TrainKind, slug?: string): Promise<TrainDose> =>
  !m.can("train") ? { ok: false, minutes: 0, reason: "guardian_only" }
    : needsCounsellorPlan(m, kind, slug) ? { ok: false, minutes: 0, reason: "counsellor_plan" }
      : decide(m, kind, await trainedToday(m.profile.id));

export async function startSession(m: Member, { kind, itemSlug }: { kind: TrainKind; itemSlug: string }): Promise<StartResult> {
  if (!inLibrary(kind, itemSlug)) return { ok: false, reason: "unknown_item" };
  const dose = await doseFor(m, kind, itemSlug);
  if (!dose.ok) return { ok: false, reason: dose.reason! };
  /* One person trains in one place at a time: a session left open by a closed tab ends here with no minutes. */
  await db.update(S).set({ endReason: "left", endedAt: new Date() })
    .where(and(eq(S.profileId, m.profile.id), inArray(S.kind, TRAIN_KINDS), isNull(S.endedAt)));
  const [row] = await db.insert(S)
    .values({ profileId: m.profile.id, deviceId: m.device?.id, kind, itemSlug, ring: ringFor(kind), strongContrast: m.eye?.strongContrast })
    .returning({ id: S.id });
  return { ok: true, sessionId: row.id, minutes: dose.minutes };
}

export async function finishSession(m: Member, f: { sessionId: string; minutes: number; score?: number; endReason: EndReason }): Promise<FinishResult> {
  if (!m.can("train")) return { ok: false };
  const open = and(eq(S.id, f.sessionId), eq(S.profileId, m.profile.id), inArray(S.kind, TRAIN_KINDS), isNull(S.endedAt));
  const [row] = await db.select({ kind: S.kind, startedAt: S.startedAt }).from(S).where(open);
  if (!row) return { ok: false };

  const before = await trainedToday(m.profile.id);
  const sinceStart = (Date.now() - row.startedAt.getTime()) / 60_000;
  const minutes = Math.max(0, Math.min(f.minutes, sinceStart, decide(m, row.kind as TrainKind, before).minutes));
  const endReason = f.endReason === "done" && before + minutes >= MAX_DAILY_MINUTES ? "daily_cap" : f.endReason;

  /* The "still open" test is repeated in the update, so two finishes for one session cannot both count. */
  const [closed] = await db.update(S).set({ minutes, score: f.score, endReason, endedAt: new Date() }).where(open).returning({ id: S.id });
  if (!closed) return { ok: false };

  const trainGoal = m.enrolment?.dailyMinutes ?? 0;
  await db.insert(D).values({ profileId: m.profile.id, day: todayKey(), trainMinutes: minutes, trainGoal })
    .onConflictDoUpdate({ target: [D.profileId, D.day], set: { trainMinutes: sql`least(${D.trainMinutes} + ${minutes}, ${MAX_DAILY_MINUTES})`, trainGoal } });
  return { ok: true, minutes, endReason, score: f.score ?? null };
}

/** Record what the member felt, on a session of theirs that the stop rule ended. */
export async function saveStopSymptom(m: Member, sessionId: string, symptom: StopSymptom) {
  if (!m.can("train")) return;
  await db.update(S).set({ stopSymptom: symptom }).where(and(eq(S.id, sessionId), eq(S.profileId, m.profile.id), eq(S.endReason, "stop_rule")));
}
