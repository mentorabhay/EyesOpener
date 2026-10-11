// Eyes Opener: Reading and writing Duet Streak. Server only.
/**
 * Reading and writing Duet Streak. Server only.
 * Everything is scoped by the member's household: partners are looked up among its own profiles and the grown-ups
 * who sign in to it, and an id from the browser is only ever matched against those. A duet is never visible to
 * another household, so a child's name never leaves the family.
 * Nothing about a day is stored: each partner's days are read from the rows that already exist, and the rules in
 * ./duet.ts turn them into the streak.
 */
import { and, asc, eq, gte, inArray, isNotNull, isNull } from "drizzle-orm";
import { db, schema as s } from "@/db";
import {
  didPart, maySeeDuet, pairProblem, pairState, partnerDays, partnerKey, partOfProfile, PERSON_PART, streakOf,
  type DuetDay, type PairProblem, type PairState, type Part, type Partner, type PartnerRecord, type PartState, type ProfileDay, type Streak,
} from "@/lib/duet";
import { startOfDay } from "@/lib/league";
import type { Seat } from "@/lib/roles";
import { todayKey, type Member } from "@/lib/session";
import { isCareRoutine, type TrainKind } from "@/lib/sessions";

const D = s.duet;
/** Care away from the screen that the family logs by hand. "goal" rows are a setting, not a day's care. */
const CARE_KINDS = ["patch", "glasses", "drops", "outdoor", "blink", "far"];
/** Seats that can be a partner with no profile. */
const PERSON_SEATS: Seat[] = ["circle", "co_guardian"];
/** Days of a duet shown as a strip. */
export const STRIP_DAYS = 14;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Run = Tx | typeof db;

export interface Person { id: string; name: string; seat: Seat }

/**
 * The grown-ups of the member's household who can be a partner without a profile: cheer seats and co-guardians,
 * by first name. The guardian who runs the household is not offered this way: a guardian pairs through a profile.
 */
export async function householdPeople(m: Member, x: Run = db): Promise<Person[]> {
  const rows = await x.select({ id: s.appUser.id, name: s.appUser.displayName, seat: s.appUser.seat }).from(s.appUser)
    .where(and(eq(s.appUser.accountId, m.account.id), inArray(s.appUser.seat, PERSON_SEATS))).orderBy(asc(s.appUser.createdAt));
  return rows.flatMap((r) => (r.seat ? [{ id: r.id, name: r.name.trim().split(/\s+/)[0] || r.name, seat: r.seat }] : []));
}

const profilePartner = (p: Member["profiles"][number]): Partner => ({ kind: "profile", id: p.id, profileKind: p.kind, birthYear: p.birthYear });

/** Child profiles of the household whose guardian's consent stands. */
async function consentedChildren(m: Member, x: Run = db): Promise<Set<string>> {
  const kids = m.profiles.filter((p) => p.kind === "child").map((p) => p.id);
  if (!kids.length) return new Set();
  const rows = await x.selectDistinct({ id: s.consent.profileId }).from(s.consent)
    .where(and(inArray(s.consent.profileId, kids), eq(s.consent.accountId, m.account.id), eq(s.consent.kind, "parental"), isNull(s.consent.revokedAt)));
  return new Set(rows.map((r) => r.id));
}

interface Resolved { id: string; startedOn: string; a: Partner & { name: string }; b: Partner & { name: string } }

/**
 * The household's duets whose two partners are both still in it. A duet with an archived profile, or with a
 * grown-up who has left the household, is not returned: it has ended by itself.
 */
