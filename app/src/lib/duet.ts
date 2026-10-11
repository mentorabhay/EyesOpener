// Eyes Opener: Duet Streak: two people of different generations keep one streak. The rules, with no database and no clock.
/**
 * Duet Streak: two people of different generations keep one streak. The rules, with no database and no clock.
 * Tested in duet.test.ts; src/lib/duet-data.ts reads and writes.
 *
 * Who can be a partner:
 * - A profile of the household, child or adult. The app keeps an eye record for a profile, so its part is eye care.
 * - A grown-up who signs in to the household and has no profile: a cheer seat or a co-guardian. Such a person may
 *   only look and encourage (src/lib/roles.ts), and the app records nothing about their eyes. The one thing they do
 *   that is recorded is a note they send. So that is their part, and they can only be paired with a child.
 * - The first partner is always a profile. The two must be of different generations (`generations`).
 * - A child takes part only while a guardian's consent stands. Each person is in one duet at a time.
 *
 * What "their part" is on a day (`partOfProfile`, `didPart`):
 * - practice: a profile on a programme with daily minutes finishes the day's practice (the league's `finishedDay`).
 * - care:     any other profile logs one care routine, one counted break, some time outdoors, or any practice.
 * - note:     a grown-up with no profile sends their partner one note that day.
 *
 * How a day counts (`partnerDays`, `pairState`, `streakOf`):
 * - Each partner is asked for a number of days a week (Monday to Sunday): the programme's days a week for
 *   practice, OPEN_DAYS_A_WEEK for care and for notes. The other days are rest days. They are not fixed to a
 *   weekday: the first days without the part take them, as on the week screen of a programme.
 * - A day on which the stop rule ended a session is a rest day too, and is never told apart from one.
 * - The streak grows on a day both did their part. A day that is a rest day for either of them changes nothing.
 *   A day on which both were asked and one part is missing ends the run. The page never says whose.
 * - Nothing is erased: the longest run and the days kept in all stay, and the next day both do their part starts
 *   a new run.
 */
import { addDays, finishedDay, weekOf } from "@/lib/league";
import type { Seat } from "@/lib/roles";

/** Two people born fewer than this many years apart are of the same generation. */
export const GENERATION_GAP_YEARS = 15;
/** Days a week asked of a partner with no programme minutes. One day a week is a rest day, as on the lazy-eye programme. */
export const OPEN_DAYS_A_WEEK = 6;

/* ───────────── who may be paired ───────────── */

export type Partner =
  | { kind: "profile"; id: string; profileKind: "adult" | "child"; birthYear: number | null }
  | { kind: "person"; id: string };

export const partnerKey = (p: Pick<Partner, "kind" | "id">) => `${p.kind}:${p.id}`;

export type Generations = "ok" | "same_generation" | "cannot_tell";

/**
 * Are these two of different generations? A child and a grown-up are, unless both years of birth are known and
 * say otherwise. Two children never are. Two grown-ups are only when both years are known and far enough apart.
 * A grown-up who signs in has no year of birth on record, so they can be told apart from a child and nobody else.
 */
export function generations(a: Partner, b: Partner): Generations {
  if (a.kind === "person" || b.kind === "person") {
    const other = a.kind === "person" ? b : a;
    return other.kind === "profile" && other.profileKind === "child" ? "ok" : "cannot_tell";
  }
  if (a.profileKind === "child" && b.profileKind === "child") return "same_generation";
  const gap = a.birthYear !== null && b.birthYear !== null ? Math.abs(a.birthYear - b.birthYear) : null;
  if (a.profileKind !== b.profileKind) return gap !== null && gap < GENERATION_GAP_YEARS ? "same_generation" : "ok";
  return gap === null ? "cannot_tell" : gap >= GENERATION_GAP_YEARS ? "ok" : "same_generation";
}

export type PairProblem = "first_not_profile" | "same_person" | "already_paired" | "needs_consent" | "same_generation" | "cannot_tell";

/**
 * Why these two cannot start a duet, or null when they can.
 * `consented` answers for a child profile; `paired` holds the keys of everyone already in a duet of the household.
 */
export function pairProblem(a: Partner, b: Partner, known: { consented: (profileId: string) => boolean; paired: ReadonlySet<string> }): PairProblem | null {
  if (a.kind !== "profile") return "first_not_profile";
  if (partnerKey(a) === partnerKey(b)) return "same_person";
  if (known.paired.has(partnerKey(a)) || known.paired.has(partnerKey(b))) return "already_paired";
  for (const p of [a, b]) if (p.kind === "profile" && p.profileKind === "child" && !known.consented(p.id)) return "needs_consent";
  const g = generations(a, b);
  return g === "ok" ? null : g;
}

/* ───────────── what each one's part is ───────────── */

export type PartKind = "practice" | "care" | "note";
export interface Part {
  kind: PartKind;
  /** Days a week (Monday to Sunday) this partner is asked for. */
  asked: number;
  /** For practice: the day's minutes, as the programme sets them. */
  minutes: number;
}

