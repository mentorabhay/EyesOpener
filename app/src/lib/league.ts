// Eyes Opener: The show-up league: its rules, with no database and no clock. Tested in league.test.ts; teams.ts reads and writes.
/**
 * The show-up league: its rules, with no database and no clock. Tested in league.test.ts; teams.ts reads and writes.
 *
 * What the league is:
 * - A league holds the teams of one programme and one age band. Teams are ranked only by showing up:
 *   the days on which the day's practice minutes were done. Scores, speed, levels and minutes are never read here.
 * - A week runs Monday to Sunday in India time and stands alone. Nothing is carried over, there are no prizes and
 *   there is no season: the concept's "seasons" are themes for games and quests, not a longer league.
 *
 * What the numbers mean:
 * - A member's week is `finished` of `asked`. `asked` is the days a week the programme asks for, so the other days
 *   are rest days and never count. A day the stop rule ended ("I feel unwell") takes one day off `asked`: it is
 *   never a missed day. Finished days beyond `asked` add nothing, so nobody gains by training more.
 * - A team's week is the share of the asked days that its members finished, all members pooled, shown on the
 *   league's own scale: `daysFinished` of `daysPossible`, where `daysPossible` is the programme's days a week and is
 *   the same for every team. Team size therefore does not decide the rank, and because the scale never changes,
 *   nobody can see from the table that somebody had a day excused.
 * - Places come from `daysFinished` alone. Teams level on days share a place.
 *
 * Who is on a team:
 * - A team is a name from a fixed list and a number of members. Teams are filled evenly, never by skill and never by
 *   choice. Profiles of one household on the same programme and in the same age band share a team by default.
 * - A member's days count from a Monday: the day they join when that is a Monday, the next Monday otherwise.
 *   So a move in the middle of a week neither helps nor hurts any team.
 */
import { programmeBySlug } from "@/data";
import { MAX_DAILY_MINUTES, MIN_SCREEN_AGE } from "@/engine";

/* ───────────── days and weeks (date keys are YYYY-MM-DD, in India time) ───────────── */

const DAY_MS = 86_400_000;
const utc = (key: string) => new Date(`${key}T00:00:00Z`);

export const addDays = (key: string, n: number) => new Date(utc(key).getTime() + n * DAY_MS).toISOString().slice(0, 10);
/** The Monday of the week a day is in. */
export const weekOf = (day: string) => addDays(day, -((utc(day).getUTCDay() + 6) % 7));
/** Monday to Sunday of the week that starts on this Monday. */
export const daysOfWeek = (week: string) => Array.from({ length: 7 }, (_, i) => addDays(week, i));
const indiaDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });
/** The day a moment falls on in India, as a date key. The same day as `todayKey` in session.ts. */
export const dayOf = (at: Date) => indiaDay.format(at);
/** The moment a day starts in India. */
export const startOfDay = (day: string) => new Date(`${day}T00:00:00+05:30`);
/** The Monday from which a member who joins on this day is counted. */
export const countsFromFor = (joinDay: string) => (weekOf(joinDay) === joinDay ? joinDay : addDays(weekOf(joinDay), 7));

/* ───────────── who may be on a team ───────────── */

export const AGE_BANDS = ["4 to 7", "8 to 12", "13 to 17", "adults"] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

/**
 * The age band a profile plays in. Children are never in a league with adults.
 * Null for a child under the screen age, and for a child whose birth year is not known.
 */
export function ageBandOf(kind: "adult" | "child", age: number | null): AgeBand | null {
  if (kind === "adult") return "adults";
  if (age === null || age < MIN_SCREEN_AGE) return null;
  return age <= 7 ? "4 to 7" : age <= 12 ? "8 to 12" : age <= 17 ? "13 to 17" : "adults";
}

export type LeagueBlock = "tester" | "no_programme" | "no_daily_minutes" | "too_young" | "needs_consent";
export interface EntryInput {
  /** A staff member's own test household. It never joins a team. */
  tester: boolean;
  kind: "adult" | "child";
  age: number | null;
  /** For a child: a guardian's consent stands. */
  consented: boolean;
  enrolment: { programme: string; dailyMinutes: number; daysPerWeek: number } | null;
}
export type Entry = { ok: true; programme: string; band: AgeBand } | { ok: false; reason: LeagueBlock };

