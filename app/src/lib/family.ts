// Eyes Opener: The household: profiles, programmes, triage, the counsellor link, consent, invites,.
/**
 * The household: profiles, programmes, triage, the counsellor link, consent, invites,
 * the child-mode exit PIN, sponsor groups and the cheer seat's view.
 * Every helper that takes an id checks that it belongs to the member's household.
 * Who may call each helper is decided by the action, with `m.can(...)`.
 */
import crypto from "node:crypto";
import { and, count, desc, eq, gt, gte, inArray, isNotNull, isNull, max, sql } from "drizzle-orm";
import { programmeBySlug } from "@/data";
import { db, schema } from "@/db";
import type { Viewer } from "@/lib/auth";
import type { Seat } from "@/lib/roles";
import { lastDays, todayKey, type Member } from "@/lib/session";
import { hashPin } from "@/lib/token";

const CONSENT_VERSION = "2026-10";

export const TRIAGE_KEYS = ["sudden_change", "double_vision", "eye_pain", "flashes_curtain", "white_pupil", "head_injury"] as const;
export type TriageKey = (typeof TRIAGE_KEYS)[number];

export type Blocked = "needs_consent" | "needs_triage" | "doctor_first" | "needs_counsellor";
export type LinkResult = "done" | "not_yours" | "counsellor_not_found" | "already_linked";
const owned = (m: Member, profileId: string) => m.profiles.find((p) => p.id === profileId);

/** Birth years that make a child profile: under 18 today. */
export const childBirthYears = (today = new Date()) => ({ min: today.getFullYear() - 17, max: today.getFullYear() });

/** What stands between a profile and its programmes: the latest triage, parental consent and counsellor links. */
export async function gates(m: Member, profileId: string) {
  const profile = owned(m, profileId);
  if (!profile) return null;
  const [[triage], [consent], links] = await Promise.all([
    db.select().from(schema.triage).where(eq(schema.triage.profileId, profileId)).orderBy(desc(schema.triage.createdAt)).limit(1),
    db.select({ id: schema.consent.id }).from(schema.consent)
      .where(and(eq(schema.consent.profileId, profileId), eq(schema.consent.kind, "parental"), isNull(schema.consent.revokedAt))).limit(1),
    db.select({ id: schema.counsellorLink.id, status: schema.counsellorLink.status, name: schema.appUser.displayName })
      .from(schema.counsellorLink).innerJoin(schema.appUser, eq(schema.appUser.id, schema.counsellorLink.counsellorId))
      .where(eq(schema.counsellorLink.profileId, profileId)).orderBy(desc(schema.counsellorLink.createdAt)),
  ]);
  return { triage: triage ?? null, consented: profile.kind === "adult" || !!consent, links };
}
type Gates = NonNullable<Awaited<ReturnType<typeof gates>>>;

/** Why this profile cannot start a programme of this level, or null when it can. The page and the Start action share it. */
export function blockedBy(g: Gates, level: number): Blocked | null {
  if (!g.consented) return "needs_consent";
  if (level > 0 && !g.triage) return "needs_triage";
  if (level > 0 && g.triage?.redFlag) return "doctor_first";
  if (level === 2 && !g.links.some((l) => l.status === "active")) return "needs_counsellor";
  return null;
}

/** Enrols the profile when the rules allow it. A level 2 dose stays at 0 until the counsellor sets it. */
export async function startProgramme(m: Member, profileId: string, slug: string) {
  const g = await gates(m, profileId);
  const p = programmeBySlug(slug);
  if (!g || !p || blockedBy(g, p.level)) return;
  const fromTrial = p.level < 2;
  await db.transaction(async (tx) => {
    /* Lock the profile so two quick presses cannot make two enrolments. */
    await tx.select({ id: schema.profile.id }).from(schema.profile).where(eq(schema.profile.id, profileId)).for("update");
    const [active] = await tx.select({ id: schema.enrolment.id }).from(schema.enrolment)
      .where(and(eq(schema.enrolment.profileId, profileId), eq(schema.enrolment.status, "active"))).limit(1);
    if (active) return;
    await tx.insert(schema.enrolment).values({ profileId, programme: p.slug, dailyMinutes: fromTrial ? p.dailyMinutes : 0, daysPerWeek: fromTrial ? p.daysPerWeek : 0 });
    await tx.update(schema.profile).set({ accessLevel: p.level }).where(eq(schema.profile.id, profileId));
  });
}

