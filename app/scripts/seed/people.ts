/**
 * Demo rows for four community ideas: Duet Streak, Discovery Board and Light the Map (Proof of Help needs none:
 * it reads the ideas and experiments the other seeds made). Run it after the main seed; it is safe to run again.
 *   npx tsx scripts/seed/people.ts
 * Every row here is sample data for development, not a measurement and not a finding.
 *
 * What it does:
 * - Duet Streak: pairs Aarav with Dadi from twelve days ago, and logs Dadi's drop routine on most of those days,
 *   so the page shows kept days, rest days and one day that was not kept.
 * - Discovery Board: one closed round with three questions, sample votes and ONE answer that is marked as sample
 *   data (`is_sample`); one open round with five questions and sample votes. Aarav and Priya voted in the closed
 *   round, Dadi has voted in the open one, Aarav has not.
 * - Light the Map: puts the demo family and the sample households on the map, and adds eleven map-only sample
 *   households, so that three areas are lit and one area stays below the minimum and is shown to nobody.
 */
import "../env";
import { and, asc, eq, inArray, like } from "drizzle-orm";
import { db, schema as s } from "../../src/db";
import { addDays, dayOf, startOfDay } from "../../src/lib/league";

const HOUR = 3_600_000;
const DROPS = "drop-reminder-routine";
const MAP_HOME = "Map sample household";

