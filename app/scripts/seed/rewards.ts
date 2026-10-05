/**
 * Demo rows for the four "rewards" ideas: Locked Gallery, First Depth Day, Sunset Rule and Keeper Graduation.
 * Run it after the main seed; it is safe to run again.
 *   npx tsx scripts/seed/rewards.ts
 * Every row here is sample data for development: not a measurement and not a finding.
 *
 * What it does:
 * - Depth check-ups for Aarav: two that found no depth and, eight days ago, one that found it at the second step
 *   of his family's screen. So the First Depth Day page has a day to show, the Today page points at it until the
 *   scene is played, and the first depth picture of the gallery is reached. The numbers are worked out from the
 *   family's own screen with the engine, exactly as a saved check-up is.
 * - A finished course for Dadi: twelve weeks of the Convergence programme that ended thirteen days ago, with a
 *   sample of practice days and a few check-ups. So Keeper Graduation has a graduate in the demo family: the
 *   ceremony, the journey book and the form to leave a welcome. The course ends before her duet with Aarav began,
 *   so that duet reads exactly as before.
 * - A welcome for Aarav's family: the sample household "Community sample" has a finished Lazy eye course and left
 *   a welcome, and the demo family asked for one in its first week and received it. No thank-you line has been
 *   sent, so the form to send one is there to try.
 * Sunset Rule needs no rows: it is worked out from the day's own minutes.
 * The gallery's marks and the kept depth day are not seeded either: the app writes them itself, from these rows,
 * the first time the pages are opened.
 */
import "../env";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema as s } from "../../src/db";
import { depthLevels, depthValue, pixelArcsec } from "../../src/engine";
import { addDays, dayOf, startOfDay } from "../../src/lib/league";

const HOUR = 3_600_000;
const at = (day: string, hour: number) => new Date(startOfDay(day).getTime() + hour * HOUR);

