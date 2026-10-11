// Eyes Opener: The server rules of four community ideas, against a real database: Lights On Hour, Cinema Club, Class Mission.
/**
 * The server rules of four community ideas, against a real database: Lights On Hour, Cinema Club, Class Mission
 * and Wish Jam. It makes throwaway households, a throwaway sponsor and throwaway staff, never touches anyone
 * else's rows, and removes what it made. The shared setting of the hour is read and never written.
 * It needs a database with the current tables. Where none answers (the checks on GitHub have none), it is skipped.
 */
import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => { try { process.loadEnvFile(".env.local"); } catch { /* no file: the default address is used */ } });

import { and, eq, inArray, like, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { decideModeration, openModeration } from "./admin";
import type { SponsorSeat, Viewer } from "./auth";
import { closeOwnClub, createClub, listedClubs, removeClub, sponsorClubs } from "./cinema-club-data";
import { giveMission, householdMissions, markMissionDone, takeBackMission } from "./class-mission-data";
import { dayOf } from "./league";
import { hourAt, LIGHTS_MIN } from "./lights-on";
import { householdsIn, lightsOnFor, ownLantern, readHour } from "./lights-on-data";
import { memberCan, type MemberAction, type Seat } from "./roles";
import type { Member } from "./session";
import { householdWishes, makeWish, offerName, publicWishes, staffWishes, takeStaffStep, tieGame, withdrawWish } from "./wish-jam-data";

const up = await db.execute(sql`select 1 from cinema_club, class_mission, wish limit 0`).then(() => true, () => false);
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const x = crypto.randomBytes(5).toString("hex"), TAG = `zz-gatherings-${x}`;
/** The same mark in letters only: a place name or a short line with a run of digits in it would be taken for a phone number. */
const L = x.replace(/\d/g, (d) => "ghijklmnop"[Number(d)]);
const MIN = 60_000;

type Profile = typeof s.profile.$inferSelect;
type User = typeof s.appUser.$inferSelect;
interface Home { id: string; name: string; guardian: User; cheer: User; profiles: Profile[] }

const member = (h: Home, o: { user?: User; seat?: Seat; active?: Profile; childMode?: boolean; tester?: boolean } = {}) => {
  const seat = o.seat ?? "guardian", childMode = o.childMode ?? false;
  return {
    account: { id: h.id, displayName: h.name }, user: o.user ?? h.guardian, profiles: h.profiles, profile: o.active ?? h.profiles[0], seat, childMode, tester: o.tester ?? false,
    can: (a: MemberAction) => memberCan(seat, a, childMode),
  } as unknown as Member;
};
const cheer = (h: Home) => member(h, { user: h.cheer, seat: "circle" });
const asViewer = (user: User) => ({ user }) as unknown as Viewer;

describe.skipIf(!up)("four gatherings, against the database", () => {
  const homes: Home[] = [];
  const extra: string[] = [];
  let staff: User, sponsorPerson: User, otherSponsorPerson: User;
  let sunrise: SponsorSeat, other: SponsorSeat, pending: SponsorSeat;
  const sponsors: string[] = [], clubs: string[] = [], hazards: string[] = [], refs: string[] = [];

  /** A household with a guardian, a cheer seat, and the profiles asked for. Family names are made up from the tag. */
  async function home(n: number, profiles: { name: string; kind: "adult" | "child"; birthYear?: number }[], over: Partial<typeof s.account.$inferInsert> = {}): Promise<Home> {
    const name = `Zzfam${n} ${L} family`;
    const [a] = await db.insert(s.account).values({ displayName: name, ...over }).returning();
    const [guardian, cheerSeat] = await db.insert(s.appUser).values([
      { email: `g${n}-${x}@iopener.test`, displayName: `Guardian${n} ${TAG}`, accountId: a.id, seat: "guardian" as const },
      { email: `c${n}-${x}@iopener.test`, displayName: `Cheer${n} ${TAG}`, accountId: a.id, seat: "circle" as const },
    ]).returning();
    const rows = profiles.length ? await db.insert(s.profile).values(profiles.map((p) => ({ accountId: a.id, displayName: p.name, kind: p.kind, birthYear: p.birthYear ?? null }))).returning() : [];
    const h = { id: a.id, name, guardian, cheer: cheerSeat, profiles: rows };
    homes.push(h);
    return h;
  }
  const consent = (h: Home, p: Profile) => db.insert(s.consent).values({ profileId: p.id, accountId: h.id, userId: h.guardian.id, kind: "parental", textVersion: "test" });
  const year = new Date().getFullYear();

  let A: Home, B: Home;
  beforeAll(async () => {
    A = await home(1, [{ name: "Kiddo Lastname", kind: "child", birthYear: year - 6 }, { name: "Mum", kind: "adult" }, { name: "Sis", kind: "child", birthYear: year - 9 }, { name: "Tiny", kind: "child", birthYear: year - 2 }]);
    B = await home(2, [{ name: "Otherkid", kind: "child", birthYear: year - 8 }]);
    for (const p of [A.profiles[0], A.profiles[3]]) await consent(A, p);
    await consent(B, B.profiles[0]);

    [staff, sponsorPerson, otherSponsorPerson] = await db.insert(s.appUser).values([
      { email: `staff-${x}@iopener.test`, displayName: `Staff ${TAG}`, staffRole: "ops" as const },
      { email: `sp1-${x}@iopener.test`, displayName: `Sponsor1 ${TAG}` },
      { email: `sp2-${x}@iopener.test`, displayName: `Sponsor2 ${TAG}` },
    ]).returning();
    const made = await db.insert(s.sponsor).values([
      { name: `${TAG} one`, kind: "ngo" as const, status: "approved" as const },
      { name: `${TAG} two`, kind: "school" as const, status: "approved" as const },
      { name: `${TAG} three`, kind: "school" as const, status: "pending" as const },
    ]).returning();
    sponsors.push(...made.map((m) => m.id));
    const seat = (i: number): SponsorSeat => ({ sponsorId: made[i].id, name: made[i].name, status: made[i].status, role: "owner" });
    sunrise = seat(0); other = seat(1); pending = seat(2);
  });

  afterAll(async () => {
    const wishIds = homes.length ? (await db.select({ id: s.wish.id }).from(s.wish).where(inArray(s.wish.accountId, homes.map((h) => h.id)))).map((w) => w.id) : [];
    const pointed = [...new Set([...wishIds, ...clubs, ...refs])];
    if (pointed.length) await db.delete(s.moderationItem).where(inArray(s.moderationItem.refId, pointed));
    if (clubs.length) await db.delete(s.cinemaClub).where(inArray(s.cinemaClub.id, clubs));
    if (sponsors.length) await db.delete(s.sponsor).where(inArray(s.sponsor.id, sponsors));
    if (hazards.length) await db.delete(s.hazardRule).where(inArray(s.hazardRule.id, hazards));
    const ids = [...homes.map((h) => h.id), ...extra];
    if (ids.length) await db.delete(s.account).where(inArray(s.account.id, ids));
    const people = await db.select({ id: s.appUser.id }).from(s.appUser).where(like(s.appUser.email, `%-${x}@iopener.test`));
    if (people.length) await db.delete(s.auditLog).where(inArray(s.auditLog.userId, people.map((p) => p.id)));
    await db.delete(s.appUser).where(like(s.appUser.email, `%-${x}@iopener.test`));
  });

  /* ───────────── Lights On Hour ───────────── */

  describe("Lights On Hour", () => {
    /* An hour long ago that no other row falls in: the first hour after 1 March 2001, by whatever the setting is now. */
    let hour: { start: Date; end: Date };
    const families: Home[] = [];
    const inside = (minutes: number) => new Date(hour.start.getTime() + minutes * MIN);
    const practice = (p: Profile, startedAt: Date, over: Partial<typeof s.session.$inferInsert> = {}) =>
      db.insert(s.session).values({ profileId: p.id, kind: "game", itemSlug: "comet-trail", ring: "train", minutes: 2, endReason: "done", startedAt, endedAt: new Date(startedAt.getTime() + 2 * MIN), ...over });

    beforeAll(async () => {
      hour = hourAt(new Date("2001-03-01T00:00:00Z"), await readHour()).hour;
      for (let i = 0; i < LIGHTS_MIN + 1; i++) families.push(await home(20 + i, [{ name: "Grown", kind: "adult" }, { name: "Child", kind: "child", birthYear: year - 7 }]));
    });

    it("shows no number while fewer households than the minimum are practising, and tells a household about its own lantern all the same", async () => {
      expect(await householdsIn(hour)).toBeNull();
      for (let i = 0; i < LIGHTS_MIN - 1; i++) await practice(families[i].profiles[0], inside(5 + i));
      expect(await householdsIn(hour)).toBeNull();
      expect(await ownLantern(member(families[0]), hour)).toBe(true);
      expect(await ownLantern(member(families[LIGHTS_MIN]), hour)).toBe(false);
      const view = await lightsOnFor(member(families[0]), inside(30));
      expect(view).toMatchObject({ on: true, households: null, own: true, preview: null });
    });

    it("leaves out sessions that are not practice in the hour: care routines, check-ups, and sessions wholly outside it", async () => {
      const p = families[LIGHTS_MIN - 1].profiles[0];
      await practice(p, inside(10), { kind: "exercise", itemSlug: "drop-reminder-routine", ring: "rest" });
      await practice(p, inside(12), { kind: "test", itemSlug: "acuity" });
      await practice(p, inside(-30));
      await practice(p, inside(61));
      expect(await householdsIn(hour)).toBeNull();
      expect(await ownLantern(member(families[LIGHTS_MIN - 1]), hour)).toBe(false);
    });

    it("leaves out a child whose consent does not stand, an archived profile and a staff test household", async () => {
      const f = families[LIGHTS_MIN - 1], child = f.profiles[1];
      await practice(child, inside(20));
      expect(await householdsIn(hour)).toBeNull();
      const [preview] = await db.insert(s.account).values({ displayName: `${TAG} preview`, previewFor: staff.id }).returning();
      extra.push(preview.id);
      const [tester] = await db.insert(s.profile).values({ accountId: preview.id, displayName: "Tester", kind: "adult" }).returning();
      await practice(tester, inside(21));
      const [gone] = await db.insert(s.profile).values({ accountId: families[LIGHTS_MIN].id, displayName: "Gone", kind: "adult", archivedAt: new Date() }).returning();
      await practice(gone, inside(22));
      expect(await householdsIn(hour)).toBeNull();

      /* with consent the child's session counts, and that makes the fifth household */
      await consent(f, child);
      expect(await householdsIn(hour)).toBe(LIGHTS_MIN);
      await db.update(s.consent).set({ revokedAt: new Date() }).where(eq(s.consent.profileId, child.id));
      expect(await householdsIn(hour)).toBeNull();
      await db.update(s.consent).set({ revokedAt: null }).where(eq(s.consent.profileId, child.id));
    });

    it("counts a household once however many of its people practise, and counts a session that only finished inside the hour", async () => {
      await practice(families[0].profiles[1], inside(40));
      await consent(families[0], families[0].profiles[1]);
      expect(await householdsIn(hour)).toBe(LIGHTS_MIN);
      /* started before the hour, finished inside it */
      await practice(families[LIGHTS_MIN].profiles[0], inside(-5), { endedAt: inside(3) });
      expect(await householdsIn(hour)).toBe(LIGHTS_MIN + 1);
    });

    it("gives the page a number and nothing that names anyone, and nothing at all outside the hour", async () => {
      const on = await lightsOnFor(member(families[1]), inside(30));
      expect(on).toMatchObject({ on: true, households: LIGHTS_MIN + 1, own: true });
      expect(Object.keys(on).sort()).toEqual(["festivalDay", "hour", "households", "last", "on", "own", "preview", "setting"]);
      const before = await lightsOnFor(member(families[1]), inside(-1));
      expect(before).toMatchObject({ on: false, households: null, own: false });
      const after = await lightsOnFor(member(families[1]), inside(60));
      expect(after.on).toBe(false);
      expect(after.last).toMatchObject({ households: LIGHTS_MIN + 1 });
      expect(after.last.hour.start.getTime()).toBe(hour.start.getTime());
    });

    it("draws sample lanterns for a staff preview and counts nobody for it", async () => {
      const view = await lightsOnFor(member(A, { tester: true }), new Date(), "festival");
      expect(view).toMatchObject({ on: true, own: true, preview: "festival", hour: { festival: true } });
      expect(view.households).toBeGreaterThanOrEqual(LIGHTS_MIN);
    });

    it("writes nothing when a household takes part: the page only reads", async () => {
      const count = async () => (await db.select({ n: sql<number>`count(*)::int` }).from(s.session).where(inArray(s.session.profileId, families.flatMap((f) => f.profiles.map((p) => p.id)))))[0].n;
      const before = await count();
      await lightsOnFor(member(families[0]), inside(30));
      expect(await count()).toBe(before);
    });
  });

  /* ───────────── Cinema Club ───────────── */

  describe("Cinema Club", () => {
    const place = (n: string) => `Zz${L} ${n} Library, Testtown`;
    const good = (n: string) => ({ placeKind: "library", placeName: place(n), weekday: 6, startMinute: 17 * 60 });
    const row = async (id: string) => (await db.select().from(s.cinemaClub).where(eq(s.cinemaClub.id, id)))[0];
    const item = async (clubId: string) => (await db.select().from(s.moderationItem).where(and(eq(s.moderationItem.kind, "club"), eq(s.moderationItem.refId, clubId))))[0];
    const shown = async (name: string) => (await listedClubs()).find((c) => c.placeName === name) ?? null;
    let first = "";

    it("keeps a sponsor's listing off the list until a person approves it, and records who listed it", async () => {
      const made = await createClub(asViewer(sponsorPerson), sunrise, good("one"));
      expect(made).toMatchObject({ ok: true, status: "in_review" });
      if (!made.ok) return;
      first = made.id; clubs.push(made.id);
      expect(await shown(place("one"))).toBeNull();
      expect(await item(made.id)).toMatchObject({ status: "open" });
      const [log] = await db.select().from(s.auditLog).where(and(eq(s.auditLog.action, "sponsor.club.list"), eq(s.auditLog.target, made.id)));
      expect(log).toMatchObject({ userId: sponsorPerson.id });
      /* the moderation room shows the place and the time, and screens the name */
      const entry = (await openModeration()).find((e) => e.item.refId === made.id);
      expect(entry?.subject).toMatchObject({ kind: "gathering", of: "club", placeName: place("one"), weekday: 6, startMinute: 1020, sponsor: sunrise.name });
      expect(entry?.hazards).toEqual([]);
    });

    it("lists it once approved, as a place and a time and nothing else", async () => {
      const open = await item(first);
      expect(await decideModeration(open.id, "approved", staff.id)).toMatchObject({ name: place("one") });
      const club = await shown(place("one"));
      expect(club).toEqual({ id: first, placeKind: "library", placeName: place("one"), weekday: 6, startMinute: 1020, isSample: false });
      expect(await row(first)).toMatchObject({ status: "listed" });
    });

    it("never stores a private home, a phone number, or a kind of place that is not on the list", async () => {
      const before = (await sponsorClubs(sunrise)).length;
      expect(await createClub(asViewer(sponsorPerson), sunrise, { ...good("x"), placeName: `Mrs ${L}'s house, Testtown` })).toEqual({ ok: false, why: "home" });
      expect(await createClub(asViewer(sponsorPerson), sunrise, { ...good("x"), placeName: `${L} hall, call 98765 43210` })).toEqual({ ok: false, why: "contact" });
      expect(await createClub(asViewer(sponsorPerson), sunrise, { ...good("x"), placeKind: "home" })).toEqual({ ok: false, why: "kind" });
      expect(await createClub(asViewer(sponsorPerson), sunrise, { ...good("x"), startMinute: 23 * 60 })).toEqual({ ok: false, why: "time" });
      expect(await createClub(asViewer(staff), null, { ...good("x"), placeName: `Our flat in ${L}town` })).toEqual({ ok: false, why: "home" });
      expect((await sponsorClubs(sunrise)).length).toBe(before);
    });

    it("refuses a sponsor that is not approved", async () => {
      expect(await createClub(asViewer(sponsorPerson), pending, good("pending"))).toEqual({ ok: false, why: "not_approved" });
      expect(await sponsorClubs(pending)).toEqual([]);
    });

    it("refuses a name the hazard screen stops, and stores nothing", async () => {
      const [rule] = await db.insert(s.hazardRule).values({ pattern: `zzhazard${L}`, reason: `test rule ${x}` }).returning();
      hazards.push(rule.id);
      expect(await createClub(asViewer(sponsorPerson), sunrise, { ...good("y"), placeName: `Library zzhazard${L}, Testtown` })).toEqual({ ok: false, why: "hazard" });
      expect((await sponsorClubs(sunrise)).some((c) => c.placeName.includes("zzhazard"))).toBe(false);
    });

    it("shows a listing by staff at once, with no review item", async () => {
      const made = await createClub(asViewer(staff), null, { ...good("staff"), placeKind: "school" });
      expect(made).toMatchObject({ ok: true, status: "listed" });
      if (!made.ok) return;
      clubs.push(made.id);
      expect(await shown(place("staff"))).toMatchObject({ placeKind: "school" });
      expect(await item(made.id)).toBeUndefined();
      const [log] = await db.select().from(s.auditLog).where(and(eq(s.auditLog.action, "admin.gatherings.club.list"), eq(s.auditLog.target, made.id)));
      expect(log).toMatchObject({ userId: staff.id });
    });

    it("lets a sponsor see and close only its own clubs", async () => {
      expect((await sponsorClubs(other)).some((c) => c.id === first)).toBe(false);
      expect(await closeOwnClub(asViewer(otherSponsorPerson), other, first)).toBe(false);
      expect(await row(first)).toMatchObject({ status: "listed" });
      expect(await closeOwnClub(asViewer(sponsorPerson), sunrise, first)).toBe(true);
      expect(await shown(place("one"))).toBeNull();
      expect((await sponsorClubs(sunrise)).find((c) => c.id === first)).toMatchObject({ status: "closed" });
      expect(await closeOwnClub(asViewer(sponsorPerson), sunrise, first)).toBe(false);
    });

    it("withdraws a waiting listing with its review item, so a later decision changes nothing", async () => {
      const made = await createClub(asViewer(sponsorPerson), sunrise, good("two"));
      if (!made.ok) throw new Error("not made");
      clubs.push(made.id);
      const open = await item(made.id);
      expect(await closeOwnClub(asViewer(sponsorPerson), sunrise, made.id)).toBe(true);
      expect(await item(made.id)).toMatchObject({ status: "removed" });
      expect(await decideModeration(open.id, "approved", staff.id)).toBeNull();
      expect(await row(made.id)).toMatchObject({ status: "closed" });
      expect(await shown(place("two"))).toBeNull();
    });

    it("keeps a removed listing off the list, and lets staff take a listed club off", async () => {
      const made = await createClub(asViewer(sponsorPerson), sunrise, good("three"));
      if (!made.ok) throw new Error("not made");
      clubs.push(made.id);
      await decideModeration((await item(made.id)).id, "removed", staff.id);
      expect(await row(made.id)).toMatchObject({ status: "removed" });
      expect(await shown(place("three"))).toBeNull();
      expect(await removeClub(asViewer(staff), made.id)).toBe(false);

      const fourth = await createClub(asViewer(staff), null, good("four"));
      if (!fourth.ok) throw new Error("not made");
      clubs.push(fourth.id);
      expect(await removeClub(asViewer(staff), fourth.id)).toBe(true);
      expect(await shown(place("four"))).toBeNull();
      const [log] = await db.select().from(s.auditLog).where(and(eq(s.auditLog.action, "admin.gatherings.club.remove"), eq(s.auditLog.target, fourth.id)));
      expect(log).toMatchObject({ userId: staff.id });
    });
  });

  /* ───────────── Class Mission ───────────── */

  describe("Class Mission", () => {
    const kid = () => A.profiles[0], mum = () => A.profiles[1], sis = () => A.profiles[2];
    const rows = (profileId: string) => db.select().from(s.classMission).where(eq(s.classMission.profileId, profileId));
    const today = dayOf(new Date());

    it("is a guardian's to give, for a child of the household whose consent stands", async () => {
      expect(await giveMission(cheer(A), kid().id)).toEqual({ ok: false, why: "not_allowed" });
      expect(await giveMission(member(A, { childMode: true }), kid().id)).toEqual({ ok: false, why: "not_allowed" });
      expect(await giveMission(member(A), mum().id)).toEqual({ ok: false, why: "not_child" });
      expect(await giveMission(member(A), sis().id)).toEqual({ ok: false, why: "needs_consent" });
      /* a child of another household is not found, even with the right id */
      expect(await giveMission(member(B), kid().id)).toEqual({ ok: false, why: "not_found" });
      expect(await rows(kid().id)).toHaveLength(0);

      expect(await giveMission(member(A), kid().id)).toEqual({ ok: true, name: "Kiddo Lastname" });
      expect(await rows(kid().id)).toMatchObject([{ givenBy: A.guardian.id, doneOn: null }]);
    });

    it("is one at a time, also when two taps arrive together", async () => {
      expect(await giveMission(member(A), kid().id)).toEqual({ ok: false, why: "already" });
      const both = await Promise.all([giveMission(member(B), B.profiles[0].id), giveMission(member(B), B.profiles[0].id)]);
      expect(both.filter((r) => r.ok)).toHaveLength(1);
      expect(await rows(B.profiles[0].id)).toHaveLength(1);
    });

    it("shows a household its own children only", async () => {
      const mine = await householdMissions(member(A));
      expect(mine.map((c) => c.name)).toEqual(["Kiddo Lastname", "Sis", "Tiny"]);
      expect(mine[0]).toMatchObject({ state: "given", consented: true });
      expect(mine[1]).toMatchObject({ state: "none", consented: false, open: null });
      const theirs = await householdMissions(member(B));
      expect(theirs.map((c) => c.name)).toEqual(["Otherkid"]);
    });

    it("keeps only the day it was run, marked by a guardian of the same household", async () => {
      const [open] = await rows(kid().id);
      const theirs = (await rows(B.profiles[0].id))[0];
      expect(await markMissionDone(member(B), open.id, today)).toEqual({ ok: false, why: "not_found" });
      expect(await markMissionDone(cheer(A), open.id, today)).toEqual({ ok: false, why: "not_allowed" });
      expect(await markMissionDone(member(A, { childMode: true }), open.id, today)).toEqual({ ok: false, why: "not_allowed" });
      expect(await markMissionDone(member(A), open.id, "2999-01-01")).toEqual({ ok: false, why: "bad_day" });
      expect(await markMissionDone(member(A), open.id, "2001-01-01")).toEqual({ ok: false, why: "bad_day" });
      expect(await markMissionDone(member(A), theirs.id, today)).toEqual({ ok: false, why: "not_found" });
      expect(await markMissionDone(member(A), open.id, today)).toEqual({ ok: true, name: "Kiddo Lastname" });
      expect(await markMissionDone(member(A), open.id, today)).toEqual({ ok: false, why: "already" });
      const [row] = await rows(kid().id);
      expect(row.doneOn).toBe(today);
      /* the row holds nothing but who was given it and the two dates */
      expect(Object.keys(row).sort()).toEqual(["doneOn", "givenAt", "givenBy", "id", "profileId"]);
    });

    it("lets a guardian take back a mission that has not been run, and deletes it", async () => {
      const [done] = await rows(kid().id);
      expect(await takeBackMission(member(A), done.id)).toEqual({ ok: false, why: "already" });
      expect(await giveMission(member(A), kid().id)).toMatchObject({ ok: true });
      const open = (await rows(kid().id)).find((r) => r.doneOn === null)!;
      expect(await takeBackMission(member(B), open.id)).toEqual({ ok: false, why: "not_found" });
      expect(await takeBackMission(cheer(A), open.id)).toEqual({ ok: false, why: "not_allowed" });
      expect(await takeBackMission(member(A), open.id)).toEqual({ ok: true, name: "Kiddo Lastname" });
      expect(await rows(kid().id)).toHaveLength(1);
      expect((await householdMissions(member(A)))[0]).toMatchObject({ state: "done", open: null });
    });
  });

  /* ───────────── Wish Jam ───────────── */

  describe("Wish Jam", () => {
    const kid = () => A.profiles[0], mum = () => A.profiles[1], sis = () => A.profiles[2], tiny = () => A.profiles[3];
    const wish = (profileId: string, over: Record<string, unknown> = {}) => ({ profileId, loves: "trains", play: "steer", game: "any", line: "Trains instead of blocks.", showFirstName: false, ...over });
    const rowsOf = (h: Home) => db.select().from(s.wish).where(eq(s.wish.accountId, h.id));
    const reviews = (wishId: string, kind: string) => db.select().from(s.moderationItem).where(and(eq(s.moderationItem.kind, kind), eq(s.moderationItem.refId, wishId), eq(s.moderationItem.status, "open")));
    const onList = async (code: string) => (await publicWishes()).find((w) => w.code === code) ?? null;
    let id = "", code = "";

    it("is a guardian's to write, for a child of the household, from the lists", async () => {
      expect(await makeWish(cheer(A), wish(kid().id))).toEqual({ ok: false, why: "not_allowed" });
      expect(await makeWish(member(A, { childMode: true }), wish(kid().id))).toEqual({ ok: false, why: "not_allowed" });
      expect(await makeWish(member(A, { tester: true }), wish(kid().id))).toEqual({ ok: false, why: "tester" });
      expect(await makeWish(member(B), wish(kid().id))).toEqual({ ok: false, why: "not_found" });
      expect(await makeWish(member(A), wish(mum().id))).toEqual({ ok: false, why: "not_child" });
      expect(await makeWish(member(A), wish(sis().id))).toEqual({ ok: false, why: "needs_consent" });
      expect(await makeWish(member(A), wish(tiny().id))).toEqual({ ok: false, why: "too_young" });
      expect(await makeWish(member(A), wish(kid().id, { loves: "Kiddo Lastname of Testtown School" }))).toEqual({ ok: false, why: "bad_choice" });
      expect(await rowsOf(A)).toHaveLength(0);
    });

    it("never stores a line with the child's name, the family's name, a school or a phone number", async () => {
      expect(await makeWish(member(A), wish(kid().id, { line: "Kiddo wants trains" }))).toEqual({ ok: false, why: "text", problem: "name" });
      expect(await makeWish(member(A), wish(kid().id, { line: `For the ${L} children` }))).toEqual({ ok: false, why: "text", problem: "name" });
      expect(await makeWish(member(A), wish(kid().id, { line: "He goes to Hillview School" }))).toEqual({ ok: false, why: "text", problem: "place" });
      expect(await makeWish(member(A), wish(kid().id, { line: "call 98765 43210" }))).toEqual({ ok: false, why: "text", problem: "contact" });
      const stopped = await makeWish(member(A), wish(kid().id, { line: `trains and zzhazard${L}` }));
      expect(stopped).toMatchObject({ ok: false, why: "hazard" });
      expect(await rowsOf(A)).toHaveLength(0);
    });

    it("waits for a person: nobody outside the household can read it before that", async () => {
      const made = await makeWish(member(A), wish(kid().id, { line: "  Trains   instead of blocks. " }));
      expect(made).toMatchObject({ ok: true });
      if (!made.ok) return;
      id = made.id; code = made.code; refs.push(made.id);
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
      expect(await rowsOf(A)).toMatchObject([{ status: "in_review", line: "Trains instead of blocks.", createdBy: A.guardian.id, showFirstName: false }]);
      expect(await reviews(id, "wish")).toHaveLength(1);
      expect(await onList(code)).toBeNull();
      expect((await staffWishes()).some((w) => w.code === code)).toBe(false);
      /* the household itself sees it, and another household does not */
      expect((await householdWishes(member(A))).wishes).toMatchObject([{ code, status: "in_review", open: true, child: "Kiddo Lastname", firstName: null }]);
      expect((await householdWishes(member(B))).wishes).toEqual([]);
      /* the moderation room shows the household and no child's name, because the family did not choose to show one */
      const entry = (await openModeration()).find((e) => e.item.refId === id);
      expect(entry?.subject).toMatchObject({ kind: "gathering", of: "wish", code, household: A.name, firstName: null, band: "4 to 6", line: "Trains instead of blocks." });
    });

    it("is one at a time for a child, also when two arrive together", async () => {
      expect(await makeWish(member(A), wish(kid().id))).toEqual({ ok: false, why: "already" });
      const both = await Promise.all([makeWish(member(B), wish(B.profiles[0].id, { showFirstName: true })), makeWish(member(B), wish(B.profiles[0].id, { showFirstName: true }))]);
      expect(both.filter((r) => r.ok)).toHaveLength(1);
      expect(await rowsOf(B)).toHaveLength(1);
      refs.push((await rowsOf(B))[0].id);
    });

    it("goes on the public list once approved, as a code, an age band and the choices", async () => {
      const [item] = await reviews(id, "wish");
      expect(await decideModeration(item.id, "approved", staff.id)).toMatchObject({ name: `wish ${code}` });
      expect(await onList(code)).toEqual({ code, firstName: null, band: "4 to 6", loves: "trains", play: "steer", game: "any", line: "Trains instead of blocks.", state: "waiting", gameName: null, isSample: false });
      /* the other household chose to show the first name: only the first word of the profile's name is shown */
      const [theirs] = await rowsOf(B);
      await decideModeration((await reviews(theirs.id, "wish"))[0].id, "approved", staff.id);
      expect(await onList(theirs.code)).toMatchObject({ firstName: "Otherkid", band: "7 to 9" });
    });

    it("leaves the public list while consent does not stand, and never lists a staff test household", async () => {
      await db.update(s.consent).set({ revokedAt: new Date() }).where(eq(s.consent.profileId, kid().id));
      expect(await onList(code)).toBeNull();
      expect((await householdWishes(member(A))).wishes[0]).toMatchObject({ consented: false });
      await db.update(s.consent).set({ revokedAt: null }).where(eq(s.consent.profileId, kid().id));
      expect(await onList(code)).not.toBeNull();

      const [preview] = await db.insert(s.account).values({ displayName: `${TAG} preview two`, previewFor: sponsorPerson.id }).returning();
      extra.push(preview.id);
      const [child] = await db.insert(s.profile).values({ accountId: preview.id, displayName: "Tester", kind: "child", birthYear: year - 6 }).returning();
      await db.insert(s.consent).values({ profileId: child.id, accountId: preview.id, kind: "parental", textVersion: "test" });
      await db.insert(s.wish).values({ accountId: preview.id, profileId: child.id, code: `Z${x.slice(0, 5).toUpperCase()}`, loves: "trains", play: "steer", status: "listed", listedAt: new Date() });
      expect((await publicWishes()).some((w) => w.code === `Z${x.slice(0, 5).toUpperCase()}`)).toBe(false);
    });

    it("moves on only by staff steps, each from where it starts, and each is recorded", async () => {
      expect(await takeStaffStep(asViewer(staff), id, "unmatch")).toEqual({ ok: false, why: "not_allowed" });
      expect(await takeStaffStep(asViewer(staff), id, "match")).toEqual({ ok: true, code, to: "matched" });
      expect(await takeStaffStep(asViewer(staff), id, "match")).toEqual({ ok: false, why: "not_allowed" });
      expect(await onList(code)).toMatchObject({ state: "matched" });
      const [log] = await db.select().from(s.auditLog).where(and(eq(s.auditLog.action, "admin.gatherings.wish.match"), eq(s.auditLog.target, id)));
      expect(log).toMatchObject({ userId: staff.id });
    });

    it("lets a name be offered only once the game is built", async () => {
      expect(await offerName(member(A), id, "Station Hero")).toEqual({ ok: false, why: "not_built" });
      expect(await takeStaffStep(asViewer(staff), id, "built", "a-game-nobody-added")).toEqual({ ok: false, why: "bad_game" });
      expect(await takeStaffStep(asViewer(staff), id, "match", "comet-trail")).toEqual({ ok: false, why: "bad_game" });
      expect(await takeStaffStep(asViewer(staff), id, "built")).toEqual({ ok: true, code, to: "built" });
      expect(await onList(code)).toMatchObject({ state: "built", gameName: null });
      /* the family gets a link only when staff tie the wish to a game that is in the library */
      expect((await householdWishes(member(A))).wishes[0]).toMatchObject({ status: "built", game_: null, open: true });
      expect(await tieGame(asViewer(staff), id, "a-game-nobody-added")).toEqual({ ok: false, why: "bad_game" });
      expect(await tieGame(asViewer(staff), id, "comet-trail")).toMatchObject({ ok: true });
      expect((await householdWishes(member(A))).wishes[0].game_).toEqual({ slug: "comet-trail", name: "Comet Trail" });
    });

    it("takes the child's name for the game from a guardian, with the same rules and the same review", async () => {
      expect(await offerName(cheer(A), id, "Station Hero")).toEqual({ ok: false, why: "not_allowed" });
      expect(await offerName(member(A, { childMode: true }), id, "Station Hero")).toEqual({ ok: false, why: "not_allowed" });
      expect(await offerName(member(B), id, "Station Hero")).toEqual({ ok: false, why: "not_found" });
      expect(await offerName(member(A), id, "Kiddo Express")).toEqual({ ok: false, why: "text", problem: "name" });
      expect(await offerName(member(A), id, "Train :)")).toEqual({ ok: false, why: "text", problem: "shape" });
      expect(await offerName(member(A), id, `zzhazard${L}`)).toMatchObject({ ok: false, why: "hazard" });
      expect((await rowsOf(A))[0]).toMatchObject({ gameName: null, nameStatus: null });

      expect(await offerName(member(A), id, " Station   Hero ")).toEqual({ ok: true });
      expect((await rowsOf(A))[0]).toMatchObject({ gameName: "Station Hero", nameStatus: "in_review" });
      expect(await reviews(id, "wish_name")).toHaveLength(1);
      /* not shown outside the household until a person approves it */
      expect(await onList(code)).toMatchObject({ state: "built", gameName: null });
      expect(await offerName(member(A), id, "Another Name")).toEqual({ ok: false, why: "waiting" });
      const entry = (await openModeration()).find((e) => e.item.refId === id && e.item.kind === "wish_name");
      expect(entry?.subject).toMatchObject({ kind: "gathering", of: "wish_name", gameName: "Station Hero", household: A.name });
    });

    it("lets the family offer another name when one is refused, and shows the approved one with the game", async () => {
      await decideModeration((await reviews(id, "wish_name"))[0].id, "removed", staff.id);
      expect((await rowsOf(A))[0]).toMatchObject({ nameStatus: "blocked" });
      expect(await onList(code)).toMatchObject({ state: "built", gameName: null });
      expect(await offerName(member(A), id, "Chuk Chuk")).toEqual({ ok: true });
      await decideModeration((await reviews(id, "wish_name"))[0].id, "approved", staff.id);
      expect(await onList(code)).toMatchObject({ state: "named", gameName: "Chuk Chuk" });
      expect(await offerName(member(A), id, "Third Name")).toEqual({ ok: false, why: "named" });
      /* a named wish is finished: the child can have a new one */
      expect((await householdWishes(member(A))).children.find((c) => c.profileId === kid().id)).toMatchObject({ hasOpen: false, consented: true });
    });

    it("lets only the wish's own guardian take it back, and deletes it with what still waited", async () => {
      const [theirs] = await rowsOf(B);
      expect(await withdrawWish(member(A), theirs.id)).toEqual({ ok: false, why: "not_found" });
      expect(await withdrawWish(cheer(B), theirs.id)).toEqual({ ok: false, why: "not_allowed" });
      expect(await takeStaffStep(asViewer(staff), theirs.id, "built")).toMatchObject({ ok: true });
      expect(await offerName(member(B), theirs.id, "Blue Rail")).toEqual({ ok: true });
      expect(await withdrawWish(member(B), theirs.id)).toEqual({ ok: true });
      expect(await rowsOf(B)).toHaveLength(0);
      expect(await reviews(theirs.id, "wish_name")).toHaveLength(0);
      /* nothing is left that points at the wish, decided items included */
      expect(await db.select().from(s.moderationItem).where(eq(s.moderationItem.refId, theirs.id))).toHaveLength(0);
      expect(await onList(theirs.code)).toBeNull();
    });

    it("keeps a removed wish inside its household, and takes a listed one off the list when staff say so", async () => {
      const made = await makeWish(member(B), wish(B.profiles[0].id, { loves: "birds" }));
      if (!made.ok) throw new Error("not made");
      refs.push(made.id);
      await decideModeration((await reviews(made.id, "wish"))[0].id, "removed", staff.id);
      expect((await rowsOf(B))[0]).toMatchObject({ status: "blocked" });
      expect(await onList(made.code)).toBeNull();
      expect(await takeStaffStep(asViewer(staff), made.id, "match")).toEqual({ ok: false, why: "not_allowed" });
      /* a blocked wish is closed, so the child can have another */
      const again = await makeWish(member(B), wish(B.profiles[0].id, { loves: "robots" }));
      if (!again.ok) throw new Error("not made");
      refs.push(again.id);
      await decideModeration((await reviews(again.id, "wish"))[0].id, "approved", staff.id);
      expect(await onList(again.code)).toMatchObject({ loves: "robots" });
      expect(await takeStaffStep(asViewer(staff), again.id, "unlist")).toMatchObject({ ok: true, to: "blocked" });
      expect(await onList(again.code)).toBeNull();
    });
  });
});
