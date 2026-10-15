/**
 * The workday monitor's server rules against a real database: who may use it, consent, runs, what is stored for a
 * minute, how a break moves the Rest ring, who sees the numbers, deleting them, and the daily clean-up.
 *
 * It makes two throwaway households and removes them at the end. It never touches the demo family.
 * It needs a database with the current tables. Where none answers (the checks on GitHub have none), it is skipped.
 */
import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => { try { process.loadEnvFile(".env.local"); } catch { /* no file: the default address is used */ } });

import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { logBreak } from "@/lib/care";
import { memberCan, type MemberAction, type Seat } from "@/lib/roles";
import { todayKey, type Member } from "@/lib/session";
import {
  cameraConsent, endRun, forgetMonitor, giveCameraConsent, maySeeMonitor, monitorUse, monitorView, sampleCutoff, saveBreak, saveMinute, startRun, trimMonitor, withdrawCameraConsent,
} from "./monitor";
import { CAMERA_CONSENT, minuteOf, MONITOR_SLUG, RULE } from "./monitor-rules";

const up = await db.execute(sql`select face_seconds from monitor_sample limit 0`).then(() => true, () => false);
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const x = crypto.randomBytes(5).toString("hex"), MIN = 60_000;
/** A clock for the test: forty minutes ago, on the minute. Every call passes its own "now". */
const T0 = minuteOf(Date.now()) - 40 * MIN;

type Row = { id: string };
interface Made { account: Row; guardian: Row; cheer: Row; adult: typeof s.profile.$inferSelect; child: typeof s.profile.$inferSelect; teen: typeof s.profile.$inferSelect }
let A: Made, B: Made;

async function household(name: string): Promise<Made> {
  const [account] = await db.insert(s.account).values({ displayName: `zz-monitor-${name}-${x}` }).returning();
  const [guardian] = await db.insert(s.appUser).values({ email: `g-${name}-${x}@iopener.test`, displayName: `Guardian ${name}`, accountId: account.id, seat: "guardian" }).returning();
  const [cheer] = await db.insert(s.appUser).values({ email: `c-${name}-${x}@iopener.test`, displayName: `Cheer ${name}`, accountId: account.id, seat: "circle" }).returning();
  const [adult] = await db.insert(s.profile).values({ accountId: account.id, displayName: `Adult ${name}`, kind: "adult" }).returning();
  const [child] = await db.insert(s.profile).values({ accountId: account.id, displayName: `Child ${name}`, kind: "child", birthYear: new Date().getFullYear() - 7 }).returning();
  const [teen] = await db.insert(s.profile).values({ accountId: account.id, displayName: `Teen ${name}`, kind: "adult", birthYear: new Date().getFullYear() - 16 }).returning();
  return { account, guardian, cheer, adult, child, teen };
}

/** A member as the gates see one: the household, the person, the seat and the active profile. */
function member(h: Made, o: { profile?: Made["adult"]; seat?: Seat; user?: Row; childMode?: boolean } = {}): Member {
  const profile = o.profile ?? h.adult, seat = o.seat ?? "guardian", childMode = o.childMode ?? false;
  const age = profile.birthYear === null ? null : new Date().getFullYear() - profile.birthYear;
  return {
    account: h.account, user: o.user ?? (seat === "circle" ? h.cheer : h.guardian), seat, profile, age, childMode, tester: false,
    device: null, enrolment: null, dose: { age, dailyMinutes: 0, stopFlag: false },
    can: (a: MemberAction) => memberCan(seat, a, childMode),
  } as unknown as Member;
}

const minute = (at: number, more: Record<string, unknown> = {}) => ({ at, faceSeconds: 57, distanceCm: 52.5, blinksPerMin: 11, halfBlinksPerMin: 3, posture: 0.9, minutesSinceBreak: 4, prompt: null, ...more });
const samplesOf = (profileId: string) => db.select().from(s.monitorSample).where(eq(s.monitorSample.profileId, profileId)).orderBy(s.monitorSample.takenAt);
const dayOf = async (profileId: string, day: string) => (await db.select().from(s.daySummary).where(and(eq(s.daySummary.profileId, profileId), eq(s.daySummary.day, day))))[0];
const breaksOf = (profileId: string) => db.select().from(s.careLog).where(and(eq(s.careLog.profileId, profileId), eq(s.careLog.kind, "far"))).orderBy(s.careLog.createdAt);