/** Ends the active enrolment. With no programme the profile is back at level 0. */
export async function leaveProgramme(m: Member, profileId: string) {
  if (!owned(m, profileId)) return;
  await db.transaction(async (tx) => {
    const ended = await tx.update(schema.enrolment).set({ status: "finished", endedAt: new Date() })
      .where(and(eq(schema.enrolment.profileId, profileId), eq(schema.enrolment.status, "active")))
      .returning({ id: schema.enrolment.id });
    if (ended.length) await tx.update(schema.profile).set({ accessLevel: 0 }).where(eq(schema.profile.id, profileId));
  });
}

/** Any yes is a red flag: an eye doctor comes before training. */
export async function saveTriage(m: Member, profileId: string, answers: Record<TriageKey, boolean>) {
  if (!owned(m, profileId)) return;
  const redFlag = Object.values(answers).some(Boolean);
  await db.insert(schema.triage).values({ profileId, answers, redFlag, outcome: redFlag ? "see_doctor_first" : "proceed" });
}

/** Asks a counsellor, found by email, to link. An ended link with the same counsellor is opened again as a request. */
export async function requestCounsellor(m: Member, profileId: string, email: string): Promise<LinkResult> {
  if (!owned(m, profileId)) return "not_yours";
  /* Only a counsellor that ops has verified can be linked. */
  const [counsellor] = await db.select({ id: schema.appUser.id }).from(schema.appUser)
    .where(and(eq(schema.appUser.isCounsellor, true), isNotNull(schema.appUser.counsellorVerifiedAt), eq(sql`lower(${schema.appUser.email})`, email.toLowerCase()))).limit(1);
  if (!counsellor) return "counsellor_not_found";
  const [link] = await db.insert(schema.counsellorLink).values({ profileId, counsellorId: counsellor.id })
    .onConflictDoUpdate({
      target: [schema.counsellorLink.profileId, schema.counsellorLink.counsellorId],
      set: { status: "pending" }, setWhere: eq(schema.counsellorLink.status, "ended"),
    })
    .returning({ id: schema.counsellorLink.id });
  return link ? "done" : "already_linked";
}

type NewProfile = { kind: "adult"; name: string } | { kind: "child"; name: string; birthYear: number; consent: "on" };

/** Adds a profile to the household. A child's profile is saved together with this guardian's consent. */
export async function addProfile(m: Member, p: NewProfile) {
  await db.transaction(async (tx) => {
    const [row] = await tx.insert(schema.profile)
      .values({ accountId: m.account.id, displayName: p.name, kind: p.kind, birthYear: p.kind === "child" ? p.birthYear : null })
      .returning({ id: schema.profile.id });
    if (p.kind === "child") await tx.insert(schema.consent).values({ profileId: row.id, accountId: m.account.id, userId: m.user.id, kind: "parental", textVersion: CONSENT_VERSION });
  });
}

/* ───────────── children and consent ───────────── */

const children = (m: Member) => m.profiles.filter((p) => p.kind === "child");
const liveConsent = (profileId: string) =>
  and(eq(schema.consent.profileId, profileId), eq(schema.consent.kind, "parental"), isNull(schema.consent.revokedAt));

/** What a guardian sees for each child: today's rings, streak, programme, last check-up and who gave consent. */
export async function childrenOverview(m: Member) {
  const kids = children(m);
  if (!kids.length) return [];
  const ids = kids.map((k) => k.id);
  const [days, streaks, enrolments, checks, consents] = await Promise.all([
    db.select().from(schema.daySummary).where(and(inArray(schema.daySummary.profileId, ids), eq(schema.daySummary.day, todayKey()))),
    db.select().from(schema.streak).where(inArray(schema.streak.profileId, ids)),
    db.select().from(schema.enrolment).where(and(inArray(schema.enrolment.profileId, ids), eq(schema.enrolment.status, "active"))),
    db.select({ profileId: schema.testResult.profileId, last: max(schema.testResult.takenAt) }).from(schema.testResult)
      .where(inArray(schema.testResult.profileId, ids)).groupBy(schema.testResult.profileId),
    db.select({ profileId: schema.consent.profileId, grantedAt: schema.consent.grantedAt, by: schema.appUser.displayName }).from(schema.consent)
      .leftJoin(schema.appUser, eq(schema.appUser.id, schema.consent.userId))
      .where(and(inArray(schema.consent.profileId, ids), eq(schema.consent.kind, "parental"), isNull(schema.consent.revokedAt)))
      .orderBy(desc(schema.consent.grantedAt)),
  ]);
  return kids.map((profile) => ({
    profile,
    day: days.find((d) => d.profileId === profile.id),
    streak: streaks.find((x) => x.profileId === profile.id)?.current ?? 0,
    enrolment: enrolments.find((e) => e.profileId === profile.id),
    lastCheck: checks.find((c) => c.profileId === profile.id)?.last ?? null,
    consent: consents.find((c) => c.profileId === profile.id),
  }));
}