export async function seedRewards() {
  const today = dayOf(new Date());
  const family = await db.select({ id: s.profile.id, name: s.profile.displayName, accountId: s.profile.accountId }).from(s.profile)
    .innerJoin(s.account, eq(s.account.id, s.profile.accountId))
    .where(and(eq(s.account.isDemo, true), inArray(s.profile.displayName, ["Aarav", "Dadi"])));
  const aarav = family.find((p) => p.name === "Aarav"), dadi = family.find((p) => p.name === "Dadi");
  if (!aarav || !dadi) { console.log("Rewards: the demo family is not there. Run the main seed first."); return; }
  const home = aarav.accountId;
  const [guardian] = await db.select({ id: s.appUser.id }).from(s.appUser).where(and(eq(s.appUser.accountId, home), eq(s.appUser.seat, "guardian"))).orderBy(asc(s.appUser.createdAt)).limit(1);
  const said: string[] = [];

  /* ── Aarav's Depth check-ups ── */
  const [device] = await db.select().from(s.device).where(and(eq(s.device.accountId, home), eq(s.device.kind, "web"))).limit(1);
  const [hasDepth] = await db.select({ id: s.testResult.id }).from(s.testResult).where(and(eq(s.testResult.profileId, aarav.id), eq(s.testResult.testKey, "stereo"))).limit(1);
  if (!device) said.push("no measured screen, so no Depth check-ups");
  else if (hasDepth) said.push("Depth check-ups kept as they were");
  else {
    const screen = { ppc: device.pxPerCm, dist: device.distanceCm }, dpr = 1, levels = depthLevels(screen, dpr);
    const row = (ago: number, px: number, note: string | null, trials: number, reversals: number, isBaseline = false) => ({
      profileId: aarav.id, deviceId: device.id, testKey: "stereo", eye: null, value: depthValue(screen, px, dpr), unit: "arcsec", note, isBaseline,
      raw: { px, dpr, pixelArcsec: Math.round(pixelArcsec(screen, dpr) * 10) / 10, trials, reversals, cyanEye: "L", sample: true },
      takenAt: at(addDays(today, -ago), 17),
    });
    await db.insert(s.testResult).values([
      row(36, levels[0], "worse", 4, 0, true),
      row(22, levels[0], "worse", 6, 1),
      row(8, levels[Math.min(1, levels.length - 1)], null, 14, 5),
    ]);
    said.push("3 Depth check-ups for Aarav");
  }

  /* ── Dadi's finished course ── */
  const lastDay = addDays(today, -14), startDay = addDays(lastDay, -83);
  const [dadiCourse] = await db.select({ id: s.enrolment.id }).from(s.enrolment).where(and(eq(s.enrolment.profileId, dadi.id), eq(s.enrolment.programme, "convergence"))).limit(1);
  if (dadiCourse) said.push("Dadi's course kept as it was");
  else {
    await db.insert(s.enrolment).values({ profileId: dadi.id, programme: "convergence", dailyMinutes: 15, daysPerWeek: 5, week: 12, status: "finished", startedAt: at(startDay, 9), endedAt: at(addDays(lastDay, 1), 3) });
    /* Five days asked a week. A sample of what a real course looks like: most days done, some short, some missed, one thin week. */
    const days = [];
    for (let i = 0; i < 84; i++) {
      const week = Math.floor(i / 7), dow = i % 7;
      if (dow >= 5) continue;
      const missed = (week * 3 + dow * 5) % 11 === 0 || (week === 6 && dow > 1), short = (week + dow * 2) % 9 === 0;
      if (!missed) days.push({ profileId: dadi.id, day: addDays(startDay, i), trainMinutes: short ? 8 : 15, trainGoal: 15, restBreaks: 3, lightMinutes: 30 });
    }
    await db.insert(s.daySummary).values(days).onConflictDoNothing();
    const [hasNear] = await db.select({ id: s.testResult.id }).from(s.testResult).where(and(eq(s.testResult.profileId, dadi.id), eq(s.testResult.testKey, "near_point"))).limit(1);
    if (!hasNear) {
      const check = (day: string, testKey: string, value: number, unit: string, isBaseline: boolean, raw: Record<string, unknown>) =>
        ({ profileId: dadi.id, testKey, eye: null, value, unit, note: null, isBaseline, raw: { ...raw, sample: true }, takenAt: at(day, 10) });
      await db.insert(s.testResult).values([
        check(addDays(startDay, 1), "near_point", 9.5, "cm", true, { tries: [9.5, 10, 9] }),
        check(addDays(startDay, 43), "near_point", 8.5, "cm", false, { tries: [8.5, 8, 9] }),
        check(addDays(startDay, 80), "near_point", 9, "cm", false, { tries: [9, 8.5, 9] }),
        check(addDays(startDay, 1), "fusion_break", 13, "prism_dioptre", true, { limit: 25 }),
        check(addDays(startDay, 1), "fusion_recovery", 8, "prism_dioptre", true, { limit: 25 }),
        check(addDays(startDay, 80), "fusion_break", 14.5, "prism_dioptre", false, { limit: 25 }),
        check(addDays(startDay, 80), "fusion_recovery", 9.5, "prism_dioptre", false, { limit: 25 }),
      ]);
    }
    said.push(`a finished Convergence course for Dadi with ${days.length} practice days`);
  }

  /* ── A keeper in the sample household, and the welcome the demo family received ── */
  const [zoya] = await db.select({ id: s.profile.id, accountId: s.profile.accountId }).from(s.profile).innerJoin(s.account, eq(s.account.id, s.profile.accountId))
    .where(and(eq(s.profile.displayName, "Zoya"), eq(s.account.displayName, "Community sample"))).limit(1);
  const [course] = await db.select().from(s.enrolment).where(and(eq(s.enrolment.profileId, aarav.id), eq(s.enrolment.status, "active"), eq(s.enrolment.programme, "lazy-eye"))).limit(1);
  if (!zoya || !course) said.push("no sample household or no running course, so no welcome");
  else {
    let [done] = await db.select({ id: s.enrolment.id }).from(s.enrolment).where(and(eq(s.enrolment.profileId, zoya.id), eq(s.enrolment.programme, "lazy-eye"), eq(s.enrolment.status, "finished"))).limit(1);
    if (!done) {
      [done] = await db.insert(s.enrolment).values({ profileId: zoya.id, programme: "lazy-eye", dailyMinutes: 60, daysPerWeek: 6, week: 12, status: "finished", startedAt: at(addDays(today, -100), 9), endedAt: at(addDays(today, -15), 3) }).returning({ id: s.enrolment.id });
    }
    const [consent] = await db.select({ id: s.consent.id }).from(s.consent).where(and(eq(s.consent.profileId, zoya.id), eq(s.consent.kind, "parental"))).limit(1);
    if (!consent) await db.insert(s.consent).values({ profileId: zoya.id, accountId: zoya.accountId, kind: "parental", textVersion: "sample" });
    const leftAt = at(addDays(today, -13), 19);
    let [welcome] = await db.select({ id: s.keeperWelcome.id, givenAt: s.keeperWelcome.givenAt }).from(s.keeperWelcome).where(eq(s.keeperWelcome.enrolmentId, done.id)).limit(1);
    if (!welcome) {
      [welcome] = await db.insert(s.keeperWelcome).values({ accountId: zoya.accountId, profileId: zoya.id, enrolmentId: done.id, programme: "lazy-eye", line: "split_it", createdAt: leftAt })
        .returning({ id: s.keeperWelcome.id, givenAt: s.keeperWelcome.givenAt });
    }
    const [asked] = await db.select({ id: s.keeperAsk.id }).from(s.keeperAsk).where(eq(s.keeperAsk.enrolmentId, course.id)).limit(1);
    if (asked) said.push("the demo family's ask kept as it was");
    else if (welcome.givenAt) said.push("the sample welcome was already given, so none for the demo family");
    else {
      await db.insert(s.keeperAsk).values({
        accountId: home, profileId: aarav.id, enrolmentId: course.id, programme: "lazy-eye", askedBy: guardian?.id ?? null,
        createdAt: new Date(course.startedAt.getTime() + 50 * HOUR), welcomeId: welcome.id, line: "split_it", receivedAt: leftAt,
      });
      await db.update(s.keeperWelcome).set({ givenAt: leftAt }).where(eq(s.keeperWelcome.id, welcome.id));
      said.push("a keeper's welcome for the demo family");
    }
  }

  console.log(`Rewards: ${said.join("; ")}.`);
}

if (/scripts[\\/]seed[\\/]rewards\.ts$/.test(process.argv[1] ?? "")) seedRewards().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