const daysAWeek = (n: number) => Math.max(1, Math.min(7, Math.floor(Number.isFinite(n) ? n : 0)));

/** The part of a profile: the day's practice when its programme sets daily minutes, a care routine otherwise. */
export function partOfProfile(enrolment: { dailyMinutes: number; daysPerWeek: number } | null): Part {
  if (enrolment && enrolment.dailyMinutes > 0 && enrolment.daysPerWeek > 0) return { kind: "practice", asked: daysAWeek(enrolment.daysPerWeek), minutes: enrolment.dailyMinutes };
  return { kind: "care", asked: OPEN_DAYS_A_WEEK, minutes: 0 };
}
/** The part of a grown-up with no profile. */
export const PERSON_PART: Part = { kind: "note", asked: OPEN_DAYS_A_WEEK, minutes: 0 };

/** One day of a profile, as `day_summary` keeps it. */
export interface ProfileDay { trainMinutes: number; trainGoal: number; restBreaks: number; lightMinutes: number }

/**
 * Did a profile do its part on a day? The day is judged by what was asked on that day:
 * a day with programme minutes needs them finished; any other day needs one thing for the eyes
 * (a logged care routine, a counted break, time outdoors, or some practice).
 */
export function didPart(row: ProfileDay | undefined, careLogged: boolean): boolean {
  if (row && row.trainGoal > 0) return finishedDay(row);
  return careLogged || (!!row && (row.trainMinutes > 0 || row.restBreaks > 0 || row.lightMinutes > 0));
}

/* ───────────── counting days ───────────── */

/** done: did the part. rest: nothing was asked. open: today, with the part still to do. missed: asked for and not done. */
export type PartState = "done" | "rest" | "open" | "missed";

export interface PartnerRecord {
  asked: number;
  /** Days the part was done. */
  done: ReadonlySet<string>;
  /** Days the stop rule ended a session. They count as rest days. */
  excused: ReadonlySet<string>;
}

/** One partner's days from `from` to `today`, both included. Day keys are YYYY-MM-DD in India time. */
export function partnerDays(r: PartnerRecord, from: string, today: string): Map<string, PartState> {
  const asked = daysAWeek(r.asked), restDays = 7 - asked, out = new Map<string, PartState>();
  let week = "", rested = 0, did = 0;
  for (let day = from; day <= today; day = addDays(day, 1)) {
    if (weekOf(day) !== week) { week = weekOf(day); rested = 0; did = 0; }
    let state: PartState;
    if (r.done.has(day)) { state = "done"; did += 1; }
    else if (r.excused.has(day)) state = "rest";
    /* the week's days are done: whatever is left of the week is rest */
    else if (did >= asked) state = "rest";
    else if (day === today) state = "open";
    else if (rested < restDays) { state = "rest"; rested += 1; }
    else state = "missed";
    out.set(day, state);
  }
  return out;
}

/** kept: both did their part. rest: a rest day for either. open: today, not yet kept. missed: both were asked and a part is missing. */
export type PairState = "kept" | "rest" | "open" | "missed";

/** One day of the duet. It never says which of the two a missing part belongs to. */
export function pairState(a: PartState, b: PartState): PairState {
  if (a === "done" && b === "done") return "kept";
  if (a === "rest" || b === "rest") return "rest";
  return a === "missed" || b === "missed" ? "missed" : "open";
}

export interface DuetDay { day: string; state: PairState }

/** The days of a duet, oldest first. */
export function duetDays(a: PartnerRecord, b: PartnerRecord, from: string, today: string): DuetDay[] {
  const da = partnerDays(a, from, today), db = partnerDays(b, from, today);
  return [...da.keys()].map((day) => ({ day, state: pairState(da.get(day)!, db.get(day)!) }));
}

export interface Streak {
  /** Days kept in the run that is still going. */
  current: number;
  longest: number;
  /** Days kept in all, since the duet began. */
  kept: number;
}

/** The run that is going, the longest run and the days kept in all. Rest days and today's open day neither add nor end a run. */
export function streakOf(days: readonly DuetDay[]): Streak {
  let current = 0, longest = 0, kept = 0;
  for (const d of days) {
    if (d.state === "kept") { current += 1; kept += 1; longest = Math.max(longest, current); }
    else if (d.state === "missed") current = 0;
  }
  return { current, longest, kept };
}

/* ───────────── who may see and change a duet ───────────── */

export interface DuetViewer { seat: Seat; childMode: boolean; userId: string; activeProfileId: string }

/**
 * Guardians see every duet of the household. A device in child mode shows only the duets of the child it is
 * handed to. A cheer seat sees the duets it is in, and the duets of a child: what a cheer seat may know is about
 * the children, never about another grown-up.
 */
export function maySeeDuet(v: DuetViewer, d: { a: Partner; b: Partner }): boolean {
  const both = [d.a, d.b];
  if (v.childMode) return both.some((p) => p.kind === "profile" && p.id === v.activeProfileId);
  if (v.seat !== "circle") return true;
  return both.some((p) => (p.kind === "person" ? p.id === v.userId : p.profileKind === "child"));
}
