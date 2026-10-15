/**
 * Reading and writing community experiments. Server only.
 * What a member sees is scoped by the active profile, and an id from the browser is only ever used together with it.
 * The pooled result reads every member's pair of check-ups and gives back group numbers and counts, never a row.
 * The rules themselves (windows, which eye, same screen, the statistics) are pure functions in ./experiments.ts.
 */
import { and, desc, eq, gte, inArray, isNull, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { experiments as words } from "@/copy/experiments";
import { testByKey, type TestDef } from "@/data";
import { db, schema as s } from "@/db";
import {
  BASELINE_MAX_AGE_DAYS, changeOf, earnedStep, lean, notCounted, pickAfter, pickBefore, pool, scheduleOf, stageOf,
  type Arm, type NotCounted, type PickedAfter, type PickedBefore, type Reading, type Screen, type Setup, type Stage, type TestRule,
} from "@/lib/experiments";
import type { Member } from "@/lib/session";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Run = Tx | typeof db;
const DAY = 86_400_000;
const e = s.experimentEnrolment;

/** Check-ups done away from the screen: no measured screen stands behind their result. */
const OFF_SCREEN: readonly string[] = ["near_point", "symptoms"];
export const ruleOf = (t: TestDef): TestRule => ({ unit: t.unit, perEye: t.perEye, lowerIsBetter: t.lowerIsBetter, onScreen: !OFF_SCREEN.includes(t.key) });

const setup = (pxPerCm: number | null, distanceCm: number | null): Setup | null => (pxPerCm === null || distanceCm === null ? null : { pxPerCm, distanceCm });
const screenOf = (m: Member): Screen | null => m.device && { id: m.device.id, pxPerCm: m.device.pxPerCm, distanceCm: m.device.distanceCm, calibratedAt: m.device.calibratedAt };

/* ───────────── a member's own experiments ───────────── */

/** Every experiment the profile has joined, newest first, with its idea and its two check-ups. */
export async function myExperiments(profileId: string, now = new Date()) {
  const before = alias(s.testResult, "before"), after = alias(s.testResult, "after");
  const rows = await db.select({ enrolment: e, experiment: { id: s.experiment.id, status: s.experiment.status }, protocol: s.protocol, before, after })
    .from(e)
    .innerJoin(s.experiment, eq(s.experiment.id, e.experimentId))
    .innerJoin(s.protocol, eq(s.protocol.id, s.experiment.protocolId))
    .leftJoin(before, and(eq(before.id, e.baselineId), eq(before.profileId, profileId)))
    .leftJoin(after, and(eq(after.id, e.followupId), eq(after.profileId, profileId)))
    .where(eq(e.profileId, profileId))
    .orderBy(desc(e.joinedAt));
  return rows.map((r) => ({ ...r, stage: stageOf(r.enrolment, r.protocol.weeks, now), schedule: r.enrolment.startedAt ? scheduleOf(r.enrolment.startedAt, r.protocol.weeks) : null }));
}
export type Mine = Awaited<ReturnType<typeof myExperiments>>[number];

/** The profile's stored rows of one check-up from a day on, as the rules read them. */
async function readings(x: Run, profileId: string, testKey: string, since: Date): Promise<Reading[]> {
  const t = s.testResult;
  return x.select({ id: t.id, takenAt: t.takenAt, eye: t.eye, value: t.value, note: t.note, deviceId: t.deviceId }).from(t)
    .where(and(eq(t.profileId, profileId), eq(t.testKey, testKey), gte(t.takenAt, since)));
}

const baseOf = (row: Mine["enrolment"]) => setup(row.basePxPerCm, row.baseDistanceCm);

/** The check-up that would be tied as "before" if the member asked now, or why there is none. */
async function beforeFor(x: Run, m: Member, test: TestDef, now: Date): Promise<PickedBefore> {
  const rows = await readings(x, m.profile.id, test.key, new Date(now.getTime() - (BASELINE_MAX_AGE_DAYS + 30) * DAY));
  return pickBefore(ruleOf(test), rows, screenOf(m), m.eye?.weakEye ?? null, now);
}

/** The check-up that would be tied as "after" if the member asked now, or why there is none. */
async function afterFor(x: Run, m: Member, test: TestDef, row: Pick<Mine, "enrolment" | "before" | "protocol">, now: Date): Promise<PickedAfter> {
  const schedule = scheduleOf(row.enrolment.startedAt!, row.protocol.weeks);
  const rows = await readings(x, m.profile.id, test.key, new Date(Date.parse(`${schedule.dueDay}T00:00:00Z`) - DAY));
  return pickAfter(ruleOf(test), rows, screenOf(m), row.before?.eye ?? null, baseOf(row.enrolment), schedule, now);
}

/** What the page offers for the step an enrolment is waiting at. Null when it waits for nothing the member can add. */
export async function offerFor(m: Member, row: Mine, now = new Date()): Promise<{ step: "before"; picked: PickedBefore } | { step: "after"; picked: PickedAfter } | null> {
  const test = testByKey(row.protocol.moves);
  if (!test || row.experiment.status !== "open") return null;
  if (row.stage === "needs_before") return { step: "before", picked: await beforeFor(db, m, test, now) };
  if (row.stage === "after_due" && row.before) return { step: "after", picked: await afterFor(db, m, test, row, now) };
  return null;
}

/** The one enrolment of the active profile with this id, as `myExperiments` gives it. */
async function mine(m: Member, enrolmentId: string, now: Date) {
  return (await myExperiments(m.profile.id, now)).find((r) => r.enrolment.id === enrolmentId) ?? null;
}

export type Refusal = "gone" | "closed" | "wrong_step";

/**
 * Ties the member's latest check-up to the enrolment as "before" and starts the weeks today.
 * The server picks the check-up; the browser only names the enrolment.
 */
export async function tieBefore(m: Member, enrolmentId: string, now = new Date()): Promise<{ ok: true } | { ok: false; why: Refusal | Exclude<PickedBefore, { ok: true }>["why"] }> {
  const row = await mine(m, enrolmentId, now), test = row && testByKey(row.protocol.moves);
  if (!row || !test) return { ok: false, why: "gone" };
  if (row.experiment.status !== "open") return { ok: false, why: "closed" };
  if (row.stage !== "needs_before") return { ok: false, why: "wrong_step" };
  const picked = await beforeFor(db, m, test, now);
  if (!picked.ok) return picked;
  const done = await db.update(e)
    .set({ baselineId: picked.reading.id, startedAt: now, basePxPerCm: picked.setup?.pxPerCm ?? null, baseDistanceCm: picked.setup?.distanceCm ?? null, followupId: null, finishedAt: null })
    .where(and(eq(e.id, enrolmentId), eq(e.profileId, m.profile.id), isNull(e.leftAt), isNull(e.finishedAt)))
    .returning({ id: e.id });
  return done.length ? { ok: true } : { ok: false, why: "wrong_step" };
}

/**
 * Ties the first check-up inside the window to the enrolment as "after" and finishes it.
 * A check-up from a changed screen set-up is tied only when the member says "anyway", and is then never counted.
 */
export async function tieAfter(m: Member, enrolmentId: string, anyway: boolean, now = new Date()): Promise<{ ok: true; comparable: boolean } | { ok: false; why: Refusal | "changed" | Exclude<PickedAfter, { ok: true }>["why"] }> {
  const row = await mine(m, enrolmentId, now), test = row && testByKey(row.protocol.moves);
  if (!row || !test) return { ok: false, why: "gone" };
  if (row.experiment.status !== "open") return { ok: false, why: "closed" };
  if (row.stage !== "after_due" || !row.before) return { ok: false, why: "wrong_step" };
  const picked = await afterFor(db, m, test, row, now);
  if (!picked.ok) return picked;
  if (!picked.comparable && !anyway) return { ok: false, why: "changed" };
  const done = await db.update(e)
    .set({ followupId: picked.reading.id, finishedAt: now, followPxPerCm: picked.setup?.pxPerCm ?? null, followDistanceCm: picked.setup?.distanceCm ?? null })
    .where(and(eq(e.id, enrolmentId), eq(e.profileId, m.profile.id), isNull(e.leftAt), isNull(e.finishedAt)))
    .returning({ id: e.id });
  return done.length ? { ok: true, comparable: picked.comparable } : { ok: false, why: "wrong_step" };
}

/**
 * Leaves an experiment, at any stage. The check-ups are untied at once (they stay in the member's own history),
 * the fact of leaving is kept, and the pooled result is worked out again without them straight away.
 */
export async function leaveExperiment(m: Member, enrolmentId: string, now = new Date()): Promise<boolean> {
  const [left] = await db.update(e)
    .set({ leftAt: now, baselineId: null, followupId: null, startedAt: null, finishedAt: null, basePxPerCm: null, baseDistanceCm: null, followPxPerCm: null, followDistanceCm: null })
    .where(and(eq(e.id, enrolmentId), eq(e.profileId, m.profile.id), isNull(e.leftAt)))
    .returning({ experimentId: e.experimentId });
  if (!left) return false;
  await recomputeSignal(left.experimentId, now);
  return true;
}

/**
 * Joins the active profile to an open experiment in the group the member chose. One enrolment per profile, for good:
 * a member who left cannot come back in, or a result could be retried until it pleased.
 */
export async function joinExperiment(m: Member, experimentId: string, protocolId: string, arm: Arm): Promise<"joined" | "already" | "left_before"> {
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(e).values({ experimentId, profileId: m.profile.id, arm }).onConflictDoNothing().returning({ id: e.id });
    if (!row) {
      const [old] = await tx.select({ leftAt: e.leftAt }).from(e).where(and(eq(e.experimentId, experimentId), eq(e.profileId, m.profile.id)));
      return old?.leftAt ? "left_before" : "already";
    }
    /* the Experiment step is earned by the first member who joins */
    await tx.update(s.protocol).set({ step: "experiment" }).where(and(eq(s.protocol.id, protocolId), eq(s.protocol.step, "protocol")));
    return "joined";
  });
}

