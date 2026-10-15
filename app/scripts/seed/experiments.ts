/**
 * Demo rows for community experiments. Run it after the main seed; it is safe to run again.
 *   npx tsx scripts/seed/experiments.ts
 * Every number here is sample data for development, not a measurement.
 *
 * What it does:
 * - Adds a third published idea with an open experiment ("Catch a ball after the daily practice", Depth check-up).
 * - Puts the demo family into one experiment at each stage:
 *     Aarav: the ball idea, waiting for the check-up before; the bead idea, in its weeks (trying the idea).
 *     Priya: the blink idea, finished (trying the idea).
 *     Dadi:  the blink idea, carrying on as usual, check-up after due today with a check-up ready to add.
 * - Adds one household of sample members to the blink experiment, enough finished members in each group for a
 *   pooled result, and a few who are still in it, missed the check-up after, or left.
 * - Works the pooled results out with the same code the daily job uses, so the result shown is computed, not typed in.
 *   It replaces the placeholder result the main seed stores for the blink idea.
 */
import "../env";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema as s } from "../../src/db";
import { recomputeSignal } from "../../src/lib/experiment-data";

const DAY = 86_400_000, HOUR = 3_600_000;
const SAMPLE = "Experiment sample members";
/** Marks the check-up rows this file adds, so that it can take them out again. */
const MARK = { seed: "experiments" };
const BLINK = "Ten full blinks, every hour", BEADS = "Bead threading while patched", BALL = "Catch a ball after the daily practice";
const e = s.experimentEnrolment;

/** The same numbers on every run: a small seeded generator and a bell curve from it. */
function numbers(seed: number) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const bell = (mean: number, spread: number) => mean + spread * Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next());
  return { next, bell };
}

const ago = (days: number, hours = 0) => new Date(Date.now() - days * DAY - hours * HOUR);

