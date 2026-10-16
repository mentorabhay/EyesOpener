// Eyes Opener: The four "rewards" ideas against a real database: what is marked, kept, shown and given, who may do it, and that.
/**
 * The four "rewards" ideas against a real database: what is marked, kept, shown and given, who may do it, and that
 * one household can never reach another's. It makes throwaway households and removes them.
 * Where no database with the current tables answers (the checks on GitHub have none), it is skipped.
 */
import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => { try { process.loadEnvFile(".env.local"); } catch { /* no file: the default address is used */ } });

import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { memberCan, type MemberAction, type Seat } from "@/lib/roles";
import type { Member } from "@/lib/session";
import { depthDayFor, depthDayNote, markPlayed, syncDepthDay } from "./depth-day-data";
import { galleryFor, syncGallery } from "./gallery-data";
import { askForWelcome, graduateOf, journeyFor, keeperFor, leaveWelcome, sendThanks, stopAsking, takeBackWelcome } from "./graduation-data";
import { addDays, dayOf, startOfDay } from "./league";
import { sunsetFor } from "./sunset-data";

const up = await db.execute(sql`select k.line, a.line, d.day from keeper_welcome k, keeper_ask a, depth_day d limit 0`).then(() => true, () => false);
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });
const x = crypto.randomBytes(4).toString("hex");
/** A programme no demo row uses, so a welcome here can only meet an ask made here. */
const COURSE = "after-concussion", WEEKS = 6;

