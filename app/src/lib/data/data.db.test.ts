// Eyes Opener: The proof, against a real database, that a family's copy is complete and private and that a deletion leaves nothing.
/**
 * The proof, against a real database, that a family's copy is complete and private and that a deletion leaves nothing.
 *
 * It makes three throwaway households with a row in every table a household can own:
 *   "gone"  is deleted whole. Afterwards every column of every table is searched for its ids and its words.
 *   "stay"  shares things with it (lights, an experiment, a counsellor) and must be left as it was.
 *   "rest"  has one of its two profiles deleted.
 * It never touches the demo family or anyone else's rows, and it removes everything it made.
 *
 * It needs a database with the current tables. Where none answers (the checks on GitHub have none), it is skipped.
 */
import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  try { process.loadEnvFile(".env.local"); } catch { /* no file: the default address is used */ }
  /* Sign-in is treated as not set up here, so a deletion queues nothing for the sign-in service and the search below
     stays a search of the household's own rows. The queue has its own test: src/lib/signin/flow.db.test.ts. */
  delete process.env.FIREBASE_PROJECT_ID;
});

import { and, eq, inArray, like, or, sql } from "drizzle-orm";
import { programmes } from "@/data";
import { db, schema as s } from "@/db";
import { memberCan, type MemberAction, type Seat } from "@/lib/roles";
import type { Member } from "@/lib/session";
import { eraseHousehold } from "./erase";
import { buildFamilyFile, OTHER_PERSON_COLUMNS, type FamilyFile } from "./export";
import { ownedWhere, tableOf, type Scope } from "./owned";
import { askForCopy, askForDeletion, cancelDeletion, carryOut, copyToDownload, DELETED_HOUSEHOLD, DELETED_PROFILE } from "./requests";
import { addDays, COPY_DAYS, WAIT_DAYS } from "./state";
import { summarise } from "./summary";
import { PARTS, ruleFor, TABLE_NAMES, type TableName } from "./tables";

const up = await db.execute(sql`select delete_after from data_request limit 0`).then(() => true, () => false);
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

/* Words no other row in the database can hold. */
const x = crypto.randomBytes(5).toString("hex");
const GONE = `zz-gone-${x}`, STAY = `zz-stay-${x}`, GIFT = `zz-gift-${x}`, ONE = `zz-one-${x}`, REST = `zz-rest-${x}`, SHARED = `zz-shared-${x}`;
/* The titles of the two published ideas. A family that joins another family's experiment sees that idea's title, so each title may show up in the other's file. */
const IDEA_GONE = `Idea zz-idea-gone-${x}`, IDEA_STAY = `Idea zz-idea-stay-${x}`;
/** Every word that belongs to the household "gone" alone. */
const GONE_WORDS = [GONE, `zz-idea-gone-${x}`];
const TARA = `Tara${x}`, ZED = `Zed${x}`, KIRAN = `Kiran${x}`, RAO = `Dr Test ${x}`;
const email = (who: string) => `${who}-${x}@iopener.test`;
const DAY = "2026-09-01";
/* The job's clock in this test. Audit lines it writes carry these exact times, which is how they are found and removed. */
const runAt = new Date(Math.floor(Date.now() / 1000) * 1000 + 137), runAt2 = new Date(runAt.getTime() + 1), runAt3 = new Date(runAt.getTime() + 2);

type Id = { id: string };
const member = (accountId: string, userId: string, profiles: Id[], seat: Seat, childMode = false) =>
  ({ account: { id: accountId }, user: { id: userId }, profiles, can: (a: MemberAction) => memberCan(seat, a, childMode) }) as unknown as Member;

const count = async (name: TableName, scope: Scope) => {
  const where = ownedWhere(name, scope);
  return where ? (await db.select({ n: sql<number>`count(*)::int` }).from(tableOf(name)).where(where))[0].n : 0;
};
const owned = TABLE_NAMES.filter((n) => ruleFor(n).owner);
async function snapshot(scope: Scope) {
  const out: Record<string, number> = {};
  for (const name of owned) out[name] = await count(name, scope);
  return out;
}

/** Searches every uuid column for the ids, and every text and JSON column for the ids and the words. Answers "table.column" with the number of rows found. */
let columns: { table: string; column: string; type: string }[] = [];
async function scan(ids: string[], words: string[]) {
  const pattern = [...ids, ...words].join("|"), hits: Record<string, number> = {};
  for (const table of [...new Set(columns.map((c) => c.table))]) {
    const cols = columns.filter((c) => c.table === table && (c.type !== "uuid" || ids.length));
    if (!cols.length) continue;
    const picks = cols.map((c, i) => {
      const col = sql.raw(`"${c.column}"`);
      return c.type === "uuid" ? sql`count(*) filter (where ${col} in ${ids}) as ${sql.raw(`c${i}`)}` : sql`count(*) filter (where ${col}::text ~ ${pattern}) as ${sql.raw(`c${i}`)}`;
    });
    const [row] = (await db.execute(sql`select ${sql.join(picks, sql`, `)} from ${sql.raw(`"${table}"`)}`)).rows as Record<string, string>[];
    cols.forEach((c, i) => { if (Number(row[`c${i}`]) > 0) hits[`${table}.${c.column}`] = Number(row[`c${i}`]); });
  }
  return hits;
}