export async function seedExperiments() {
  const family = await db.select({ id: s.profile.id, name: s.profile.displayName }).from(s.profile).innerJoin(s.account, eq(s.account.id, s.profile.accountId))
    .where(and(eq(s.account.isDemo, true), inArray(s.profile.displayName, ["Aarav", "Priya", "Dadi"])));
  const who = (name: string) => family.find((p) => p.name === name)?.id;
  const aarav = who("Aarav"), priya = who("Priya"), dadi = who("Dadi");
  if (!aarav || !priya || !dadi) { console.log("Experiments: the demo family is not there. Run the main seed first."); return; }

  const openExperiment = async (title: string) => {
    const [p] = await db.select({ id: s.protocol.id }).from(s.protocol).where(and(eq(s.protocol.title, title), eq(s.protocol.status, "published"))).limit(1);
    if (!p) return null;
    const [x] = await db.select({ id: s.experiment.id }).from(s.experiment).where(eq(s.experiment.protocolId, p.id)).orderBy(desc(s.experiment.opensAt)).limit(1);
    return x ?? (await db.insert(s.experiment).values({ protocolId: p.id }).returning({ id: s.experiment.id }))[0];
  };
  const blink = await openExperiment(BLINK), beads = await openExperiment(BEADS);
  if (!blink || !beads) { console.log("Experiments: the seeded ideas are not there. Run the main seed first."); return; }

  /* a third idea, from a sample member of the community */
  let ball = await openExperiment(BALL);
  if (!ball) {
    const [author] = await db.select({ id: s.profile.id }).from(s.profile).innerJoin(s.account, eq(s.account.id, s.profile.accountId))
      .where(and(eq(s.account.isDemo, false), eq(s.profile.kind, "adult"), eq(s.account.displayName, "Community sample"))).orderBy(asc(s.profile.createdAt)).limit(1);
    const by = author?.id ?? priya;
    const [story] = await db.insert(s.story).values({
      profileId: by, status: "published",
      body: "After our son's daily practice we began to throw a soft ball in the yard for ten minutes. In the first week he missed most throws. A month later he caught many more. We cannot tell whether it was the catching or just a month of growing, so we would like to see it tested.",
    }).returning({ id: s.story.id });
    const [p] = await db.insert(s.protocol).values({
      storyId: story.id, profileId: by, title: BALL, forWhom: "Children on the lazy-eye programme, ages 5 to 10",
      doWhat: "Play catch with a soft ball, two to three metres apart", howMuch: "10 minutes a day after the practice, for 4 weeks",
      weeks: 4, moves: "stereo", step: "protocol", status: "published", hazard: { blocked: [], flagged: [] }, publishedAt: ago(9),
    }).returning({ id: s.protocol.id });
    [ball] = await db.insert(s.experiment).values({ protocolId: p.id, opensAt: ago(9) }).returning({ id: s.experiment.id });
  }

  /* take out what an earlier run of this file put in */
  const mine = [blink.id, beads.id, ball.id];
  await db.delete(e).where(and(inArray(e.experimentId, mine), inArray(e.profileId, [aarav, priya, dadi])));
  await db.delete(s.account).where(eq(s.account.displayName, SAMPLE));
  await db.delete(s.testResult).where(sql`${s.testResult.raw} @> ${JSON.stringify(MARK)}::jsonb`);

  /* one survey result; the first one a profile has is its baseline */
  const survey = (profileId: string, value: number, takenAt: Date, first: boolean) =>
    ({ profileId, deviceId: null, testKey: "symptoms", unit: "score", eye: null, value, raw: MARK, isBaseline: first, takenAt });

  /* ── the blink idea: sample members, enough in each group for a pooled result ── */
  const [home] = await db.insert(s.account).values({ displayName: SAMPLE }).returning({ id: s.account.id });
  const plan = [
    ...Array.from({ length: 34 }, () => ({ arm: "tried" as const, end: "finished" as const })),
    ...Array.from({ length: 31 }, () => ({ arm: "control" as const, end: "finished" as const })),
    ...Array.from({ length: 3 }, () => ({ arm: "tried" as const, end: "running" as const })),
    ...Array.from({ length: 2 }, () => ({ arm: "tried" as const, end: "missed" as const })),
    ...Array.from({ length: 2 }, () => ({ arm: "control" as const, end: "left" as const })),
  ];
  const people = await db.insert(s.profile).values(plan.map((_, i) => ({ accountId: home.id, displayName: `Sample member ${i + 1}`, kind: "adult" as const }))).returning({ id: s.profile.id });
  const rnd = numbers(20261005);
  for (const [i, step] of plan.entries()) {
    const profileId = people[i].id;
    const before = Math.round(Math.max(6, Math.min(48, rnd.bell(25, 8))));
    const change = step.arm === "tried" ? rnd.bell(-6, 7) : rnd.bell(-1.2, 6.5);
    const after = Math.round(Math.max(0, Math.min(60, before + change)));
    const start = step.end === "running" ? ago(6 + i % 3 * 5) : step.end === "missed" ? ago(60 + i) : ago(40 + Math.floor(rnd.next() * 30), 2);
    if (step.end === "left") {
      /* a member who left keeps the day of joining and of leaving; the check-ups are untied */
      await db.insert(e).values({ experimentId: blink.id, profileId, arm: step.arm, joinedAt: new Date(start.getTime() - DAY), leftAt: new Date(start.getTime() + 9 * DAY) });
      continue;
    }
    const [base] = await db.insert(s.testResult).values(survey(profileId, before, new Date(start.getTime() - HOUR), true)).returning({ id: s.testResult.id });
    const done = step.end === "finished" ? new Date(start.getTime() + (28 + Math.floor(rnd.next() * 6)) * DAY) : null;
    const [follow] = done ? await db.insert(s.testResult).values(survey(profileId, after, done, false)).returning({ id: s.testResult.id }) : [];
    await db.insert(e).values({ experimentId: blink.id, profileId, arm: step.arm, joinedAt: new Date(start.getTime() - DAY), startedAt: start, baselineId: base.id, followupId: follow?.id ?? null, finishedAt: done });
  }

  /* ── Priya: finished, in the group that tried it ── */
  const hadSurvey = async (profileId: string) => (await db.select({ id: s.testResult.id }).from(s.testResult).where(and(eq(s.testResult.profileId, profileId), eq(s.testResult.testKey, "symptoms"))).limit(1)).length > 0;
  const [pBefore, pAfter] = await db.insert(s.testResult).values([survey(priya, 27, ago(29, 1), !(await hadSurvey(priya))), survey(priya, 19, ago(1), false)]).returning({ id: s.testResult.id });
  await db.insert(e).values({ experimentId: blink.id, profileId: priya, arm: "tried", joinedAt: ago(30), startedAt: ago(29), baselineId: pBefore.id, followupId: pAfter.id, finishedAt: ago(1) });

  /* ── Dadi: carrying on as usual; the check-up after is due today and one taken a minute ago waits to be added ── */
  const [dBefore] = await db.insert(s.testResult).values([survey(dadi, 22, ago(28, 1), !(await hadSurvey(dadi))), survey(dadi, 21, new Date(Date.now() - 60_000), false)]).returning({ id: s.testResult.id });
  await db.insert(e).values({ experimentId: blink.id, profileId: dadi, arm: "control", joinedAt: ago(29), startedAt: ago(28), baselineId: dBefore.id });

  /* ── Aarav: the bead idea, two weeks in. The check-up before is the letter check-up he took about 14 days ago ── */
  const letters = await db.select({ id: s.testResult.id, eye: s.testResult.eye, value: s.testResult.value, takenAt: s.testResult.takenAt, deviceId: s.testResult.deviceId })
    .from(s.testResult).where(and(eq(s.testResult.profileId, aarav), eq(s.testResult.testKey, "acuity"))).orderBy(asc(s.testResult.takenAt));
  const target = Date.now() - 14 * DAY;
  const run = letters.filter((r) => r.eye).sort((a, b) => Math.abs(a.takenAt.getTime() - target) - Math.abs(b.takenAt.getTime() - target))[0];
  const pair = run ? letters.filter((r) => r.takenAt.getTime() === run.takenAt.getTime()) : [];
  /* the eye that counts is the one that read worse: for letters, the larger number */
  const worse = pair.sort((a, b) => b.value - a.value)[0];
  const [screen] = worse?.deviceId ? await db.select().from(s.device).where(eq(s.device.id, worse.deviceId)) : [];
  if (worse && screen && pair.length === 2 && Math.abs(worse.takenAt.getTime() - target) < 4 * DAY) {
    await db.insert(e).values({
      experimentId: beads.id, profileId: aarav, arm: "tried", joinedAt: new Date(worse.takenAt.getTime() - DAY), startedAt: new Date(worse.takenAt.getTime() + HOUR),
      baselineId: worse.id, basePxPerCm: screen.pxPerCm, baseDistanceCm: screen.distanceCm,
    });
  } else {
    /* no letter check-up from two weeks ago to build on: Aarav has joined and still needs the check-up before */
    await db.insert(e).values({ experimentId: beads.id, profileId: aarav, arm: "tried", joinedAt: ago(2) });
  }

  /* ── Aarav: the ball idea, joined yesterday, no check-up before yet ── */
  await db.insert(e).values({ experimentId: ball.id, profileId: aarav, arm: "tried", joinedAt: ago(1) });

  /* the pooled results and the ladder steps, by the daily job's own code */
  const outcomes = [];
  for (const id of mine) outcomes.push((await recomputeSignal(id)).outcome);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(e).where(inArray(e.experimentId, mine));
  console.log(`Experiments: ${n} enrolments in 3 experiments; pooled results: ${outcomes.join(", ")}.`);
}

if (/scripts[\\/]seed[\\/]experiments\.ts$/.test(process.argv[1] ?? "")) seedExperiments().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