describe.skipIf(!up)("rewards, in the database", () => {
  type Row<T extends { $inferSelect: unknown }> = T["$inferSelect"];
  type Home = { account: Row<typeof s.account>; user: Row<typeof s.appUser>; profile: Row<typeof s.profile> };
  const homes: Home[] = [];
  const now = new Date(), today = dayOf(now);
  const at = (day: string, hour = 10) => new Date(startOfDay(day).getTime() + hour * 3_600_000);

  /** A household with one grown-up who signs in and one profile. */
  async function home(tag: string, kind: "adult" | "child" = "adult"): Promise<Home> {
    const [account] = await db.insert(s.account).values({ displayName: `zz-rw-${tag}-${x}` }).returning();
    const [user] = await db.insert(s.appUser).values({ email: `zz-rw-${tag}-${x}@eyesopener.test`, displayName: `Guardian ${tag} ${x}`, accountId: account.id, seat: "guardian" }).returning();
    const [profile] = await db.insert(s.profile).values({ accountId: account.id, displayName: `${tag}${x}`, kind, birthYear: kind === "child" ? 2019 : null }).returning();
    const h = { account, user, profile };
    homes.push(h);
    return h;
  }
  /** The part of a signed-in household these functions read. */
  async function member(h: Home, o: { seat?: Seat; childMode?: boolean; tester?: boolean; profile?: Row<typeof s.profile> } = {}): Promise<Member> {
    const profile = o.profile ?? h.profile, seat = o.seat ?? "guardian", childMode = o.childMode ?? false, tester = o.tester ?? false;
    const [enrolment] = await db.select().from(s.enrolment).where(and(eq(s.enrolment.profileId, profile.id), eq(s.enrolment.status, "active")));
    const age = profile.birthYear === null ? null : now.getFullYear() - profile.birthYear;
    return {
      account: h.account, user: h.user, profile, profiles: [profile], seat, childMode, tester, age, eye: null, device: null, enrolment: enrolment ?? null,
      dose: { age, dailyMinutes: enrolment?.dailyMinutes ?? 0, stopFlag: false, consentMissing: false, awaitingCounsellor: false, tester },
      can: (a: MemberAction) => memberCan(seat, a, childMode),
    } as unknown as Member;
  }
  const depth = (profileId: string, ago: number, value: number, note: string | null) =>
    db.insert(s.testResult).values({ profileId, testKey: "stereo", eye: null, value, unit: "arcsec", note, takenAt: at(addDays(today, -ago)) });
  /** A course that ran all its weeks and ended `ago` days ago. */
  const finished = (profileId: string, ago = 3) =>
    db.insert(s.enrolment).values({ profileId, programme: COURSE, dailyMinutes: 15, daysPerWeek: 5, week: WEEKS, status: "finished", startedAt: at(addDays(today, -(ago + WEEKS * 7))), endedAt: at(addDays(today, -ago)) }).returning();
  /** A course that began `ago` days ago and is still running. */
  const running = (profileId: string, ago = 3) =>
    db.insert(s.enrolment).values({ profileId, programme: COURSE, dailyMinutes: 15, daysPerWeek: 5, week: 1, status: "active", startedAt: at(addDays(today, -ago)) }).returning();

  afterAll(async () => { if (homes.length) await db.delete(s.account).where(inArray(s.account.id, homes.map((h) => h.account.id))); });

  /* ───────────── Locked Gallery ───────────── */
  describe("Locked Gallery", () => {
    let A: Home, B: Home;
    beforeAll(async () => { A = await home("gal-a"); B = await home("gal-b"); });

    it("shows a member with no results and no practice an empty gallery, and writes nothing", async () => {
      const g = await galleryFor(await member(A));
      expect(g.items.every((i) => i.reachedAt === null)).toBe(true);
      expect(g.depth).toBeNull();
      expect(await db.select().from(s.galleryUnlock).where(eq(s.galleryUnlock.profileId, A.profile.id))).toEqual([]);
    });

    it("marks a picture from the member's own check-up, dated to that check-up", async () => {
      await depth(A.profile.id, 20, 1600, "worse");
      await depth(A.profile.id, 6, 380, null);
      const g = await galleryFor(await member(A));
      const got = Object.fromEntries(g.items.filter((i) => i.reachedAt).map((i) => [i.slug, i.reachedAt]));
      expect(Object.keys(got).sort()).toEqual(["depth-400", "depth-800"]);
      expect(got["depth-800"]).toEqual(at(addDays(today, -6)));
      expect(g.depth?.value).toBe(380);
    });

    it("keeps one mark for one picture however often the page is read", async () => {
      await galleryFor(await member(A));
      await syncGallery(A.profile.id, null);
      expect((await db.select().from(s.galleryUnlock).where(eq(s.galleryUnlock.profileId, A.profile.id))).length).toBe(2);
    });

    it("never takes a mark away when a later check-up comes out worse", async () => {
      await depth(A.profile.id, 1, 1600, "worse");
      const g = await galleryFor(await member(A));
      expect(g.items.filter((i) => i.reachedAt).map((i) => i.slug).sort()).toEqual(["depth-400", "depth-800"]);
      expect(g.depth?.note).toBe("worse");
    });

    it("marks effort trophies from practice days, one for a day however long it was", async () => {
      await db.insert(s.daySummary).values([
        { profileId: A.profile.id, day: addDays(today, -3), trainMinutes: 15, trainGoal: 15 },
        { profileId: A.profile.id, day: addDays(today, -2), trainMinutes: 90, trainGoal: 15 },
        { profileId: A.profile.id, day: addDays(today, -1), trainMinutes: 4, trainGoal: 15 },
      ]);
      const g = await galleryFor(await member(A));
      expect(g.effort.days).toBe(2);
      const first = g.items.find((i) => i.slug === "days-1")!;
      expect(first.reachedAt).toEqual(startOfDay(addDays(today, -3)));
      expect(g.items.find((i) => i.slug === "days-7")).toMatchObject({ reachedAt: null, progress: { done: 2, of: 7 } });
    });

    it("never counts another household's results or days", async () => {
      const g = await galleryFor(await member(B));
      expect(g.items.every((i) => i.reachedAt === null)).toBe(true);
      expect(g.effort.days).toBe(0);
    });

    it("reads the faint pictures from the weaker eye when the eye settings name one", async () => {
      await db.insert(s.testResult).values([
        { profileId: B.profile.id, testKey: "contrast", eye: "right", value: 1.65, unit: "logCS", takenAt: at(addDays(today, -5)) },
        { profileId: B.profile.id, testKey: "contrast", eye: "left", value: 0.9, unit: "logCS", takenAt: at(addDays(today, -5)) },
      ]);
      const weakLeft = { ...(await member(B)), eye: { weakEye: "left" } } as unknown as Member;
      const g = await galleryFor(weakLeft);
      expect(g.items.filter((i) => i.kind === "faint" && i.reachedAt).map((i) => i.slug)).toEqual(["faint-090"]);
      expect(g.faint).toEqual([{ eye: "left", value: 0.9 }]);
    });
  });

  /* ───────────── First Depth Day ───────────── */
  describe("First Depth Day", () => {
    let A: Home, B: Home, C: Home;
    beforeAll(async () => { A = await home("dd-a", "child"); B = await home("dd-b"); C = await home("dd-c"); });

    it("keeps no day while no check-up has found depth", async () => {
      await depth(A.profile.id, 30, 1600, "worse");
      expect(await syncDepthDay(A.profile.id)).toBeNull();
      expect((await depthDayFor(await member(A))).story).toMatchObject({ state: "not_yet", checks: 1 });
      expect(await depthDayNote(await member(A))).toBeNull();
    });

    it("keeps the day of the first check-up that found depth, and points at it on Today", async () => {
      await depth(A.profile.id, 5, 760, null);
      const v = await depthDayFor(await member(A));
      expect(v.kept).toEqual({ day: addDays(today, -5), arcsec: 760, playedAt: null });
      expect(v.story).toMatchObject({ state: "first", before: 1 });
      expect(await depthDayNote(await member(A))).toEqual({ kind: "new", day: addDays(today, -5), years: 0 });
    });

    it("never moves the day: a later check-up changes what is said since, not the day", async () => {
      await depth(A.profile.id, 2, 1600, "worse");
      await depth(A.profile.id, 1, 190, null);
      const v = await depthDayFor(await member(A));
      expect(v.kept).toMatchObject({ day: addDays(today, -5), arcsec: 760 });
      expect(v.since).toEqual({ checks: 2, found: 1, latestFound: true });
    });

    it("keeps no day for a member whose very first check-up found depth, and tells them nothing was gained", async () => {
      await depth(B.profile.id, 9, 200, null);
      await depth(B.profile.id, 2, 100, null);
      const v = await depthDayFor(await member(B));
      expect(v.kept).toBeNull();
      expect(v.story).toMatchObject({ state: "from_start", arcsec: 200 });
      expect(await depthDayNote(await member(B))).toBeNull();
      expect(await db.select().from(s.depthDay).where(eq(s.depthDay.profileId, B.profile.id))).toEqual([]);
    });

    it("lets only someone who may train mark the scene as played, and only once", async () => {
      expect(await markPlayed(await member(A, { seat: "circle" }))).toBe(false);
      expect((await depthDayFor(await member(A))).kept?.playedAt).toBeNull();
      const when = new Date(now.getTime() - 60_000);
      expect(await markPlayed(await member(A, { childMode: true }), when)).toBe(true);
      expect(await markPlayed(await member(A))).toBe(false);
      expect((await depthDayFor(await member(A))).kept?.playedAt).toEqual(when);
      expect(await depthDayNote(await member(A))).toBeNull();
    });

    it("cannot mark another household's day, and has nothing to mark where no day is kept", async () => {
      await depth(C.profile.id, 8, 1600, "worse");
      await depth(C.profile.id, 3, 800, null);
      await syncDepthDay(C.profile.id);
      /* B has no day of its own; being signed in as B never reaches C's */
      expect(await markPlayed(await member(B))).toBe(false);
      expect((await depthDayFor(await member(C))).kept?.playedAt).toBeNull();
    });

    it("does not show the scene to a child under four", async () => {
      const small = { ...A.profile, birthYear: now.getFullYear() - 3 };
      expect((await depthDayFor(await member(A, { profile: small }))).mayWatch).toBe(false);
      expect((await depthDayFor(await member(A))).mayWatch).toBe(true);
    });
  });

  /* ───────────── Sunset Rule ───────────── */
  describe("Sunset Rule", () => {
    let A: Home, B: Home;
    const noon = at(today, 12), night = at(today, 22);
    beforeAll(async () => {
      A = await home("sun-a");
      B = await home("sun-b");
      await running(A.profile.id);
      await running(B.profile.id);
    });
    const minutes = (h: Home, trainMinutes: number, lightMinutes = 20) =>
      db.insert(s.daySummary).values({ profileId: h.profile.id, day: today, trainMinutes, trainGoal: 15, lightMinutes })
        .onConflictDoUpdate({ target: [s.daySummary.profileId, s.daySummary.day], set: { trainMinutes, lightMinutes } });

    it("keeps the sun up while minutes are left", async () => {
      await minutes(A, 9);
      expect((await sunsetFor(await member(A), noon)).sunset).toEqual({ state: "open", share: 9 / 15, left: 6 });
    });

    it("sets the sun when the day's minutes are done, and invites outside while it can be light", async () => {
      await minutes(A, 15);
      const v = await sunsetFor(await member(A), noon);
      expect(v.sunset).toEqual({ state: "set", cap: false, outside: "go", lightLeft: 70 });
      expect(v.links).toEqual({ hunt: true, log: true });
      expect((await sunsetFor(await member(A), night)).sunset).toMatchObject({ state: "set", outside: "tomorrow" });
    });

    it("says the Light ring is full when it is", async () => {
      await minutes(A, 15, 95);
      expect((await sunsetFor(await member(A), noon)).sunset).toMatchObject({ state: "set", outside: "full" });
    });

    it("shows rest and no sunset on a day a session was stopped for feeling unwell", async () => {
      await minutes(B, 15);
      await db.insert(s.session).values({ profileId: B.profile.id, kind: "game", itemSlug: "firefly-catch", ring: "train", minutes: 2, endReason: "stop_rule", startedAt: at(today, 9), endedAt: at(today, 9) });
      expect((await sunsetFor(await member(B), noon)).sunset).toEqual({ state: "rest", dayDone: true });
      /* a stop on another day does not count, and neither does another household's */
      expect((await sunsetFor(await member(A), noon)).sunset.state).toBe("set");
    });

    it("never sets in a staff test household", async () => {
      expect((await sunsetFor(await member(A, { tester: true }), noon)).sunset).toEqual({ state: "tester" });
    });
  });

  /* ───────────── Keeper Graduation ───────────── */
  describe("Keeper Graduation", () => {
    let A: Home, B: Home, C: Home, D: Home, E: Home, kid: Home;
    beforeAll(async () => {
      [A, B, C, D, E] = await Promise.all(["kg-a", "kg-b", "kg-c", "kg-d", "kg-e"].map((t) => home(t)));
      kid = await home("kg-kid", "child");
    });

    it("counts a course that ran its weeks as finished, and not one that was left early", async () => {
      expect(await graduateOf(A.profile.id)).toBeNull();
      await db.insert(s.enrolment).values({ profileId: A.profile.id, programme: COURSE, dailyMinutes: 15, daysPerWeek: 5, week: 2, status: "finished", startedAt: at(addDays(today, -80)), endedAt: at(addDays(today, -70)) });
      expect(await graduateOf(A.profile.id)).toBeNull();
      await finished(A.profile.id);
      expect(await graduateOf(A.profile.id)).toMatchObject({ weeks: WEEKS, end: "counsellor" });
    });

    it("gives the journey in days, from the profile's own rows inside the course", async () => {
      const g = (await graduateOf(A.profile.id))!, start = dayOf(g.enrolment.startedAt);
      await db.insert(s.daySummary).values([
        { profileId: A.profile.id, day: start, trainMinutes: 15, trainGoal: 15 },
        { profileId: A.profile.id, day: addDays(start, 8), trainMinutes: 6, trainGoal: 15 },
        { profileId: A.profile.id, day: addDays(start, -1), trainMinutes: 15, trainGoal: 15 },
        { profileId: B.profile.id, day: addDays(start, 2), trainMinutes: 15, trainGoal: 15 },
      ]);
      expect(await journeyFor(g)).toMatchObject({ weeks: WEEKS, practised: 2, finished: 1, weeksWithPractice: 2 });
    });

    it("lets only a guardian, out of child mode, in a real household leave a welcome, and only a line from the list", async () => {
      expect(await leaveWelcome(await member(A, { seat: "circle" }), "first_weeks")).toEqual({ ok: false, why: "not_allowed" });
      expect(await leaveWelcome(await member(A, { childMode: true }), "first_weeks")).toEqual({ ok: false, why: "not_allowed" });
      expect(await leaveWelcome(await member(A, { tester: true }), "first_weeks")).toEqual({ ok: false, why: "tester" });
      expect(await leaveWelcome(await member(A), "Call us on 98...")).toEqual({ ok: false, why: "bad_line" });
      expect(await leaveWelcome(await member(B), "first_weeks")).toEqual({ ok: false, why: "not_graduate" });
      expect(await db.select().from(s.keeperWelcome).where(eq(s.keeperWelcome.accountId, A.account.id))).toEqual([]);
    });

    it("needs the household's parental consent for a child, on both sides", async () => {
      await finished(kid.profile.id);
      expect(await leaveWelcome(await member(kid), "glasses")).toEqual({ ok: false, why: "consent" });
      await db.insert(s.consent).values({ profileId: kid.profile.id, accountId: kid.account.id, userId: kid.user.id, kind: "parental", textVersion: "test" });
      expect(await leaveWelcome(await member(kid), "glasses")).toEqual({ ok: true, met: false });
      /* tidy: this welcome must not meet the asks below */
      expect(await takeBackWelcome(await member(kid))).toEqual({ ok: true });
    });

    it("keeps a welcome waiting until a family asks, one welcome for one finished course", async () => {
      expect(await leaveWelcome(await member(A), "split_it")).toEqual({ ok: true, met: false });
      expect(await leaveWelcome(await member(A), "glasses")).toEqual({ ok: false, why: "already" });
      expect((await keeperFor(await member(A))).graduate?.welcome).toMatchObject({ line: "split_it", givenAt: null, thanks: null });
    });

    it("lets a family new to a course ask once, and gives it the waiting welcome at once", async () => {
      expect(await askForWelcome(await member(B))).toEqual({ ok: false, why: "not_on_course" });
      await running(B.profile.id);
      expect(await askForWelcome(await member(B, { seat: "circle" }))).toEqual({ ok: false, why: "not_allowed" });
      expect(await askForWelcome(await member(B, { tester: true }))).toEqual({ ok: false, why: "tester" });
      expect(await askForWelcome(await member(B))).toEqual({ ok: true, met: true });
      expect(await askForWelcome(await member(B))).toEqual({ ok: false, why: "already" });
      const b = await keeperFor(await member(B)), a = await keeperFor(await member(A));
      expect(b.ask).toMatchObject({ line: "split_it" });
      expect(b.ask?.receivedAt).not.toBeNull();
      expect(a.graduate?.welcome?.givenAt).not.toBeNull();
    });

    it("shows neither family anything of the other: no name, no id, no place", async () => {
      const a = JSON.stringify(await keeperFor(await member(A))), b = JSON.stringify(await keeperFor(await member(B)));
      for (const secret of [B.account.id, B.profile.id, B.user.id, B.account.displayName, B.profile.displayName, B.user.displayName]) expect(a).not.toContain(secret);
      for (const secret of [A.account.id, A.profile.id, A.user.id, A.account.displayName, A.profile.displayName, A.user.displayName]) expect(b).not.toContain(secret);
      /* the keeper's row holds no pointer to the family that received it */
      const [row] = await db.select().from(s.keeperWelcome).where(eq(s.keeperWelcome.accountId, A.account.id));
      expect(JSON.stringify(row)).not.toContain(B.account.id);
      expect(JSON.stringify(row)).not.toContain(B.profile.id);
    });

    it("gives one welcome to one family: the next family waits for the next keeper", async () => {
      await running(C.profile.id);
      expect(await askForWelcome(await member(C))).toEqual({ ok: true, met: false });
      expect((await keeperFor(await member(C))).ask).toMatchObject({ line: null, receivedAt: null });
      await finished(D.profile.id);
      expect(await leaveWelcome(await member(D), "not_alone")).toEqual({ ok: true, met: true });
      expect((await keeperFor(await member(C))).ask).toMatchObject({ line: "not_alone" });
    });

    it("never gives a household its own welcome", async () => {
      const [other] = await db.insert(s.profile).values({ accountId: E.account.id, displayName: `Second${x}`, kind: "adult" }).returning();
      await finished(E.profile.id);
      await running(other.id);
      expect(await leaveWelcome(await member(E), "small_days")).toEqual({ ok: true, met: false });
      expect(await askForWelcome(await member(E, { profile: other }))).toEqual({ ok: true, met: false });
      expect((await keeperFor(await member(E))).graduate?.welcome?.givenAt).toBeNull();
      /* tidy: neither may meet a row of a later test */
      expect(await stopAsking(await member(E, { profile: other }))).toEqual({ ok: true });
      expect(await takeBackWelcome(await member(E))).toEqual({ ok: true });
      expect(await db.select().from(s.keeperWelcome).where(eq(s.keeperWelcome.accountId, E.account.id))).toEqual([]);
      expect(await db.select().from(s.keeperAsk).where(eq(s.keeperAsk.accountId, E.account.id))).toEqual([]);
    });

    it("carries one thank-you line from the list back to the keeper, once", async () => {
      expect(await sendThanks(await member(B), "Where do you live?")).toEqual({ ok: false, why: "bad_line" });
      expect(await sendThanks(await member(B, { childMode: true }), "thank_you")).toEqual({ ok: false, why: "not_allowed" });
      expect(await sendThanks(await member(A), "thank_you")).toEqual({ ok: false, why: "nothing" });
      expect(await sendThanks(await member(B), "it_helped")).toEqual({ ok: true });
      expect(await sendThanks(await member(B), "thank_you")).toEqual({ ok: false, why: "already" });
      expect((await keeperFor(await member(A))).graduate?.welcome?.thanks).toBe("it_helped");
      expect((await keeperFor(await member(B))).ask?.thanks).toBe("it_helped");
      /* C's thanks go to D, never to A */
      expect(await sendThanks(await member(C), "we_will")).toEqual({ ok: true });
      expect((await keeperFor(await member(A))).graduate?.welcome?.thanks).toBe("it_helped");
      expect((await keeperFor(await member(D))).graduate?.welcome?.thanks).toBe("we_will");
    });

    it("does not let a welcome that was given be taken back, or an ask that was answered be withdrawn", async () => {
      expect(await takeBackWelcome(await member(A))).toEqual({ ok: false, why: "given" });
      expect(await stopAsking(await member(B))).toEqual({ ok: false, why: "given" });
      expect(await takeBackWelcome(await member(B))).toEqual({ ok: false, why: "nothing" });
    });

    it("leaves the new family its line when the keeper's household is deleted, and the keeper its record when the new family is", async () => {
      /* D, the keeper of C's welcome, is deleted */
      await db.delete(s.account).where(eq(s.account.id, D.account.id));
      const c = await keeperFor(await member(C));
      expect(c.ask).toMatchObject({ line: "not_alone", thanks: "we_will" });
      const [ask] = await db.select().from(s.keeperAsk).where(eq(s.keeperAsk.accountId, C.account.id));
      expect(ask.welcomeId).toBeNull();
      /* B, the family that received A's welcome, is deleted */
      await db.delete(s.account).where(eq(s.account.id, B.account.id));
      expect((await keeperFor(await member(A))).graduate?.welcome).toMatchObject({ line: "split_it", thanks: "it_helped" });
      expect((await keeperFor(await member(A))).graduate?.welcome?.givenAt).not.toBeNull();
    });
  });
});