async function liveDuets(m: Member, people: Person[], x: Run = db): Promise<{ live: Resolved[]; stale: string[] }> {
  const rows = await x.select().from(D).where(eq(D.accountId, m.account.id)).orderBy(asc(D.createdAt));
  const live: Resolved[] = [], stale: string[] = [];
  for (const r of rows) {
    const pa = m.profiles.find((p) => p.id === r.aProfileId);
    const pb = r.bProfileId ? m.profiles.find((p) => p.id === r.bProfileId) : undefined;
    const ub = r.bUserId ? people.find((u) => u.id === r.bUserId) : undefined;
    if (!pa || (!pb && !ub) || (r.bProfileId && r.bUserId)) { stale.push(r.id); continue; }
    live.push({
      id: r.id, startedOn: r.startedOn,
      a: { ...profilePartner(pa), name: pa.displayName },
      b: pb ? { ...profilePartner(pb), name: pb.displayName } : { kind: "person", id: ub!.id, name: ub!.name },
    });
  }
  return { live, stale };
}

/* ───────────── what each partner did ───────────── */

interface Facts { parts: Map<string, Part>; records: Map<string, PartnerRecord> }

/** Each partner's part and the days it was done, from the earliest start day on. Keys are `partnerKey`. */
async function factsFor(duets: Resolved[]): Promise<Facts> {
  const parts = new Map<string, Part>(), records = new Map<string, PartnerRecord>();
  if (!duets.length) return { parts, records };
  const from = duets.map((d) => d.startedOn).sort()[0], since = startOfDay(from);
  const profileIds = [...new Set(duets.flatMap((d) => [d.a, d.b]).filter((p) => p.kind === "profile").map((p) => p.id))];
  const notes = duets.filter((d) => d.b.kind === "person");

  const [days, sessions, care, enrolments, mail] = await Promise.all([
    db.select({ profileId: s.daySummary.profileId, day: s.daySummary.day, trainMinutes: s.daySummary.trainMinutes, trainGoal: s.daySummary.trainGoal, restBreaks: s.daySummary.restBreaks, lightMinutes: s.daySummary.lightMinutes })
      .from(s.daySummary).where(and(inArray(s.daySummary.profileId, profileIds), gte(s.daySummary.day, from))),
    db.select({ profileId: s.session.profileId, kind: s.session.kind, slug: s.session.itemSlug, endReason: s.session.endReason, startedAt: s.session.startedAt })
      .from(s.session).where(and(inArray(s.session.profileId, profileIds), gte(s.session.startedAt, since), isNotNull(s.session.endedAt))),
    db.select({ profileId: s.careLog.profileId, day: s.careLog.day, minutes: s.careLog.minutes, count: s.careLog.count })
      .from(s.careLog).where(and(inArray(s.careLog.profileId, profileIds), inArray(s.careLog.kind, CARE_KINDS), gte(s.careLog.day, from))),
    db.select({ profileId: s.enrolment.profileId, dailyMinutes: s.enrolment.dailyMinutes, daysPerWeek: s.enrolment.daysPerWeek })
      .from(s.enrolment).where(and(inArray(s.enrolment.profileId, profileIds), eq(s.enrolment.status, "active"))).orderBy(asc(s.enrolment.startedAt)),
    notes.length
      ? db.select({ from: s.fusionMail.fromUserId, to: s.fusionMail.toProfileId, at: s.fusionMail.createdAt }).from(s.fusionMail)
        .where(and(inArray(s.fusionMail.fromUserId, notes.map((d) => d.b.id)), inArray(s.fusionMail.toProfileId, notes.map((d) => d.a.id)), gte(s.fusionMail.createdAt, since)))
      : [],
  ]);

  for (const id of profileIds) {
    const key = partnerKey({ kind: "profile", id });
    /* the newest active enrolment decides the part; rows come oldest first */
    const enrolment = enrolments.filter((e) => e.profileId === id).at(-1) ?? null;
    parts.set(key, partOfProfile(enrolment));
    const rows = new Map<string, ProfileDay>(days.filter((d) => d.profileId === id).map((d) => [d.day, d]));
    const mine = sessions.filter((x) => x.profileId === id);
    /* a care routine counts once it was saved, and a hand-kept log once it holds something */
    const cared = new Set<string>([
      ...mine.filter((x) => x.endReason === "done" && isCareRoutine(x.kind as TrainKind, x.slug)).map((x) => todayKey(x.startedAt)),
      ...care.filter((c) => c.profileId === id && (c.minutes > 0 || c.count > 0)).map((c) => c.day),
    ]);
    const done = new Set<string>([...new Set([...rows.keys(), ...cared])].filter((day) => didPart(rows.get(day), cared.has(day))));
    const excused = new Set(mine.filter((x) => x.endReason === "stop_rule").map((x) => todayKey(x.startedAt)));
    records.set(key, { asked: parts.get(key)!.asked, done, excused });
  }
  for (const d of notes) {
    /* a note counts for the day it was sent, and only when it went to the partner */
    const done = new Set(mail.filter((n) => n.from === d.b.id && n.to === d.a.id).map((n) => todayKey(n.at)));
    parts.set(partnerKey(d.b), PERSON_PART);
    records.set(partnerKey(d.b), { asked: PERSON_PART.asked, done, excused: new Set() });
  }
  return { parts, records };
}

