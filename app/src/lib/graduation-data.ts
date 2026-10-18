/**
 * Keeper Graduation: reading a profile's finished course and its journey, and leaving, asking for and thanking
 * for a welcome. Server only. The rules are in graduation.ts.
 *
 * Privacy lives in the queries, not only in the page:
 * - a household is found by the signed-in member's own account and active profile. The browser sends the key of a
 *   line and nothing that names a household, a profile or a row;
 * - the two rows of a meeting do not point at each other's household. `keeper_welcome` holds no pointer at all to
 *   the family that received it. `keeper_ask` holds the id of the welcome, which is never selected for a page and
 *   is used only to carry a thank-you line back; no query here reads a household through it;
 * - no function selects another household's name, profile, place or result, so no page can show one;
 * - a staff test household never writes a row, and nothing here is read by a counsellor, a sponsor or staff.
 */
import { and, asc, desc, eq, gte, inArray, isNull, lte, ne } from "drizzle-orm";
import { programmeBySlug, type Programme } from "@/data";
import { programmePlanFor } from "@/data/programme-plans";
import { db, schema as s } from "@/db";
import { mayJoin } from "@/lib/community";
import {
  askRefusal, isThanksKey, isWelcomeKey, journeyOf, lastDayOf, leaveRefusal, stopAskingRefusal, takeBackRefusal, thanksRefusal,
  type Journey, type KeeperRefusal, type ThanksKey, type WelcomeKey,
} from "@/lib/graduation";
import { dayOf, startOfDay } from "@/lib/league";
import { ranItsCourse, weekOn } from "@/lib/programme-rules";
import type { Member } from "@/lib/session";
import { notifyHousehold } from "@/lib/notify/service";
import { notify as nw } from "@/copy/notify";

const E = s.enrolment, W = s.keeperWelcome, A = s.keeperAsk;
type Enrolment = typeof E.$inferSelect;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/* ───────────── the finished course ───────────── */

export interface Graduate {
  enrolment: Enrolment;
  programme: Programme;
  weeks: number;
  /** What the plan says comes after the course. */
  end: "eye_test" | "counsellor";
  endedAt: Date;
}

/**
 * The profile's latest course that ran all its weeks. A course a guardian left early is not one, and a habit
 * programme (no set weeks) never ends. Null when there is none.
 */
export async function graduateOf(profileId: string, x: Pick<typeof db, "select"> = db): Promise<Graduate | null> {
  const rows = await x.select().from(E).where(and(eq(E.profileId, profileId), eq(E.status, "finished"))).orderBy(desc(E.endedAt));
  for (const e of rows) {
    const programme = programmeBySlug(e.programme), plan = programmePlanFor(e.programme);
    if (!programme || !plan || plan.weeks === null || !plan.end || !e.endedAt) continue;
    if (ranItsCourse(plan, dayOf(e.startedAt), dayOf(e.endedAt))) return { enrolment: e, programme, weeks: plan.weeks, end: plan.end, endedAt: e.endedAt };
  }
  return null;
}

/** The course in numbers: the days with practice, week by week, read from the profile's own rows. */
export async function journeyFor(g: Graduate): Promise<Journey> {
  const D = s.daySummary, S = s.session, profileId = g.enrolment.profileId;
  const startDay = dayOf(g.enrolment.startedAt), lastDay = lastDayOf(startDay, g.weeks);
  const [days, stops] = await Promise.all([
    db.select({ day: D.day, trainMinutes: D.trainMinutes, trainGoal: D.trainGoal }).from(D).where(and(eq(D.profileId, profileId), gte(D.day, startDay), lte(D.day, lastDay))),
    db.select({ at: S.startedAt }).from(S).where(and(eq(S.profileId, profileId), eq(S.endReason, "stop_rule"), gte(S.startedAt, startOfDay(startDay)))),
  ]);
  return journeyOf({ startDay, weeks: g.weeks, daysPerWeek: g.enrolment.daysPerWeek, days, stopDays: stops.map((x) => dayOf(x.at)) });
}

/* ───────────── what a page shows ───────────── */

export interface OwnWelcome { line: WelcomeKey; leftAt: Date; givenAt: Date | null; thanks: ThanksKey | null }
export interface OwnAsk { askedAt: Date; line: WelcomeKey | null; receivedAt: Date | null; thanks: ThanksKey | null; programme: Programme | null }

export interface KeeperView {
  /** The active profile's finished course, and the welcome its household left for it. */
  graduate: (Graduate & { welcome: OwnWelcome | null }) | null;
  /** The course the active profile is on now, when it has a set number of weeks. */
  course: { programme: Programme; week: number; weeks: number } | null;
  /** The household's latest ask for the active profile, with the welcome it received. */
  ask: OwnAsk | null;
  /** For a child's profile: the household's parental consent stands. Always true for an adult. */
  parental: boolean;
}