/** Records this guardian's consent for a child of the household, unless consent is already in place. */
export async function giveConsent(m: Member, profileId: string) {
  if (!children(m).some((p) => p.id === profileId)) return;
  const [live] = await db.select({ id: schema.consent.id }).from(schema.consent).where(liveConsent(profileId)).limit(1);
  if (live) return;
  await db.insert(schema.consent).values({ profileId, accountId: m.account.id, userId: m.user.id, kind: "parental", textVersion: CONSENT_VERSION });
}

export async function withdrawConsent(m: Member, profileId: string) {
  if (!owned(m, profileId)) return;
  await db.update(schema.consent).set({ revokedAt: new Date() }).where(liveConsent(profileId));
}

/* ───────────── people, invites and the exit PIN ───────────── */

export const INVITE_SEATS = ["co_guardian", "circle"] as const;
/** Letters and digits that cannot be mistaken for each other: no 0, O, 1 or I. */
const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => Array.from(crypto.randomBytes(8), (b) => CODE_LETTERS[b % CODE_LETTERS.length]).join("");
/** A code as typed: spaces dropped, capitals only. */
const tidyCode = (typed: string) => typed.replace(/\s+/g, "").toUpperCase();

/** The people who sign in to this household, and the invites still open. */
export const household = (m: Member) => Promise.all([
  db.select({ id: schema.appUser.id, name: schema.appUser.displayName, seat: schema.appUser.seat }).from(schema.appUser)
    .where(eq(schema.appUser.accountId, m.account.id)).orderBy(schema.appUser.createdAt),
  db.select().from(schema.invite).where(and(eq(schema.invite.accountId, m.account.id), eq(schema.invite.status, "open"))).orderBy(desc(schema.invite.createdAt)),
]);

export async function createInvite(m: Member, seat: (typeof INVITE_SEATS)[number]) {
  /* A code is unique; in the rare case one is taken, draw again. */
  for (;;) {
    const [row] = await db.insert(schema.invite).values({ accountId: m.account.id, seat, code: newCode(), createdBy: m.user.id }).onConflictDoNothing().returning({ id: schema.invite.id });
    if (row) return;
  }
}

export async function revokeInvite(m: Member, inviteId: string) {
  await db.update(schema.invite).set({ status: "revoked" })
    .where(and(eq(schema.invite.id, inviteId), eq(schema.invite.accountId, m.account.id), eq(schema.invite.status, "open")));
}

export async function setExitPin(m: Member, pin: string) {
  await db.update(schema.account).set({ exitPinHash: hashPin(pin) }).where(eq(schema.account.id, m.account.id));
}

/** The child this device may be handed to: a child of the household with consent in place, once an exit PIN exists. */
export async function childToHandTo(m: Member, profileId: string) {
  const child = children(m).find((p) => p.id === profileId);
  if (!child || !m.account.exitPinHash || !(await gates(m, profileId))?.consented) return null;
  return child;
}

export type JoinRefusal = "has_household" | "invite_not_found";