describe.skipIf(!up)("the workday monitor on the server", () => {
  beforeAll(async () => { A = await household("a"); B = await household("b"); });
  afterAll(async () => { await db.delete(s.account).where(inArray(s.account.id, [A.account.id, B.account.id])); });

  it("belongs to the guardian seats, and runs only for a grown-up's profile", () => {
    expect(maySeeMonitor(member(A))).toBe(true);
    expect(maySeeMonitor(member(A, { seat: "co_guardian" }))).toBe(true);
    expect(maySeeMonitor(member(A, { seat: "circle" }))).toBe(false);
    expect(monitorUse(member(A))).toBe("ok");
    expect(monitorUse(member(A, { profile: A.child }))).toBe("child");
    expect(monitorUse(member(A, { profile: A.teen }))).toBe("child");
    expect(monitorUse(member(A, { childMode: true }))).toBe("look_only");
  });

  it("does not start without camera consent, for a child, or for a cheer seat", async () => {
    expect(await startRun(member(A))).toEqual({ ok: false, why: "consent" });
    expect(await startRun(member(A, { profile: A.child }))).toEqual({ ok: false, why: "not_allowed" });
    expect(await startRun(member(A, { seat: "circle" }))).toEqual({ ok: false, why: "not_allowed" });
    expect(await db.select().from(s.session).where(eq(s.session.profileId, A.adult.id))).toHaveLength(0);
  });

  it("records consent once, from a guardian, never for a child's profile and never in child mode", async () => {
    expect(await giveCameraConsent(member(A, { seat: "circle" }))).toBe("not_allowed");
    expect(await giveCameraConsent(member(A, { profile: A.child }))).toBe("not_allowed");
    expect(await giveCameraConsent(member(A, { profile: A.teen }))).toBe("not_allowed");
    expect(await giveCameraConsent(member(A, { childMode: true }))).toBe("not_allowed");
    expect(await cameraConsent(member(A))).toBeNull();
    expect(await giveCameraConsent(member(A))).toBe("done");
    expect(await giveCameraConsent(member(A))).toBe("done");
    const rows = await db.select().from(s.consent).where(and(eq(s.consent.profileId, A.adult.id), eq(s.consent.kind, CAMERA_CONSENT)));
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(A.guardian.id);
    expect((await cameraConsent(member(A)))?.by).toBe("Guardian a");
    /* the other household's grown-up has none */
    expect(await cameraConsent(member(B))).toBeNull();
  });

  let run = "";
  it("starts a run, and a second start ends the first", async () => {
    const first = await startRun(member(A), new Date(T0 - 5 * MIN));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = await startRun(member(A), new Date(T0));
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    run = second.runId;
    const rows = await db.select().from(s.session).where(eq(s.session.profileId, A.adult.id)).orderBy(s.session.startedAt);
    /* the first run stored nothing, so it leaves no row; the second is the open one */
    expect(rows.map((r) => [r.kind, r.itemSlug, r.ring, r.endReason])).toEqual([["monitor", MONITOR_SLUG, "rest", null]]);
    expect(await saveMinute(member(A), first.runId, minute(T0), new Date(T0 + MIN + 1000))).toEqual({ ok: false, why: "ended" });
  });

  it("stores one measured minute, once, as screen time and never as training", async () => {
    const m = member(A), at = T0 + MIN, now = new Date(at + MIN + 2000);
    expect(await saveMinute(m, run, minute(at, { prompt: "break" }), now)).toEqual({ ok: true, stored: true });
    expect(await saveMinute(m, run, minute(at, { distanceCm: 99 }), now)).toEqual({ ok: true, stored: false });
    const rows = await samplesOf(A.adult.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ distanceCm: 52.5, blinksPerMin: 11, halfBlinksPerMin: 3, posture: 0.9, minutesSinceBreak: 4, faceSeconds: 57, prompt: "break" });
    expect(rows[0].takenAt.getTime()).toBe(at);
    const day = await dayOf(A.adult.id, todayKey(new Date(at)));
    expect(day.screenMinutes).toBeCloseTo(0.95, 2);
    expect(day.trainMinutes).toBe(0);
    expect(day.restBreaks).toBe(0);
    const [session] = await db.select().from(s.session).where(eq(s.session.id, run));
    expect(session.minutes).toBeCloseTo(0.95, 2);
  });

  it("keeps a minute's missing numbers as missing", async () => {
    const at = T0 + 2 * MIN;
    expect(await saveMinute(member(A), run, minute(at, { distanceCm: null, blinksPerMin: null, halfBlinksPerMin: null, posture: null }), new Date(at + MIN + 1000))).toEqual({ ok: true, stored: true });
    const row = (await samplesOf(A.adult.id))[1];
    expect([row.distanceCm, row.blinksPerMin, row.halfBlinksPerMin, row.posture]).toEqual([null, null, null, null]);
  });

  it("refuses numbers out of range, anything that is not a number, and minutes that are not over, too old or in the future", async () => {
    const m = member(A), at = T0 + 3 * MIN, now = new Date(at + MIN + 1000);
    for (const bad of [{ distanceCm: 4 }, { blinksPerMin: 500 }, { posture: 3 }, { faceSeconds: 2 }, { prompt: "stress" }, { picture: "data:image/jpeg;base64,/9j/4AAQ" }, { profileId: B.adult.id }]) {
      expect(await saveMinute(m, run, minute(at, bad), now), JSON.stringify(bad)).toEqual({ ok: false, why: "bad" });
    }
    expect(await saveMinute(m, "not-a-run", minute(at), now)).toEqual({ ok: false, why: "bad" });
    expect(await saveMinute(m, run, minute(at), new Date(at + 20_000))).toEqual({ ok: false, why: "late" });
    expect(await saveMinute(m, run, minute(at), new Date(at + 30 * MIN))).toEqual({ ok: false, why: "late" });
    expect(await saveMinute(m, run, minute(at + 60 * MIN), now)).toEqual({ ok: false, why: "late" });
    expect(await saveMinute(m, run, minute(T0 - 10 * MIN), now)).toEqual({ ok: false, why: "late" });
    expect(await samplesOf(A.adult.id)).toHaveLength(2);
  });

  it("stores nothing for another household's run, another profile, or a seat that may not run it", async () => {
    const at = T0 + 3 * MIN, now = new Date(at + MIN + 1000);
    await giveCameraConsent(member(B));
    /* B's guardian with A's run id: the run is not B's */
    expect(await saveMinute(member(B), run, minute(at), now)).toEqual({ ok: false, why: "ended" });
    expect(await saveMinute(member(A, { profile: A.child }), run, minute(at), now)).toEqual({ ok: false, why: "not_allowed" });
    expect(await saveMinute(member(A, { seat: "circle" }), run, minute(at), now)).toEqual({ ok: false, why: "not_allowed" });
    expect(await samplesOf(B.adult.id)).toHaveLength(0);
    expect(await samplesOf(A.child.id)).toHaveLength(0);
    expect(await samplesOf(A.adult.id)).toHaveLength(2);
  });

  it("adds an earned break to the Rest ring once, and keeps the rest without moving the ring", async () => {
    const m = member(A), day = todayKey(new Date(T0)), b0 = T0 + 5 * MIN;
    const after = (at: number) => new Date(at + 60_000);
    /* not earned: kept for the record, the ring stays */
    expect(await saveBreak(m, run, { at: b0, seen: true, due: false, earned: false }, after(b0))).toEqual({ ok: true, kept: true, counted: false, today: 0 });
    /* earned: counts */
    const b1 = T0 + 8 * MIN;
    expect(await saveBreak(m, run, { at: b1, seen: true, due: true, earned: true }, after(b1))).toEqual({ ok: true, kept: true, counted: true, today: 1 });
    /* the same break sent twice: not kept again */
    expect(await saveBreak(m, run, { at: b1, seen: true, due: true, earned: true }, after(b1))).toEqual({ ok: true, kept: false, counted: false, today: 1 });
    /* another earned break ten minutes later: kept, but too soon to count */
    const b2 = T0 + 18 * MIN;
    expect(await saveBreak(m, run, { at: b2, seen: false, due: true, earned: true }, after(b2))).toEqual({ ok: true, kept: true, counted: false, today: 1 });
    /* and one 21 minutes after the counted one: counts */
    const b3 = b1 + (RULE.ringEveryMin + 1) * MIN;
    expect(await saveBreak(m, run, { at: b3, seen: true, due: true, earned: true }, after(b3))).toEqual({ ok: true, kept: true, counted: true, today: 2 });
    const rows = await breaksOf(A.adult.id);
    expect(rows.map((r) => [r.itemSlug, r.count])).toEqual([[MONITOR_SLUG, 0], [MONITOR_SLUG, 1], [MONITOR_SLUG, 0], [MONITOR_SLUG, 1]]);
    expect((rows[1].data as { due: boolean; seen: boolean }).due).toBe(true);
    expect((await dayOf(A.adult.id, day)).restBreaks).toBe(2);
  });

  it("refuses a break that is still running, too old, or badly formed", async () => {
    const m = member(A), at = T0 + 30 * MIN;
    expect(await saveBreak(m, run, { at, seen: true, due: false, earned: false }, new Date(at + 2000))).toEqual({ ok: false, why: "late" });
    expect(await saveBreak(m, run, { at: T0 - 30 * MIN, seen: true, due: false, earned: false }, new Date(T0 + 31 * MIN))).toEqual({ ok: false, why: "late" });
    expect(await saveBreak(m, run, { at, seen: "yes", due: false, earned: false }, new Date(at + MIN))).toEqual({ ok: false, why: "bad" });
    expect(await saveBreak(m, run, { at, seen: true, due: false, earned: true, count: 5 }, new Date(at + MIN))).toEqual({ ok: false, why: "bad" });
  });

  it("does not count a look-away twice when the member also logged it in a care companion", async () => {
    const m = member(B), day = todayKey(new Date(T0));
    const started = await startRun(m, new Date(T0));
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const at = T0 + 10 * MIN;
    /* the Far Window companion logs a break that began half a minute after the monitor saw her look away */
    const companion = await logBreak(m, { kind: "far", slug: "far-window", day, startedAt: at + 30_000, data: {} });
    expect(companion).toMatchObject({ ok: true, counted: true, today: 1 });
    expect(await saveBreak(m, started.runId, { at, seen: true, due: true, earned: true }, new Date(at + 3 * MIN))).toEqual({ ok: true, kept: false, counted: false, today: 1 });
    expect((await dayOf(B.adult.id, day)).restBreaks).toBe(1);
    expect(await breaksOf(B.adult.id)).toHaveLength(1);
    /* a companion break counted eight minutes earlier also keeps a monitor break from counting */
    const later = at + 8 * MIN;
    expect(await saveBreak(m, started.runId, { at: later, seen: true, due: true, earned: true }, new Date(later + MIN))).toMatchObject({ kept: true, counted: false, today: 1 });
  });

  it("stops at twelve breaks a day, the companions' own limit", async () => {
    const m = member(B), day = todayKey(new Date(T0));
    /* eleven more counted breaks earlier in the day, as companions would have logged them */
    await db.insert(s.careLog).values(Array.from({ length: 11 }, (_, i) => ({ profileId: B.adult.id, day, kind: "blink", itemSlug: "blink-garden", count: 1, data: { startedAt: T0 - (300 + i * 25) * MIN } })));
    const [open] = await db.select({ id: s.session.id }).from(s.session).where(and(eq(s.session.profileId, B.adult.id), eq(s.session.kind, "monitor")));
    const at = T0 + 34 * MIN;
    expect(await saveBreak(m, open.id, { at, seen: true, due: true, earned: true }, new Date(at + MIN))).toEqual({ ok: true, kept: true, counted: false, today: 12 });
    expect((await dayOf(B.adult.id, day)).restBreaks).toBe(1);
  });

  it("shows a member their own numbers only", async () => {
    const mine = await monitorView(member(A));
    const day = mine.days.find((d) => d.key === todayKey(new Date(T0 + MIN)))!;
    expect(day.totals).toMatchObject({ measured: 2, distanceCm: 53, blinksPerMin: 11, due: 3, taken: 3, early: 1, counted: 2 });
    expect(mine.any).toBe(true);
    /* household B has breaks and no samples; nothing of A's shows there, and nothing of B's showed above */
    const theirs = await monitorView(member(B));
    expect(theirs.any).toBe(false);
    expect(theirs.days.reduce((n, d) => n + d.totals.measured, 0)).toBe(0);
    /* a day that is not one of the last seven is ignored */
    expect((await monitorView(member(A), "1999-01-01")).shown.key).toBe(mine.shown.key);
  });

  it("stores nothing more once consent is withdrawn, and ends the run", async () => {
    expect(await withdrawCameraConsent(member(A, { seat: "circle" }))).toBe("not_allowed");
    expect(await withdrawCameraConsent(member(A))).toBe("done");
    const at = T0 + 36 * MIN;
    expect(await saveMinute(member(A), run, minute(at), new Date(at + MIN + 1000))).toEqual({ ok: false, why: "consent" });
    expect(await startRun(member(A))).toEqual({ ok: false, why: "consent" });
    /* the run had stored minutes, so its row stays, marked as left */
    const [session] = await db.select().from(s.session).where(eq(s.session.id, run));
    expect(session.endReason).toBe("left");
    expect(await endRun(member(A), run)).toBe(false);
  });

  it("removes a run that stored nothing when it is stopped, and closes one that stored something", async () => {
    const m = member(B);
    const [open] = await db.select({ id: s.session.id, minutes: s.session.minutes }).from(s.session).where(and(eq(s.session.profileId, B.adult.id), eq(s.session.kind, "monitor")));
    expect(open.minutes).toBe(0);
    expect(await endRun(member(A), open.id)).toBe(false); // not A's run
    expect(await endRun(m, open.id)).toBe(true);
    expect(await db.select().from(s.session).where(eq(s.session.id, open.id))).toHaveLength(0);
    const again = await startRun(m, new Date(T0));
    if (!again.ok) throw new Error("start refused");
    await saveMinute(m, again.runId, minute(T0 + MIN), new Date(T0 + 2 * MIN + 1000));
    expect(await endRun(m, again.runId)).toBe(true);
    const [closed] = await db.select().from(s.session).where(eq(s.session.id, again.runId));
    expect(closed.endReason).toBe("done");
  });

  it("lets a guardian delete the monitor's numbers for the active profile, and nobody else's", async () => {
    expect(await forgetMonitor(member(A, { seat: "circle" }))).toEqual({ ok: false, samples: 0 });
    expect(await forgetMonitor(member(A))).toEqual({ ok: true, samples: 2 });
    expect(await samplesOf(A.adult.id)).toHaveLength(0);
    expect(await db.select().from(s.session).where(and(eq(s.session.profileId, A.adult.id), eq(s.session.kind, "monitor")))).toHaveLength(0);
    /* the breaks already on the ring stay, and the other household is untouched */
    expect(await breaksOf(A.adult.id)).toHaveLength(4);
    expect(await samplesOf(B.adult.id)).toHaveLength(1);
  });

  it("removes samples older than the keeping time in the daily job, and leaves newer ones", async () => {
    const now = new Date(), old = new Date(sampleCutoff(now).getTime() - 3 * 3_600_000), kept = new Date(sampleCutoff(now).getTime() + 3 * 3_600_000);
    await db.insert(s.monitorSample).values([{ profileId: A.adult.id, takenAt: old, distanceCm: 50 }, { profileId: A.adult.id, takenAt: kept, distanceCm: 51 }]);
    await db.insert(s.session).values({ profileId: A.adult.id, kind: "monitor", itemSlug: MONITOR_SLUG, ring: "rest", minutes: 12, startedAt: new Date(now.getTime() - 3 * 86_400_000) });
    const first = await trimMonitor(now);
    expect(first.samples).toBeGreaterThanOrEqual(1);
    expect(first.runs).toBeGreaterThanOrEqual(1);
    expect((await samplesOf(A.adult.id)).map((r) => r.distanceCm)).toEqual([51]);
    const [stale] = await db.select().from(s.session).where(and(eq(s.session.profileId, A.adult.id), eq(s.session.kind, "monitor")));
    expect(stale.endReason).toBe("left");
    /* a second run finds nothing more of this household's to do */
    await trimMonitor(now);
    expect(await samplesOf(A.adult.id)).toHaveLength(1);
    expect(RULE.keepDays).toBe(35);
  });
});
