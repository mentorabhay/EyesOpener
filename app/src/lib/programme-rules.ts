/**
 * Programme rules: which week it is, what a day holds, what is done, what is due, and when a course ends.
 * Pure functions, unit-tested (programme-rules.test.ts). No database and no clock: every day is passed in as a
 * key (YYYY-MM-DD) in the member's own calendar. src/lib/programme.ts reads the rows and calls these.
 *
 * The rules, in one place:
 *  - The week is counted on the calendar from the day the programme started (see `weekOn` for why).
 *  - A chapter is one day's guided set. Its training parts add up to the enrolment's daily minutes exactly, and
 *    never to more than the daily limit. Care routines away from the screen carry no minutes at all.
 *  - A day with no practice becomes that week's rest day. Once the rest days are used, a day with no practice is
 *    simply a day with none. Nothing is carried over and nothing is owed.
 *  - A course that has run its weeks is finished. It never says what changed: an eye test or the counsellor does.
 */
import { exerciseBySlug, gameBySlug, games } from "@/data";
import type { ChapterPlan, CheckPlan, PartPlan, Pick, ProgrammePlan, StagePlan } from "@/data/programme-plans";
import { MAX_DAILY_MINUTES, MIN_SCREEN_AGE } from "@/engine/dose";

/* ───────────── days and weeks ───────────── */

const DAY_MS = 86_400_000;
const utc = (key: string) => Date.parse(`${key}T00:00:00Z`);

export const addDays = (key: string, n: number) => new Date(utc(key) + n * DAY_MS).toISOString().slice(0, 10);
/** Whole days from one day key to another. Negative when `to` is earlier. */
export const daysBetween = (from: string, to: string) => Math.round((utc(to) - utc(from)) / DAY_MS);

/**
 * The week of a programme: days 1 to 7 from the start day are week 1, the next seven are week 2, and so on.
 *
 * Why the calendar, and not "weeks in which the plan was followed":
 *  - The trials behind the doses ran for a fixed number of calendar weeks and measured at the end, whatever each
 *    child had managed to do. Twelve weeks means twelve weeks.
 *  - The check-ups and the eye-test visit are safeguards. If the week only moved when the plan was followed, a
 *    member who practised now and then would never reach the visit, and could train unreviewed for a year.
 *  - It keeps "nothing to catch up" true: a missed week is not waiting to be done again.
 * A day before the start counts as the first day, so a clock that runs behind cannot give week 0.
 */
export const weekOn = (startDay: string, today: string) => Math.floor(Math.max(0, daysBetween(startDay, today)) / 7) + 1;
/** The day of the programme week, 1 to 7. Day 1 is the weekday the programme started on. */
export const dayOn = (startDay: string, today: string) => (Math.max(0, daysBetween(startDay, today)) % 7) + 1;
/** The seven day keys of a programme week. */
export const daysOfWeek = (startDay: string, week: number) => Array.from({ length: 7 }, (_, i) => addDays(startDay, (week - 1) * 7 + i));

/**
 * Where an active enrolment stands today: its week, or finished when the course has run all its weeks.
 * A habit programme (`weeks: null`) never finishes. The stored week of a finished course stays at its last week.
 */
export function advance(plan: { weeks: number | null }, startDay: string, today: string): { week: number; finished: boolean } {
  const week = weekOn(startDay, today);
  return plan.weeks !== null && week > plan.weeks ? { week: plan.weeks, finished: true } : { week, finished: false };
}

/** True when an enrolment that has ended ran its whole course, and was not left early. */
export const ranItsCourse = (plan: { weeks: number | null }, startDay: string, endDay: string) =>
  plan.weeks !== null && weekOn(startDay, endDay) > plan.weeks;

/* ───────────── what a day holds ───────────── */

/** The stage a week belongs to: the last one that has begun. */
export function stageFor(plan: ProgrammePlan, week: number): StagePlan {
  return [...plan.stages].reverse().find((s) => s.from <= week) ?? plan.stages[0];
}

/** Days are numbered through the whole course, so chapters that take turns keep taking turns across weeks. */
const turnOf = (week: number, day: number) => (Math.max(1, week) - 1) * 7 + (Math.max(1, day) - 1);