/* ───────────── the page ───────────── */

export interface DuetSide {
  kind: Partner["kind"];
  id: string;
  name: string;
  child: boolean;
  part: Part;
  /** Where this partner stands today: done, still open, or a rest day. Never "missed": today is not over. */
  today: PartState;
}

export interface DuetView {
  id: string;
  startedOn: string;
  a: DuetSide;
  b: DuetSide;
  /** True while a child of the duet has no standing consent. Nothing is counted or shown until it is given again. */
  waits: boolean;
  streak: Streak;
  today: PairState;
  /** The last days, oldest first. Each says how the day went for the two together, never for one of them. */
  days: DuetDay[];
}

/** The household's duets this person may see, the active profile's own first. */
export async function householdDuets(m: Member, today = todayKey()): Promise<DuetView[]> {
  const people = await householdPeople(m);
  const { live } = await liveDuets(m, people);
  const seen = live.filter((d) => maySeeDuet({ seat: m.seat, childMode: m.childMode, userId: m.user.id, activeProfileId: m.profile.id }, d));
  if (!seen.length) return [];
  const [consented, facts] = await Promise.all([consentedChildren(m), factsFor(seen)]);

  const views = seen.map((d): DuetView => {
    const both = [d.a, d.b];
    const waits = both.some((p) => p.kind === "profile" && p.profileKind === "child" && !consented.has(p.id));
    const da = partnerDays(facts.records.get(partnerKey(d.a))!, d.startedOn, today), dbb = partnerDays(facts.records.get(partnerKey(d.b))!, d.startedOn, today);
    const days = [...da.keys()].map((day) => ({ day, state: pairState(da.get(day)!, dbb.get(day)!) }));
    const side = (p: Resolved["a"], mine: Map<string, PartState>): DuetSide => ({
      kind: p.kind, id: p.id, name: p.name, child: p.kind === "profile" && p.profileKind === "child",
      part: facts.parts.get(partnerKey(p))!, today: mine.get(today) ?? "open",
    });
    return {
      id: d.id, startedOn: d.startedOn, a: side(d.a, da), b: side(d.b, dbb), waits,
      streak: waits ? { current: 0, longest: 0, kept: 0 } : streakOf(days),
      today: days.at(-1)?.state ?? "open",
      days: waits ? [] : days.slice(-STRIP_DAYS),
    };
  });
  const own = (v: DuetView) => (v.a.id === m.profile.id || (v.b.kind === "profile" && v.b.id === m.profile.id) ? 0 : 1);
  return views.sort((x, y) => own(x) - own(y));
}

/* ───────────── setting up and ending ───────────── */

export interface Candidate { key: string; name: string; kind: "child" | "adult" | Seat; taken: boolean }

/**
 * Who a guardian can choose from: the household's profiles, and its cheer seats and co-guardians.
 * `pick` is the first pair that could start a duet now, or null when no two people can.
 */