/** Which league a profile may join, or the one reason it may not. The page and the actions share it. */
export function leagueEntry(p: EntryInput): Entry {
  if (p.tester) return { ok: false, reason: "tester" };
  if (!p.enrolment) return { ok: false, reason: "no_programme" };
  /* With no minutes to finish there is no day to count: the habit programmes, and a counsellor-led one before its dose is set. */
  if (p.enrolment.dailyMinutes <= 0 || p.enrolment.daysPerWeek <= 0) return { ok: false, reason: "no_daily_minutes" };
  const band = ageBandOf(p.kind, p.age);
  if (!band) return { ok: false, reason: "too_young" };
  if (p.kind === "child" && !p.consented) return { ok: false, reason: "needs_consent" };
  return { ok: true, programme: p.enrolment.programme, band };
}

/**
 * Does a member keep the seat on their team? Not once the profile is archived, has left the league's programme,
 * or is a child whose guardian's consent no longer stands.
 */
export const keepsSeat = (p: { archived: boolean; kind: "adult" | "child"; consented: boolean; onProgramme: boolean }) =>
  !p.archived && p.onProgramme && (p.kind === "adult" || p.consented);

/* ───────────── counting a day ───────────── */

/** A clock that is a few seconds slow must not cost a day. */
export const DAY_SLACK_MINUTES = 0.05;

export interface DayRow { day: string; trainMinutes: number; trainGoal: number }

/**
 * Did this profile finish the day? Yes when the training minutes the programme set for that day were reached.
 * A day with no minutes set can never be finished, and minutes above the goal change nothing.
 */
export function finishedDay(d: { trainMinutes: number; trainGoal: number }): boolean {
  const goal = Math.min(d.trainGoal, MAX_DAILY_MINUTES);
  return goal > 0 && d.trainMinutes >= goal - DAY_SLACK_MINUTES;
}

export interface MemberWeek { finished: number; asked: number }
export interface MemberWeekInput {
  /** The Monday of the week being counted. */
  week: string;
  /** Days a week the member's programme asks for. */
  daysPerWeek: number;
  /** The member's day rows. Rows outside the week are ignored. */
  days: readonly DayRow[];
  /** Days on which the stop rule ended a session. */
  stopDays: readonly string[];
  /** The Monday from which this member counts. Null means every week. */
  countsFrom: string | null;
}

/**
 * One member's week. Not counted at all before `countsFrom`.
 * A stopped day that was not finished is excused: it leaves `asked`, so it can never be a missed day.
 */
export function memberWeek(i: MemberWeekInput): MemberWeek {
  if (i.countsFrom && i.countsFrom > i.week) return { finished: 0, asked: 0 };
  const inWeek = new Set(daysOfWeek(i.week));
  const done = new Set(i.days.filter((d) => inWeek.has(d.day) && finishedDay(d)).map((d) => d.day));
  const excused = new Set(i.stopDays.filter((d) => inWeek.has(d) && !done.has(d)));
  const asked = Math.max(0, Math.min(7, Math.floor(i.daysPerWeek)) - excused.size);
  return { finished: Math.min(done.size, asked), asked };
}

/** The scale a league's days are shown on: the days a week its programme asks for. */
export const DEFAULT_LEAGUE_DAYS = 5;
export function leagueDays(programme: string): number {
  const days = programmeBySlug(programme)?.daysPerWeek ?? 0;
  return days >= 1 && days <= 7 ? days : DEFAULT_LEAGUE_DAYS;
}

export interface TeamDays { daysFinished: number; daysPossible: number }

/**
 * A team's week on the league's scale: the pooled share of asked days that were finished, to the nearest whole day
 * (a half goes up). Null when no member has a day to count: such a team is not in the table that week.
 */
export function teamDays(members: readonly MemberWeek[], scale: number): TeamDays | null {
  const asked = members.reduce((n, m) => n + m.asked, 0);
  if (asked <= 0) return null;
  const finished = members.reduce((n, m) => n + Math.min(m.finished, m.asked), 0);
  return { daysFinished: Math.round((finished * scale) / asked), daysPossible: scale };
}