const ownWelcome = async (m: Member, enrolmentId: string, x: Pick<typeof db, "select"> = db) => {
  const [row] = await x.select().from(W).where(and(eq(W.enrolmentId, enrolmentId), eq(W.profileId, m.profile.id), eq(W.accountId, m.account.id)));
  return row ?? null;
};
const latestAsk = async (m: Member, x: Pick<typeof db, "select"> = db) => {
  const [row] = await x.select().from(A).where(and(eq(A.profileId, m.profile.id), eq(A.accountId, m.account.id))).orderBy(desc(A.createdAt)).limit(1);
  return row ?? null;
};

/** The course the active profile is on now, when it is one with a set number of weeks. */
function courseOf(m: Member, now: Date) {
  const e = m.enrolment, programme = e ? programmeBySlug(e.programme) : undefined, plan = e ? programmePlanFor(e.programme) : undefined;
  if (!e || !programme || !plan || plan.weeks === null) return null;
  return { enrolment: e, programme, weeks: plan.weeks, week: Math.min(plan.weeks, weekOn(dayOf(e.startedAt), dayOf(now))) };
}

/** Both sides of Keeper Graduation for the active profile: its finished course, and the welcome it may ask for. */
export async function keeperFor(m: Member, now = new Date()): Promise<KeeperView> {
  const [g, ask, parental] = await Promise.all([graduateOf(m.profile.id), latestAsk(m), mayJoin(m)]);
  const left = g ? await ownWelcome(m, g.enrolment.id) : null;
  const course = courseOf(m, now);
  return {
    graduate: g && {
      ...g,
      welcome: left && isWelcomeKey(left.line) ? { line: left.line, leftAt: left.createdAt, givenAt: left.givenAt, thanks: isThanksKey(left.thanks) ? left.thanks : null } : null,
    },
    course: course && { programme: course.programme, week: course.week, weeks: course.weeks },
    ask: ask && {
      askedAt: ask.createdAt, line: isWelcomeKey(ask.line) ? ask.line : null, receivedAt: ask.receivedAt,
      thanks: isThanksKey(ask.thanks) ? ask.thanks : null, programme: programmeBySlug(ask.programme) ?? null,
    },
    parental,
  };
}

/* ───────────── meeting ───────────── */

/**
 * Gives the oldest waiting welcome of a programme to the oldest waiting ask of it, never inside one household.
 * It is called with one side already chosen (`welcomeId` or `askId`): the row just written. Both rows are locked
 * while they are joined, and a row another request holds is passed over, so a welcome is never given twice.
 * An ask counts only while its course is still running.
 */
async function meet(tx: Tx, programme: string, mine: { accountId: string; welcomeId?: string; askId?: string }, now: Date): Promise<boolean> {
  const running = tx.select({ id: E.id }).from(E).where(eq(E.status, "active"));
  const [welcome] = await tx.select({ id: W.id, line: W.line, accountId: W.accountId }).from(W)
    .where(and(eq(W.programme, programme), isNull(W.givenAt), mine.welcomeId ? eq(W.id, mine.welcomeId) : ne(W.accountId, mine.accountId)))
    .orderBy(asc(W.createdAt), asc(W.id)).limit(1).for("update", { skipLocked: true });
  if (!welcome || !isWelcomeKey(welcome.line)) return false;
  const [ask] = await tx.select({ id: A.id, accountId: A.accountId }).from(A)
    .where(and(eq(A.programme, programme), isNull(A.receivedAt), inArray(A.enrolmentId, running), mine.askId ? eq(A.id, mine.askId) : ne(A.accountId, welcome.accountId)))
    .orderBy(asc(A.createdAt), asc(A.id)).limit(1).for("update", { skipLocked: true });
  if (!ask) return false;
  await tx.update(A).set({ welcomeId: welcome.id, line: welcome.line, receivedAt: now }).where(eq(A.id, ask.id));
  await tx.update(W).set({ givenAt: now }).where(eq(W.id, welcome.id));
  /* both families hear of it, quietly (src/lib/notify); a notice must never hold up or undo the match */
  const c = nw.community;
  void notifyHousehold(welcome.accountId, { kind: "community.welcome", title: c.welcomeGiven.title(), body: c.welcomeGiven.body, href: c.welcomeGiven.href, key: `welcome-given:${welcome.id}` });
  void notifyHousehold(ask.accountId, { kind: "community.welcome", title: c.welcomeGot.title(), body: c.welcomeGot.body, href: c.welcomeGot.href, key: `welcome-got:${ask.id}` });
  return true;
}

export type KeeperResult = { ok: true; met: boolean } | { ok: false; why: KeeperRefusal };

/**
 * A guardian leaves a welcome for the active profile's finished course: one line from the fixed list.
 * If a new family on the same programme is waiting, it receives the welcome at once.
 */