/** The chapter a day of a week holds, before it is fitted to a member. */
export function chapterPlanFor(plan: ProgrammePlan, week: number, day: number): ChapterPlan {
  const keys = stageFor(plan, week).chapters;
  const key = keys[turnOf(week, day) % keys.length];
  return plan.chapters.find((c) => c.key === key) ?? plan.chapters[0];
}

/** Every film session carries this slug, whatever the film (see src/lib/sessions.ts). */
export const FILM_SLUG = "two-eye-cinema";

export interface PlanItem {
  kind: "film" | "game" | "exercise";
  slug: string;
  /** The catalogue's name. Empty for the cinema, which the page names. */
  name: string;
  gear: string;
  /** The method, a key of the catalogue's mechanisms: it carries the evidence label. */
  mechanism: string;
}
export const itemKey = (it: { kind: string; slug: string }) => `${it.kind}:${it.slug}`;

/** Who the chapter is being fitted to. */
export interface Fit {
  /** Age in whole years. null for an adult whose birth year is not kept. */
  age: number | null;
  /** Is this item there for this member: in this edition, built, and not closed by the status staff gave it. */
  usable: (kind: PlanItem["kind"], slug: string) => boolean;
}

/**
 * The ages a catalogue line gives: "ages 6+", "ages 4 to 7", "Children 5 to 15", "teens and adults", "adults".
 * null means the line sets no limit on that side.
 */
export function ageRange(line: string): { min: number | null; max: number | null } {
  const range = /(\d+)\s+to\s+(\d+)/.exec(line);
  if (range) return { min: Number(range[1]), max: /adults/i.test(line) ? null : Number(range[2]) };
  const from = /(\d+)\+/.exec(line);
  if (from) return { min: Number(from[1]), max: null };
  if (/\bteens\b/i.test(line)) return { min: 13, max: null };
  if (/\badults\b/i.test(line)) return { min: 18, max: null };
  return { min: null, max: null };
}

/** Does an item's "who it is for" line take in this age? An adult with no birth year fits unless the line ends in childhood. */
export function fitsAge(line: string, age: number | null): boolean {
  const { min, max } = ageRange(line);
  if (age === null) return max === null || max >= 18;
  return (min === null || age >= min) && (max === null || age <= max);
}

/** The library items a pick stands for, for this member, in catalogue order. */
export function resolve(pick: Pick, fit: Fit): PlanItem[] {
  if ("film" in pick) {
    return fit.usable("film", FILM_SLUG) ? [{ kind: "film", slug: FILM_SLUG, name: "", gear: "Red-cyan glasses", mechanism: "dvid" }] : [];
  }
  if ("exercise" in pick) {
    const e = exerciseBySlug(pick.exercise);
    return e && fitsAge(e.for, fit.age) && fit.usable("exercise", e.slug) ? [{ kind: "exercise", slug: e.slug, name: e.name, gear: e.gear, mechanism: e.mechanism }] : [];
  }
  const found = "game" in pick ? [gameBySlug(pick.game)].filter((g) => !!g) : games.filter((g) => g.mechanism === pick.games && g.tags.includes(pick.tag));
  return found.filter((g) => fitsAge(g.for, fit.age) && fit.usable("game", g.slug))
    .map((g) => ({ kind: "game" as const, slug: g.slug, name: g.name, gear: g.gear, mechanism: g.mechanism }));
}

const unique = (items: PlanItem[]) => items.filter((it, i) => items.findIndex((o) => itemKey(o) === itemKey(it)) === i);

/**
 * What a part offers this member today: the suggestion first, then the other choices.
 * The suggestion moves on by one each day, so the same drill is not put first every day.
 */
export function itemsFor(part: PartPlan, fit: Fit, turn: number): PlanItem[] {
  const first = unique(part.picks.flatMap((p) => resolve(p, fit)));
  const more = unique((part.also ?? []).flatMap((p) => resolve(p, fit)));
  const lead = first.length ? first : more;
  if (!lead.length) return [];
  const k = ((turn % lead.length) + lead.length) % lead.length;
  return unique([...lead.slice(k), ...lead.slice(0, k), ...more]);
}

/** The minutes a day may ask for: the enrolment's own, whole, and never above the daily limit. */
export const doseOf = (dailyMinutes: number) => Math.max(0, Math.min(MAX_DAILY_MINUTES, Math.floor(Number.isFinite(dailyMinutes) ? dailyMinutes : 0)));