/* ───────────── the pooled result ───────────── */

interface Standing { arm: Arm; stage: Stage; why: NotCounted | null; change: number | null }

/** Every enrolment of an experiment, reduced to its group, where it stands and (when it counts) its one number. */
async function standingOf(x: Run, experimentId: string, test: TestDef, weeks: number, now: Date): Promise<Standing[]> {
  const before = alias(s.testResult, "before"), after = alias(s.testResult, "after");
  const rows = await x.select({ enrolment: e, kind: s.profile.kind, before: before.value, after: after.value })
    .from(e)
    .innerJoin(s.profile, eq(s.profile.id, e.profileId))
    .leftJoin(before, and(eq(before.id, e.baselineId), eq(before.profileId, e.profileId), eq(before.testKey, test.key)))
    .leftJoin(after, and(eq(after.id, e.followupId), eq(after.profileId, e.profileId), eq(after.testKey, test.key)))
    .where(eq(e.experimentId, experimentId));
  /* a child's check-ups are pooled only while a parent's permission stands */
  const children = rows.filter((r) => r.kind === "child").map((r) => r.enrolment.profileId);
  const allowed = new Set(children.length ? (await x.selectDistinct({ id: s.consent.profileId }).from(s.consent)
    .where(and(inArray(s.consent.profileId, children), eq(s.consent.kind, "parental"), isNull(s.consent.revokedAt)))).map((c) => c.id) : []);
  return rows.map((r): Standing => {
    const en = r.enrolment;
    const why = notCounted({
      leftAt: en.leftAt, finishedAt: en.finishedAt, before: r.before, after: r.after,
      base: setup(en.basePxPerCm, en.baseDistanceCm), follow: setup(en.followPxPerCm, en.followDistanceCm),
      consent: r.kind !== "child" || allowed.has(en.profileId),
    });
    return { arm: en.arm, stage: stageOf(en, weeks, now), why, change: why === null ? changeOf(test.unit, r.before!, r.after!) : null };
  });
}

