/**
 * The show-up league, reading and writing. The rules are in league.ts; this file only applies them.
 * Server only.
 *
 * - This week's table is worked out from the day rows each time it is read, so it moves as soon as a day is finished.
 *   The same numbers are stored in `team_week` by the daily job, and frozen there by the weekly job (`closedAt`).
 * - A team shows other households its name, its number of members and its days. A member's name, days or stopped
 *   days never leave this file for anyone outside the household.
 * - Every member-facing read and write is scoped to the active profile and its household.
 */
import { and, asc, count, desc, eq, exists, gt, gte, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { league as words, TEAM_NAMES } from "@/copy/league";
import { db, schema as s } from "@/db";
import {
  addDays, countsFromFor, dayOf, keepsSeat, leagueDays, leagueEntry, mayChangeTeam, memberWeek, nextChangeDay, pickTeam, placed,
  startOfDay, teamDays, weekOf, weeksToClose, type Entry, type LeagueBlock, type MemberWeek,
} from "@/lib/league";
import type { Member } from "@/lib/session";

/** Today in India. This file names the day itself, so that it also runs outside a request (a job, the seed). */
const todayKey = (at = new Date()) => dayOf(at);

/** The database, or a transaction on it. */
type Q = Pick<typeof db, "select" | "selectDistinct" | "insert" | "update" | "delete" | "execute">;

/** A guardian's consent stands for the profile in the query. Built when asked for, so loading this file reads nothing. */
const consentStands = () => exists(db.select({ id: s.consent.id }).from(s.consent)
  .where(and(eq(s.consent.profileId, s.profile.id), eq(s.consent.kind, "parental"), isNull(s.consent.revokedAt))));

/* ───────────── a week's numbers ───────────── */

interface TeamNumbers { members: number; counting: number; weeks: MemberWeek[] }

/**
 * For every team of these leagues, in one week: how many members it has, how many of them are counted that week,
 * and each counted member's week. Only members who may be counted are read: on the league's programme with minutes
 * set, not archived, and for a child with consent standing.
 */
async function weekNumbers(q: Q, leagueIds: string[], week: string) {
  const teams = new Map<string, TeamNumbers>();
  const own = new Map<string, MemberWeek>();
  if (!leagueIds.length) return { teams, own };
  const rows = await q.select({ teamId: s.teamMember.teamId, profileId: s.teamMember.profileId, countsFrom: s.teamMember.countsFrom, daysPerWeek: s.enrolment.daysPerWeek })
    .from(s.teamMember)
    .innerJoin(s.team, eq(s.team.id, s.teamMember.teamId))
    .innerJoin(s.league, eq(s.league.id, s.team.leagueId))
    .innerJoin(s.profile, eq(s.profile.id, s.teamMember.profileId))
    .innerJoin(s.enrolment, and(eq(s.enrolment.profileId, s.profile.id), eq(s.enrolment.status, "active"), eq(s.enrolment.programme, s.league.programme)))
    .where(and(
      inArray(s.team.leagueId, leagueIds), isNull(s.profile.archivedAt), gt(s.enrolment.dailyMinutes, 0), gt(s.enrolment.daysPerWeek, 0),
      or(eq(s.profile.kind, "adult"), consentStands()),
    ));
  /* One seat per profile: a second active enrolment row must not count anybody twice. */
  const members = [...new Map(rows.map((r) => [r.profileId, r])).values()];
  if (!members.length) return { teams, own };

  const ids = members.map((m) => m.profileId);
  /* One query after another: `q` may be a transaction, which runs on a single connection. */
  const days = await q.select({ profileId: s.daySummary.profileId, day: s.daySummary.day, trainMinutes: s.daySummary.trainMinutes, trainGoal: s.daySummary.trainGoal })
    .from(s.daySummary).where(and(inArray(s.daySummary.profileId, ids), gte(s.daySummary.day, week), lt(s.daySummary.day, addDays(week, 7))));
  const stops = await q.select({ profileId: s.session.profileId, at: s.session.startedAt }).from(s.session)
    .where(and(inArray(s.session.profileId, ids), eq(s.session.endReason, "stop_rule"), gte(s.session.startedAt, startOfDay(week)), lt(s.session.startedAt, startOfDay(addDays(week, 7)))));
  for (const m of members) {
    const mine = memberWeek({
      week, daysPerWeek: m.daysPerWeek, countsFrom: m.countsFrom,
      days: days.filter((d) => d.profileId === m.profileId),
      stopDays: stops.filter((x) => x.profileId === m.profileId).map((x) => todayKey(x.at)),
    });
    const counted = !m.countsFrom || m.countsFrom <= week;
    const t = teams.get(m.teamId) ?? { members: 0, counting: 0, weeks: [] };
    t.members += 1;
    if (counted) { t.counting += 1; t.weeks.push(mine); own.set(m.profileId, mine); }
    teams.set(m.teamId, t);
  }
  return { teams, own };
}

const teamsOf = (q: Q, leagueIds: string[]) =>
  q.select({ id: s.team.id, name: s.team.name, leagueId: s.team.leagueId, programme: s.league.programme })
    .from(s.team).innerJoin(s.league, eq(s.league.id, s.team.leagueId)).where(inArray(s.team.leagueId, leagueIds)).orderBy(asc(s.team.name));

/**
 * Writes one week's numbers for the teams of these leagues. A row that is already closed is never changed.
 * A team with no day to count gets a row of 0 of 0, which no table shows. Returns how many rows were written.
 */
async function storeWeek(q: Q, leagueIds: string[], week: string, close: boolean, onlyTeams?: string[]) {
  if (!leagueIds.length) return 0;
  const all = await teamsOf(q, leagueIds);
  const { teams } = await weekNumbers(q, leagueIds, week);
  const values = all.filter((t) => !onlyTeams || onlyTeams.includes(t.id)).map((t) => {
    const d = teamDays(teams.get(t.id)?.weeks ?? [], leagueDays(t.programme));
    return { teamId: t.id, weekStart: week, daysFinished: d?.daysFinished ?? 0, daysPossible: d?.daysPossible ?? 0, closedAt: close ? new Date() : null };
  });
  if (!values.length) return 0;
  const written = await q.insert(s.teamWeek).values(values).onConflictDoUpdate({
    target: [s.teamWeek.teamId, s.teamWeek.weekStart],
    set: { daysFinished: sql`excluded.days_finished`, daysPossible: sql`excluded.days_possible`, closedAt: sql`excluded.closed_at` },
    setWhere: isNull(s.teamWeek.closedAt),
  }).returning({ teamId: s.teamWeek.teamId });
  return written.length;
}

const allLeagueIds = async (q: Q) => (await q.select({ id: s.league.id }).from(s.league)).map((l) => l.id);

/**
 * Closes every week that has ended and is still open, with its final numbers. With `onlyTeams`, only for those teams:
 * used just before a member leaves, so that the week they played in is kept as it was.
 * Safe to run twice: a closed row is never written again.
 */
export async function closeWeeks(q: Q = db, today = todayKey(), onlyTeams?: string[]) {
  const scope = onlyTeams ? inArray(s.teamWeek.teamId, onlyTeams) : undefined;
  const leagueIds = onlyTeams
    ? (await q.selectDistinct({ id: s.team.leagueId }).from(s.team).where(inArray(s.team.id, onlyTeams))).map((t) => t.id)
    : await allLeagueIds(q);
  const open = await q.selectDistinct({ week: s.teamWeek.weekStart }).from(s.teamWeek)
    .where(and(isNull(s.teamWeek.closedAt), lt(s.teamWeek.weekStart, weekOf(today)), scope));
  let weeks = 0, rows = 0;
  for (const week of weeksToClose(open.map((o) => o.week), today)) {
    const written = await storeWeek(q, leagueIds, week, true, onlyTeams);
    if (written) weeks += 1;
    rows += written;
  }
  /* Weeks and rows that this run closed. A second run answers 0 and 0. */
  return { weeks, rows };
}

/** Brings this week's stored rows up to date for every team, creating the row for a team that has none. */
export async function refreshWeek(q: Q = db, today = todayKey(), leagueIds?: string[]) {
  return storeWeek(q, leagueIds ?? await allLeagueIds(q), weekOf(today), false);
}

/**
 * Takes members off teams they may no longer be on: an archived profile, a member who left the league's programme,
 * a child whose guardian's consent no longer stands. Their earlier weeks are closed first. Returns how many left.
 */
export async function tidySeats(today = todayKey()) {
  const seats = await db.select({
    teamId: s.teamMember.teamId, profileId: s.teamMember.profileId, kind: s.profile.kind, archivedAt: s.profile.archivedAt,
    consented: sql<boolean>`${consentStands()}`,
    onProgramme: sql<boolean>`exists (select 1 from ${s.enrolment} where ${s.enrolment.profileId} = ${s.profile.id} and ${s.enrolment.status} = 'active' and ${s.enrolment.programme} = ${s.league.programme})`,
  }).from(s.teamMember)
    .innerJoin(s.team, eq(s.team.id, s.teamMember.teamId))
    .innerJoin(s.league, eq(s.league.id, s.team.leagueId))
    .innerJoin(s.profile, eq(s.profile.id, s.teamMember.profileId));
  const gone = seats.filter((x) => !keepsSeat({ archived: !!x.archivedAt, kind: x.kind, consented: x.consented, onProgramme: x.onProgramme }));
  for (const x of gone) {
    await db.transaction(async (tx) => {
      await closeWeeks(tx, today, [x.teamId]);
      const left = await tx.delete(s.teamMember).where(and(eq(s.teamMember.teamId, x.teamId), eq(s.teamMember.profileId, x.profileId))).returning({ id: s.teamMember.profileId });
      if (left.length) await tx.insert(s.teamMove).values({ profileId: x.profileId, kind: "leave", fromTeamId: x.teamId });
    });
  }
  return gone.length;
}

/* ───────────── what a member sees ───────────── */

/** Which league the active profile may join, or the one reason it may not. */
export const entryOf = (m: Member): Entry => leagueEntry({
  tester: m.tester, kind: m.profile.kind, age: m.age, consented: !m.dose.consentMissing,
  enrolment: m.enrolment && { programme: m.enrolment.programme, dailyMinutes: m.enrolment.dailyMinutes, daysPerWeek: m.enrolment.daysPerWeek },
});

const seatsOf = (q: Q, profileIds: string[]) =>
  q.select({
    profileId: s.teamMember.profileId, teamId: s.teamMember.teamId, countsFrom: s.teamMember.countsFrom,
    team: s.team.name, leagueId: s.team.leagueId, programme: s.league.programme, ageBand: s.league.ageBand,
  }).from(s.teamMember)
    .innerJoin(s.team, eq(s.team.id, s.teamMember.teamId))
    .innerJoin(s.league, eq(s.league.id, s.team.leagueId))
    .where(inArray(s.teamMember.profileId, profileIds));

/** How many past weeks a team's history shows. */
const HISTORY_WEEKS = 8;

/**
 * Everything the league page shows for the active profile: whether it may join, its team, this week's table,
 * the team's past weeks since the profile joined, and the household's other profiles that are on a team.
 */
export async function leagueView(m: Member) {
  const today = todayKey(), week = weekOf(today);
  const entry = entryOf(m);
  const seats = await seatsOf(db, m.profiles.map((p) => p.id));
  const seat = seats.find((x) => x.profileId === m.profile.id) ?? null;
  const family = seats.filter((x) => x.profileId !== m.profile.id)
    .map((x) => ({ profileId: x.profileId, name: m.profiles.find((p) => p.id === x.profileId)?.displayName ?? "", team: x.team }));
  if (!seat) return { today, week, entry, seat: null, family };

  const since = [seat.countsFrom, addDays(week, -7 * HISTORY_WEEKS)].filter((d): d is string => !!d).sort().at(-1)!;
  const [numbers, teams, past, [lastChange]] = await Promise.all([
    weekNumbers(db, [seat.leagueId], week),
    teamsOf(db, [seat.leagueId]),
    db.select({ id: s.team.id, name: s.team.name, week: s.teamWeek.weekStart, daysFinished: s.teamWeek.daysFinished, daysPossible: s.teamWeek.daysPossible })
      .from(s.teamWeek).innerJoin(s.team, eq(s.team.id, s.teamWeek.teamId))
      .where(and(eq(s.team.leagueId, seat.leagueId), isNotNull(s.teamWeek.closedAt), gt(s.teamWeek.daysPossible, 0), gte(s.teamWeek.weekStart, since), lt(s.teamWeek.weekStart, week))),
    db.select({ at: s.teamMove.at }).from(s.teamMove)
      .where(and(eq(s.teamMove.profileId, m.profile.id), eq(s.teamMove.kind, "switch"))).orderBy(desc(s.teamMove.at)).limit(1),
  ]);

  const scale = leagueDays(seat.programme);
  const table = placed(teams.flatMap((t) => {
    const n = numbers.teams.get(t.id), d = teamDays(n?.weeks ?? [], scale);
    return d ? [{ id: t.id, name: t.name, members: n!.members, ...d, mine: t.id === seat.teamId }] : [];
  }));
  const history = [...new Set(past.map((p) => p.week))].sort().reverse().flatMap((w) => {
    const rows = placed(past.filter((p) => p.week === w)), mine = rows.find((r) => r.id === seat.teamId);
    return mine ? [{ week: w, daysFinished: mine.daysFinished, daysPossible: mine.daysPossible, place: mine.place, tied: mine.tied, teams: rows.length }] : [];
  });
  return {
    today, week, entry, family,
    seat: { ...seat, members: numbers.teams.get(seat.teamId)?.members ?? 0, counted: !seat.countsFrom || seat.countsFrom <= week },
    table,
    /** The active profile's own finished days this week. Null while it is not counted. */
    own: numbers.own.get(m.profile.id) ?? null,
    history,
    mayChange: mayChangeTeam(lastChange ? todayKey(lastChange.at) : null, today),
    nextChange: nextChangeDay(today),
  };
}
export type LeagueView = Awaited<ReturnType<typeof leagueView>>;

/* ───────────── joining, leaving, changing ───────────── */

export type MoveResult = { ok: true; team: string } | { ok: false; reason: LeagueBlock | "already" | "not_on_team" | "too_soon" };

/** Locks the profile, so two quick presses cannot seat it twice, and answers its seat if it has one. */
async function lockSeat(tx: Q, profileId: string) {
  await tx.execute(sql`select 1 from ${s.profile} where ${s.profile.id} = ${profileId} for update`);
  return (await seatsOf(tx, [profileId]))[0] ?? null;
}

/** Seats the profile on the team the rules give it, making a team or a league when one is needed. */
async function seat(tx: Q, m: Member, entry: Extract<Entry, { ok: true }>, today: string, move: { kind: "join" | "switch"; from: string | null }) {
  /* One profile at a time is placed in a programme and age band, so two joins cannot both take the last place. */
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`league:${entry.programme}:${entry.band}`}))`);
  const leagues = (await tx.select({ id: s.league.id }).from(s.league)
    .where(and(eq(s.league.programme, entry.programme), eq(s.league.ageBand, entry.band))).orderBy(asc(s.league.createdAt), asc(s.league.id))).map((l) => l.id);
  const teams = leagues.length ? await tx.select({ id: s.team.id, leagueId: s.team.leagueId, name: s.team.name, members: count(s.teamMember.profileId) })
    .from(s.team).leftJoin(s.teamMember, eq(s.teamMember.teamId, s.team.id)).where(inArray(s.team.leagueId, leagues)).groupBy(s.team.id) : [];
  const others = m.profiles.filter((p) => p.id !== m.profile.id).map((p) => p.id);
  const family = others.length && teams.length
    ? await tx.select({ teamId: s.teamMember.teamId }).from(s.teamMember).where(and(inArray(s.teamMember.profileId, others), inArray(s.teamMember.teamId, teams.map((t) => t.id))))
    : [];
  /* The profile's latest move this week. Only a "leave" sends it back to the team it left. */
  const [left] = await tx.select({ kind: s.teamMove.kind, fromTeamId: s.teamMove.fromTeamId }).from(s.teamMove)
    .where(and(eq(s.teamMove.profileId, m.profile.id), gte(s.teamMove.at, startOfDay(weekOf(today))))).orderBy(desc(s.teamMove.at)).limit(1);

  const pick = pickTeam({
    leagues, teams, family: family.map((f) => f.teamId), avoid: move.from,
    back: move.kind === "join" && left?.kind === "leave" ? left.fromTeamId : null,
  }, TEAM_NAMES);
  let team: { id: string; name: string };
  if (pick.kind === "team") team = teams.find((t) => t.id === pick.teamId)!;
  else {
    const leagueId = pick.kind === "new_team" ? pick.leagueId
      : (await tx.insert(s.league).values({ name: words.storedName, programme: entry.programme, ageBand: entry.band }).returning({ id: s.league.id }))[0].id;
    [team] = await tx.insert(s.team).values({ leagueId, name: pick.name }).returning({ id: s.team.id, name: s.team.name });
  }
  await tx.insert(s.teamMember).values({ teamId: team.id, profileId: m.profile.id, countsFrom: countsFromFor(today) });
  await tx.insert(s.teamMove).values({ profileId: m.profile.id, kind: move.kind, fromTeamId: move.from, toTeamId: team.id });
  return team;
}

/** Joins the active profile to a team. The caller checks `m.can("share")` first. */
export async function joinTeam(m: Member, today = todayKey()): Promise<MoveResult> {
  const entry = entryOf(m);
  if (!entry.ok) return { ok: false, reason: entry.reason };
  return db.transaction(async (tx): Promise<MoveResult> => {
    if (await lockSeat(tx, m.profile.id)) return { ok: false, reason: "already" };
    const team = await seat(tx, m, entry, today, { kind: "join", from: null });
    return { ok: true, team: team.name };
  });
}

/** Takes the active profile off its team. The weeks it played in are closed first, so they stay as they were. */
export async function leaveTeam(m: Member, today = todayKey()): Promise<MoveResult> {
  return db.transaction(async (tx): Promise<MoveResult> => {
    const has = await lockSeat(tx, m.profile.id);
    if (!has) return { ok: false, reason: "not_on_team" };
    await closeWeeks(tx, today, [has.teamId]);
    await tx.delete(s.teamMember).where(and(eq(s.teamMember.teamId, has.teamId), eq(s.teamMember.profileId, m.profile.id)));
    await tx.insert(s.teamMove).values({ profileId: m.profile.id, kind: "leave", fromTeamId: has.teamId });
    return { ok: true, team: has.team };
  });
}

/** Moves the active profile to a different team, at most once a week. It is never the team it came from. */
export async function changeTeam(m: Member, today = todayKey()): Promise<MoveResult> {
  const entry = entryOf(m);
  if (!entry.ok) return { ok: false, reason: entry.reason };
  return db.transaction(async (tx): Promise<MoveResult> => {
    const has = await lockSeat(tx, m.profile.id);
    if (!has) return { ok: false, reason: "not_on_team" };
    const [last] = await tx.select({ at: s.teamMove.at }).from(s.teamMove)
      .where(and(eq(s.teamMove.profileId, m.profile.id), eq(s.teamMove.kind, "switch"))).orderBy(desc(s.teamMove.at)).limit(1);
    if (!mayChangeTeam(last ? todayKey(last.at) : null, today)) return { ok: false, reason: "too_soon" };
    await closeWeeks(tx, today, [has.teamId]);
    await tx.delete(s.teamMember).where(and(eq(s.teamMember.teamId, has.teamId), eq(s.teamMember.profileId, m.profile.id)));
    const team = await seat(tx, m, entry, today, { kind: "switch", from: has.teamId });
    return { ok: true, team: team.name };
  });
}