/** Shares `total` whole minutes out by weight. The shares add up to `total` exactly: the largest remainders get the odd minutes. */
export function shareOut(weights: number[], total: number): number[] {
  const sum = weights.reduce((a, b) => a + Math.max(0, b), 0);
  if (sum <= 0 || total <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (Math.max(0, w) / sum) * total);
  const out = exact.map(Math.floor);
  let left = Math.round(total - out.reduce((a, b) => a + b, 0));
  const order = exact.map((x, i) => ({ rest: x - Math.floor(x), i })).sort((a, b) => b.rest - a.rest || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    out[i] += 1;
    left -= 1;
  }
  return out;
}

export interface DayPart {
  key: string;
  kind: "train" | "care";
  /** Training minutes this part asks for today. Always 0 for care, and 0 while no minutes are set. */
  minutes: number;
  ring: "rest" | "light" | null;
  /** The suggestion first, then the other choices. Never empty. */
  items: PlanItem[];
}
export interface DayChapter {
  key: string;
  /** Today's training minutes: the sum of the training parts. Never more than the enrolment's daily minutes. */
  minutes: number;
  parts: DayPart[];
}

/**
 * One day's chapter, fitted to a member: the items this edition has and this member may use, at this age, and the
 * day's training minutes shared out over the training parts.
 *
 *  - A part with nothing to offer this member is left out and its minutes go to the other parts.
 *  - No screen sessions under age 4: every training part is left out, and the care parts stay.
 *  - With no minutes set (a counsellor-led programme before the counsellor has set them, or a habit programme) the
 *    training parts are listed with 0 minutes: the page shows them as a suggestion with nothing to start.
 */
export function chapterFor(plan: ProgrammePlan, week: number, day: number, dailyMinutes: number, fit: Fit): DayChapter {
  const c = chapterPlanFor(plan, week, day), turn = turnOf(week, day);
  const tooYoung = fit.age !== null && fit.age < MIN_SCREEN_AGE;
  /* parts that suggest the same thing (three sets of depth play) each put a different item first */
  const marks = c.parts.map((q) => JSON.stringify(q.picks));
  const same = (i: number) => marks.slice(0, i).filter((mark) => mark === marks[i]).length;
  const fitted = c.parts
    .map((p, i) => ({ p, items: p.kind === "train" && tooYoung ? [] : itemsFor(p, fit, turn + same(i)) }))
    .filter((x) => x.items.length > 0);
  const total = doseOf(dailyMinutes);
  const train = fitted.filter((x) => x.p.kind === "train");
  const shares = shareOut(train.map((x) => x.p.minutes), total);
  const parts = fitted
    .map(({ p, items }): DayPart => ({ key: p.key, kind: p.kind, minutes: p.kind === "train" ? shares[train.findIndex((x) => x.p === p)] : 0, ring: p.ring ?? null, items }))
    /* a dose too small to give every part a whole minute leaves the empty parts out */
    .filter((p) => p.kind === "care" || total === 0 || p.minutes > 0);
  return { key: c.key, minutes: parts.reduce((s, p) => s + p.minutes, 0), parts };
}

/* ───────────── what is done today ───────────── */

/** A minute shown as done: the rings round to the minute, so half a minute short still reads as the whole. */
const SLACK = 0.5;

export interface DayDone {
  /** Today's training minutes by item (`itemKey`). Care routines are never in here. */
  minutes: Readonly<Record<string, number>>;
  /** Today's counted training minutes: the Train ring. */
  train: number;
  /** Items with any record today: a finished session or an entry in the family's care log. */
  logged: readonly string[];
  rest: { done: number; goal: number };
  light: { done: number; goal: number };
}
export interface PartDone {
  key: string;
  state: "done" | "part" | "todo";
  /** Minutes for a training part, breaks or minutes for a ring part. 0 for a care part that is only a record. */
  done: number;
  goal: number;
}
export interface ChapterDone {
  parts: PartDone[];
  minutes: number;
  goal: number;
  /** Every training part is done, or, in a chapter with none, every care part. */
  finished: boolean;
  /** The part to do next, as an index into the chapter's parts. null when nothing is left. */
  next: number | null;
}

/**
 * Progress through today's chapter.
 * Minutes spent in a part's own items count for that part. Any other practice today then fills the parts in
 * order, so the chapter is finished exactly when the day's minutes are done: it can never ask for more than the
 * dose, and a member who chose something else is not told they have more to do.
 */
