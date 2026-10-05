/**
 * The server rules of four community ideas, against a real database: Proof of Help, Duet Streak, Discovery Board
 * and Light the Map. It makes throwaway households, never touches anyone else's rows, and removes what it made.
 * It needs a database with the current tables. Where none answers (the checks on GitHub have none), it is skipped.
 */
import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => { try { process.loadEnvFile(".env.local"); } catch { /* no file: the default address is used */ } });

import { and, eq, inArray, like, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { ANSWER_MIN_MEMBERS, MIN_VOTES_TO_SHOW } from "./discovery";
import { answerQuestion, castVote, closeDueRounds, closeRound, retractAnswer, roundsFor, withdrawQuestion } from "./discovery-data";
import { endDuet, householdDuets, startDuet } from "./duet-data";
import { MIN_FINISHED_PER_GROUP } from "./experiments";
import { addDays, dayOf, startOfDay } from "./league";
import { MAP_MIN_HOUSEHOLDS } from "./map";
import { joinMap, leaveMap, mapFor, setWelcome } from "./map-data";
import { householdProof, ideasWithResult } from "./proof-data";
import { memberCan, type MemberAction, type Seat } from "./roles";
import type { Member } from "./session";

const up = await db.execute(sql`select 1 from map_place, duet, discovery_vote limit 0`).then(() => true, () => false);
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const x = crypto.randomBytes(5).toString("hex"), TAG = `zz-people-${x}`;
const today = dayOf(new Date()), at = (daysAgo: number, hour = 9) => new Date(startOfDay(addDays(today, -daysAgo)).getTime() + hour * 3_600_000);
/* Two areas nobody else is asked to use: the seed and the demo stay out of them. */
const AREA = "796", OTHER_AREA = "797";

type Profile = typeof s.profile.$inferSelect;
type User = typeof s.appUser.$inferSelect;
interface Home { id: string; guardian: User; cheer: User; profiles: Profile[] }

const member = (h: Home, o: { user?: User; seat?: Seat; active?: Profile; childMode?: boolean; tester?: boolean } = {}) => {
  const seat = o.seat ?? "guardian", childMode = o.childMode ?? false;
  return {
    account: { id: h.id }, user: o.user ?? h.guardian, profiles: h.profiles, profile: o.active ?? h.profiles[0], seat, childMode, tester: o.tester ?? false,
    can: (a: MemberAction) => memberCan(seat, a, childMode),
  } as unknown as Member;
};

describe.skipIf(!up)("four community ideas, against the database", () => {
  const homes: Home[] = [];
  let preview: { id: string } | null = null;
  const rounds: string[] = [];

  /** A household with a guardian, a cheer seat, and the profiles asked for. The first child has a guardian's consent. */
  async function home(n: number, profiles: { name: string; kind: "adult" | "child"; birthYear?: number }[]): Promise<Home> {
    const [a] = await db.insert(s.account).values({ displayName: `${TAG} home ${n}` }).returning();
    const [guardian, cheer] = await db.insert(s.appUser).values([
      { email: `g${n}-${x}@iopener.test`, displayName: `Guardian${n} ${TAG}`, accountId: a.id, seat: "guardian" as const },
      { email: `c${n}-${x}@iopener.test`, displayName: `Cheer${n} ${TAG}`, accountId: a.id, seat: "circle" as const },
    ]).returning();
    const rows = profiles.length ? await db.insert(s.profile).values(profiles.map((p) => ({ accountId: a.id, displayName: `${p.name}${n}`, kind: p.kind, birthYear: p.birthYear ?? null }))).returning() : [];
    const h = { id: a.id, guardian, cheer, profiles: rows };
    homes.push(h);
    return h;
  }
  const consent = (h: Home, p: Profile) => db.insert(s.consent).values({ profileId: p.id, accountId: h.id, userId: h.guardian.id, kind: "parental", textVersion: "test" });

  let A: Home, B: Home;
  beforeAll(async () => {
    A = await home(1, [{ name: "Kid", kind: "child", birthYear: 2019 }, { name: "Gran", kind: "adult", birthYear: 1957 }, { name: "Sis", kind: "child", birthYear: 2016 }, { name: "Mum", kind: "adult" }]);
    B = await home(2, [{ name: "Kid", kind: "child", birthYear: 2018 }, { name: "Dad", kind: "adult", birthYear: 1985 }]);
    await consent(A, A.profiles[0]);
    await consent(B, B.profiles[0]);
  });

  afterAll(async () => {
    if (rounds.length) await db.delete(s.discoveryRound).where(inArray(s.discoveryRound.id, rounds));
    const ids = [...homes.map((h) => h.id), ...(preview ? [preview.id] : [])];
    if (ids.length) await db.delete(s.account).where(inArray(s.account.id, ids));
    await db.delete(s.appUser).where(like(s.appUser.email, `%-${x}@iopener.test`));
  });

  /* ───────────── Light the Map ───────────── */

  describe("Light the Map", () => {
    const families: Home[] = [];
    const litCount = async (viewer: Home, area: string) => (await mapFor(member(viewer))).lit.find((a) => a.area === area)?.households ?? null;
    let before = 0;

    beforeAll(async () => {
      [{ n: before }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.mapPlace).where(eq(s.mapPlace.area, AREA));
      for (let i = 0; i < MAP_MIN_HOUSEHOLDS; i++) families.push(await home(10 + i, []));
    });

    it("stores three digits and nothing else, on a guardian's word only", async () => {
      expect(await joinMap(member(A, { user: A.cheer, seat: "circle" }), AREA)).toEqual({ ok: false, why: "not_allowed" });
      expect(await joinMap(member(A, { childMode: true }), AREA)).toEqual({ ok: false, why: "not_allowed" });
      expect(await joinMap(member(A, { tester: true }), AREA)).toEqual({ ok: false, why: "tester" });
      for (const typed of ["796001", "79", "abc", ""]) expect(await joinMap(member(A), typed), typed).toEqual({ ok: false, why: "format" });
      expect(await joinMap(member(A), "912")).toEqual({ ok: false, why: "army" });
      expect(await db.select().from(s.mapPlace).where(eq(s.mapPlace.accountId, A.id))).toHaveLength(0);

      expect(await joinMap(member(A), OTHER_AREA)).toEqual({ ok: true, area: OTHER_AREA });
      const [row] = await db.select().from(s.mapPlace).where(eq(s.mapPlace.accountId, A.id));
      expect(row).toMatchObject({ area: OTHER_AREA, joinedBy: A.guardian.id, welcome: null });
      expect(await joinMap(member(A), AREA)).toEqual({ ok: false, why: "already" });
    });

    it("shows an area to nobody, not even its own families, until enough of them are on it", async () => {
      test: for (let i = 0; i < MAP_MIN_HOUSEHOLDS - 1; i++) {
        expect((await joinMap(member(families[i]), AREA, at(10 - i))).ok).toBe(true);
        if (before + i + 1 >= MAP_MIN_HOUSEHOLDS) break test;
        const own = (await mapFor(member(families[i]))).own;
        expect(own).toMatchObject({ area: AREA, households: null });
        expect(await litCount(B, AREA)).toBeNull();
      }
      /* a staff test household on the area is in no count */
      [preview] = await db.insert(s.account).values({ displayName: `${TAG} test household`, previewFor: A.guardian.id }).returning();
      await db.insert(s.mapPlace).values({ accountId: preview.id, area: AREA });
      if (before === 0) expect(await litCount(B, AREA)).toBeNull();

      const last = families[MAP_MIN_HOUSEHOLDS - 1];
      expect((await joinMap(member(last), AREA)).ok).toBe(true);
      expect(await litCount(B, AREA)).toBe(before + MAP_MIN_HOUSEHOLDS);
      expect((await mapFor(member(last))).own?.households).toBe(before + MAP_MIN_HOUSEHOLDS);
      /* the total is the lit areas added up, so it says nothing about areas that are not shown */
      const view = await mapFor(member(B));
      expect(view.total).toBe(view.lit.reduce((n, a) => n + a.households, 0));
      expect(view.lit.some((a) => a.area === OTHER_AREA)).toBe(false);
    });

    it("lets the first family of an area, and nobody else, choose a welcome from the list", async () => {
      if (before > 0) return;
      const [first, second] = families;
      expect((await mapFor(member(first))).own).toMatchObject({ first: true, welcome: null });
      expect((await mapFor(member(second))).own).toMatchObject({ first: false, welcome: null, ownWelcome: null });

      expect(await setWelcome(member(second), "hello")).toEqual({ ok: false, why: "not_first" });
      expect(await setWelcome(member(first, { user: first.cheer, seat: "circle" }), "hello")).toEqual({ ok: false, why: "not_allowed" });
      expect(await setWelcome(member(first), "Come and see us at 12 Hill Road")).toEqual({ ok: false, why: "bad_line" });
      expect(await setWelcome(member(B), "hello")).toEqual({ ok: false, why: "not_on_map" });
      expect(await setWelcome(member(first), "hello")).toEqual({ ok: true, line: "hello" });

      /* the families that came later see it; the lamp-lighter is not welcomed by itself */
      expect((await mapFor(member(second))).own?.welcome).toBe("hello");
      expect((await mapFor(member(first))).own).toMatchObject({ welcome: null, ownWelcome: "hello" });
      /* a family in another area sees no welcome from this one */
      expect((await mapFor(member(A))).own).toMatchObject({ area: OTHER_AREA, first: true, welcome: null });
    });

    it("passes the lamp on when the first family leaves, and forgets that family", async () => {
      if (before > 0) return;
      const [first, second] = families;
      expect(await leaveMap(member(first, { user: first.cheer, seat: "circle" }))).toEqual({ ok: false, why: "not_allowed" });
      expect(await leaveMap(member(first))).toEqual({ ok: true });
      expect(await db.select().from(s.mapPlace).where(eq(s.mapPlace.accountId, first.id))).toHaveLength(0);
      expect(await leaveMap(member(first))).toEqual({ ok: false, why: "not_on_map" });

      expect((await mapFor(member(second))).own).toMatchObject({ first: true, welcome: null });
      /* one family fewer: the area is below the minimum again and is shown to nobody */
      expect(await litCount(B, AREA)).toBeNull();
      expect((await mapFor(member(second))).own?.households).toBeNull();
    });
  });

  /* ───────────── Discovery Board ───────────── */

  describe("Discovery Board", () => {
    let open: { id: string }, past: { id: string }, q1: { id: string }, q2: { id: string }, q3: { id: string }, old: { id: string };
    const kid = () => A.profiles[0], gran = () => A.profiles[1], sis = () => A.profiles[2];

    beforeAll(async () => {
      [open, past] = await db.insert(s.discoveryRound).values([
        { title: `${TAG} open`, closesOn: addDays(today, 5) },
        { title: `${TAG} past`, closesOn: addDays(today, -1) },
      ]).returning();
      rounds.push(open.id, past.id);
      [q1, q2, q3, old] = await db.insert(s.discoveryQuestion).values([
        { roundId: open.id, question: `Question one ${TAG}?`, why: "Because.", position: 0 },
        { roundId: open.id, question: `Question two ${TAG}?`, why: "Because.", position: 1 },
        { roundId: open.id, question: `Question three ${TAG}?`, why: "Because.", position: 2 },
        { roundId: past.id, question: `Old question ${TAG}?`, why: "Because.", position: 0 },
      ]).returning();
    });

    const votesOf = (profileId: string) => db.select().from(s.discoveryVote).where(and(eq(s.discoveryVote.roundId, open.id), eq(s.discoveryVote.profileId, profileId)));
    const round = async (h: Home, id: string, active?: Profile) => (await roundsFor(member(h, { active }))).find((r) => r.id === id) ?? null;

    it("keeps one vote for each profile in a round, and lets it be changed", async () => {
      expect(await castVote(member(A, { active: gran() }), q1.id)).toEqual({ ok: true, changed: false });
      expect(await castVote(member(A, { active: gran() }), q1.id)).toEqual({ ok: true, changed: false });
      expect(await castVote(member(A, { active: gran() }), q2.id)).toEqual({ ok: true, changed: true });
      expect(await votesOf(gran().id)).toMatchObject([{ questionId: q2.id }]);
      expect((await round(A, open.id, gran()))?.mine).toBe(q2.id);
    });

    it("refuses a cheer seat, a device in child mode, a staff test household, and a child without consent", async () => {
      expect(await castVote(member(A, { user: A.cheer, seat: "circle", active: gran() }), q1.id)).toEqual({ ok: false, why: "not_allowed" });
      expect(await castVote(member(A, { childMode: true, active: kid() }), q1.id)).toEqual({ ok: false, why: "not_allowed" });
      expect(await castVote(member(A, { tester: true, active: A.profiles[3] }), q1.id)).toEqual({ ok: false, why: "tester" });
      expect(await castVote(member(A, { active: sis() }), q1.id)).toEqual({ ok: false, why: "needs_consent" });
      expect(await votesOf(sis().id)).toHaveLength(0);
      /* the child whose consent stands votes by a guardian's hand */
      expect(await castVote(member(A, { active: kid() }), q1.id)).toEqual({ ok: true, changed: false });
    });

    it("refuses a vote in a round whose day has passed, and for a question that is not there", async () => {
      expect(await castVote(member(A, { active: gran() }), old.id)).toEqual({ ok: false, why: "closed" });
      expect(await castVote(member(A, { active: gran() }), crypto.randomUUID())).toEqual({ ok: false, why: "not_listed" });
    });

    it("removes the votes for a question that is taken off the list, so those members can vote again", async () => {
      expect(await castVote(member(B, { active: B.profiles[1] }), q3.id)).toEqual({ ok: true, changed: false });
      expect(await withdrawQuestion(q3.id)).toMatchObject({ votesRemoved: 1 });
      expect(await db.select().from(s.discoveryVote).where(eq(s.discoveryVote.questionId, q3.id))).toHaveLength(0);
      expect(await castVote(member(B, { active: B.profiles[1] }), q3.id)).toEqual({ ok: false, why: "not_listed" });
      expect((await round(B, open.id))?.questions.map((q) => q.id)).toEqual([q1.id, q2.id]);
      expect(await withdrawQuestion(q3.id)).toBeNull();
      expect(await withdrawQuestion(old.id)).toBeNull();
    });

    it("shows no number while the round is open, and credits each household only with its own profiles", async () => {
      const mine = await round(A, open.id, kid());
      expect(mine).toMatchObject({ state: "open", counted: false, total: null });
      expect(mine?.questions.every((q) => q.votes === null && !q.top && q.answer === null)).toBe(true);
      expect(mine?.credited.map((p) => p.id).sort()).toEqual([kid().id, gran().id].sort());
      const theirs = await round(B, open.id);
      expect(theirs?.credited).toEqual([]);
      expect(JSON.stringify(theirs)).not.toContain(kid().id);
      expect(JSON.stringify(theirs)).not.toContain("Kid1");
    });

    it("leaves a child's vote out of the count and the credit while consent is taken back, and counts it again when it returns", async () => {
      const voted = async () => (await roundsFor(member(A, { active: kid() }))).find((r) => r.id === open.id)!;
      expect((await voted()).credited.map((p) => p.id)).toContain(kid().id);
      await db.update(s.consent).set({ revokedAt: new Date() }).where(eq(s.consent.profileId, kid().id));
      expect((await voted()).credited.map((p) => p.id)).toEqual([gran().id]);
      expect((await voted()).mine).toBeNull();
      expect(await castVote(member(A, { active: kid() }), q2.id)).toEqual({ ok: false, why: "needs_consent" });
      await db.update(s.consent).set({ revokedAt: null }).where(eq(s.consent.profileId, kid().id));
      expect((await voted()).credited.map((p) => p.id).sort()).toEqual([kid().id, gran().id].sort());
      expect((await voted()).mine).toBe(q1.id);
    });

    it("closes for good, and then shows the numbers when enough voted", async () => {
      /* enough voters: more profiles of the other household */
      const extra = await db.insert(s.profile).values(Array.from({ length: MIN_VOTES_TO_SHOW }, (_, i) => ({ accountId: B.id, displayName: `Voter${i} ${TAG}`, kind: "adult" as const }))).returning();
      B.profiles.push(...extra);
      for (const p of extra) expect((await castVote(member(B, { active: p }), q1.id)).ok).toBe(true);

      expect(await closeRound(open.id)).toMatchObject({ id: open.id });
      expect(await closeRound(open.id)).toBeNull();
      expect(await castVote(member(A, { active: gran() }), q1.id)).toEqual({ ok: false, why: "closed" });
      expect(await votesOf(gran().id)).toMatchObject([{ questionId: q2.id }]);

      const closed = await round(A, open.id, kid());
      expect(closed).toMatchObject({ state: "closed", counted: true, total: MIN_VOTES_TO_SHOW + 2 });
      expect(closed?.questions.map((q) => [q.id, q.votes, q.top])).toEqual([[q1.id, MIN_VOTES_TO_SHOW + 1, true], [q2.id, 1, false]]);
    });

    it("stamps a round whose day has passed, once", async () => {
      expect(await closeDueRounds()).toBeGreaterThanOrEqual(1);
      const [row] = await db.select().from(s.discoveryRound).where(eq(s.discoveryRound.id, past.id));
      expect(row.closedAt).not.toBeNull();
      await closeDueRounds();
      expect((await db.select().from(s.discoveryRound).where(eq(s.discoveryRound.id, past.id)))[0].closedAt).toEqual(row.closedAt);
    });

    it("publishes an answer only for a closed round, from enough members, with no promise in it", async () => {
      const good = { answer: "Members who voted had steadier weeks. It does not show why.", basis: "Practice days of members who agreed to pooling.", members: ANSWER_MIN_MEMBERS };
      expect(await answerQuestion(A.guardian.id, q1.id, { ...good, members: ANSWER_MIN_MEMBERS - 1 })).toBe("too_few_members");
      expect(await answerQuestion(A.guardian.id, q1.id, { ...good, answer: "This cures tired eyes for everyone who tries it." })).toBe("promise");
      expect(await answerQuestion(A.guardian.id, q3.id, good)).toBe("withdrawn");
      expect(await answerQuestion(A.guardian.id, crypto.randomUUID(), good)).toBe("gone");
      expect((await round(A, open.id))?.questions.every((q) => q.answer === null)).toBe(true);

      expect(await answerQuestion(A.guardian.id, q1.id, good)).toMatchObject({ id: q1.id, isSample: false, answerMembers: ANSWER_MIN_MEMBERS });
      expect(await answerQuestion(A.guardian.id, q1.id, good)).toBe("already");
      const seen = await round(B, open.id);
      expect(seen?.questions[0].answer).toMatchObject({ text: good.answer, basis: good.basis, members: ANSWER_MIN_MEMBERS, sample: false });
      /* everyone who voted in the round is credited, each household with its own profiles only */
      expect(seen?.credited.length).toBe(MIN_VOTES_TO_SHOW);
      expect((await round(A, open.id))?.credited.map((p) => p.id).sort()).toEqual([kid().id, gran().id].sort());

      expect(await retractAnswer(q1.id)).toMatchObject({ id: q1.id, answer: null, answeredAt: null });
      expect(await retractAnswer(q1.id)).toBeNull();
      expect((await round(B, open.id))?.questions[0].answer).toBeNull();
    });
  });

  /* ───────────── Duet Streak ───────────── */

  describe("Duet Streak", () => {
    const key = (p: Profile) => `profile:${p.id}`, person = (u: User) => `person:${u.id}`;
    const kid = () => A.profiles[0], gran = () => A.profiles[1], sis = () => A.profiles[2], mum = () => A.profiles[3];
    const duetsOf = (accountId: string) => db.select().from(s.duet).where(eq(s.duet.accountId, accountId));

    it("is set up by a guardian, for two people of the household and of different generations", async () => {
      expect(await startDuet(member(A, { user: A.cheer, seat: "circle" }), key(kid()), key(gran()))).toEqual({ ok: false, why: "not_allowed" });
      expect(await startDuet(member(A, { childMode: true }), key(kid()), key(gran()))).toEqual({ ok: false, why: "not_allowed" });
      /* a profile or a person of another household is not found, whatever id the browser sends */
      expect(await startDuet(member(A), key(kid()), key(B.profiles[1]))).toEqual({ ok: false, why: "unknown" });
      expect(await startDuet(member(A), key(kid()), person(B.cheer))).toEqual({ ok: false, why: "unknown" });
      /* the guardian is not offered as a partner without a profile */
      expect(await startDuet(member(A), key(kid()), person(A.guardian))).toEqual({ ok: false, why: "unknown" });
      expect(await startDuet(member(A), key(kid()), key(kid()))).toEqual({ ok: false, why: "same_person" });
      expect(await startDuet(member(A), key(sis()), key(gran()))).toEqual({ ok: false, why: "needs_consent" });
      expect(await startDuet(member(A), key(gran()), key(mum()))).toEqual({ ok: false, why: "cannot_tell" });
      expect(await startDuet(member(A), key(mum()), person(A.cheer))).toEqual({ ok: false, why: "cannot_tell" });
      expect(await duetsOf(A.id)).toHaveLength(0);

      expect(await startDuet(member(A), key(kid()), key(gran()))).toEqual({ ok: true, a: "Kid1", b: "Gran1" });
      expect(await duetsOf(A.id)).toMatchObject([{ aProfileId: kid().id, bProfileId: gran().id, bUserId: null, startedOn: today, createdBy: A.guardian.id }]);
      expect(await startDuet(member(A), key(kid()), person(A.cheer))).toEqual({ ok: false, why: "already_paired" });
      await consent(A, sis());
      expect(await startDuet(member(A), key(sis()), key(kid()))).toEqual({ ok: false, why: "already_paired" });
    });

    it("counts a day only when both did their part, and ends a run quietly on a day one part is missing", async () => {
      const [d] = await duetsOf(A.id);
      await db.update(s.duet).set({ startedOn: addDays(today, -3) }).where(eq(s.duet.id, d.id));
      /* the child is asked for every day; the grandparent logs a care routine on every day so far */
      await db.insert(s.enrolment).values({ profileId: kid().id, programme: "lazy-eye", dailyMinutes: 30, daysPerWeek: 7 });
      await db.insert(s.daySummary).values([3, 2].map((ago) => ({ profileId: kid().id, day: addDays(today, -ago), trainMinutes: 30, trainGoal: 30 })));
      await db.insert(s.session).values([3, 2, 1].map((ago) => ({ profileId: gran().id, kind: "exercise" as const, itemSlug: "drop-reminder-routine", ring: "rest" as const, minutes: 1, endReason: "done", startedAt: at(ago), endedAt: at(ago, 10) })));

      const [view] = await householdDuets(member(A));
      expect(view.days.map((x) => x.state)).toEqual(["kept", "kept", "missed", "open"]);
      expect(view.streak).toEqual({ current: 0, longest: 2, kept: 2 });
      expect(view.a).toMatchObject({ name: "Kid1", child: true, part: { kind: "practice", asked: 7, minutes: 30 }, today: "open" });
      expect(view.b).toMatchObject({ name: "Gran1", part: { kind: "care" }, today: "open" });
      /* nothing in what the page gets says whose part was missing */
      expect(Object.keys(view.days[2])).toEqual(["day", "state"]);
    });

    it("treats a day the stop rule ended as a rest day, so it never ends the run", async () => {
      await db.insert(s.session).values({ profileId: kid().id, kind: "game", itemSlug: "firefly-catch", ring: "train", minutes: 5, endReason: "stop_rule", stopSymptom: "headache", startedAt: at(1), endedAt: at(1, 10) });
      const [view] = await householdDuets(member(A));
      expect(view.days.map((x) => x.state)).toEqual(["kept", "kept", "rest", "open"]);
      expect(view.streak).toEqual({ current: 2, longest: 2, kept: 2 });
    });

    it("grows today once both have done their part", async () => {
      await db.insert(s.daySummary).values({ profileId: kid().id, day: today, trainMinutes: 30, trainGoal: 30 });
      expect((await householdDuets(member(A)))[0]).toMatchObject({ today: "open", a: { today: "done" }, b: { today: "open" } });
      await db.insert(s.careLog).values({ profileId: gran().id, day: today, kind: "drops", itemSlug: "drop-reminder-routine", count: 1 });
      expect((await householdDuets(member(A)))[0]).toMatchObject({ today: "kept", b: { today: "done" }, streak: { current: 3, longest: 3, kept: 3 } });
    });

    it("waits, with nothing counted, while a child's consent does not stand", async () => {
      await db.update(s.consent).set({ revokedAt: new Date() }).where(eq(s.consent.profileId, kid().id));
      expect((await householdDuets(member(A)))[0]).toMatchObject({ waits: true, days: [], streak: { current: 0, longest: 0, kept: 0 } });
      await db.update(s.consent).set({ revokedAt: null }).where(eq(s.consent.profileId, kid().id));
      expect((await householdDuets(member(A)))[0]).toMatchObject({ waits: false, streak: { current: 3 } });
    });

    it("lets a cheer seat take part with a note to the child, and with nothing else", async () => {
      expect(await startDuet(member(B), key(B.profiles[0]), person(B.cheer))).toEqual({ ok: true, a: "Kid2", b: "Cheer2" });
      await db.insert(s.daySummary).values({ profileId: B.profiles[0].id, day: today, restBreaks: 1 });
      const before = (await householdDuets(member(B)))[0];
      expect(before).toMatchObject({ a: { part: { kind: "care" }, today: "done" }, b: { kind: "person", part: { kind: "note" }, today: "open" }, today: "open" });
      /* a note to someone else does not count; a note to the partner does */
      await db.insert(s.fusionMail).values({ fromUserId: B.cheer.id, toProfileId: B.profiles[1].id, fromName: "Cheer", body: "HELLO DAD" });
      expect((await householdDuets(member(B)))[0].b.today).toBe("open");
      await db.insert(s.fusionMail).values({ fromUserId: B.cheer.id, toProfileId: B.profiles[0].id, fromName: "Cheer", body: "WELL DONE" });
      expect((await householdDuets(member(B)))[0]).toMatchObject({ b: { today: "done" }, today: "kept", streak: { current: 1 } });
    });

    it("is seen only inside the household, and by a cheer seat only when it is in it or a child is", async () => {
      expect((await householdDuets(member(B))).map((v) => v.a.name)).toEqual(["Kid2"]);
      expect(JSON.stringify(await householdDuets(member(B)))).not.toContain("Kid1");
      expect(await householdDuets(member(A, { user: A.cheer, seat: "circle" }))).toHaveLength(1);
      expect(await householdDuets(member(A, { childMode: true, active: sis() }))).toHaveLength(0);
      expect(await householdDuets(member(A, { childMode: true, active: kid() }))).toHaveLength(1);
    });

    it("is ended by a guardian of its own household only, and nothing of it is kept", async () => {
      const [d] = await duetsOf(A.id);
      expect(await endDuet(member(B), d.id)).toBe(false);
      expect(await endDuet(member(A, { user: A.cheer, seat: "circle" }), d.id)).toBe(false);
      expect(await endDuet(member(A, { childMode: true }), d.id)).toBe(false);
      expect(await duetsOf(A.id)).toHaveLength(1);
      expect(await endDuet(member(A), d.id)).toBe(true);
      expect(await duetsOf(A.id)).toHaveLength(0);
      expect(await endDuet(member(A), d.id)).toBe(false);
    });
  });

  /* ───────────── Proof of Help ───────────── */

  describe("Proof of Help", () => {
    let idea: { id: string }, experiment: { id: string };
    const MIN = MIN_FINISHED_PER_GROUP;

    beforeAll(async () => {
      [idea] = await db.insert(s.protocol).values({ profileId: A.profiles[3].id, title: `Idea ${TAG}`, forWhom: "Anyone", doWhat: "Blink", howMuch: "Daily", weeks: 4, moves: "symptoms", step: "signal", status: "published", publishedAt: new Date() }).returning();
      [experiment] = await db.insert(s.experiment).values({ protocolId: idea.id }).returning();
      await db.insert(s.experimentEnrolment).values([{ experimentId: experiment.id, profileId: B.profiles[1].id, arm: "tried" }, { experimentId: experiment.id, profileId: B.profiles[0].id, arm: "control", leftAt: new Date() }]);
      await db.insert(s.protocol).values({ profileId: A.profiles[3].id, title: `Waiting ${TAG}`, forWhom: "Anyone", doWhat: "Rest", howMuch: "Daily", weeks: 2, moves: "symptoms", status: "in_review" });
    });
    const signal = (nTried: number, nControl: number, low: number, high: number) =>
      db.insert(s.experimentSignal).values({ experimentId: experiment.id, nTried, nControl, changeTried: -5, changeControl: -1, low, high, computedAt: new Date() });
    const clear = () => db.delete(s.experimentSignal).where(eq(s.experimentSignal.experimentId, experiment.id));
    const own = async () => (await householdProof(member(A))).find((i) => i.id === idea.id)!;
    const listed = async (h: Home) => (await ideasWithResult(member(h))).find((i) => i.id === idea.id);

    it("counts who joined and who finished, and says nothing more until there is a result", async () => {
      const mine = await householdProof(member(A));
      expect(mine.map((i) => [i.title, i.proof.stage]).sort()).toEqual([[`Idea ${TAG}`, "being_tested"], [`Waiting ${TAG}`, "waiting"]]);
      /* the member who left is not counted as joined; nobody has two check-ups yet */
      expect((await own()).proof).toMatchObject({ joined: 1, finished: { tried: 0, control: 0 }, result: null });
      expect((await own()).sharedBy).toBe("Mum1");
      expect(await listed(B)).toBeUndefined();
    });

    it("says no result for a stored row below the minimum in either group", async () => {
      await signal(MIN - 1, MIN + 20, -8, -2);
      expect((await own()).proof).toMatchObject({ stage: "being_tested", result: null });
      expect(await listed(B)).toBeUndefined();
      await clear();
    });

    it("says what the range supports once both groups are large enough, and names no author to anyone else", async () => {
      await signal(MIN + 2, MIN, -8, -2);
      expect((await own()).proof).toMatchObject({ stage: "result", result: { tried: MIN + 2, control: MIN, lean: "better" } });
      const theirs = await listed(B);
      expect(theirs).toMatchObject({ mine: false, sharedBy: null, proof: { result: { lean: "better" } } });
      expect(JSON.stringify(theirs)).not.toContain("Mum1");
      expect(JSON.stringify(theirs)).not.toContain(A.profiles[3].id);
      expect(await listed(A)).toMatchObject({ mine: true });
      await clear();

      await signal(MIN + 2, MIN, -8, 0.5);
      expect((await own()).proof.result?.lean).toBe("unclear");
      await clear();
    });

    it("shows a household only its own ideas", async () => {
      expect((await householdProof(member(B))).some((i) => i.title.includes(TAG))).toBe(false);
    });
  });
});
