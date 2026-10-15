/**
 * The weekly plan of a member's programme: what the week screen, the Today page and the counsellor's page show.
 * Server only. The rules are in programme-rules.ts; this file reads the rows and keeps `enrolment.week` in step.
 *
 * Nothing about a chapter is stored. What is done is worked out from the rows that already exist: finished
 * sessions, the day summary (the rings), the family's care log and check-up results.
 *
 * How the week moves on: the calendar decides (see `weekOn`). The stored `enrolment.week` is brought up to date
 *  - when the member opens Today or the week screen (`programmeView`), so it is right with no scheduler running;
 *  - by the daily job `programme-weeks`, so lists that other people read (the guardian's family page, the
 *    counsellor's list) are right for a member who has not opened the app, and a finished course is closed.
 * Both call `syncEnrolment`, which changes a row only when it is out of date and is safe to run any number of times.
 */
import { and, desc, eq, gte, inArray, isNotNull, lte } from "drizzle-orm";
import { exerciseBySlug, gameBySlug, programmeBySlug, testByKey, type Programme, type TestDef } from "@/data";
import { programmePlanFor, type ProgrammePlan } from "@/data/programme-plans";
import { db, schema } from "@/db";
import { ageFrom } from "@/engine";
import { isBuilt } from "@/games/built";
import type { Viewer } from "@/lib/auth";
import { readStatuses } from "@/lib/catalogue";
import {
  advance, chapterFor, checksFor, dayOn, daysOfWeek, FILM_SLUG, isLastWeek, itemKey, nextWeek, practisedDays, progress, ranItsCourse, resolve, visitIn, weekView,
  type ChapterDone, type CheckDue, type DayChapter, type DayDone, type DayRecord, type Fit, type NextWeek, type PlanItem, type WeekDay,
} from "@/lib/programme-rules";
import { todayKey, type Member } from "@/lib/session";
import { isCareRoutine, onCounsellorPlan, TRAIN_KINDS, type TrainKind } from "@/lib/sessions";
import { isListed, statusOf, type StatusMap } from "@/lib/status";

const E = schema.enrolment, S = schema.session, D = schema.daySummary;
export type Enrolment = typeof E.$inferSelect;

const DAY_MS = 86_400_000;
/** How long the Today page keeps pointing at the end screen of a finished course: the span the summary page covers. */
const END_NOTE_DAYS = 28;

/* ───────────── keeping the stored week in step ───────────── */

/**
 * Brings one active enrolment up to date. Returns "finished" when its course has run all its weeks (the row is
 * closed and the profile is back at level 0, as when a guardian leaves a programme), else the week it is in.
 * The `status = active` test is repeated in each update, so two callers at once cannot both close it.
 */
export async function syncEnrolment(e: Pick<Enrolment, "id" | "profileId" | "programme" | "week" | "startedAt" | "status">, now = new Date()): Promise<{ week: number; finished: boolean; changed: boolean }> {
  const plan = programmePlanFor(e.programme);
  if (!plan || e.status !== "active") return { week: e.week, finished: false, changed: false };
  const at = advance(plan, todayKey(e.startedAt), todayKey(now));
  if (at.finished) {
    const closed = await db.transaction(async (tx) => {
      const rows = await tx.update(E).set({ status: "finished", week: at.week, endedAt: now })
        .where(and(eq(E.id, e.id), eq(E.status, "active"))).returning({ id: E.id });
      if (rows.length) await tx.update(schema.profile).set({ accessLevel: 0 }).where(eq(schema.profile.id, e.profileId));
      return rows.length > 0;
    });
    return { week: at.week, finished: true, changed: closed };
  }
  if (at.week === e.week) return { week: e.week, finished: false, changed: false };
  const rows = await db.update(E).set({ week: at.week }).where(and(eq(E.id, e.id), eq(E.status, "active"))).returning({ id: E.id });
  return { week: at.week, finished: false, changed: rows.length > 0 };
}

/** Every active enrolment, brought up to date. For the daily job: counts only. */
export async function syncAllEnrolments(now = new Date()) {
  const rows = await db.select({ id: E.id, profileId: E.profileId, programme: E.programme, week: E.week, startedAt: E.startedAt, status: E.status })
    .from(E).where(eq(E.status, "active"));
  const counts = { checked: rows.length, advanced: 0, finished: 0 };
  for (const row of rows) {
    const r = await syncEnrolment(row, now);
    if (r.changed) counts[r.finished ? "finished" : "advanced"] += 1;
  }
  return counts;
}

/* ───────────── which items are there for a member ───────────── */

/**
 * The same tests the session code applies before it lets an item start: the item is in this edition and built, and
 * its status is open, or counsellor-led for a member on a counsellor's plan. A staff test household passes every status.
 */
function fitFor(who: { age: number | null; tester: boolean; linked: boolean; enrolment: { programme: string } | null }, statuses: StatusMap): Fit {
  return {
    age: who.age,
    usable: (kind, slug) => {
      const inEdition = kind === "film" ? slug === FILM_SLUG : kind === "game" ? !!gameBySlug(slug) && isBuilt(slug) : !!exerciseBySlug(slug);
      if (!inEdition) return false;
      if (who.tester) return true;
      const status = statusOf(statuses, kind, slug);
      return isListed(status, false) && (status !== "counsellor" || onCounsellorPlan(who, kind as TrainKind, slug));
    },
  };
}