/** Rows with their places, most days first. Teams level on days share a place and are listed by name. */
export function placed<T extends { name: string; daysFinished: number }>(rows: readonly T[]): (T & { place: number; tied: boolean })[] {
  return [...rows]
    .sort((a, b) => b.daysFinished - a.daysFinished || a.name.localeCompare(b.name))
    .map((r, _, all) => ({
      ...r,
      place: 1 + all.filter((o) => o.daysFinished > r.daysFinished).length,
      tied: all.filter((o) => o.daysFinished === r.daysFinished).length > 1,
    }));
}

/* ───────────── filling teams ───────────── */

/** No team is larger than this. */
export const TEAM_MAX = 5;
/** A new team opens only when every team in the league has at least this many, so nobody starts alone for long. */
export const TEAM_PAIR = 2;
/** Teams in one league: with full teams that is 30 members. */
export const LEAGUE_TEAMS = 6;

export interface TeamSeats { id: string; leagueId: string; name: string; members: number }
export type TeamPick = { kind: "team"; teamId: string } | { kind: "new_team"; leagueId: string; name: string } | { kind: "new_league"; name: string };
export interface PickInput {
  /** The leagues for this programme and age band, oldest first. */
  leagues: readonly string[];
  /** Every team in those leagues with its number of members. */
  teams: readonly TeamSeats[];
  /** Teams that already hold someone from this household. */
  family?: readonly string[];
  /** The team this profile left earlier in the same week. */
  back?: string | null;
  /** The team a member asked to move away from. */
  avoid?: string | null;
}

const fewest = (teams: readonly TeamSeats[]) =>
  [...teams].sort((a, b) => a.members - b.members || a.name.localeCompare(b.name))[0] as TeamSeats | undefined;

/**
 * The team a profile is given. Nothing about the profile is read: not a result, not a streak, not a wish.
 * 1. Back to the team left earlier this week, so leaving and joining again is not a way to get another team.
 * 2. With the household, when one of its teams has room.
 * 3. Otherwise the oldest league with room: the team with the fewest members, or a new team once every team has a pair.
 * 4. A new league when every team is full.
 */
export function pickTeam(i: PickInput, names: readonly string[]): TeamPick {
  const room = i.teams.filter((t) => t.id !== i.avoid && t.members < TEAM_MAX);
  const back = room.find((t) => t.id === i.back);
  if (back) return { kind: "team", teamId: back.id };
  const family = fewest(room.filter((t) => i.family?.includes(t.id)));
  if (family) return { kind: "team", teamId: family.id };

  for (const leagueId of i.leagues) {
    const all = i.teams.filter((t) => t.leagueId === leagueId);
    const open = fewest(room.filter((t) => t.leagueId === leagueId));
    if (open && open.members < TEAM_PAIR) return { kind: "team", teamId: open.id };
    if (all.length < LEAGUE_TEAMS) return { kind: "new_team", leagueId, name: freeName(all.map((t) => t.name), names) };
    if (open) return { kind: "team", teamId: open.id };
  }
  return { kind: "new_league", name: freeName([], names) };
}

/** The first name on the list that this league does not use yet. */
export function freeName(used: readonly string[], names: readonly string[]): string {
  return names.find((n) => !used.includes(n)) ?? names[used.length % names.length];
}

/* ───────────── changing team ───────────── */

/** A different team at most once in a league week. `lastChangeDay` is the day of the last change, or null. */
export const mayChangeTeam = (lastChangeDay: string | null, today: string) => !lastChangeDay || weekOf(lastChangeDay) < weekOf(today);
/** The Monday from which a member who changed team this week may ask again. */
export const nextChangeDay = (today: string) => addDays(weekOf(today), 7);

/* ───────────── the weekly job ───────────── */

/** Weeks the job must close: the week that just ended, and any earlier week left open. Oldest first, each once. */
export function weeksToClose(openWeeks: readonly string[], today: string): string[] {
  const thisWeek = weekOf(today);
  return [...new Set([...openWeeks.map(weekOf), addDays(thisWeek, -7)])].filter((w) => w < thisWeek).sort();
}