/** Seats a signed-in person with no household in the household that sent the invite, and answers with the seat. An invite works once. */
export async function acceptInvite(viewer: Viewer, typed: string): Promise<Seat | JoinRefusal> {
  return db.transaction(async (tx) => {
    /* Read the person fresh and hold the row, so two codes sent at once cannot both be used up. */
    const [me] = await tx.select({ accountId: schema.appUser.accountId }).from(schema.appUser).where(eq(schema.appUser.id, viewer.user.id)).for("update");
    if (!me || me.accountId) return "has_household";
    const [invite] = await tx.update(schema.invite).set({ status: "accepted", acceptedBy: viewer.user.id })
      .where(and(eq(schema.invite.code, tidyCode(typed)), eq(schema.invite.status, "open")))
      .returning({ accountId: schema.invite.accountId, seat: schema.invite.seat });
    if (!invite) return "invite_not_found";
    await tx.update(schema.appUser).set({ accountId: invite.accountId, seat: invite.seat }).where(eq(schema.appUser.id, viewer.user.id));
    return invite.seat;
  });
}

/* ───────────── sponsor groups ───────────── */

export type GroupResult = "done" | "group_not_found" | "already_in";

/** The sponsor groups this household is in. The sponsor sees counts for a group, never a household. */
export const sponsorGroups = (m: Member) =>
  db.select({ id: schema.sponsorGroup.id, name: schema.sponsorGroup.name, sponsor: schema.sponsor.name, joinedAt: schema.sponsorGroupMember.joinedAt })
    .from(schema.sponsorGroupMember)
    .innerJoin(schema.sponsorGroup, eq(schema.sponsorGroup.id, schema.sponsorGroupMember.groupId))
    .innerJoin(schema.sponsor, eq(schema.sponsor.id, schema.sponsorGroup.sponsorId))
    .where(eq(schema.sponsorGroupMember.accountId, m.account.id)).orderBy(desc(schema.sponsorGroupMember.joinedAt));

/** Joins an open group of an approved sponsor by its code. */
export async function joinGroup(m: Member, typed: string): Promise<GroupResult> {
  const [group] = await db.select({ id: schema.sponsorGroup.id }).from(schema.sponsorGroup)
    .innerJoin(schema.sponsor, eq(schema.sponsor.id, schema.sponsorGroup.sponsorId))
    .where(and(eq(schema.sponsorGroup.code, tidyCode(typed)), isNull(schema.sponsorGroup.closedAt), eq(schema.sponsor.status, "approved"))).limit(1);
  if (!group) return "group_not_found";
  const [row] = await db.insert(schema.sponsorGroupMember).values({ groupId: group.id, accountId: m.account.id }).onConflictDoNothing().returning({ groupId: schema.sponsorGroupMember.groupId });
  return row ? "done" : "already_in";
}

export async function leaveGroup(m: Member, groupId: string) {
  await db.delete(schema.sponsorGroupMember).where(and(eq(schema.sponsorGroupMember.groupId, groupId), eq(schema.sponsorGroupMember.accountId, m.account.id)));
}

/* ───────────── the cheer seat ───────────── */

/**
 * What a cheer seat may know about each child: the streak, how many of the last seven days had practice,
 * and the last note the child got. The queries read nothing else: no results, no eye settings, no minutes.
 */
export async function circleFacts(m: Member) {
  const kids = children(m);
  if (!kids.length) return [];
  const ids = kids.map((k) => k.id);
  const [streaks, practised, notes] = await Promise.all([
    db.select({ profileId: schema.streak.profileId, current: schema.streak.current }).from(schema.streak).where(inArray(schema.streak.profileId, ids)),
    db.select({ profileId: schema.daySummary.profileId, days: count() }).from(schema.daySummary)
      .where(and(inArray(schema.daySummary.profileId, ids), gte(schema.daySummary.day, lastDays(7)[0].key), gt(schema.daySummary.trainMinutes, 0)))
      .groupBy(schema.daySummary.profileId),
    db.selectDistinctOn([schema.fusionMail.toProfileId], { profileId: schema.fusionMail.toProfileId, from: schema.fusionMail.fromName, sentAt: schema.fusionMail.createdAt })
      .from(schema.fusionMail).where(inArray(schema.fusionMail.toProfileId, ids)).orderBy(schema.fusionMail.toProfileId, desc(schema.fusionMail.createdAt)),
  ]);
  return kids.map((k) => ({
    id: k.id, name: k.displayName,
    streak: streaks.find((x) => x.profileId === k.id)?.current ?? 0,
    days: practised.find((x) => x.profileId === k.id)?.days ?? 0,
    note: notes.find((x) => x.profileId === k.id),
  }));
}