describe.skipIf(!up)("a family's copy and a family's deletion, against the database", () => {
  /* Everything the test makes. `goneIds` are the ids that must be nowhere after the household "gone" is deleted. */
  const goneIds: string[] = [], oneIds: string[] = [], auditIds: string[] = [];
  const made: Partial<Record<TableName, number>> = {};
  const note = <T extends Id>(name: TableName, rows: T[], into = goneIds) => { made[name] = (made[name] ?? 0) + rows.length; into.push(...rows.map((r) => r.id)); return rows; };
  const tally = (name: TableName, n = 1) => { made[name] = (made[name] ?? 0) + n; };

  let staff: Id, counsellor: Id, league: Id, team: Id, wall: Id, pair: Id, sponsor: Id, group: Id, round: Id, question: Id;
  let A: Id, PV: Id, gA: Id & { email: string }, cA: Id, K: Id & { email: string }, P1: Id, P2: Id, EA: Id, askA: Id;
  let B: Id, gB: Id & { email: string }, Q1: Id, EB: Id, linkKB: Id, auditB: Id, welcomeB: Id, keeperAskB: Id;
  let C: Id, gC: Id & { email: string }, cC: Id, R1: Id, R2: Id;
  let scopeA: Scope, scopeB: Scope;
  let demo: { id: string; profiles: number; sessions: number } | null = null;
  const demoCounts = async (id: string) => ({
    profiles: (await db.select({ n: sql<number>`count(*)::int` }).from(s.profile).where(eq(s.profile.accountId, id)))[0].n,
    sessions: (await db.select({ n: sql<number>`count(*)::int` }).from(s.session).innerJoin(s.profile, eq(s.profile.id, s.session.profileId)).where(eq(s.profile.accountId, id)))[0].n,
  });

  beforeAll(async () => {
    columns = ((await db.execute(sql`select table_name, column_name, data_type from information_schema.columns
      where table_schema = 'public' and data_type in ('uuid', 'text', 'character varying', 'jsonb', 'json') order by 1, 2`)).rows as Record<string, string>[])
      .map((r) => ({ table: r.table_name, column: r.column_name, type: r.data_type }));
    const [d] = await db.select({ id: s.account.id }).from(s.account).where(eq(s.account.isDemo, true)).limit(1);
    if (d) demo = { id: d.id, ...(await demoCounts(d.id)) };

    /* ── things shared by everyone: not a household's, and they must survive ── */
    [staff, counsellor] = await db.insert(s.appUser).values([
      { email: email("staff"), displayName: `Staff ${SHARED}`, staffRole: "ops" },
      { email: email("counsellor"), displayName: RAO, isCounsellor: true, counsellorVerifiedAt: new Date() },
    ]).returning();
    [league] = await db.insert(s.league).values({ name: `League ${SHARED}`, programme: "lazy-eye", ageBand: "5-8" }).returning();
    [team] = await db.insert(s.team).values({ leagueId: league.id, name: `Team ${SHARED}` }).returning();
    [wall] = await db.insert(s.focusWall).values({ month: `zz-${x}`, title: `Wall ${SHARED}`, artist: "Nobody" }).returning();
    [pair] = await db.insert(s.glassesPair).values({ code: `ZZ-${x}` }).returning();
    [sponsor] = await db.insert(s.sponsor).values({ name: `Sponsor ${SHARED}`, kind: "ngo", status: "approved" }).returning();
    [group] = await db.insert(s.sponsorGroup).values({ sponsorId: sponsor.id, name: `Group ${SHARED}`, code: `ZZ${x}`.toUpperCase() }).returning();
    [round] = await db.insert(s.discoveryRound).values({ title: `Round ${SHARED}`, closesOn: DAY, createdBy: staff.id }).returning();
    [question] = await db.insert(s.discoveryQuestion).values({ roundId: round.id, question: `Question ${SHARED}`, why: `Why ${SHARED}`, createdBy: staff.id }).returning();

    /* ── the household that stays ── */
    [B] = await db.insert(s.account).values({ displayName: `${STAY} family` }).returning();
    [gB] = await db.insert(s.appUser).values({ email: email("stay"), displayName: `Guardian ${STAY}`, accountId: B.id, seat: "guardian" }).returning();
    [Q1] = await db.insert(s.profile).values({ accountId: B.id, displayName: ZED, kind: "child", birthYear: 2018 }).returning();
    await db.insert(s.consent).values({ profileId: Q1.id, accountId: B.id, userId: gB.id, kind: "parental", textVersion: "test" });
    const [dB] = await db.insert(s.device).values({ accountId: B.id, kind: "web", label: `Laptop ${STAY}`, pxPerCm: 40, distanceCm: 50 }).returning();
    await db.insert(s.session).values({ profileId: Q1.id, deviceId: dB.id, kind: "game", itemSlug: "firefly-catch", ring: "train", minutes: 5, detail: { hits: 3 } });
    const [tB] = await db.insert(s.testResult).values({ profileId: Q1.id, testKey: "acuity", eye: "left", value: 0.2, unit: "logMAR", note: STAY }).returning();
    const [storyB] = await db.insert(s.story).values({ profileId: Q1.id, body: `Story ${STAY}` }).returning();
    const [ideaB] = await db.insert(s.protocol).values({ profileId: Q1.id, storyId: storyB.id, title: IDEA_STAY, forWhom: STAY, doWhat: STAY, howMuch: STAY, weeks: 4, moves: "acuity", status: "published" }).returning();
    [EB] = await db.insert(s.experiment).values({ protocolId: ideaB.id }).returning();
    await db.insert(s.experimentSignal).values({ experimentId: EB.id, nTried: 5, nControl: 5, changeTried: 0.1, changeControl: 0, low: 0, high: 0.2 });
    await db.insert(s.moderationItem).values({ kind: "story", refId: storyB.id, reason: `Review ${STAY}`, reviewerId: staff.id });
    await db.insert(s.fusionMail).values({ fromUserId: gB.id, toProfileId: Q1.id, fromName: "Guardian", body: `MAIL ${STAY}` });
    const [askB] = await db.insert(s.dataRequest).values({ accountId: B.id, kind: "export", status: "ready", askedBy: gB.id, readyAt: runAt, expiresAt: addDays(runAt, COPY_DAYS) }).returning();
    await db.insert(s.enquiry).values({ kind: "other", name: `Guardian ${STAY}`, email: gB.email, message: `Message ${STAY}` });
    [auditB] = await db.insert(s.auditLog).values({ userId: staff.id, action: "admin.requests.done", target: askB.id, meta: { kind: "export", accountId: B.id, name: `${STAY} family` } }).returning();
    auditIds.push(auditB.id);
    /* package "rewards": this family left a welcome, which the other family received (see below) */
    const [courseB] = await db.insert(s.enrolment).values({ profileId: Q1.id, programme: "lazy-eye", dailyMinutes: 60, daysPerWeek: 6, week: 12, status: "finished", endedAt: runAt }).returning();
    [welcomeB] = await db.insert(s.keeperWelcome).values({ accountId: B.id, profileId: Q1.id, enrolmentId: courseB.id, programme: "lazy-eye", line: "not_alone", leftBy: gB.id, givenAt: runAt, thanks: "thank_you", thanksAt: runAt }).returning();

    /* ── the household that goes ── */
    [A] = note("account", await db.insert(s.account).values({ displayName: `${GONE} family`, exitPinHash: `hash-${GONE}` }).returning());
    [gA, cA, K] = await db.insert(s.appUser).values([
      { email: email("gone"), displayName: `Guardian ${GONE}`, accountId: A.id, seat: "guardian" as const, firebaseUid: `uid-${GONE}` },
      { email: email("cheer"), displayName: `Cheer ${GONE}`, accountId: A.id, seat: "circle" as const },
      /* A co-guardian who is also a counsellor to another family: she keeps her sign-in, so her name carries no word of this household. */
      { email: email("kiran"), displayName: KIRAN, accountId: A.id, seat: "co_guardian" as const, isCounsellor: true, counsellorVerifiedAt: new Date() },
    ]).returning();
    goneIds.push(gA.id, cA.id); tally("appUser", 3);
    note("invite", await db.insert(s.invite).values({ accountId: A.id, seat: "circle", code: `ZZ${x}IN`.toUpperCase(), status: "accepted", createdBy: gA.id, acceptedBy: cA.id }).returning());
    [P1, P2] = note("profile", await db.insert(s.profile).values([
      { accountId: A.id, displayName: TARA, kind: "child" as const, birthYear: 2019, pinHash: `hash-${GONE}`, accessLevel: 1 },
      { accountId: A.id, displayName: `Parent ${GONE}`, kind: "adult" as const },
    ]).returning());
    note("consent", await db.insert(s.consent).values({ profileId: P1.id, accountId: A.id, userId: gA.id, kind: "parental", textVersion: `v-${GONE}` }).returning());
    note("triage", await db.insert(s.triage).values({ profileId: P1.id, answers: { eye_pain: false, why: GONE }, outcome: "proceed" }).returning());
    const [dA] = note("device", await db.insert(s.device).values({ accountId: A.id, kind: "web", label: `Laptop ${GONE}`, pxPerCm: 38, distanceCm: 55 }).returning());
    note("onboardingRun", await db.insert(s.onboardingRun).values({ profileId: P1.id, deviceId: dA.id, answers: { left: [true], right: [false], tag: GONE }, leftSeconds: 90, rightSeconds: 80 }).returning());
    note("eyeProfile", await db.insert(s.eyeProfile).values({ profileId: P1.id, deviceId: dA.id, weakEye: "left", strongContrast: 0.15, letterCm: 1.2, targetCm: 0.8, appTextPx: 18, flags: { tag: GONE } }).returning());
    const [t1, t2, t3] = note("testResult", await db.insert(s.testResult).values([
      { profileId: P1.id, deviceId: dA.id, testKey: "acuity", eye: "left" as const, value: 0.4, unit: "logMAR", isBaseline: true, raw: { tag: GONE } },
      { profileId: P1.id, deviceId: dA.id, testKey: "acuity", eye: "left" as const, value: 0.3, unit: "logMAR", note: GONE },
      { profileId: P2.id, testKey: "near_point", value: 9, unit: "cm", note: GONE },
    ]).returning());
    const [courseA] = note("enrolment", await db.insert(s.enrolment).values({ profileId: P1.id, programme: programmes[0].slug, dailyMinutes: 60, daysPerWeek: 6, approvedBy: counsellor.id }).returning());
    note("session", await db.insert(s.session).values([
      { profileId: P1.id, deviceId: dA.id, kind: "game" as const, itemSlug: "firefly-catch", ring: "train" as const, minutes: 12.5, strongContrast: 0.15, score: 31, detail: { hits: 20, misses: 4, top: 3 }, endReason: "stop_rule", stopSymptom: `headache ${GONE}` },
      { profileId: P2.id, kind: "test" as const, itemSlug: "near_point", ring: "rest" as const, minutes: 2 },
    ]).returning());
    await db.insert(s.daySummary).values({ profileId: P1.id, day: DAY, trainMinutes: 12.5, trainGoal: 60 }); tally("daySummary");
    note("carePlan", await db.insert(s.carePlan).values({ profileId: P1.id, kind: "patch", perDay: 2, setBy: gA.id }).returning());
    note("careLog", await db.insert(s.careLog).values({ profileId: P1.id, day: DAY, kind: "patch", itemSlug: "patch-pal", minutes: 60, data: { tag: GONE }, confirmedBy: gA.id }).returning());
    note("monitorSample", await db.insert(s.monitorSample).values({ profileId: P2.id, distanceCm: 48, blinksPerMin: 11, posture: 0.7, minutesSinceBreak: 22 }).returning());
    await db.insert(s.streak).values({ profileId: P1.id, current: 3, longest: 5, lastDay: DAY, lights: 1 }); tally("streak");
    const [linkA] = note("counsellorLink", await db.insert(s.counsellorLink).values({ profileId: P1.id, counsellorId: counsellor.id, status: "active" }).returning());
    const [noteA] = note("counsellorNote", await db.insert(s.counsellorNote).values({ linkId: linkA.id, body: `Counsellor note ${GONE}` }).returning());
    const [storyA] = note("story", await db.insert(s.story).values({ profileId: P1.id, body: `Story ${GONE}`, status: "published" }).returning());
    const [ideaA] = note("protocol", await db.insert(s.protocol).values({ profileId: P1.id, storyId: storyA.id, title: IDEA_GONE, forWhom: GONE, doWhat: GONE, howMuch: GONE, weeks: 6, moves: "acuity", status: "published", hazard: { flagged: [GONE] } }).returning());
    [EA] = note("experiment", await db.insert(s.experiment).values({ protocolId: ideaA.id }).returning());
    note("experimentSignal", await db.insert(s.experimentSignal).values({ experimentId: EA.id, nTried: 6, nControl: 6, changeTried: 0.1, changeControl: 0.02, low: 0, high: 0.2 }).returning());
    note("experimentEnrolment", await db.insert(s.experimentEnrolment).values([
      { experimentId: EA.id, profileId: P1.id, arm: "tried" as const, baselineId: t1.id, followupId: t2.id },
      { experimentId: EB.id, profileId: P2.id, arm: "control" as const, baselineId: t3.id },
    ]).returning());
    /* The other family joined this family's experiment. Its place in it falls with the experiment; its check-up stays. */
    goneIds.push((await db.insert(s.experimentEnrolment).values({ experimentId: EA.id, profileId: Q1.id, arm: "control", baselineId: tB.id }).returning())[0].id);
    const [weekNote] = note("aheadNote", await db.insert(s.aheadNote).values({ profileId: P1.id, programme: "lazy-eye", week: 3, body: `Week note ${GONE}`, signature: `Sig ${GONE}` }).returning());
    const mails = note("fusionMail", await db.insert(s.fusionMail).values([
      { fromUserId: gA.id, toProfileId: P1.id, fromName: `G${GONE}`, body: `MAIL ONE ${GONE}` },
      { fromUserId: gA.id, fromProfileId: P2.id, toProfileId: P1.id, fromName: `P${GONE}`, body: `MAIL TWO ${GONE}` },
      { fromUserId: cA.id, toProfileId: P1.id, fromName: `C${GONE}`, body: `MAIL THREE ${GONE}` },
    ]).returning());
    const review = note("moderationItem", await db.insert(s.moderationItem).values([
      { kind: "story", refId: storyA.id, reason: `Review ${GONE}`, reviewerId: staff.id, status: "approved" as const },
      { kind: "protocol", refId: ideaA.id, reason: `Review ${GONE}`, aiFlag: { tag: GONE } },
      { kind: "note", refId: weekNote.id, reason: `Review ${GONE}` },
      { kind: "mail", refId: mails[2].id, reason: `Review ${GONE}` },
    ]).returning());
    await db.insert(s.teamMember).values({ teamId: team.id, profileId: P1.id }); tally("teamMember");
    note("teamMove", await db.insert(s.teamMove).values({ profileId: P1.id, kind: "join", toTeamId: team.id }).returning());
    note("lightGift", await db.insert(s.lightGift).values([
      { fromProfileId: P1.id, toProfileId: Q1.id, note: `Out ${GIFT}`, forDay: DAY },
      { fromProfileId: Q1.id, toProfileId: P1.id, note: `In ${GIFT}`, forDay: DAY },
    ]).returning());
    await db.insert(s.focusTile).values({ wallId: wall.id, idx: 0, profileId: P1.id }); tally("focusTile");
    await db.insert(s.galleryUnlock).values({ profileId: P1.id, itemSlug: `art-${GONE}` }); tally("galleryUnlock");
    note("glassesLeg", await db.insert(s.glassesLeg).values({ pairId: pair.id, profileId: P1.id, displayName: `Leg ${GONE}`, city: `City ${GONE}`, status: "wearing", note: `Note ${GONE}` }).returning());
    note("hero", await db.insert(s.hero).values({ profileId: P1.id, sprite: { outline: [1, 2, 3], tag: GONE } }).returning());
    note("pushToken", await db.insert(s.pushToken).values({ accountId: A.id, token: `token-${GONE}`, platform: "android" }).returning());
    await db.insert(s.sponsorGroupMember).values({ groupId: group.id, accountId: A.id }); tally("sponsorGroupMember");
    /* package "people": a duet of the child and the cheer seat, a vote on the Discovery Board, a place on the map */
    note("duet", await db.insert(s.duet).values({ accountId: A.id, aProfileId: P1.id, bUserId: cA.id, startedOn: DAY, createdBy: gA.id }).returning());
    await db.insert(s.discoveryVote).values({ roundId: round.id, profileId: P1.id, questionId: question.id }); tally("discoveryVote");
    await db.insert(s.mapPlace).values({ accountId: A.id, area: "411", joinedBy: gA.id, welcome: "hello" }); tally("mapPlace");
    /* package "gatherings": a class mission that was run, and a wish with the review item that points at it */
    note("classMission", await db.insert(s.classMission).values({ profileId: P1.id, givenBy: gA.id, doneOn: DAY }).returning());
    const [wishA] = note("wish", await db.insert(s.wish).values({ accountId: A.id, profileId: P1.id, code: `W-${GONE}`, loves: "trains", play: "steer", line: `Wish ${GONE}`, gameName: `Game ${GONE}`, createdBy: gA.id }).returning());
    note("moderationItem", await db.insert(s.moderationItem).values({ kind: "wish", refId: wishA.id, reason: `Review ${GONE}` }).returning());
    /* package "clips": a clip that was finished on the household's screen */
    note("clipRun", await db.insert(s.clipRun).values({ accountId: A.id, profileId: P1.id, deviceId: dA.id, code: "C06", outcome: "fail", detail: { scene: "edges", answers: [1], tag: GONE }, setKey: "screen" }).returning());
    /* package "rewards": the day a Depth check-up first found depth; a welcome this family left, which the other family
       received and thanked for; and the welcome this family received from the other one. The two families' rows point
       at each other only through `keeper_ask.welcome_id`. */
    await db.insert(s.depthDay).values({ profileId: P1.id, day: DAY, arcsec: 800, playedAt: runAt }); tally("depthDay");
    const [welcomeA] = note("keeperWelcome", await db.insert(s.keeperWelcome).values({ accountId: A.id, profileId: P1.id, enrolmentId: courseA.id, programme: "lazy-eye", line: "split_it", leftBy: gA.id, givenAt: runAt, thanks: "it_helped", thanksAt: runAt }).returning());
    note("keeperAsk", await db.insert(s.keeperAsk).values({ accountId: A.id, profileId: P1.id, enrolmentId: courseA.id, programme: "lazy-eye", askedBy: gA.id, welcomeId: welcomeB.id, line: "not_alone", receivedAt: runAt, thanks: "thank_you", thanksAt: runAt }).returning());
    [keeperAskB] = await db.insert(s.keeperAsk).values({ accountId: B.id, profileId: Q1.id, enrolmentId: courseB.id, programme: "lazy-eye", askedBy: gB.id, welcomeId: welcomeA.id, line: "split_it", receivedAt: runAt, thanks: "it_helped", thanksAt: runAt }).returning();
    const [copyA] = note("dataRequest", await db.insert(s.dataRequest).values({ accountId: A.id, kind: "export", status: "ready", askedBy: gA.id, readyAt: runAt, expiresAt: addDays(runAt, COPY_DAYS) }).returning());
    note("enquiry", await db.insert(s.enquiry).values({ kind: "other", name: `Guardian ${GONE}`, email: gA.email.toUpperCase(), message: `Message ${GONE}`, handledBy: staff.id }).returning());
    /* The co-guardian who stays wrote in as a counsellor. That message is hers and stays with her. */
    await db.insert(s.enquiry).values({ kind: "counsellor", name: KIRAN, email: K.email, message: `Counsellor enquiry ${SHARED}` });
    /* She is a counsellor to the other family. */
    [linkKB] = await db.insert(s.counsellorLink).values({ profileId: Q1.id, counsellorId: K.id, status: "active" }).returning();
    await db.insert(s.counsellorNote).values({ linkId: linkKB.id, body: `Note ${STAY}` });
    /* The guardian was once staff and still has a test household from then. It would be left pointing at nobody. */
    [PV] = await db.insert(s.account).values({ displayName: `Old test ${GONE}`, previewFor: gA.id }).returning();
    const [pvProfile] = await db.insert(s.profile).values({ accountId: PV.id, displayName: `Tester ${GONE}`, kind: "adult" }).returning();
    const [pvSession] = await db.insert(s.session).values({ profileId: pvProfile.id, kind: "game", itemSlug: "firefly-catch", ring: "train", minutes: 1 }).returning();
    goneIds.push(PV.id, pvProfile.id, pvSession.id);
    /* What staff and the counsellor did about this household: lines in the audit log that name it. */
    auditIds.push(...(await db.insert(s.auditLog).values([
      { userId: staff.id, action: "admin.requests.done", target: copyA.id, meta: { kind: "export", accountId: A.id, name: `${GONE} family` } },
      { userId: staff.id, action: "admin.moderation.approve", target: review[0].id, meta: { kind: "protocol", refId: ideaA.id, name: IDEA_GONE } },
      { userId: counsellor.id, action: "counsellor.note.add", target: noteA.id, meta: { linkId: linkA.id } },
      { userId: staff.id, action: "admin.staff.remove", target: gA.id, meta: { name: `Guardian ${GONE}`, from: "ops", nested: { deep: [P1.id] } } },
      { userId: gA.id, action: "admin.hazards.add", target: "rule", meta: { pattern: "old" } },
    ]).returning()).map((r) => r.id));

    scopeA = { accountId: A.id, profileIds: [P1.id, P2.id], personIds: [gA.id, cA.id, K.id], emails: [gA.email, email("cheer")] };
    scopeB = { accountId: B.id, profileIds: [Q1.id], personIds: [gB.id], emails: [gB.email] };

    /* ── the household that loses one profile ── */
    [C] = await db.insert(s.account).values({ displayName: `${REST} family` }).returning();
    [gC, cC] = await db.insert(s.appUser).values([
      { email: email("rest"), displayName: `Guardian ${REST}`, accountId: C.id, seat: "guardian" as const },
      { email: email("restcheer"), displayName: `Cheer ${REST}`, accountId: C.id, seat: "circle" as const },
    ]).returning();
    [R1, R2] = await db.insert(s.profile).values([
      { accountId: C.id, displayName: `Child ${ONE}`, kind: "child" as const, birthYear: 2017 },
      { accountId: C.id, displayName: `Adult ${REST}`, kind: "adult" as const },
    ]).returning();
    const [dC] = await db.insert(s.device).values({ accountId: C.id, kind: "web", label: `Laptop ${REST}`, pxPerCm: 40, distanceCm: 50 }).returning();
    const keep = <T extends Id>(rows: T[]) => { oneIds.push(...rows.map((r) => r.id)); return rows; };
    oneIds.push(R1.id);
    keep(await db.insert(s.consent).values({ profileId: R1.id, accountId: C.id, userId: gC.id, kind: "parental", textVersion: ONE }).returning());
    keep(await db.insert(s.session).values({ profileId: R1.id, deviceId: dC.id, kind: "game", itemSlug: "firefly-catch", ring: "train", minutes: 4, stopSymptom: ONE }).returning());
    keep(await db.insert(s.testResult).values({ profileId: R1.id, deviceId: dC.id, testKey: "acuity", value: 0.5, unit: "logMAR", note: ONE }).returning());
    const [linkC] = keep(await db.insert(s.counsellorLink).values({ profileId: R1.id, counsellorId: counsellor.id, status: "active" }).returning());
    keep(await db.insert(s.counsellorNote).values({ linkId: linkC.id, body: `Note ${ONE}` }).returning());
    const [storyC] = keep(await db.insert(s.story).values({ profileId: R1.id, body: `Story ${ONE}` }).returning());
    keep(await db.insert(s.moderationItem).values({ kind: "story", refId: storyC.id, reason: `Review ${ONE}` }).returning());
    keep(await db.insert(s.fusionMail).values([
      { fromUserId: gC.id, fromProfileId: R1.id, toProfileId: R2.id, fromName: "Child", body: `MAIL ${ONE}` },
      { fromUserId: gC.id, fromProfileId: R2.id, toProfileId: R1.id, fromName: "Adult", body: `MAIL TO CHILD ${ONE}` },
    ]).returning());
    await db.insert(s.focusTile).values({ wallId: wall.id, idx: 1, profileId: R1.id });
    keep(await db.insert(s.glassesLeg).values({ pairId: pair.id, profileId: R1.id, displayName: `Leg ${ONE}`, city: ONE, status: "finished" }).returning());
    await db.insert(s.teamMember).values({ teamId: team.id, profileId: R1.id });
    keep(await db.insert(s.hero).values({ profileId: R1.id, sprite: { tag: ONE } }).returning());
    /* package "rewards": the profile's depth day, and the welcome left for its finished course */
    await db.insert(s.depthDay).values({ profileId: R1.id, day: DAY, arcsec: 400 });
    const [courseC] = keep(await db.insert(s.enrolment).values({ profileId: R1.id, programme: "lazy-eye", dailyMinutes: 60, daysPerWeek: 6, week: 12, status: "finished", endedAt: runAt }).returning());
    keep(await db.insert(s.keeperWelcome).values({ accountId: C.id, profileId: R1.id, enrolmentId: courseC.id, programme: "lazy-eye", line: "glasses" }).returning());
    await db.insert(s.session).values({ profileId: R2.id, deviceId: dC.id, kind: "game", itemSlug: "firefly-catch", ring: "train", minutes: 7, stopSymptom: REST });
    await db.insert(s.testResult).values({ profileId: R2.id, deviceId: dC.id, testKey: "acuity", value: 0.1, unit: "logMAR", note: REST });
    await db.insert(s.fusionMail).values({ fromUserId: gC.id, toProfileId: R2.id, fromName: "Guardian", body: `MAIL ${REST}` });
  });

  async function cleanUp() {
    for (const home of [A, PV, B, C]) if (home) await db.transaction((tx) => eraseHousehold(tx, home.id));
    await db.delete(s.enquiry).where(like(sql`lower(${s.enquiry.email})`, `%-${x}@iopener.test`));
    if (auditIds.length) await db.delete(s.auditLog).where(inArray(s.auditLog.id, auditIds));
    await db.delete(s.auditLog).where(and(inArray(s.auditLog.action, [DELETED_HOUSEHOLD, DELETED_PROFILE]), inArray(s.auditLog.createdAt, [runAt, runAt2, runAt3])));
    await db.delete(s.appUser).where(like(s.appUser.email, `%-${x}@iopener.test`));
    if (sponsor) await db.delete(s.sponsor).where(eq(s.sponsor.id, sponsor.id));
    if (league) await db.delete(s.league).where(eq(s.league.id, league.id));
    if (wall) await db.delete(s.focusWall).where(eq(s.focusWall.id, wall.id));
    if (pair) await db.delete(s.glassesPair).where(eq(s.glassesPair.id, pair.id));
    if (round) await db.delete(s.discoveryRound).where(eq(s.discoveryRound.id, round.id));
  }
  afterAll(cleanUp);

  /* ───────────── the fixture itself ───────────── */

  it("gives the household a row in every table a household can own, and the list finds exactly those rows", async () => {
    const found = await snapshot(scopeA);
    for (const name of owned) expect(found[name], `the test household has no row in ${name}: add one to this test`).toBeGreaterThan(0);
    /* The rows the list calls the household's are the rows this test made: no fewer, and none of anyone else's. */
    expect(found).toEqual(Object.fromEntries(owned.map((n) => [n, made[n] ?? 0])));
  });

  /* ───────────── the copy ───────────── */

  describe("the copy", () => {
    let file: FamilyFile, json: string;
    beforeAll(async () => {
      file = (await buildFamilyFile(A.id, { id: gA.id, email: gA.email }, runAt))!;
      json = JSON.stringify(file, null, 1);
    });

    it("is one file a program can read, with a README that counts each part", () => {
      const back = JSON.parse(json) as FamilyFile;
      expect(back.format).toBe("iopener-family-data");
      expect(back.madeAt).toBe(runAt.toISOString());
      expect(Object.keys(back.data)).toEqual([...PARTS]);
      for (const part of PARTS) {
        expect(back.README.parts[part].rows, part).toBe(back.data[part].length);
        expect(back.README.parts[part].what.length).toBeGreaterThan(20);
      }
      expect(back.README.read.length).toBeGreaterThan(3);
    });

    it("holds every row the household owns, in every part", () => {
      for (const part of PARTS) expect(file.data[part].length, `nothing in ${part}`).toBeGreaterThan(0);
      for (const name of owned) {
        const c = ruleFor(name).copy;
        /* Messages sent from the site are the downloader's own, so the scope for that part is one address. */
        if ("part" in c) expect(file.data[c.part].length, name).toBe(name === "enquiry" ? 1 : made[name]);
      }
      const sessions = file.data.sessions.filter((r) => r.profileId === P1.id);
      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toMatchObject({ itemSlug: "firefly-catch", minutes: 12.5, score: 31, detail: { hits: 20, misses: 4, top: 3 }, endReason: "stop_rule", stopSymptom: `headache ${GONE}` });
      expect(file.data.counsellorNotes[0].body).toBe(`Counsellor note ${GONE}`);
    });

    it("never holds a PIN, in any form", () => {
      expect(json).not.toMatch(/pinHash|exitPinHash|hash-zz/i);
      expect(file.data.household[0]).toMatchObject({ exitPinSet: true, staffTestHousehold: false });
      expect(file.data.profiles.find((p) => p.id === P1.id)).toMatchObject({ pinSet: true });
      expect(file.data.profiles.find((p) => p.id === P2.id)).toMatchObject({ pinSet: false });
    });

    it("holds nothing of another household, and names outsiders instead of giving their ids", () => {
      expect(json).not.toContain(STAY);
      for (const id of [B.id, Q1.id, gB.id, staff.id, counsellor.id]) expect(json.includes(id), id).toBe(false);
      expect(file.data.counsellorLinks[0]).toMatchObject({ counsellorName: `${RAO} (counsellor)` });
      expect(file.data.counsellorLinks[0]).not.toHaveProperty("counsellorId");
      expect(file.data.programmes[0]).toMatchObject({ approvedByName: `${RAO} (counsellor)` });
      expect(file.data.review.find((r) => r.kind === "story")).toMatchObject({ reviewerName: "A person at IOpener" });
      const out = file.data.lights.find((l) => l.fromProfileId === P1.id)!, back = file.data.lights.find((l) => l.toProfileId === P1.id)!;
      expect(out).toMatchObject({ toProfileName: ZED, note: `Out ${GIFT}` });
      expect(out).not.toHaveProperty("toProfileId");
      expect(back).toMatchObject({ fromProfileName: ZED, note: `In ${GIFT}` });
      /* A welcome from another family: the line that was received is there, the id of that family's row is not. */
      expect(file.data.keeperAsks[0]).toMatchObject({ line: "not_alone", thanks: "thank_you" });
      expect(file.data.keeperAsks[0]).not.toHaveProperty("welcomeId");
      expect(json.includes(welcomeB.id)).toBe(false);
    });

    it("gives the downloader's own sign-in in full, and of the other grown-ups only what the Family page shows", () => {
      const me = file.data.people.find((p) => p.id === gA.id)!, her = file.data.people.find((p) => p.id === K.id)!;
      expect(me).toMatchObject({ email: gA.email, seat: "guardian", firebaseUid: `uid-${GONE}` });
      expect(Object.keys(her).sort()).toEqual([...OTHER_PERSON_COLUMNS].sort());
      expect(her).toMatchObject({ displayName: KIRAN, seat: "co_guardian" });
      expect(json).not.toContain(K.email);
      /* Her message to IOpener as a counsellor is not in his file; his own is. */
      expect(file.data.enquiries.map((e) => e.message)).toEqual([`Message ${GONE}`]);
    });

    it("puts shared things into words", () => {
      expect(file.data.teams[0]).toMatchObject({ team: `Team ${SHARED}`, teamLeague: `League ${SHARED}` });
      expect(file.data.teamMoves[0]).toMatchObject({ kind: "join", toTeam: `Team ${SHARED}` });
      expect(file.data.wallTiles[0]).toMatchObject({ wall: `Wall ${SHARED}`, idx: 0 });
      expect(file.data.glassesJourney[0]).toMatchObject({ pair: `ZZ-${x}`, city: `City ${GONE}` });
      expect(file.data.sponsorGroups[0]).toMatchObject({ group: `Group ${SHARED}`, groupSponsor: `Sponsor ${SHARED}` });
      expect(file.data.discoveryVotes[0]).toMatchObject({ round: `Round ${SHARED}`, question: `Question ${SHARED}`, profileId: P1.id });
      expect(file.data.experimentPlaces.find((e) => e.profileId === P1.id)).toMatchObject({ experimentId: EA.id, experimentIdea: IDEA_GONE });
      /* The idea of another family that this family joined: its title is public, and nothing else of it is here. */
      expect(file.data.experimentPlaces.find((e) => e.profileId === P2.id)).toMatchObject({ experimentId: EB.id, experimentIdea: IDEA_STAY });
    });

    it("explains its short codes", () => {
      expect(file.names.items["firefly-catch"]).toMatchObject({ kind: "Game" });
      expect(file.names.items["firefly-catch"].numbers).toMatchObject({ hits: "Right", top: "Highest level (of 10)" });
      expect(file.names.programmes[programmes[0].slug]).toBe(programmes[0].name);
      expect(file.names.checkUps.acuity).toMatchObject({ unit: "logMAR" });
      expect(file.names.checkUps.near_point).toMatchObject({ unit: "cm" });
    });

    it("can be summed up for the printable page without disagreeing with the file", () => {
      const sum = summarise(JSON.parse(json) as FamilyFile);
      expect(sum.household).toMatchObject({ name: `${GONE} family`, exitPinSet: true, screens: 1, groups: 1 });
      expect(sum.people).toHaveLength(3);
      expect(sum.people.find((p) => p.name === KIRAN)).toMatchObject({ email: "", seat: "co_guardian" });
      const tara = sum.profiles.find((p) => p.name === TARA)!;
      expect(tara).toMatchObject({ kind: "child", birthYear: 2019, sessions: 1, minutes: 13, stopped: 1, days: 1, care: 1, plans: 1, stories: 1, ideas: 1, weekNotes: 1, mail: 3, lights: 2, safety: 1 });
      expect(tara.checkUps).toEqual([expect.objectContaining({ key: "acuity", n: 2 })]);
      expect(tara.eye).toMatchObject({ weakEye: "left", strongContrast: 0.15 });
      expect(tara.notes).toEqual([expect.objectContaining({ by: `${RAO} (counsellor)`, body: `Counsellor note ${GONE}` })]);
      expect(tara.consent).toEqual({ n: 1, live: 1 });
      expect(sum.total).toBe(sum.parts.reduce((n, p) => n + p.rows, 0));
    });

    it("is not readable by another household: its file holds nothing of this one", async () => {
      const theirs = JSON.stringify(await buildFamilyFile(B.id, { id: gB.id, email: gB.email }, runAt));
      expect(theirs).toContain(STAY);
      expect(theirs).not.toContain(GONE);
      for (const id of [A.id, P1.id, P2.id, gA.id, cA.id, K.id]) expect(theirs).not.toContain(id);
      /* The counsellor who is a guardian elsewhere is named, and nothing more of her is given. */
      expect(theirs).toContain(`${KIRAN} (counsellor)`);
      expect(theirs).not.toContain(K.email);
    });

    it("answers nothing for a household that does not exist", async () => {
      expect(await buildFamilyFile(crypto.randomUUID(), null, runAt)).toBeNull();
    });
  });

  /* ───────────── asking, downloading, cancelling ───────────── */

  describe("who may ask, download and cancel", () => {
    const guardian = () => member(C.id, gC.id, [R1, R2], "guardian");
    const cheer = () => member(C.id, cC.id, [R1, R2], "circle");
    const child = () => member(C.id, gC.id, [R1, R2], "guardian", true);
    const other = () => member(B.id, gB.id, [Q1], "guardian");
    const t0 = addDays(runAt, -1);
    const requests = () => db.select().from(s.dataRequest).where(eq(s.dataRequest.accountId, C.id));

    it("refuses a cheer seat and a device in child mode, and records nothing", async () => {
      for (const m of [cheer(), child()]) {
        expect(await askForCopy(m, t0)).toEqual({ ok: false, why: "not_allowed" });
        expect(await askForDeletion(m, { scope: "household" }, t0)).toEqual({ ok: false, why: "not_allowed" });
        expect(await askForDeletion(m, { scope: "profile", profileId: R1.id }, t0)).toEqual({ ok: false, why: "not_allowed" });
        expect(await copyToDownload(m, t0)).toBeNull();
      }
      expect(await requests()).toHaveLength(0);
    });

    it("makes a guardian's copy ready at once, for seven days, and does not make a second one meanwhile", async () => {
      const first = await askForCopy(guardian(), t0);
      if (!first.ok) throw new Error(first.why);
      expect(first.request).toMatchObject({ kind: "export", status: "ready", accountId: C.id, askedBy: gC.id });
      expect(first.request.expiresAt).toEqual(addDays(t0, COPY_DAYS));
      const second = await askForCopy(guardian(), runAt);
      expect(second.ok && second.request.id).toBe(first.request.id);
      expect((await copyToDownload(guardian(), runAt))?.id).toBe(first.request.id);
      /* Even with a copy ready, the cheer seat and child mode get nothing. */
      expect(await copyToDownload(cheer(), runAt)).toBeNull();
      expect(await copyToDownload(child(), runAt)).toBeNull();
    });

    it("gives each household only its own copy", async () => {
      const mine = await copyToDownload(guardian(), runAt), theirs = await copyToDownload(other(), runAt);
      expect(mine?.accountId).toBe(C.id);
      expect(theirs?.accountId).toBe(B.id);
      expect(theirs?.id).not.toBe(mine?.id);
    });

    it("closes the download when its days run out, and a new copy can then be made", async () => {
      const late = addDays(t0, COPY_DAYS);
      expect(await copyToDownload(guardian(), late)).toBeNull();
      const again = await askForCopy(guardian(), late);
      expect(again.ok && again.request.status).toBe("ready");
      const rows = await requests();
      expect(rows.filter((r) => r.kind === "export").map((r) => r.status).sort()).toEqual(["done", "ready"]);
      await db.delete(s.dataRequest).where(eq(s.dataRequest.accountId, C.id));
    });

    it("sets a deletion of one profile for seven days on, once, and never for the last profile or another family's", async () => {
      expect(await askForDeletion(guardian(), { scope: "profile", profileId: Q1.id }, t0)).toEqual({ ok: false, why: "not_yours" });
      const first = await askForDeletion(guardian(), { scope: "profile", profileId: R1.id }, t0);
      if (!first.ok) throw new Error(first.why);
      expect(first.request).toMatchObject({ kind: "delete", scope: "profile", profileId: R1.id, status: "open", askedBy: gC.id });
      expect(first.request.deleteAfter).toEqual(addDays(t0, WAIT_DAYS));
      expect(await askForDeletion(guardian(), { scope: "profile", profileId: R1.id }, t0)).toEqual({ ok: false, why: "already" });
      expect(await askForDeletion(guardian(), { scope: "profile", profileId: R2.id }, t0)).toEqual({ ok: false, why: "last_one" });

      /* Nobody but a guardian of this household can cancel it. */
      expect(await cancelDeletion(other(), first.request.id, runAt)).toEqual({ ok: false, why: "not_found" });
      expect(await cancelDeletion(cheer(), first.request.id, runAt)).toEqual({ ok: false, why: "not_allowed" });
      expect(await cancelDeletion(child(), first.request.id, runAt)).toEqual({ ok: false, why: "not_allowed" });
      const done = await cancelDeletion(guardian(), first.request.id, runAt);
      expect(done.ok && done.request).toMatchObject({ status: "cancelled", cancelledAt: runAt });
      expect(await cancelDeletion(guardian(), first.request.id, runAt)).toEqual({ ok: false, why: "not_found" });
    });

    it("does nothing before the waiting time is over, and nothing at all after a cancel", async () => {
      const all = await askForDeletion(guardian(), { scope: "household" }, t0);
      if (!all.ok) throw new Error(all.why);
      expect(await askForDeletion(guardian(), { scope: "household" }, t0)).toEqual({ ok: false, why: "already" });
      expect(await askForDeletion(guardian(), { scope: "profile", profileId: R1.id }, t0)).toEqual({ ok: false, why: "all_going" });
      /* six days in: not yet */
      expect(await carryOut(all.request.id, addDays(t0, WAIT_DAYS - 1))).toBe("skipped");
      expect(await db.select().from(s.profile).where(eq(s.profile.accountId, C.id))).toHaveLength(2);
      /* cancelled, and then its day comes: still nothing */
      expect((await cancelDeletion(guardian(), all.request.id, runAt)).ok).toBe(true);
      expect(await carryOut(all.request.id, addDays(t0, WAIT_DAYS + 1))).toBe("skipped");
      expect(await db.select().from(s.profile).where(eq(s.profile.accountId, C.id))).toHaveLength(2);
      expect(await db.select().from(s.account).where(eq(s.account.id, C.id))).toHaveLength(1);
      await db.delete(s.dataRequest).where(eq(s.dataRequest.accountId, C.id));
    });
  });

  /* ───────────── deleting a household ───────────── */

  describe("deleting a household", () => {
    let before: { stay: Record<string, number>; stayWords: Record<string, number>; stayIds: Record<string, number> };
    let outcome: string;

    beforeAll(async () => {
      before = { stay: await snapshot(scopeB), stayWords: await scan([], [STAY, SHARED, IDEA_STAY]), stayIds: await scan([B.id, Q1.id, gB.id], []) };
      /* The search itself must be able to find the household before it goes, or finding nothing afterwards proves nothing. */
      const seen = await scan(goneIds, [...GONE_WORDS, TARA]);
      for (const place of ["account.display_name", "profile.display_name", "session.stop_symptom", "moderation_item.ref_id", "audit_log.target", "audit_log.meta", "glasses_leg.note", "fusion_mail.from_user_id", "focus_tile.profile_id", "account.preview_for", "enquiry.message", "care_log.data", "hero.sprite"]) {
        expect(seen[place], `the search should find the household in ${place}`).toBeGreaterThan(0);
      }
      const ask = await askForDeletion(member(A.id, gA.id, [P1, P2], "guardian"), { scope: "household" }, addDays(runAt, -WAIT_DAYS - 1));
      if (!ask.ok) throw new Error(ask.why);
      askA = ask.request;
      goneIds.push(askA.id);
      outcome = await carryOut(askA.id, runAt);
    });

    it("runs to the end", () => {
      expect(outcome).toBe("household");
    });

    it("leaves no row that points at the household and no row that carries its words, in any column of any table", async () => {
      expect(await scan(goneIds, [...GONE_WORDS, TARA])).toEqual({});
      expect(await snapshot(scopeA)).toEqual(Object.fromEntries(owned.map((n) => [n, 0])));
    });

    it("deletes the grown-ups who signed in only for it, and their old test household", async () => {
      expect(await db.select().from(s.appUser).where(inArray(s.appUser.id, [gA.id, cA.id]))).toHaveLength(0);
      expect(await db.select().from(s.account).where(inArray(s.account.id, [A.id, PV.id]))).toHaveLength(0);
    });

    it("keeps the grown-up who is also a counsellor, without her seat, and everything of her other role", async () => {
      const [her] = await db.select().from(s.appUser).where(eq(s.appUser.id, K.id));
      expect(her).toMatchObject({ accountId: null, seat: null, isCounsellor: true, displayName: KIRAN, email: K.email });
      expect(await db.select().from(s.counsellorLink).where(eq(s.counsellorLink.id, linkKB.id))).toHaveLength(1);
      expect(await db.select().from(s.counsellorNote).where(eq(s.counsellorNote.linkId, linkKB.id))).toHaveLength(1);
      expect(await db.select().from(s.enquiry).where(eq(s.enquiry.email, K.email))).toHaveLength(1);
    });

    it("leaves one audit line that says a deletion ran, with counts and nothing else", async () => {
      const lines = await db.select().from(s.auditLog).where(and(eq(s.auditLog.action, DELETED_HOUSEHOLD), eq(s.auditLog.createdAt, runAt)));
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatchObject({ userId: null, target: null });
      const meta = lines[0].meta as Record<string, unknown>;
      expect(meta).toMatchObject({ profiles: 2, people: 2, peopleKept: 1, testHousehold: false });
      expect(Object.values(meta).every((v) => typeof v === "number" || typeof v === "boolean")).toBe(true);
      expect(meta.rows).toBeGreaterThan(50);
    });

    it("scrubs the audit lines that named the household: the line stays, its target and details do not", async () => {
      const lines = await db.select().from(s.auditLog).where(inArray(s.auditLog.id, auditIds));
      const about = lines.filter((l) => l.action !== "admin.hazards.add" && l.id !== auditB.id);
      expect(about).toHaveLength(4);
      for (const l of about) expect(l, l.action).toMatchObject({ target: null, meta: { erased: true } });
      expect(about.map((l) => l.userId).sort()).toEqual([staff.id, staff.id, staff.id, counsellor.id].sort());
      /* A line the deleted guardian wrote himself, about something else, stays with nobody named. */
      expect(lines.find((l) => l.action === "admin.hazards.add")).toMatchObject({ userId: null, target: "rule", meta: { pattern: "old" } });
      /* A line about the other household is as it was. */
      expect(lines.find((l) => l.id === auditB.id)).toMatchObject({ userId: staff.id, meta: { name: `${STAY} family` } });
    });

    it("keeps what was shared by everyone, with the family's tile left on the wall and nobody's name on it", async () => {
      expect(await db.select().from(s.focusTile).where(and(eq(s.focusTile.wallId, wall.id), eq(s.focusTile.idx, 0)))).toMatchObject([{ profileId: null }]);
      expect(await db.select().from(s.team).where(eq(s.team.id, team.id))).toHaveLength(1);
      expect(await db.select().from(s.league).where(eq(s.league.id, league.id))).toHaveLength(1);
      expect(await db.select().from(s.glassesPair).where(eq(s.glassesPair.id, pair.id))).toHaveLength(1);
      expect(await db.select().from(s.sponsorGroup).where(eq(s.sponsorGroup.id, group.id))).toHaveLength(1);
      expect(await db.select().from(s.appUser).where(inArray(s.appUser.id, [staff.id, counsellor.id]))).toHaveLength(2);
    });

    it("leaves the other household as it was, except what it shared with the deleted one", async () => {
      const after = await snapshot(scopeB);
      /* Both lights were between the two families. The other family's place in the deleted family's experiment went with the experiment. */
      expect(after).toEqual({ ...before.stay, lightGift: before.stay.lightGift - 2, experimentEnrolment: before.stay.experimentEnrolment - 1 });
      expect(before.stay.lightGift).toBe(2);
      expect(before.stay.experimentEnrolment).toBe(1);
      /* Every word it wrote, and every shared name, is still exactly where it was. */
      expect(await scan([], [STAY, SHARED, IDEA_STAY])).toEqual(before.stayWords);
      const ids = await scan([B.id, Q1.id, gB.id], []);
      const changed = Object.keys(before.stayIds).filter((k) => ids[k] !== before.stayIds[k]);
      expect(changed.sort()).toEqual(["experiment_enrolment.profile_id", "light_gift.from_profile_id", "light_gift.to_profile_id"]);
      /* Its own experiment and its pooled result are still there; the deleted family's place in it is not. */
      expect(await db.select().from(s.experiment).where(eq(s.experiment.id, EB.id))).toHaveLength(1);
      expect(await db.select().from(s.experimentSignal).where(eq(s.experimentSignal.experimentId, EB.id))).toHaveLength(1);
      expect(await db.select().from(s.experimentEnrolment).where(eq(s.experimentEnrolment.experimentId, EB.id))).toHaveLength(0);
      /* The welcome it left keeps its record of being given and thanked for. The welcome it received keeps its line, and
         the pointer at the deleted family's row is emptied. */
      expect(await db.select().from(s.keeperWelcome).where(eq(s.keeperWelcome.id, welcomeB.id))).toMatchObject([{ line: "not_alone", givenAt: runAt, thanks: "thank_you" }]);
      expect(await db.select().from(s.keeperAsk).where(eq(s.keeperAsk.id, keeperAskB.id))).toMatchObject([{ line: "split_it", thanks: "it_helped", receivedAt: runAt, welcomeId: null }]);
    });

    it("is safe to run twice", async () => {
      expect(await carryOut(askA.id, runAt)).toBe("skipped");
      expect(await db.transaction((tx) => eraseHousehold(tx, A.id))).toEqual({ ok: false, why: "missing" });
      expect(await db.select().from(s.auditLog).where(and(eq(s.auditLog.action, DELETED_HOUSEHOLD), eq(s.auditLog.createdAt, runAt)))).toHaveLength(1);
    });
  });

  /* ───────────── deleting one profile ───────────── */

  describe("deleting one profile", () => {
    let before: { words: Record<string, number>; restIds: Record<string, number> };
    let askId: string;

    beforeAll(async () => {
      before = { words: await scan([], [REST]), restIds: await scan([C.id, R2.id, gC.id, cC.id], []) };
      const ask = await askForDeletion(member(C.id, gC.id, [R1, R2], "guardian"), { scope: "profile", profileId: R1.id }, addDays(runAt2, -WAIT_DAYS - 1));
      if (!ask.ok) throw new Error(ask.why);
      askId = ask.request.id;
      expect(await carryOut(askId, runAt2)).toBe("profile");
    });

    it("leaves nothing of that profile anywhere", async () => {
      expect(await scan(oneIds, [ONE])).toEqual({});
    });

    it("leaves the household, its grown-ups, its screen and its other profile as they were", async () => {
      expect(await scan([], [REST])).toEqual(before.words);
      const ids = await scan([C.id, R2.id, gC.id, cC.id], []);
      /* What changed: the deleted profile's own row and consent, the mail between the two profiles, the welcome left for its course, and the request made above. */
      const changed = Object.keys({ ...before.restIds, ...ids }).filter((k) => ids[k] !== before.restIds[k]);
      expect(changed.sort()).toEqual([
        "consent.account_id", "consent.user_id", "data_request.account_id", "data_request.asked_by",
        "fusion_mail.from_profile_id", "fusion_mail.from_user_id", "fusion_mail.to_profile_id", "keeper_welcome.account_id", "profile.account_id",
      ]);
      expect(await db.select().from(s.depthDay).where(eq(s.depthDay.profileId, R1.id))).toHaveLength(0);
      expect(await db.select().from(s.profile).where(eq(s.profile.accountId, C.id))).toMatchObject([{ id: R2.id }]);
      expect(await db.select().from(s.device).where(eq(s.device.accountId, C.id))).toHaveLength(1);
      expect(await db.select().from(s.appUser).where(eq(s.appUser.accountId, C.id))).toHaveLength(2);
      expect(await db.select().from(s.session).where(eq(s.session.profileId, R2.id))).toHaveLength(1);
      expect(await db.select().from(s.focusTile).where(and(eq(s.focusTile.wallId, wall.id), eq(s.focusTile.idx, 1)))).toMatchObject([{ profileId: null }]);
    });

    it("keeps the request as the family's record, with no pointer left in it, and one audit line with counts", async () => {
      const [r] = await db.select().from(s.dataRequest).where(eq(s.dataRequest.id, askId));
      expect(r).toMatchObject({ status: "done", scope: "profile", profileId: null, doneAt: runAt2 });
      const lines = await db.select().from(s.auditLog).where(and(eq(s.auditLog.action, DELETED_PROFILE), eq(s.auditLog.createdAt, runAt2)));
      expect(lines).toHaveLength(1);
      expect(Object.values(lines[0].meta as Record<string, unknown>).every((v) => typeof v === "number" || typeof v === "boolean")).toBe(true);
      expect(await carryOut(askId, runAt2)).toBe("skipped");
    });

    it("never deletes the last profile of a household, even if a request for it exists", async () => {
      const [r] = await db.insert(s.dataRequest).values({ accountId: C.id, kind: "delete", scope: "profile", profileId: R2.id, status: "open", deleteAfter: addDays(runAt3, -1) }).returning();
      expect(await carryOut(r.id, runAt3)).toBe("kept");
      expect(await db.select().from(s.dataRequest).where(eq(s.dataRequest.id, r.id))).toMatchObject([{ status: "cancelled", cancelledAt: runAt3 }]);
      expect(await db.select().from(s.profile).where(eq(s.profile.id, R2.id))).toHaveLength(1);
    });
  });

  /* ───────────── the demo family, and cleaning up ───────────── */

  it("never deletes the demo family, and left it untouched", async () => {
    if (!demo) return;
    expect(await db.transaction((tx) => eraseHousehold(tx, demo!.id))).toEqual({ ok: false, why: "demo" });
    expect(await demoCounts(demo.id)).toEqual({ profiles: demo.profiles, sessions: demo.sessions });
  });

  it("removes everything it made", async () => {
    await cleanUp();
    expect(await scan([], [x])).toEqual({});
    expect(await db.select().from(s.appUser).where(or(like(s.appUser.email, `%-${x}@iopener.test`), eq(s.appUser.id, K.id)))).toHaveLength(0);
  });
});