const changesOf = (rows: Standing[], arm: Arm) => rows.filter((r) => r.arm === arm && r.change !== null).map((r) => r.change!);

/** Counts for an idea's page: counted pairs in each group, members still taking part, and members who dropped out of the count. Counts only. */
export async function progressOf(experimentId: string, testKey: string, weeks: number, now = new Date()) {
  const test = testByKey(testKey);
  if (!test) return null;
  const rows = await standingOf(db, experimentId, test, weeks, now);
  const running = (r: Standing) => r.stage === "needs_before" || r.stage === "practising" || r.stage === "after_due";
  return {
    tried: changesOf(rows, "tried").length, control: changesOf(rows, "control").length,
    now: rows.filter(running).length,
    out: rows.filter((r) => !running(r) && r.change === null).length,
  };
}

export type SignalOutcome = "written" | "withdrawn" | "none" | "skipped";

/**
 * Works out one experiment's pooled result again from the members who finished, and stores it as the experiment's
 * single signal row. With too few counted members in either group the row is removed: no number is better than a
 * shaky one. The idea's ladder step follows what the numbers support, up to "signal" and no further.
 * Safe to run any number of times.
 */
export async function recomputeSignal(experimentId: string, now = new Date()): Promise<{ outcome: SignalOutcome; flagged: boolean }> {
  return db.transaction(async (tx) => {
    const [found] = await tx.select({ protocol: s.protocol }).from(s.experiment)
      .innerJoin(s.protocol, eq(s.protocol.id, s.experiment.protocolId)).where(eq(s.experiment.id, experimentId));
    const test = found && testByKey(found.protocol.moves);
    if (!found || !test) return { outcome: "skipped", flagged: false };
    const p = found.protocol, sig = s.experimentSignal;

    const rows = await standingOf(tx, experimentId, test, p.weeks, now);
    const pooled = pool(changesOf(rows, "tried"), changesOf(rows, "control"));
    const old = await tx.select({ id: sig.id }).from(sig).where(eq(sig.experimentId, experimentId)).orderBy(desc(sig.computedAt));
    if (pooled) {
      if (old[0]) {
        await tx.update(sig).set({ ...pooled, computedAt: now }).where(eq(sig.id, old[0].id));
        if (old.length > 1) await tx.delete(sig).where(and(eq(sig.experimentId, experimentId), ne(sig.id, old[0].id)));
      } else await tx.insert(sig).values({ experimentId, ...pooled, computedAt: now });
    } else if (old.length) await tx.delete(sig).where(eq(sig.experimentId, experimentId));

    const earned = earnedStep(!!pooled, rows.filter((r) => r.stage !== "left").length);
    if ((p.step === "protocol" || p.step === "experiment" || p.step === "signal") && p.step !== earned) await tx.update(s.protocol).set({ step: earned }).where(eq(s.protocol.id, p.id));

    /* a result that leans the wrong way goes to a person, once */
    let flagged = false;
    if (pooled && lean(pooled, test.lowerIsBetter) === "worse") {
      const mod = s.moderationItem, reason = words.job.review;
      const [asked] = await tx.select({ id: mod.id }).from(mod).where(and(eq(mod.kind, "protocol"), eq(mod.refId, p.id), eq(mod.reason, reason))).limit(1);
      if (!asked) { await tx.insert(mod).values({ kind: "protocol", refId: p.id, reason }); flagged = true; }
    }
    return { outcome: pooled ? "written" : old.length ? "withdrawn" : "none", flagged };
  });
}

/** Works out the pooled result of every open experiment. Counts only. */
export async function recomputeOpenSignals(now = new Date()) {
  const open = await db.select({ id: s.experiment.id }).from(s.experiment).where(eq(s.experiment.status, "open"));
  const counts = { experiments: open.length, written: 0, withdrawn: 0, flagged: 0 };
  for (const x of open) {
    const r = await recomputeSignal(x.id, now);
    if (r.outcome === "written") counts.written++;
    if (r.outcome === "withdrawn") counts.withdrawn++;
    if (r.flagged) counts.flagged++;
  }
  return counts;
}