export async function leaveWelcome(m: Member, line: unknown, now = new Date()): Promise<KeeperResult> {
  const parental = await mayJoin(m);
  return db.transaction(async (tx) => {
    const g = await graduateOf(m.profile.id, tx);
    const left = g ? await ownWelcome(m, g.enrolment.id, tx) : null;
    const why = leaveRefusal({ canShare: m.can("share"), tester: m.tester, child: m.profile.kind === "child", parental, graduate: !!g, left: !!left, line });
    if (why || !g || !isWelcomeKey(line)) return { ok: false as const, why: why ?? "bad_line" };
    const [made] = await tx.insert(W).values({ accountId: m.account.id, profileId: m.profile.id, enrolmentId: g.enrolment.id, programme: g.enrolment.programme, line, leftBy: m.user.id, createdAt: now })
      .onConflictDoNothing().returning({ id: W.id });
    if (!made) return { ok: false as const, why: "already" as const };
    return { ok: true as const, met: await meet(tx, g.enrolment.programme, { accountId: m.account.id, welcomeId: made.id }, now) };
  });
}

/** A guardian takes back a welcome that no family has received yet. The row is deleted. */
export async function takeBackWelcome(m: Member): Promise<{ ok: true } | { ok: false; why: KeeperRefusal }> {
  return db.transaction(async (tx) => {
    const g = await graduateOf(m.profile.id, tx);
    const [left] = g ? await tx.select({ id: W.id, givenAt: W.givenAt }).from(W)
      .where(and(eq(W.enrolmentId, g.enrolment.id), eq(W.profileId, m.profile.id), eq(W.accountId, m.account.id))).for("update") : [];
    const why = takeBackRefusal({ canShare: m.can("share"), left: !!left, given: !!left?.givenAt });
    if (why || !left) return { ok: false as const, why: why ?? "nothing" };
    await tx.delete(W).where(and(eq(W.id, left.id), isNull(W.givenAt)));
    return { ok: true as const };
  });
}

/**
 * A guardian of a family new to a course asks for a welcome. If one is waiting from another household that
 * finished the same programme, it is given at once; otherwise the ask waits for the next one.
 */
export async function askForWelcome(m: Member, now = new Date()): Promise<KeeperResult> {
  const parental = await mayJoin(m), course = courseOf(m, now);
  return db.transaction(async (tx) => {
    const [asked] = course ? await tx.select({ id: A.id }).from(A).where(eq(A.enrolmentId, course.enrolment.id)) : [];
    const why = askRefusal({ canShare: m.can("share"), tester: m.tester, child: m.profile.kind === "child", parental, onCourse: !!course, week: course?.week ?? 0, asked: !!asked });
    if (why || !course) return { ok: false as const, why: why ?? "not_on_course" };
    const [made] = await tx.insert(A).values({ accountId: m.account.id, profileId: m.profile.id, enrolmentId: course.enrolment.id, programme: course.enrolment.programme, askedBy: m.user.id, createdAt: now })
      .onConflictDoNothing().returning({ id: A.id });
    if (!made) return { ok: false as const, why: "already" as const };
    return { ok: true as const, met: await meet(tx, course.enrolment.programme, { accountId: m.account.id, askId: made.id }, now) };
  });
}

/** A guardian stops waiting for a welcome that has not come. The row is deleted. */
export async function stopAsking(m: Member): Promise<{ ok: true } | { ok: false; why: KeeperRefusal }> {
  return db.transaction(async (tx) => {
    const [ask] = await tx.select({ id: A.id, receivedAt: A.receivedAt }).from(A)
      .where(and(eq(A.profileId, m.profile.id), eq(A.accountId, m.account.id))).orderBy(desc(A.createdAt)).limit(1).for("update");
    const why = stopAskingRefusal({ canShare: m.can("share"), asked: !!ask, received: !!ask?.receivedAt });
    if (why || !ask) return { ok: false as const, why: why ?? "nothing" };
    await tx.delete(A).where(and(eq(A.id, ask.id), isNull(A.receivedAt)));
    return { ok: true as const };
  });
}

/**
 * A guardian of the new family sends one thank-you line from the fixed list, once. It is kept on this family's
 * own row and copied to the welcome, so the keeper can read it. The keeper is told nothing else.
 */
export async function sendThanks(m: Member, line: unknown, now = new Date()): Promise<{ ok: true } | { ok: false; why: KeeperRefusal }> {
  return db.transaction(async (tx) => {
    const [ask] = await tx.select({ id: A.id, receivedAt: A.receivedAt, thanks: A.thanks, welcomeId: A.welcomeId }).from(A)
      .where(and(eq(A.profileId, m.profile.id), eq(A.accountId, m.account.id))).orderBy(desc(A.createdAt)).limit(1).for("update");
    const why = thanksRefusal({ canShare: m.can("share"), received: !!ask?.receivedAt, thanked: !!ask?.thanks, line });
    if (why || !ask || !isThanksKey(line)) return { ok: false as const, why: why ?? "bad_line" };
    await tx.update(A).set({ thanks: line, thanksAt: now }).where(eq(A.id, ask.id));
    if (ask.welcomeId) {
      const [keeper] = await tx.update(W).set({ thanks: line, thanksAt: now }).where(and(eq(W.id, ask.welcomeId), isNull(W.thanks))).returning({ accountId: W.accountId });
      const c = nw.community.thanks;
      if (keeper) void notifyHousehold(keeper.accountId, { kind: "community.thanks", title: c.title(), body: c.body, href: c.href, key: `thanks:${ask.welcomeId}` });
    }
    return { ok: true as const };
  });
}
