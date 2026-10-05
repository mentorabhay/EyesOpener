/**
 * Demo rows for the workday monitor. Run it after the main seed; it is safe to run again.
 *   npx tsx scripts/seed/monitor.ts
 *
 * EVERY NUMBER HERE IS SAMPLE DATA for development and for looking at the charts. None of it was measured by a
 * camera, and none of it describes a real person.
 *
 * What it does, for the grown-up profile Priya in the demo household:
 *  - records that the guardian Priya Sharma allowed the camera for that profile (the monitor shows nothing before);
 *  - writes one-minute samples for the working days among the last seven days, and for today up to a few minutes
 *    ago: two blocks of desk work a day with a lunch gap and a meeting gap, distance that drifts closer through a
 *    stretch, blink numbers that drop while she concentrates, and breaks that are mostly taken a few minutes late;
 *  - writes the breaks to the care log under the monitor's slug, counted for the Rest ring by the monitor's own rules;
 *  - sets those days' screen time and rest breaks to what these rows add up to.
 * Saturday and Sunday are left empty, so the charts show their hatching.
 * A second run first removes what the first run wrote for Priya (every monitor sample and run of that profile, and
 * the care-log rows marked `sample`), so nothing is doubled. It touches no other profile.
 */
import "../env";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db, schema as s } from "../../src/db";
import { BREAKS_A_DAY } from "../../src/lib/care";
import { CAMERA_CONSENT, CAMERA_CONSENT_VERSION, dayKeyOf, MONITOR_SLUG, ringDecision, RULE, type LoggedBreak } from "../../src/lib/monitor-rules";

const MIN = 60_000, DAY = 86_400_000, INDIA = 330 * MIN;
/** Desk work as minutes after midnight in India: [from, to). The gaps are lunch and a meeting away from the desk. */
const BLOCKS: [number, number][] = [[9 * 60 + 30, 12 * 60 + 45], [13 * 60 + 40, 15 * 60], [15 * 60 + 35, 17 * 60 + 50]];

/** The same numbers on every run: a small generator seeded by the day. */
function dice(seed: string) {
  let a = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) { a ^= seed.charCodeAt(i); a = Math.imul(a, 0x01000193); }
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const round = (v: number, p = 1) => Math.round(v * 10 ** p) / 10 ** p;

interface Sample { takenAt: Date; distanceCm: number | null; blinksPerMin: number | null; halfBlinksPerMin: number | null; posture: number | null; minutesSinceBreak: number; faceSeconds: number; prompt: string | null }
interface Break { at: number; due: boolean; earned: boolean; seen: boolean }

/** One made-up day at the desk, up to `until` (milliseconds since 1970). */
function madeUpDay(dayStart: number, key: string, until: number) {
  const r = dice(`monitor:${key}`);
  const samples: Sample[] = [], breaks: Break[] = [], runs: { from: number; to: number; minutes: number }[] = [];
  let owed = 0;
  for (const [from, to] of BLOCKS) {
    let since = 0, seat = 58 + r() * 4, wait = -1, focus = 0, marked = false;
    const run = { from: dayStart + from * MIN, to: dayStart + from * MIN, minutes: 0 };
    for (let m = from; m < to; m++) {
      const at = dayStart + m * MIN;
      if (at > until) break;
      /* a break falls due at 20 minutes; she takes it after a few minutes more, and now and then lets it slide */
      if (since >= RULE.breakEveryMin && wait < 0) wait = r() < 0.55 ? Math.floor(r() * 5) : 10 + Math.floor(r() * 26);
      const early = since > 8 && since < RULE.breakEveryMin && r() < 0.012;
      if ((wait === 0 && since >= RULE.breakEveryMin) || early) {
        const earned = owed >= RULE.breakEveryMin;
        breaks.push({ at: at + Math.floor(r() * 30) * 1000, due: since >= RULE.breakEveryMin, earned, seen: r() < 0.8 });
        if (earned) owed -= RULE.breakEveryMin;
        since = 0; wait = -1; marked = false; seat = 56 + r() * 6;
        continue; // the minute of the break itself: she was not at the screen, so it was not measured
      }
      if (wait > 0) wait -= 1;
      /* a minute here and there is not measured: she reached for something, or the camera lost her */
      if (r() < 0.035) { since += 1; owed += 1; continue; }
      since += 1; owed += 1;
      if (focus <= 0 && r() < 0.03) focus = 6 + Math.floor(r() * 10);
      focus -= 1;
      /* she drifts towards the screen through a stretch, more so in the afternoon */
      const drift = Math.min(15, since * (from > 13 * 60 ? 0.55 : 0.4));
      const distance = seat - drift + (r() - 0.5) * 3;
      const blinks = focus > 0 ? 2.5 + r() * 3.5 : 8 + r() * 8;
      const noBlinks = r() < 0.07;
      const prompt = since >= RULE.breakEveryMin && !marked ? "break" : null;
      if (prompt) marked = true;
      samples.push({
        takenAt: new Date(at),
        distanceCm: r() < 0.03 ? null : round(distance),
        blinksPerMin: noBlinks ? null : round(blinks),
        halfBlinksPerMin: noBlinks ? null : round(blinks * (0.18 + r() * 0.2)),
        posture: round(Math.max(0, Math.min(1, (distance < seat * 0.85 ? 0.55 : 0.92) + (r() - 0.5) * 0.14)), 2),
        minutesSinceBreak: since,
        faceSeconds: round(52 + r() * 8),
        prompt,
      });
      run.to = at + MIN; run.minutes += 1;
    }
    if (run.minutes) runs.push(run);
  }
  return { samples, breaks, runs };
}