export function progress(chapter: DayChapter, d: DayDone): ChapterDone {
  const pool: Record<string, number> = { ...d.minutes };
  const credit = chapter.parts.map((p) => {
    if (p.kind !== "train") return 0;
    let got = 0;
    for (const it of p.items) {
      const take = Math.min(p.minutes - got, Math.max(0, pool[itemKey(it)] ?? 0));
      pool[itemKey(it)] = (pool[itemKey(it)] ?? 0) - take;
      got += take;
    }
    return got;
  });
  let spare = Math.max(0, Math.min(d.train, chapter.minutes) - credit.reduce((a, b) => a + b, 0));
  chapter.parts.forEach((p, i) => {
    if (p.kind !== "train") return;
    const take = Math.min(p.minutes - credit[i], spare);
    credit[i] += take;
    spare -= take;
  });

  const parts = chapter.parts.map((p, i): PartDone => {
    if (p.kind === "train") {
      const done = credit[i];
      return { key: p.key, done, goal: p.minutes, state: p.minutes > 0 && done >= p.minutes - SLACK ? "done" : done > 0 ? "part" : "todo" };
    }
    const logged = p.items.some((it) => d.logged.includes(itemKey(it)));
    if (p.ring) {
      const r = d[p.ring];
      return { key: p.key, done: r.done, goal: r.goal, state: r.goal > 0 && r.done >= r.goal ? "done" : r.done > 0 || logged ? "part" : "todo" };
    }
    return { key: p.key, done: 0, goal: 0, state: logged ? "done" : "todo" };
  });

  const kind = chapter.parts.some((p) => p.kind === "train") ? "train" : "care";
  const mine = chapter.parts.map((p, i) => ({ p, i })).filter((x) => x.p.kind === kind);
  const open = mine.filter((x) => parts[x.i].state !== "done" && (kind === "care" || x.p.minutes > 0));
  return {
    parts,
    minutes: credit.reduce((a, b) => a + b, 0),
    goal: chapter.minutes,
    finished: mine.length > 0 && (kind === "care" || chapter.minutes > 0) && open.length === 0,
    next: open.length ? open[0].i : null,
  };
}

/* ───────────── the week ───────────── */

/** One day of the eye day, as `day_summary` keeps it. */
export interface DayRecord { train: number; trainGoal: number; rest: number; restGoal: number; light: number; lightGoal: number }

/**
 * done        the day's minutes (or its rings, for a habit programme) were reached
 * part        some practice
 * open        today, with practice still to do
 * rest        a day with no practice that is one of the week's rest days
 * none        a day with no practice, after the rest days were used. Nothing is owed for it.
 * ahead       a coming practice day
 * rest_ahead  a coming rest day
 * waiting     no minutes are set yet, so there is no day to keep
 */
export type DayState = "done" | "part" | "open" | "rest" | "none" | "ahead" | "rest_ahead" | "waiting";

export interface WeekDay {
  index: number;
  key: string;
  today: boolean;
  state: DayState;
  /** Training minutes done and asked for. Both 0 for a programme with no training minutes. */
  minutes: number;
  goal: number;
  /** How much of the day is done, 0 to 1: minutes of the dose, or the rings of a habit programme. */
  share: number;
}

export interface WeekIn {
  startDay: string;
  week: number;
  today: string;
  dailyMinutes: number;
  daysPerWeek: number;
  /** For a programme with no training minutes: the rings that make its day. */
  rings: readonly ("rest" | "light")[];
}

const ringShare = (r: DayRecord | undefined, rings: readonly ("rest" | "light")[]) => {
  if (!r || !rings.length) return 0;
  const one = (done: number, goal: number) => (goal > 0 ? Math.max(0, Math.min(1, done / goal)) : 0);
  return rings.reduce((s, ring) => s + (ring === "rest" ? one(r.rest, r.restGoal) : one(r.light, r.lightGoal)), 0) / rings.length;
};

/**
 * The seven days of a programme week.
 *
 * Rest days are not fixed to a weekday. A week of six practice days has one rest day: the first day with no
 * practice takes it, and if every day so far had practice it falls at the end of the week. A day with no practice
 * after the rest days are used is shown as a day with none, and the coming days stay ordinary practice days:
 * minutes are never carried over, so the week can end one day short and nothing is owed.
 */