/* ───────────── the week ───────────── */

export interface PlanCheck extends CheckDue { def: TestDef }

export interface ActiveWeek {
  programme: Programme;
  plan: ProgrammePlan;
  week: number;
  /** Weeks in the course. null for a habit programme. */
  weeks: number | null;
  today: string;
  dailyMinutes: number;
  daysPerWeek: number;
  /** A counsellor-led programme: the plan is a suggestion. */
  counsellorLed: boolean;
  /** No minutes are set yet (counsellor-led, before the counsellor has set them). */
  waiting: boolean;
  /** A programme with no training minutes: its day is the rings. */
  habit: boolean;
  days: WeekDay[];
  practised: number;
  /** Today in the week view. */
  day: WeekDay;
  chapter: DayChapter;
  done: ChapterDone;
  /** A routine that replaces the chapter for a member whose own therapist sets the list. null when the plan has none. */
  instead: PlanItem | null;
  checks: PlanCheck[];
  visit: boolean;
  lastWeek: boolean;
  next: NextWeek | null;
}

const NO_DAY: DayRecord = { train: 0, trainGoal: 0, rest: 0, restGoal: 6, light: 0, lightGoal: 90 };

/**
 * Everything about one profile's week on its active enrolment. `week` is the calendar week of the course, which
 * the caller has already checked is inside it.
 */
async function weekOf(profileId: string, e: Enrolment, programme: Programme, plan: ProgrammePlan, week: number, fit: Fit, now: Date): Promise<ActiveWeek> {
  const startDay = todayKey(e.startedAt), today = todayKey(now);
  const span = daysOfWeek(startDay, week);
  const [dayRows, sessions, careRows, results] = await Promise.all([
    db.select().from(D).where(and(eq(D.profileId, profileId), gte(D.day, span[0]), lte(D.day, span[6]))),
    /* two days back is enough to hold every session of today in the member's own calendar */
    db.select({ kind: S.kind, slug: S.itemSlug, minutes: S.minutes, startedAt: S.startedAt }).from(S)
      .where(and(eq(S.profileId, profileId), inArray(S.kind, TRAIN_KINDS), isNotNull(S.endedAt), gte(S.startedAt, new Date(now.getTime() - 2 * DAY_MS)))),
    db.select({ slug: schema.careLog.itemSlug }).from(schema.careLog).where(and(eq(schema.careLog.profileId, profileId), eq(schema.careLog.day, today))),
    db.select({ test: schema.testResult.testKey, takenAt: schema.testResult.takenAt }).from(schema.testResult)
      .where(and(eq(schema.testResult.profileId, profileId), gte(schema.testResult.takenAt, new Date(e.startedAt.getTime() - DAY_MS)))),
  ]);

  const records: Record<string, DayRecord> = {};
  for (const r of dayRows) records[r.day] = { train: r.trainMinutes, trainGoal: r.trainGoal, rest: r.restBreaks, restGoal: r.restGoal, light: r.lightMinutes, lightGoal: r.lightGoal };

  const chapter = chapterFor(plan, week, dayOn(startDay, today), e.dailyMinutes, fit);
  const rings = [...new Set(chapter.parts.flatMap((p) => (p.ring ? [p.ring] : [])))];
  const days = weekView({ startDay, week, today, dailyMinutes: e.dailyMinutes, daysPerWeek: e.daysPerWeek, rings }, records);

  /* Today's sessions. A care routine is a record: it is logged, and its time is never counted as training. */
  const mine = sessions.filter((s) => todayKey(s.startedAt) === today);
  const minutes: Record<string, number> = {};
  const logged = new Set<string>(careRows.map((r) => itemKey({ kind: "game", slug: r.slug })));
  for (const s of mine) {
    const key = itemKey({ kind: s.kind, slug: s.kind === "film" ? FILM_SLUG : s.slug });
    logged.add(key);
    if (!isCareRoutine(s.kind as TrainKind, s.slug)) minutes[key] = (minutes[key] ?? 0) + Math.max(0, s.minutes);
  }
  const r = records[today] ?? NO_DAY;
  const done: DayDone = { minutes, train: r.train, logged: [...logged], rest: { done: r.rest, goal: r.restGoal }, light: { done: r.light, goal: r.lightGoal } };

  const taken = results.map((t) => ({ test: t.test, day: todayKey(t.takenAt) }));
  const checks = checksFor(plan, startDay, week, taken).flatMap((c) => {
    const def = testByKey(c.test);
    return def?.built ? [{ ...c, def }] : [];
  });

  return {
    programme, plan, week, weeks: plan.weeks, today,
    dailyMinutes: e.dailyMinutes, daysPerWeek: e.daysPerWeek,
    counsellorLed: programme.level === 2,
    waiting: programme.level === 2 && e.dailyMinutes <= 0,
    habit: e.dailyMinutes <= 0 && programme.level < 2,
    days, practised: practisedDays(days),
    day: days.find((d) => d.today) ?? days[0],
    chapter, done: progress(chapter, done),
    instead: (plan.instead && resolve(plan.instead, fit)[0]) || null,
    checks, visit: visitIn(plan, week), lastWeek: isLastWeek(plan, week), next: nextWeek(plan, week),
  };
}