export async function seedMonitor() {
  const [priya] = await db.select({ id: s.profile.id, accountId: s.profile.accountId }).from(s.profile)
    .innerJoin(s.account, eq(s.account.id, s.profile.accountId))
    .where(and(eq(s.account.isDemo, true), eq(s.profile.displayName, "Priya"), eq(s.profile.kind, "adult"))).limit(1);
  if (!priya) { console.log("Monitor: the demo household has no grown-up profile named Priya. Run the main seed first."); return; }
  const [guardian] = await db.select({ id: s.appUser.id }).from(s.appUser).where(and(eq(s.appUser.accountId, priya.accountId), eq(s.appUser.seat, "guardian"))).limit(1);

  const now = Date.now(), today = dayKeyOf(now), todayStart = Date.parse(`${today}T00:00:00Z`) - INDIA;
  const days = Array.from({ length: 7 }, (_, i) => todayStart - (6 - i) * DAY);

  await db.transaction(async (tx) => {
    /* what an earlier run wrote */
    await tx.delete(s.monitorSample).where(eq(s.monitorSample.profileId, priya.id));
    await tx.delete(s.session).where(and(eq(s.session.profileId, priya.id), eq(s.session.kind, "monitor")));
    await tx.delete(s.careLog).where(and(eq(s.careLog.profileId, priya.id), eq(s.careLog.itemSlug, MONITOR_SLUG), sql`${s.careLog.data}->>'sample' = 'true'`));

    const [consent] = await tx.select({ id: s.consent.id }).from(s.consent)
      .where(and(eq(s.consent.profileId, priya.id), eq(s.consent.kind, CAMERA_CONSENT), isNull(s.consent.revokedAt))).limit(1);
    if (!consent) await tx.insert(s.consent).values({ profileId: priya.id, accountId: priya.accountId, userId: guardian?.id, kind: CAMERA_CONSENT, textVersion: CAMERA_CONSENT_VERSION, grantedAt: new Date(days[0]) });

    let minutes = 0, taken = 0;
    for (const dayStart of days) {
      const key = dayKeyOf(dayStart + 12 * 60 * MIN), weekday = new Date(`${key}T00:00:00Z`).getUTCDay();
      if (weekday === 0 || weekday === 6) continue;
      const d = madeUpDay(dayStart, key, now - 3 * MIN);
      if (!d.samples.length) continue;
      await tx.insert(s.monitorSample).values(d.samples.map((x) => ({ profileId: priya.id, ...x })));
      for (const run of d.runs) {
        await tx.insert(s.session).values({ profileId: priya.id, kind: "monitor", itemSlug: MONITOR_SLUG, ring: "rest", minutes: run.minutes, startedAt: new Date(run.from), endedAt: new Date(run.to), endReason: "done" });
      }
      /* the Rest ring by the monitor's own rules: earned, not within 20 minutes of another, twelve a day */
      const logged: LoggedBreak[] = [];
      let counted = 0;
      for (const b of d.breaks) {
        const counts = b.earned && ringDecision(b.at, logged) === "count" && counted < BREAKS_A_DAY;
        logged.push({ at: b.at, monitor: true, counted: counts });
        if (counts) counted += 1;
        await tx.insert(s.careLog).values({ profileId: priya.id, day: key, kind: "far", itemSlug: MONITOR_SLUG, count: counts ? 1 : 0, data: { startedAt: b.at, seen: b.seen, due: b.due, sample: true }, createdAt: new Date(b.at + 2 * MIN) });
      }
      const screen = round(d.samples.reduce((sum, x) => sum + x.faceSeconds, 0) / 60);
      await tx.insert(s.daySummary).values({ profileId: priya.id, day: key, restBreaks: counted, restGoal: 6, lightGoal: 60, screenMinutes: screen })
        .onConflictDoUpdate({ target: [s.daySummary.profileId, s.daySummary.day], set: { restBreaks: counted, screenMinutes: screen } });
      minutes += d.samples.length; taken += d.breaks.length;
    }
    console.log(`Monitor: ${minutes} sample minutes and ${taken} breaks written for Priya (sample data, not measurements).`);
  });
}

if (/scripts[\\/]seed[\\/]monitor\.ts$/.test(process.argv[1] ?? "")) seedMonitor().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