export function weekView(w: WeekIn, records: Readonly<Record<string, DayRecord | undefined>>): WeekDay[] {
  const dosed = w.dailyMinutes > 0, habit = !dosed && w.rings.length > 0;
  const want = Math.max(1, Math.min(7, Math.round(w.daysPerWeek) || 7));
  const restDays = dosed ? 7 - want : 0;
  let rested = 0, practised = 0;
  return daysOfWeek(w.startDay, w.week).map((key, i): WeekDay => {
    const r = records[key], today = key === w.today, past = key < w.today;
    const day = { index: i + 1, key, today };
    if (!dosed && !habit) return { ...day, state: "waiting", minutes: 0, goal: 0, share: 0 };
    const minutes = dosed ? Math.max(0, r?.train ?? 0) : 0;
    const goal = dosed ? (past && r && r.trainGoal > 0 ? r.trainGoal : w.dailyMinutes) : 0;
    const share = dosed ? Math.min(1, minutes / goal) : ringShare(r, w.rings);
    const any = share > 0;
    const full = dosed ? minutes >= goal - SLACK : share >= 1;
    let state: DayState;
    if (past) state = full ? "done" : any ? "part" : rested < restDays ? "rest" : "none";
    else if (today) state = full ? "done" : !any && dosed && practised >= want ? "rest" : "open";
    else state = dosed && practised >= want ? "rest_ahead" : "ahead";
    if (state === "rest") rested += 1;
    if (state === "done" || state === "part" || state === "open" || state === "ahead") practised += 1;
    return { ...day, state, minutes, goal, share };
  });
}

/** Days of the week with practice (or, for a habit programme, something logged) so far, today included once it has any. */
export const practisedDays = (days: WeekDay[]) => days.filter((d) => d.state === "done" || d.state === "part" || (d.state === "open" && d.share > 0)).length;

/* ───────────── check-ups, the visit and next week ───────────── */

/** Is this check-up set for this week: week 1, then every `everyWeeks` weeks, and the last week of a course. */
export const checkInWeek = (plan: { weeks: number | null }, c: CheckPlan, week: number) =>
  (week - 1) % Math.max(1, c.everyWeeks) === 0 || week === plan.weeks;

/** A check-up a member took: its test key and the day in their calendar. */
export interface Taken { test: string; day: string }
export interface CheckDue {
  test: string;
  /** The week it was set for. Earlier than this week when it was not taken then: it stays due until it is. */
  since: number;
  done: boolean;
}

/**
 * The check-ups to show in a week: those set for it, and any set for an earlier week that has not been taken
 * since. A check-up is a safeguard, not a dose, so unlike practice it does stay due.
 */
export function checksFor(plan: ProgrammePlan, startDay: string, week: number, taken: readonly Taken[]): CheckDue[] {
  return plan.checks.flatMap((c) => {
    let since = week;
    while (since > 1 && !checkInWeek(plan, c, since)) since -= 1;
    const from = addDays(startDay, (since - 1) * 7);
    const done = taken.some((t) => t.test === c.test && t.day >= from);
    return since === week || !done ? [{ test: c.test, since, done }] : [];
  });
}

/** Does the plan ask for an eye-test visit in this week? */
export const visitIn = (plan: ProgrammePlan, week: number) => plan.visits.includes(week);
/** The last week of a course. Never true for a habit programme. */
export const isLastWeek = (plan: { weeks: number | null }, week: number) => plan.weeks !== null && week >= plan.weeks;

export interface NextWeek {
  week: number;
  /** The chapters its days hold, each once. */
  chapters: string[];
  /** Test keys of the check-ups set for it. */
  checks: string[];
  visit: boolean;
  /** It is the last week of the course. */
  last: boolean;
  /** A new stage begins: the chapters change. */
  newStage: boolean;
}

/** What next week holds. null when this is the last week: the course ends and nothing follows. */
export function nextWeek(plan: ProgrammePlan, week: number): NextWeek | null {
  if (isLastWeek(plan, week)) return null;
  const n = week + 1;
  const chapters = Array.from({ length: 7 }, (_, i) => chapterPlanFor(plan, n, i + 1).key);
  return {
    week: n,
    chapters: chapters.filter((k, i) => chapters.indexOf(k) === i),
    checks: plan.checks.filter((c) => checkInWeek(plan, c, n)).map((c) => c.test),
    visit: visitIn(plan, n),
    last: n === plan.weeks,
    newStage: stageFor(plan, n) !== stageFor(plan, week),
  };
}
