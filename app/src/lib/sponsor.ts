/**
 * What a sponsor may read and change. Every query is scoped to one sponsor.
 *
 * The privacy rule lives here, not in the pages:
 * - a sponsor gets counts only. No query in this file selects a member's name, profile, result or session;
 * - a count that covers fewer than SPONSOR_MIN_GROUP households is not returned at all (`null`), so a page cannot show it;
 * - a sponsor that is not approved gets no numbers and cannot open groups, register glasses or change its team.
 * Every write is recorded with `audit`.
 */
import { randomInt } from "node:crypto";
import { notFound } from "next/navigation";
import { and, asc, count, countDistinct, desc, eq, gt, gte, inArray, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { audit, type SponsorSeat, type Viewer } from "./auth";
import { SPONSOR_MIN_GROUP, type SponsorRole } from "./roles";
import { lastDays } from "./session";

const G = schema.sponsorGroup;
const GM = schema.sponsorGroupMember;
const SU = schema.sponsorUser;

/** What a form shows after its action ran. */
export type FormState = { ok: boolean; message: string } | null;

/** A count of households, or null when it covers too few households to show. */
const enough = (households: number): number | null => (households >= SPONSOR_MIN_GROUP ? households : null);

/** Groups, glasses and the team open only once the IOpener team has approved the sponsor. */
export function approvedOnly(s: SponsorSeat) {
  if (s.status !== "approved") notFound();
}

/** The households in any of this sponsor's groups, as a subquery. Used only inside counts. */
const homesOf = (sponsorId: string) =>
  db.selectDistinct({ accountId: GM.accountId }).from(GM).innerJoin(G, eq(G.id, GM.groupId)).where(eq(G.sponsorId, sponsorId));

/* ───────────── overview ───────────── */

export interface FamilyNumbers {
  /** Households in the sponsor's groups, each counted once. */
  joined: number;
  /** Households where someone practised, took a break or logged outdoor time in the last 7 days. */
  active: number;
  /** Days with practice in the last 7 days, summed over households. */
  practiceDays: number;
  /** Households that practised on at least 4 of the last 7 days. */
  steady: number;
}

/**
 * Counts across all of the sponsor's groups. Null when the sponsor is not approved,
 * or when fewer than SPONSOR_MIN_GROUP households have joined: every number here describes those households.
 */
export async function familyNumbers(s: SponsorSeat): Promise<FamilyNumbers | null> {
  if (s.status !== "approved") return null;
  const [{ n }] = await db.select({ n: countDistinct(GM.accountId) }).from(GM).innerJoin(G, eq(G.id, GM.groupId)).where(eq(G.sponsorId, s.sponsorId));
  const joined = enough(n);
  if (joined === null) return null;

  const D = schema.daySummary;
  const span = lastDays(7);
  /* One row per active household, holding only its number of practice days. Summed below; no household leaves the database. */
  const perHome = db
    .select({ practiceDays: sql<number>`count(distinct ${D.day}) filter (where ${D.trainMinutes} > 0)`.as("practice_days") })
    .from(D).innerJoin(schema.profile, eq(schema.profile.id, D.profileId))
    .where(and(
      inArray(schema.profile.accountId, homesOf(s.sponsorId)),
      isNull(schema.profile.archivedAt),
      gte(D.day, span[0].key), lte(D.day, span[6].key),
      or(gt(D.trainMinutes, 0), gt(D.restBreaks, 0), gt(D.lightMinutes, 0)),
    ))
    .groupBy(schema.profile.accountId).as("per_home");
  const [row] = await db.select({
    active: count(),
    practiceDays: sql<number>`coalesce(sum(${perHome.practiceDays}), 0)`.mapWith(Number),
    steady: sql<number>`count(*) filter (where ${perHome.practiceDays} >= 4)`.mapWith(Number),
  }).from(perHome);
  return { joined, active: row.active, practiceDays: row.practiceDays, steady: row.steady };
}

/** Pairs this sponsor donated and how many journeys those pairs have finished. Null when the sponsor is not approved. */
export async function glassesNumbers(s: SponsorSeat): Promise<{ pairs: number; finished: number } | null> {
  if (s.status !== "approved") return null;
  const pair = schema.glassesPair, leg = schema.glassesLeg;
  const [[{ pairs }], [{ finished }]] = await Promise.all([
    db.select({ pairs: count() }).from(pair).where(eq(pair.sponsorId, s.sponsorId)),
    db.select({ finished: count() }).from(leg).innerJoin(pair, eq(pair.id, leg.pairId)).where(and(eq(pair.sponsorId, s.sponsorId), eq(leg.status, "finished"))),
  ]);
  return { pairs, finished };
}

/* ───────────── groups ───────────── */

/** The sponsor's groups, newest first. `households` is null for a group with too few households to show. */
export async function listGroups(s: SponsorSeat) {
  approvedOnly(s);
  const rows = await db.select({ id: G.id, name: G.name, code: G.code, createdAt: G.createdAt, closedAt: G.closedAt, households: count(GM.accountId) })
    .from(G).leftJoin(GM, eq(GM.groupId, G.id))
    .where(eq(G.sponsorId, s.sponsorId)).groupBy(G.id).orderBy(desc(G.createdAt));
  return rows.map((g) => ({ ...g, households: enough(g.households) }));
}

/** Letters and digits that cannot be mistaken for each other: no 0, O, 1 or I. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");

/** Open a group with a fresh join code. Tries again when the code is already taken. */
export async function createGroup(viewer: Viewer, s: SponsorSeat, name: string): Promise<{ id: string; code: string } | null> {
  approvedOnly(s);
  for (let attempt = 0; attempt < 6; attempt++) {
    const [row] = await db.insert(G).values({ sponsorId: s.sponsorId, name, code: newCode() })
      .onConflictDoNothing({ target: G.code }).returning({ id: G.id, code: G.code });
    if (row) {
      await audit(viewer, "sponsor.group.create", row.id, { sponsorId: s.sponsorId, name });
      return row;
    }
  }
  return null;
}

/** Close a group to new families, or open it again. Only a group of this sponsor changes. */
export async function setGroupOpen(viewer: Viewer, s: SponsorSeat, groupId: string, open: boolean): Promise<boolean> {
  approvedOnly(s);
  const [row] = await db.update(G).set({ closedAt: open ? null : new Date() })
    .where(and(eq(G.id, groupId), eq(G.sponsorId, s.sponsorId), open ? isNotNull(G.closedAt) : isNull(G.closedAt)))
    .returning({ id: G.id });
  if (!row) return false;
  await audit(viewer, open ? "sponsor.group.reopen" : "sponsor.group.close", row.id, { sponsorId: s.sponsorId });
  return true;
}

/* ───────────── glasses ───────────── */

export type PairStatus = "new" | "wearing" | "passed_on" | "finished";

/** The pairs this sponsor donated: code, how many children have worn the pair, and where it is now. Never who. */
export async function listPairs(s: SponsorSeat) {
  approvedOnly(s);
  const pair = schema.glassesPair, leg = schema.glassesLeg;
  const pairs = await db.select({ id: pair.id, code: pair.code }).from(pair).where(eq(pair.sponsorId, s.sponsorId)).orderBy(asc(pair.code));
  if (!pairs.length) return [];
  /* Only the pair, the status and the start time are read: not the child's name, city or note. */
  const legs = await db.select({ pairId: leg.pairId, status: leg.status }).from(leg)
    .where(inArray(leg.pairId, pairs.map((p) => p.id))).orderBy(desc(leg.startedAt));
  return pairs.map((p) => {
    const mine = legs.filter((l) => l.pairId === p.id);
    const latest = mine[0]?.status;
    const status: PairStatus = latest === "wearing" || latest === "passed_on" || latest === "finished" ? latest : "new";
    return { id: p.id, code: p.code, worn: mine.length, status };
  });
}

/** Register a donated pair by the code printed on it. */
export async function registerPair(viewer: Viewer, s: SponsorSeat, code: string): Promise<"done" | "taken"> {
  approvedOnly(s);
  const pair = schema.glassesPair;
  const [row] = await db.insert(pair).values({ code, sponsorId: s.sponsorId }).onConflictDoNothing({ target: pair.code }).returning({ id: pair.id });
  if (!row) return "taken";
  await audit(viewer, "sponsor.glasses.register", row.id, { sponsorId: s.sponsorId, code });
  return "done";
}

/* ───────────── team ───────────── */

/** People on the sponsor's team, owners first. */
export async function listTeam(s: SponsorSeat) {
  approvedOnly(s);
  const rows = await db.select({ userId: SU.userId, role: SU.role, name: schema.appUser.displayName, email: schema.appUser.email })
    .from(SU).innerJoin(schema.appUser, eq(schema.appUser.id, SU.userId))
    .where(eq(SU.sponsorId, s.sponsorId)).orderBy(asc(schema.appUser.displayName));
  return rows.sort((a, b) => Number(b.role === "owner") - Number(a.role === "owner"));
}

/** Add a person who already signs in to IOpener, found by email. */
export async function addToTeam(viewer: Viewer, s: SponsorSeat, email: string, role: SponsorRole): Promise<"done" | "not_found" | "already"> {
  approvedOnly(s);
  const [person] = await db.select({ id: schema.appUser.id }).from(schema.appUser).where(eq(sql`lower(${schema.appUser.email})`, email.toLowerCase())).limit(1);
  if (!person) return "not_found";
  const [row] = await db.insert(SU).values({ sponsorId: s.sponsorId, userId: person.id, role }).onConflictDoNothing().returning({ userId: SU.userId });
  if (!row) return "already";
  await audit(viewer, "sponsor.team.add", person.id, { sponsorId: s.sponsorId, role });
  return "done";
}

export type TeamResult = "done" | "not_found" | "last_owner";

/**
 * Change a person's role (`to` is a role) or remove them (`to` is null).
 * The team rows are locked while the owners are counted, so two quick changes cannot leave a team with no owner.
 */
export async function changeTeam(viewer: Viewer, s: SponsorSeat, userId: string, to: SponsorRole | null): Promise<TeamResult> {
  approvedOnly(s);
  const out = await db.transaction(async (tx) => {
    const team = await tx.select().from(SU).where(eq(SU.sponsorId, s.sponsorId)).for("update");
    /* The person acting must still be an owner now, not only when the page was drawn. */
    if (team.find((m) => m.userId === viewer.user.id)?.role !== "owner") return { result: "not_found" as const };
    const row = team.find((m) => m.userId === userId);
    if (!row) return { result: "not_found" as const };
    if (row.role === to) return { result: "done" as const };
    if (row.role === "owner" && team.filter((m) => m.role === "owner").length <= 1) return { result: "last_owner" as const };
    const mine = and(eq(SU.sponsorId, s.sponsorId), eq(SU.userId, userId));
    if (to) await tx.update(SU).set({ role: to }).where(mine);
    else await tx.delete(SU).where(mine);
    return { result: "done" as const, from: row.role };
  });
  if (out.result === "done" && out.from) {
    await audit(viewer, to ? "sponsor.team.role" : "sponsor.team.remove", userId, { sponsorId: s.sponsorId, from: out.from, ...(to ? { to } : {}) });
  }
  return out.result;
}
