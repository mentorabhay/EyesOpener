/**
 * Seeds the demo family and sample community data. Safe to run again: it clears the demo rows first.
 * Every number here is sample data for development, not a measurement.
 *   npm run db:seed
 */
import "./env";
import { eq, sql } from "drizzle-orm";
import { db, schema as s } from "../src/db";
import { derive, type Measured } from "../src/engine";

const DAY = 86_400_000;
const key = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
const ago = (days: number, hour = 17) => { const d = new Date(Date.now() - days * DAY); d.setHours(hour, 0, 0, 0); return d; };
const monday = (d = new Date()) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return key(x); };

async function main() {
  await db.execute(sql`truncate table ${s.appUser}, ${s.account}, ${s.sponsor} cascade`);
  for (const t of [s.hazardRule, s.league, s.focusWall, s.glassesPair, s.blogPost, s.setting, s.aiCall, s.moderationItem, s.auditLog]) await db.delete(t);

  /* households */
  const [family, others] = await db.insert(s.account).values([{ displayName: "Sharma family", isDemo: true }, { displayName: "Community sample" }]).returning();

  /* people who sign in, one of each kind (demo sign-in lists them) */
  const person = (email: string, displayName: string, more: Partial<typeof s.appUser.$inferInsert> = {}) => ({ email, displayName, ...more });
  const [priya_u, , , opsUser, , , counsellor, , sponsorOwner, schoolOwner] = await db.insert(s.appUser).values([
    person("priya@iopener.test", "Priya Sharma", { accountId: family.id, seat: "guardian" }),
    person("raj@iopener.test", "Raj Sharma", { accountId: family.id, seat: "co_guardian" }),
    person("nani@iopener.test", "Nani", { accountId: family.id, seat: "circle" }),
    person("ops@iopener.test", "Meera (ops team)", { staffRole: "ops" }),
    person("admin@iopener.test", "Asha (admin)", { staffRole: "super_admin" }),
    person("content@iopener.test", "Kabir (content)", { staffRole: "content" }),
    person("drrao@iopener.test", "Dr Rao (sample counsellor)", { isCounsellor: true, counsellorVerifiedAt: new Date() }),
    person("drnew@iopener.test", "Dr Iyer (waiting for checks)", { isCounsellor: true }),
    person("anita@iopener.test", "Anita (Sunrise Eye Foundation)"),
    person("principal@iopener.test", "Mr Das (Hillview School)"),
    person("sample@iopener.test", "Community sample", { accountId: others.id, seat: "guardian" }),
  ]).returning();

  /* sponsors: one approved with a group of families, one waiting for ops */
  const [sunrise, hillview] = await db.insert(s.sponsor).values([
    { name: "Sunrise Eye Foundation", kind: "ngo", city: "Mumbai", about: "Free eye checks and glasses for school children.", status: "approved", approvedBy: opsUser.id, approvedAt: new Date() },
    { name: "Hillview School", kind: "school", city: "Pune", about: "Wants to offer IOpener to its primary classes." },
  ]).returning();
  await db.insert(s.sponsorUser).values([{ sponsorId: sunrise.id, userId: sponsorOwner.id, role: "owner" }, { sponsorId: hillview.id, userId: schoolOwner.id, role: "owner" }]);
  const [group] = await db.insert(s.sponsorGroup).values({ sponsorId: sunrise.id, name: "Sunrise families 2026", code: "SUNRISE1" }).returning();
  const groupHomes = await db.insert(s.account).values(Array.from({ length: 6 }, (_, i) => ({ displayName: `Sample household ${i + 1}` }))).returning();
  await db.insert(s.sponsorGroupMember).values([family, ...groupHomes].map((a) => ({ groupId: group.id, accountId: a.id })));
  const groupKids = await db.insert(s.profile).values(groupHomes.map((a, i) => ({ accountId: a.id, displayName: `Child ${i + 1}`, kind: "child" as const, birthYear: new Date().getFullYear() - 7, accessLevel: 1 }))).returning();
  await db.insert(s.daySummary).values(groupKids.flatMap((k, i) => Array.from({ length: 7 }, (_, d) => ({ profileId: k.id, day: key(ago(d)), trainMinutes: (i + d) % 4 === 0 ? 0 : 60, trainGoal: 60 }))));

  const year = new Date().getFullYear();
  const [aarav, priya, dadi] = await db.insert(s.profile).values([
    { accountId: family.id, displayName: "Aarav", kind: "child", birthYear: year - 6, accessLevel: 1 },
    { accountId: family.id, displayName: "Priya", kind: "adult", accessLevel: 0 },
    { accountId: family.id, displayName: "Dadi", kind: "adult", birthYear: year - 68, accessLevel: 0 },
  ]).returning();
  const [zoya, kochiDad] = await db.insert(s.profile).values([
    { accountId: others.id, displayName: "Zoya", kind: "child", birthYear: year - 9, accessLevel: 1 },
    { accountId: others.id, displayName: "A dad in Kochi", kind: "adult" },
  ]).returning();

  const [laptop] = await db.insert(s.device).values([
    { accountId: family.id, kind: "web", label: "Family laptop", pxPerCm: 37.8, distanceCm: 60 },
    { accountId: family.id, kind: "tv", label: "Living-room TV", pxPerCm: 15, distanceCm: 200 },
  ]).returning();

  await db.insert(s.consent).values({ profileId: aarav.id, accountId: family.id, userId: priya_u.id, kind: "parental", textVersion: "2026-10" });

  /* eye profiles, derived by the engine from sample measurements */
  const measured: Record<string, Measured> = {
    [aarav.id]: { tested: true, ppc: 37.8, dist: 60, eyes: { L: { va: 0.5, cs: 1.35, q: [true, true, false, false], note: "" }, R: { va: 0, cs: 1.65, q: [true, false, false, false], note: "" } }, bal: { x: -0.82, cyanEye: "L" } },
    [dadi.id]: { tested: true, ppc: 37.8, dist: 60, eyes: { L: { va: 0.3, cs: 1.2, q: [true, false, false, false], note: "" }, R: { va: 0.3, cs: 1.2, q: [true, false, false, false], note: "" } }, bal: { x: 0, cyanEye: "L" } },
  };
  for (const [profileId, m] of Object.entries(measured)) {
    const d = derive(m);
    await db.insert(s.onboardingRun).values({ profileId, deviceId: laptop.id, answers: { left: m.eyes.L.q, right: m.eyes.R.q }, leftSeconds: 104, rightSeconds: 96, finishedAt: new Date() });
    await db.insert(s.eyeProfile).values({
      profileId, deviceId: laptop.id, weakEye: d.weak ? (d.weak === "L" ? "left" : "right") : null, cyanEye: d.cyanEye === "L" ? "left" : "right",
      strongContrast: d.con, balanceLogRatio: m.bal?.x ?? null, letterCm: d.letterCm, targetCm: d.targetCm, appTextPx: d.appPx, faintText: d.faint, flags: d.flags,
    });
  }

  /* six weeks of check-ups for Aarav; the first row of each test is the baseline */
  const weekly = (testKey: string, unit: string, eye: "left" | "right" | null, values: number[]) =>
    values.map((value, i) => ({ profileId: aarav.id, deviceId: laptop.id, testKey, unit, eye, value, isBaseline: i === 0, takenAt: ago((values.length - 1 - i) * 7, 18) }));
  await db.insert(s.testResult).values([
    ...weekly("acuity", "logMAR", "left", [0.7, 0.66, 0.6, 0.58, 0.52, 0.5]),
    ...weekly("acuity", "logMAR", "right", [0, 0, 0, 0, 0, 0]),
    ...weekly("balance", "log_ratio", null, [-1, -0.95, -0.9, -0.88, -0.85, -0.82]),
    ...weekly("fusion_break", "prism_dioptre", null, [11, 12, 14, 15, 17, 18]),
    ...weekly("fusion_recovery", "prism_dioptre", null, [7, 8, 10, 11, 13, 14]),
    { profileId: aarav.id, deviceId: laptop.id, testKey: "contrast", unit: "logCS", eye: "left" as const, value: 1.35, isBaseline: true, takenAt: ago(35, 18) },
    { profileId: aarav.id, deviceId: laptop.id, testKey: "contrast", unit: "logCS", eye: "right" as const, value: 1.65, isBaseline: true, takenAt: ago(35, 18) },
  ]);

  await db.insert(s.enrolment).values({ profileId: aarav.id, programme: "lazy-eye", dailyMinutes: 60, daysPerWeek: 6, week: 6 });
  await db.insert(s.counsellorLink).values({ profileId: aarav.id, counsellorId: counsellor.id, status: "pending" });

  /* the last week: one missed day, today partly done */
  const train = [45, 60, 60, 0, 60, 60, 60];
  for (let i = 0; i < 7; i++) {
    const t = train[i];
    await db.insert(s.daySummary).values({ profileId: aarav.id, day: key(ago(i)), restBreaks: i === 0 ? 5 : 6 - (i % 2), restGoal: 6, trainMinutes: t, trainGoal: 60, lightMinutes: i === 0 ? 54 : 70 + i * 6, lightGoal: 90, screenMinutes: 150 + i * 12 });
    if (t > 0) await db.insert(s.session).values([
      { profileId: aarav.id, deviceId: laptop.id, kind: "film", itemSlug: "two-eye-cinema", ring: "train", minutes: Math.min(t, 28), strongContrast: 0.15, endReason: "done", startedAt: ago(i, 17), endedAt: ago(i, 17) },
      { profileId: aarav.id, deviceId: laptop.id, kind: "game", itemSlug: "firefly-catch", ring: "train", minutes: Math.max(0, t - 28), strongContrast: 0.15, score: 30 + i * 4, endReason: i === 0 ? "left" : "done", startedAt: ago(i, 18), endedAt: ago(i, 18) },
    ]);
  }
  await db.insert(s.daySummary).values({ profileId: priya.id, day: key(new Date()), restBreaks: 3, restGoal: 6, lightMinutes: 20, lightGoal: 60, screenMinutes: 310 });
  await db.insert(s.streak).values([{ profileId: aarav.id, current: 23, longest: 23, lastDay: key(new Date()), lights: 2 }, { profileId: zoya.id, current: 41, longest: 41, lastDay: key(new Date()), lights: 1 }]);
  await db.insert(s.lightGift).values({ fromProfileId: zoya.id, toProfileId: aarav.id, note: "Exam week. We know how it goes.", forDay: key(ago(3)) });

  /* league */
  const [league] = await db.insert(s.league).values({ name: "Show-up league", programme: "lazy-eye", ageBand: "6 to 9" }).returning();
  const teams = await db.insert(s.team).values(["Team Mango", "Starfish", "Sharma family", "Kite Club", "Night Owls"].map((name) => ({ leagueId: league.id, name }))).returning();
  await db.insert(s.teamMember).values({ teamId: teams[2].id, profileId: aarav.id });
  await db.insert(s.teamWeek).values(teams.map((t, i) => ({ teamId: t.id, weekStart: monday(), daysFinished: [6, 6, 5, 5, 4][i], daysPossible: 6 })));

  /* evidence engine */
  const [blinkStory] = await db.insert(s.story).values({ profileId: priya.id, body: "My eyes burned by four every afternoon. A colleague told me to do ten slow, full blinks at the top of each hour. After a month the burning mostly stopped.", status: "published" }).returning();
  const [blink, beads] = await db.insert(s.protocol).values([
    { storyId: blinkStory.id, profileId: priya.id, title: "Ten full blinks, every hour", forWhom: "Adults with dry, tired eyes at a screen", doWhat: "Ten slow, full blinks at the top of every hour", howMuch: "Every working hour, for 4 weeks", weeks: 4, moves: "symptoms", step: "signal", status: "published", publishedAt: ago(60) },
    { profileId: kochiDad.id, title: "Bead threading while patched", forWhom: "Children with a patch, ages 4 to 8", doWhat: "Thread beads during patch time", howMuch: "20 minutes a day, for 6 weeks", weeks: 6, moves: "acuity", step: "protocol", status: "published", publishedAt: ago(9) },
    { profileId: kochiDad.id, title: "Pencil push-ups before homework", forWhom: "Children who see double when reading", doWhat: "Bring a pencil slowly to the nose, 15 times", howMuch: "Once a day before homework, for 6 weeks", weeks: 6, moves: "near_point", step: "protocol", status: "in_review" },
  ]).returning();
  const [pencil] = await db.select().from(s.protocol).where(eq(s.protocol.status, "in_review"));
  if (pencil) await db.insert(s.moderationItem).values({ kind: "protocol", refId: pencil.id, reason: "New idea waiting for review" });
  await db.insert(s.dataRequest).values({ accountId: others.id, kind: "export" });
  const [exp] = await db.insert(s.experiment).values({ protocolId: blink.id }).returning();
  await db.insert(s.experimentSignal).values({ experimentId: exp.id, nTried: 64, nControl: 58, changeTried: -6.1, changeControl: -1.2, low: -7.9, high: -1.9 });
  await db.insert(s.experiment).values({ protocolId: beads.id });
  await db.insert(s.hazardRule).values([
    { pattern: "look(ing)? at the sun|sun ?gazing", reason: "Looking at the sun damages the retina." },
    { pattern: "stop (wearing|using) (your |the )?(glasses|spectacles|patch)", reason: "Stopping prescribed glasses or patching needs an eye doctor." },
    { pattern: "press(ing)? on (the|your) eye|eye massage", reason: "Pressing on the eye can harm it." },
    { pattern: "eye ?drops?|atropine|castor oil|honey in", reason: "Anything put in the eye needs an eye doctor." },
    { pattern: "flash(ing)? light|strobe", reason: "Flashing light can trigger seizures." },
  ]);

  /* community ideas */
  await db.insert(s.aheadNote).values([
    { profileId: kochiDad.id, programme: "lazy-eye", week: 3, body: "The glasses felt silly for a week. Then he started asking for his cartoon hour himself.", signature: "A dad in Kochi, now at week 9", status: "published" },
    { profileId: zoya.id, programme: "lazy-eye", week: 3, body: "Split the hour in three. After school, before dinner, before bed.", signature: "A mum in Pune, now at week 7", status: "published" },
    { profileId: zoya.id, programme: "lazy-eye", week: 8, body: "Week eight is when the letter test moved for us. Keep going.", signature: "A family in Jaipur, now at week 12", status: "published" },
  ]);
  await db.insert(s.fusionMail).values({ fromProfileId: dadi.id, toProfileId: aarav.id, fromName: "Dadi", body: "WELL DONE\nI AM PROUD\nOF YOU" });
  const [wall] = await db.insert(s.focusWall).values({ month: key(new Date()).slice(0, 7), title: "Kite over the hills", artist: "Meera, 8", tiles: 32 }).returning();
  await db.insert(s.focusTile).values(Array.from({ length: 32 }, (_, i) => i).filter((i) => (i * 7) % 10 < 7).map((idx) => ({ wallId: wall.id, idx, profileId: idx % 3 === 0 ? aarav.id : null })));
  const [pair] = await db.insert(s.glassesPair).values({ code: "0412", sponsorId: sunrise.id }).returning();
  await db.insert(s.glassesLeg).values([
    { pairId: pair.id, displayName: "Ishaan, 7", city: "Pune", status: "finished", startedAt: ago(400), finishedAt: ago(310) },
    { pairId: pair.id, displayName: "Meera, 8", city: "Kochi", status: "finished", startedAt: ago(300), finishedAt: ago(215) },
    { pairId: pair.id, displayName: "Kabir, 6", city: "Indore", status: "finished", startedAt: ago(210), finishedAt: ago(120) },
    { pairId: pair.id, profileId: zoya.id, displayName: "Zoya, 9", city: "Jaipur", status: "passed_on", note: "They are lucky glasses. Look after them.", startedAt: ago(115), finishedAt: ago(45) },
    { pairId: pair.id, profileId: aarav.id, displayName: "Aarav, 6", city: "Mumbai", status: "wearing", startedAt: ago(40) },
  ]);

  await db.insert(s.setting).values({ key: "saver_mode", value: false });

  const counts = await Promise.all(([["account", s.account], ["appUser", s.appUser], ["sponsor", s.sponsor], ["profile", s.profile], ["testResult", s.testResult], ["session", s.session], ["protocol", s.protocol]] as const).map(async ([n, t]) => `${n} ${(await db.select({ c: sql<number>`count(*)::int` }).from(t))[0].c}`));
  console.log("Seeded:", counts.join(", "));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
