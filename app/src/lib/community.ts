/**
 * Queries for the Together space: the evidence engine, the league and the community ideas.
 * Server only. Every query is scoped by the active profile or its account.
 */
import { and, asc, count, countDistinct, desc, eq, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/db";
import { pageZoom } from "@/engine";
import { todayKey, type Member } from "@/lib/session";

export type LadderStep = (typeof s.ladderStep.enumValues)[number];
export const LADDER: readonly LadderStep[] = s.ladderStep.enumValues;
/** An idea is untested until a pooled result has been published for it. */
export const isTested = (step: LadderStep) => LADDER.indexOf(step) >= LADDER.indexOf("signal");

/**
 * Reasons from the fixed hazard blocklist that this text trips. An empty list means it may go on to a person.
 * A rule whose pattern does not compile is skipped and logged, so one bad row cannot stop every submission.
 */
export async function screenHazards(text: string): Promise<string[]> {
  const rules = await db.select().from(s.hazardRule).where(eq(s.hazardRule.active, true));
  const flat = text.replace(/\s+/g, " ");
  const hits = rules.filter((r) => {
    try { return new RegExp(r.pattern, "i").test(flat); }
    catch { console.error(`hazard_rule ${r.id}: pattern does not compile`); return false; }
  });
  return [...new Set(hits.map((r) => r.reason))];
}

/** Plain-word messages for the fields a zod parse rejected. */
export const fieldProblems = (error: z.ZodError, words: Record<string, string>) =>
  [...new Set(error.issues.map((i) => words[String(i.path[0])]).filter(Boolean))];

const dayFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
/** A date for reading. Takes a timestamp or a YYYY-MM-DD day key. */
export const dayText = (d: Date | string) => dayFormat.format(typeof d === "string" ? new Date(`${d}T12:00:00+05:30`) : d);

/* ───────────── evidence engine ───────────── */

/** Published ideas, and the viewer's own ideas that still wait for review. */
const visibleTo = (profileId: string) =>
  or(eq(s.protocol.status, "published"), and(eq(s.protocol.status, "in_review"), eq(s.protocol.profileId, profileId)));

/** Ideas the viewer may see, with how many members are enrolled, how many a published signal counted, and how many experiments are open. */
export function listProtocols(profileId: string) {
  return db.select({
    id: s.protocol.id, title: s.protocol.title, forWhom: s.protocol.forWhom, step: s.protocol.step, status: s.protocol.status,
    joined: countDistinct(s.experimentEnrolment.id),
    tookPart: sql<number | null>`max(${s.experimentSignal.nTried} + ${s.experimentSignal.nControl})`,
    open: sql<number>`count(distinct ${s.experiment.id}) filter (where ${s.experiment.status} = 'open')`.mapWith(Number),
  }).from(s.protocol)
    .leftJoin(s.experiment, eq(s.experiment.protocolId, s.protocol.id))
    .leftJoin(s.experimentEnrolment, eq(s.experimentEnrolment.experimentId, s.experiment.id))
    .leftJoin(s.experimentSignal, eq(s.experimentSignal.experimentId, s.experiment.id))
    .where(visibleTo(profileId))
    .groupBy(s.protocol.id)
    .orderBy(desc(s.protocol.publishedAt), desc(s.protocol.createdAt));
}

/** One idea with its story, newest experiment, head count, the viewer's own enrolment and the signal. Null when the viewer may not see it. */
export async function protocolById(id: string, profileId: string) {
  if (!z.guid().safeParse(id).success) return null;
  const [protocol] = await db.select().from(s.protocol).where(and(eq(s.protocol.id, id), visibleTo(profileId)));
  if (!protocol) return null;
  const [[story], [experiment]] = await Promise.all([
    protocol.storyId
      ? db.select().from(s.story).where(and(eq(s.story.id, protocol.storyId), or(eq(s.story.status, "published"), eq(s.story.profileId, profileId))))
      : [],
    db.select().from(s.experiment).where(eq(s.experiment.protocolId, id)).orderBy(desc(s.experiment.opensAt)).limit(1),
  ]);
  if (!experiment) return { protocol, story, experiment: null };
  const inExperiment = eq(s.experimentEnrolment.experimentId, experiment.id);
  const [[{ joined }], [mine], [signal]] = await Promise.all([
    db.select({ joined: count() }).from(s.experimentEnrolment).where(inExperiment),
    db.select().from(s.experimentEnrolment).where(and(inExperiment, eq(s.experimentEnrolment.profileId, profileId))),
    db.select().from(s.experimentSignal).where(eq(s.experimentSignal.experimentId, experiment.id)).orderBy(desc(s.experimentSignal.computedAt)).limit(1),
  ]);
  return { protocol, story, experiment: { ...experiment, joined, mine, signal } };
}

/** A child profile may join an experiment only while the account's parental consent stands. */
export async function mayJoin(m: Member) {
  if (m.profile.kind !== "child") return true;
  const [row] = await db.select({ id: s.consent.id }).from(s.consent).where(and(
    eq(s.consent.profileId, m.profile.id), eq(s.consent.accountId, m.account.id), eq(s.consent.kind, "parental"), isNull(s.consent.revokedAt),
  )).limit(1);
  return !!row;
}

/* ───────────── league ───────────── */

/** Monday of the week that holds this day, as YYYY-MM-DD. */
export function weekStart(day = todayKey()) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/**
 * This week's table for the league the family's team plays in, ranked only by days finished.
 * Teams level on days share a place. Null when no profile in the account is on a team.
 */
export async function leagueFor(m: Member) {
  const teams = await db.select({ teamId: s.team.id, leagueId: s.team.leagueId, profileId: s.teamMember.profileId })
    .from(s.teamMember).innerJoin(s.team, eq(s.team.id, s.teamMember.teamId))
    .where(inArray(s.teamMember.profileId, m.profiles.map((p) => p.id)));
  const mine = teams.find((x) => x.profileId === m.profile.id) ?? teams[0];
  if (!mine) return null;
  const week = weekStart();
  const [[league], rows] = await Promise.all([
    db.select().from(s.league).where(eq(s.league.id, mine.leagueId)),
    db.select({ id: s.team.id, name: s.team.name, daysFinished: s.teamWeek.daysFinished, daysPossible: s.teamWeek.daysPossible })
      .from(s.team).leftJoin(s.teamWeek, and(eq(s.teamWeek.teamId, s.team.id), eq(s.teamWeek.weekStart, week)))
      .where(eq(s.team.leagueId, mine.leagueId)).orderBy(asc(s.team.name)),
  ]);
  const table = rows
    .map((r) => ({ ...r, daysFinished: r.daysFinished ?? 0, daysPossible: r.daysPossible ?? 6 }))
    .sort((a, b) => b.daysFinished - a.daysFinished)
    .map((r, _, all) => ({ ...r, place: 1 + all.filter((o) => o.daysFinished > r.daysFinished).length, mine: r.id === mine.teamId }));
  return { league, week, table };
}

/* ───────────── community ideas ───────────── */

/** Cap height over font size for Outfit, the app's typeface. */
const CAP_HEIGHT = 0.7;
/** Used until onboarding has measured this profile and this screen. */
const FALLBACK_LETTER_CM = 0.6;
const FALLBACK_PX_PER_CM = 37.8;

/**
 * Font size in CSS pixels that draws a capital letter as tall as the eye profile asks, on this screen.
 * The app layout enlarges the whole page by the member's text size; that is divided out so the letter keeps its true height.
 */
export function letterFontPx(m: Member) {
  const zoom = pageZoom(m.eye?.appTextPx);
  return ((m.eye?.letterCm ?? FALLBACK_LETTER_CM) * (m.device?.pxPerCm ?? FALLBACK_PX_PER_CM)) / CAP_HEIGHT / zoom;
}

/** The week of the programme the member has reached, or null when not on a programme. */
export const currentWeek = (m: Member) => (m.enrolment ? Math.max(1, m.enrolment.week) : null);

export const inbox = (profileId: string) =>
  db.select().from(s.fusionMail).where(eq(s.fusionMail.toProfileId, profileId)).orderBy(desc(s.fusionMail.createdAt)).limit(30);

/** Published notes for a programme, up to the week the reader has reached. */
export const aheadNotes = (programme: string, week: number) =>
  db.select({ id: s.aheadNote.id, week: s.aheadNote.week, body: s.aheadNote.body, signature: s.aheadNote.signature }).from(s.aheadNote)
    .where(and(eq(s.aheadNote.programme, programme), eq(s.aheadNote.status, "published"), lte(s.aheadNote.week, week)))
    .orderBy(desc(s.aheadNote.week), desc(s.aheadNote.createdAt));

/** The note this profile already left for a week, if any. One note a week. */
export async function ownNote(profileId: string, programme: string, week: number) {
  const [row] = await db.select().from(s.aheadNote)
    .where(and(eq(s.aheadNote.profileId, profileId), eq(s.aheadNote.programme, programme), eq(s.aheadNote.week, week))).limit(1);
  return row ?? null;
}

export async function streakOf(profileId: string) {
  const [row] = await db.select().from(s.streak).where(eq(s.streak.profileId, profileId));
  return row ?? null;
}

export const giftsTo = (profileId: string) =>
  db.select({ id: s.lightGift.id, from: s.profile.displayName, note: s.lightGift.note, forDay: s.lightGift.forDay }).from(s.lightGift)
    .innerJoin(s.profile, eq(s.profile.id, s.lightGift.fromProfileId))
    .where(eq(s.lightGift.toProfileId, profileId)).orderBy(desc(s.lightGift.forDay)).limit(30);

/**
 * Who this profile may give a light to: people with a streak who are in the family, on the same team,
 * or who once gave this profile a light. Never the profile itself.
 */
export function lightCandidates(m: Member) {
  const me = m.profile.id;
  const myTeams = db.select({ id: s.teamMember.teamId }).from(s.teamMember).where(eq(s.teamMember.profileId, me));
  const teamMates = db.select({ id: s.teamMember.profileId }).from(s.teamMember).where(inArray(s.teamMember.teamId, myTeams));
  const givers = db.select({ id: s.lightGift.fromProfileId }).from(s.lightGift).where(eq(s.lightGift.toProfileId, me));
  return db.select({ id: s.profile.id, name: s.profile.displayName, current: s.streak.current }).from(s.streak)
    .innerJoin(s.profile, eq(s.profile.id, s.streak.profileId))
    .where(and(ne(s.profile.id, me), isNull(s.profile.archivedAt),
      or(eq(s.profile.accountId, m.account.id), inArray(s.profile.id, teamMates), inArray(s.profile.id, givers))))
    .orderBy(asc(s.profile.displayName));
}

/** This month's wall and its sharpened tiles. Null when no wall has been set up for the month. */
export async function wallFor(month = todayKey().slice(0, 7)) {
  const [wall] = await db.select().from(s.focusWall).where(eq(s.focusWall.month, month));
  if (!wall) return null;
  const sharp = await db.select({ idx: s.focusTile.idx, profileId: s.focusTile.profileId }).from(s.focusTile).where(eq(s.focusTile.wallId, wall.id));
  return { wall, sharp };
}

/** The logbook of the glasses pair this profile has most recently worn, oldest wearer first. Null when it has no pair. */
export async function glassesLog(profileId: string) {
  const [leg] = await db.select({ pairId: s.glassesLeg.pairId }).from(s.glassesLeg)
    .where(eq(s.glassesLeg.profileId, profileId)).orderBy(desc(s.glassesLeg.startedAt)).limit(1);
  if (!leg) return null;
  const [[pair], legs] = await Promise.all([
    db.select().from(s.glassesPair).where(eq(s.glassesPair.id, leg.pairId)),
    db.select().from(s.glassesLeg).where(eq(s.glassesLeg.pairId, leg.pairId)).orderBy(asc(s.glassesLeg.startedAt)),
  ]);
  return { pair, legs };
}