/* ───────────── the member's view ───────────── */

export interface EndedCourse {
  programme: Programme;
  weeks: number;
  end: "eye_test" | "counsellor";
  endedAt: Date;
  /** Ended within the last four weeks: the Today page still points at the end screen. */
  recent: boolean;
}

export type ProgrammeView =
  | { state: "none" }
  | ({ state: "ended" } & EndedCourse)
  | ({ state: "active" } & ActiveWeek);

/** The latest enrolment of a profile, when it ran its whole course and nothing has been started since. */
async function endedCourse(profileId: string, now: Date): Promise<EndedCourse | null> {
  const [last] = await db.select().from(E).where(eq(E.profileId, profileId)).orderBy(desc(E.startedAt)).limit(1);
  if (!last || last.status !== "finished" || !last.endedAt) return null;
  const programme = programmeBySlug(last.programme), plan = programmePlanFor(last.programme);
  if (!programme || !plan || plan.weeks === null || !plan.end || !ranItsCourse(plan, todayKey(last.startedAt), todayKey(last.endedAt))) return null;
  return { programme, weeks: plan.weeks, end: plan.end, endedAt: last.endedAt, recent: now.getTime() - last.endedAt.getTime() <= END_NOTE_DAYS * DAY_MS };
}

/**
 * The active profile's programme, as the week screen and the Today page show it.
 * Reading it also brings the stored week up to date, and closes a course that has run its weeks.
 */
export async function programmeView(m: Member, now = new Date()): Promise<ProgrammeView> {
  const e = m.enrolment;
  const programme = e ? programmeBySlug(e.programme) : undefined, plan = e ? programmePlanFor(e.programme) : undefined;
  if (e && programme && plan) {
    const at = await syncEnrolment(e, now);
    if (!at.finished) {
      const fit = fitFor({ age: m.age, tester: m.tester, linked: m.linked, enrolment: e }, await readStatuses());
      return { state: "active", ...(await weekOf(m.profile.id, e, programme, plan, at.week, fit, now)) };
    }
  }
  const ended = await endedCourse(m.profile.id, now);
  return ended ? { state: "ended", ...ended } : { state: "none" };
}

/* ───────────── the counsellor's view ───────────── */

export type MemberWeek =
  | { state: "none" }
  | { state: "over"; programme: Programme; weeks: number }
  | ({ state: "active" } & ActiveWeek);

/**
 * A linked member's week, read-only, for the counsellor's member page. Null unless the link is this counsellor's
 * and active. It writes nothing: the member's own visit or the daily job moves the stored week on.
 */
export async function memberWeek(viewer: Viewer, linkId: string, now = new Date()): Promise<MemberWeek | null> {
  const L = schema.counsellorLink, P = schema.profile;
  const [own] = await db.select({ profileId: P.id, birthYear: P.birthYear }).from(L).innerJoin(P, eq(P.id, L.profileId))
    .where(and(eq(L.id, linkId), eq(L.counsellorId, viewer.user.id), eq(L.status, "active"))).limit(1);
  if (!own) return null;
  const [e] = await db.select().from(E).where(and(eq(E.profileId, own.profileId), eq(E.status, "active"))).orderBy(desc(E.startedAt)).limit(1);
  const programme = e ? programmeBySlug(e.programme) : undefined, plan = e ? programmePlanFor(e.programme) : undefined;
  if (!e || !programme || !plan) return { state: "none" };
  const at = advance(plan, todayKey(e.startedAt), todayKey(now));
  if (at.finished) return { state: "over", programme, weeks: at.week };
  /* The counsellor is linked, so a counsellor-led item is on this member's plan. */
  const fit = fitFor({ age: ageFrom(own.birthYear), tester: false, linked: true, enrolment: e }, await readStatuses());
  return { state: "active", ...(await weekOf(own.profileId, e, programme, plan, at.week, fit, now)) };
}

/* ───────────── links ───────────── */

/** Where an item of a chapter is done. */
export const itemHref = (it: Pick<PlanItem, "kind" | "slug">) =>
  it.kind === "film" ? "/train/cinema" : it.kind === "game" ? `/train/games/${it.slug}/play` : `/train/exercises/${it.slug}`;

/** Where "Start today's chapter" leads: the next part's suggestion. null when nothing is left to start. */
export function nextStep(w: Pick<ActiveWeek, "chapter" | "done">): { index: number; total: number; href: string } | null {
  const i = w.done.next;
  if (i === null) return null;
  const kind = w.chapter.parts[i].kind, same = w.chapter.parts.filter((p) => p.kind === kind);
  return { index: same.indexOf(w.chapter.parts[i]) + 1, total: same.length, href: itemHref(w.chapter.parts[i].items[0]) };
}