export async function duetCandidates(m: Member): Promise<{ profiles: Candidate[]; people: Candidate[]; pick: { a: string; b: string } | null }> {
  const people = await householdPeople(m);
  const [{ live }, consented] = await Promise.all([liveDuets(m, people), consentedChildren(m)]);
  const paired = new Set(live.flatMap((d) => [partnerKey(d.a), partnerKey(d.b)]));
  const known = { consented: (id: string) => consented.has(id), paired };
  const firsts = m.profiles.map(profilePartner), seconds: Partner[] = [...firsts, ...people.map((u) => ({ kind: "person" as const, id: u.id }))];
  /* a child first when there is one, as the idea has it */
  const ordered = [...firsts.filter((p) => p.kind === "profile" && p.profileKind === "child"), ...firsts];
  let pick: { a: string; b: string } | null = null;
  for (const a of ordered) {
    const b = seconds.find((x) => pairProblem(a, x, known) === null);
    if (b) { pick = { a: partnerKey(a), b: partnerKey(b) }; break; }
  }
  return {
    profiles: m.profiles.map((p) => ({ key: partnerKey({ kind: "profile", id: p.id }), name: p.displayName, kind: p.kind, taken: paired.has(partnerKey({ kind: "profile", id: p.id })) })),
    people: people.map((u) => ({ key: partnerKey({ kind: "person", id: u.id }), name: u.name, kind: u.seat, taken: paired.has(partnerKey({ kind: "person", id: u.id })) })),
    pick,
  };
}

export type DuetRefusal = "not_allowed" | "unknown" | PairProblem;

/**
 * Starts a duet from today. Both partners are named by a key from the form and are looked up again here, among
 * the household's own profiles and people. Only a guardian or co-guardian can do this, and never a device in child mode.
 */
export async function startDuet(m: Member, aKey: string, bKey: string, today = todayKey()): Promise<{ ok: true; a: string; b: string } | { ok: false; why: DuetRefusal }> {
  if (!m.can("manage_family")) return { ok: false, why: "not_allowed" };
  return db.transaction(async (tx) => {
    /* one writer at a time for the household, so two taps cannot put one person in two duets */
    await tx.select({ id: s.account.id }).from(s.account).where(eq(s.account.id, m.account.id)).for("update");
    const people = await householdPeople(m, tx);
    const find = (key: string): (Partner & { name: string }) | null => {
      const profile = m.profiles.find((p) => partnerKey({ kind: "profile", id: p.id }) === key);
      if (profile) return { ...profilePartner(profile), name: profile.displayName };
      const person = people.find((u) => partnerKey({ kind: "person", id: u.id }) === key);
      return person ? { kind: "person", id: person.id, name: person.name } : null;
    };
    const a = find(aKey), b = find(bKey);
    if (!a || !b) return { ok: false as const, why: "unknown" as const };
    const { live, stale } = await liveDuets(m, people, tx);
    if (stale.length) await tx.delete(D).where(and(inArray(D.id, stale), eq(D.accountId, m.account.id)));
    const consented = await consentedChildren(m, tx);
    const problem = pairProblem(a, b, { consented: (id) => consented.has(id), paired: new Set(live.flatMap((d) => [partnerKey(d.a), partnerKey(d.b)])) });
    if (problem) return { ok: false as const, why: problem };
    await tx.insert(D).values({ accountId: m.account.id, aProfileId: a.id, bProfileId: b.kind === "profile" ? b.id : null, bUserId: b.kind === "person" ? b.id : null, startedOn: today, createdBy: m.user.id });
    return { ok: true as const, a: a.name, b: b.name };
  });
}

/** Ends a duet of the household. The row is deleted: nothing of it is kept. */
export async function endDuet(m: Member, duetId: string): Promise<boolean> {
  if (!m.can("manage_family")) return false;
  const gone = await db.delete(D).where(and(eq(D.id, duetId), eq(D.accountId, m.account.id))).returning({ id: D.id });
  return gone.length > 0;
}