export async function seedPeople() {
  const today = dayOf(new Date());
  const family = await db.select({ id: s.profile.id, name: s.profile.displayName, accountId: s.profile.accountId }).from(s.profile)
    .innerJoin(s.account, eq(s.account.id, s.profile.accountId))
    .where(and(eq(s.account.isDemo, true), inArray(s.profile.displayName, ["Aarav", "Priya", "Dadi"])));
  const who = (name: string) => family.find((p) => p.name === name);
  const aarav = who("Aarav"), priya = who("Priya"), dadi = who("Dadi");
  if (!aarav || !priya || !dadi) { console.log("People: the demo family is not there. Run the main seed first."); return; }
  const home = aarav.accountId;
  const [guardian] = await db.select({ id: s.appUser.id }).from(s.appUser).where(and(eq(s.appUser.accountId, home), eq(s.appUser.seat, "guardian"))).orderBy(asc(s.appUser.createdAt)).limit(1);
  const [staff] = await db.select({ id: s.appUser.id }).from(s.appUser).where(eq(s.appUser.staffRole, "ops")).orderBy(asc(s.appUser.createdAt)).limit(1);

  /* ── Duet Streak: Aarav and Dadi ── */
  const [paired] = await db.select({ id: s.duet.id }).from(s.duet).where(eq(s.duet.accountId, home)).limit(1);
  if (!paired) await db.insert(s.duet).values({ accountId: home, aProfileId: aarav.id, bProfileId: dadi.id, startedOn: addDays(today, -12), createdBy: guardian?.id ?? null });
  /* Dadi's drop routine, by days ago. Not on days 10, 9 and 5, and not yet today. */
  let logged = 0;
  for (const ago of [12, 11, 8, 7, 6, 4, 3, 2, 1]) {
    const at = new Date(startOfDay(addDays(today, -ago)).getTime() + 8 * HOUR);
    const [has] = await db.select({ id: s.session.id }).from(s.session).where(and(eq(s.session.profileId, dadi.id), eq(s.session.itemSlug, DROPS), eq(s.session.startedAt, at))).limit(1);
    if (has) continue;
    await db.insert(s.session).values({ profileId: dadi.id, kind: "exercise", itemSlug: DROPS, ring: "rest", minutes: 1, endReason: "done", startedAt: at, endedAt: new Date(at.getTime() + 60_000) });
    logged += 1;
  }

  /* ── Discovery Board ── */
  const voters = await db.select({ id: s.profile.id }).from(s.profile).innerJoin(s.account, eq(s.account.id, s.profile.accountId))
    .where(eq(s.account.displayName, "Experiment sample members")).orderBy(asc(s.profile.displayName));
  const round = async (title: string, closesOn: string, closedAt: Date | null, questions: { question: string; why: string }[]) => {
    const [old] = await db.select().from(s.discoveryRound).where(eq(s.discoveryRound.title, title)).limit(1);
    if (old) return { id: old.id, made: false, questions: await db.select({ id: s.discoveryQuestion.id }).from(s.discoveryQuestion).where(eq(s.discoveryQuestion.roundId, old.id)).orderBy(asc(s.discoveryQuestion.position)) };
    const [made] = await db.insert(s.discoveryRound).values({ title, closesOn, closedAt, createdBy: staff?.id ?? null }).returning({ id: s.discoveryRound.id });
    const rows = await db.insert(s.discoveryQuestion).values(questions.map((q, position) => ({ ...q, roundId: made.id, position, createdBy: staff?.id ?? null }))).returning({ id: s.discoveryQuestion.id });
    return { id: made.id, made: true, questions: rows };
  };
  const vote = (roundId: string, questionId: string, profileIds: string[]) =>
    profileIds.length ? db.insert(s.discoveryVote).values(profileIds.map((profileId) => ({ roundId, questionId, profileId }))).onConflictDoNothing() : null;

  const closed = await round("Round one", addDays(today, -20), new Date(startOfDay(addDays(today, -19)).getTime() + 2 * HOUR), [
    { question: "Is the letter check-up steadier when it is taken at the same time of day?", why: "Check-up results move a little from day to day. If the hour matters, families could be told when to take it. The pooled letter check-ups carry the time they were taken." },
    { question: "How many weeks does it take before most families finish five days a week?", why: "The first weeks of a programme are the hardest to keep up. The pooled practice days show when the habit settles." },
    { question: "Which day of the week is missed most often?", why: "If one day stands out, a reminder could be offered for it. The pooled practice days hold the answer." },
  ]);
  if (closed.made) {
    const [q1, q2, q3] = closed.questions;
    await vote(closed.id, q1.id, [aarav.id, priya.id, ...voters.slice(0, 17).map((v) => v.id)]);
    await vote(closed.id, q2.id, voters.slice(17, 28).map((v) => v.id));
    await vote(closed.id, q3.id, voters.slice(28, 34).map((v) => v.id));
    /* the one answered example. It is sample data and the page says so: no finding is behind it. */
    await db.update(s.discoveryQuestion).set({
      isSample: true, answeredAt: new Date(startOfDay(addDays(today, -6)).getTime() + 5 * HOUR), answeredBy: staff?.id ?? null, answerMembers: 212,
      answer: "Members who took the letter check-up within one hour of their usual time had results that moved less from week to week than members who took it at different times of day. The difference was small. This does not show that the time of day changes how well anyone sees. It may only make the check-up itself steadier.",
      answerBasis: "Letter check-ups of members who agreed to pooling and took the check-up at least four times.",
    }).where(eq(s.discoveryQuestion.id, q1.id));
  }
  const open = await round("Round two", addDays(today, 21), null, [
    { question: "Does practising at the same time each day go with more finished days?", why: "A fixed time may make a habit easier. Session start times and finished days are both in the pooled records." },
    { question: "Do families who log outdoor time also finish more practice days?", why: "It would show whether the two habits help each other. Outdoor minutes and practice days are both recorded." },
    { question: "Do check-up results change more in the first four weeks of a programme than in the next four?", why: "Families ask when to expect a change. The pooled check-ups by programme week could show the usual course." },
    { question: "Are several short sessions finished as often as one long session?", why: "Some families split the day's minutes. The pooled sessions show whether split days get finished." },
    { question: "Do members who take a break every 20 minutes report fewer tired-eye symptoms?", why: "The break routine is advised to everyone at a screen. The symptom survey and the counted breaks could be put side by side." },
  ]);
  if (open.made) {
    const [q1, q2, q3, , q5] = open.questions;
    await vote(open.id, q1.id, [dadi.id, ...voters.slice(0, 6).map((v) => v.id)]);
    await vote(open.id, q2.id, voters.slice(6, 10).map((v) => v.id));
    await vote(open.id, q3.id, voters.slice(10, 15).map((v) => v.id));
    await vote(open.id, q5.id, voters.slice(15, 17).map((v) => v.id));
  }

  /* ── Light the Map ── */
  const have = await db.select({ id: s.account.id, name: s.account.displayName }).from(s.account).where(like(s.account.displayName, `${MAP_HOME} %`));
  const missing = Array.from({ length: 11 }, (_, i) => `${MAP_HOME} ${i + 1}`).filter((name) => !have.some((a) => a.name === name));
  if (missing.length) await db.insert(s.account).values(missing.map((displayName) => ({ displayName })));
  const mapHomes = await db.select({ id: s.account.id, name: s.account.displayName }).from(s.account).where(like(s.account.displayName, `${MAP_HOME} %`));
  const samples = await db.select({ id: s.account.id, name: s.account.displayName }).from(s.account).where(like(s.account.displayName, "Sample household %"));
  const [community] = await db.select({ id: s.account.id }).from(s.account).where(eq(s.account.displayName, "Community sample")).limit(1);
  const numbered = (rows: { id: string; name: string }[], n: number) => rows.find((r) => r.name.endsWith(` ${n}`))?.id;
  const daysAgo = (n: number) => new Date(startOfDay(addDays(today, -n)).getTime() + 10 * HOUR);
  /* area, household, days ago it joined, welcome line of the first household */
  const places: { area: string; accountId: string | undefined; ago: number; welcome?: string }[] = [
    /* 400: the demo family joined after five sample households. The first of them is the lamp-lighter. */
    { area: "400", accountId: numbered(samples, 1), ago: 60, welcome: "not_alone" },
    ...[2, 3, 4, 5].map((n) => ({ area: "400", accountId: numbered(samples, n), ago: 60 - n * 7 })),
    { area: "400", accountId: home, ago: 9 },
    /* 411: exactly the minimum */
    ...[1, 2, 3, 4, 5].map((n) => ({ area: "411", accountId: numbered(mapHomes, n), ago: 50 - n * 6, ...(n === 1 ? { welcome: "hello" } : {}) })),
    /* 560 */
    ...[6, 7, 8, 9, 10, 11].map((n) => ({ area: "560", accountId: numbered(mapHomes, n), ago: 45 - n * 3 })),
    /* 110: two households, below the minimum. Nobody is shown this area. */
    { area: "110", accountId: numbered(samples, 6), ago: 14 },
    { area: "110", accountId: community?.id, ago: 11 },
  ];
  const rows = places.flatMap((p) => (p.accountId ? [{ accountId: p.accountId, area: p.area, joinedAt: daysAgo(p.ago), welcome: p.welcome ?? null, joinedBy: p.accountId === home ? guardian?.id ?? null : null }] : []));
  const placed = rows.length ? await db.insert(s.mapPlace).values(rows).onConflictDoNothing().returning({ accountId: s.mapPlace.accountId }) : [];

  console.log(`People: duet ${paired ? "kept" : "made"}, ${logged} care days added; rounds ${closed.made ? "made" : "kept"} and ${open.made ? "made" : "kept"}; ${placed.length} households put on the map.`);
}

if (/scripts[\\/]seed[\\/]people\.ts$/.test(process.argv[1] ?? "")) seedPeople().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
