/**
 * Dose clock, daily caps and the stop rule.
 * These limits are product rules. No screen, setting or AI call can raise them for a family.
 * The one exception is a staff member's own test household (`tester`), which no family member can use.
 */

/** No profile trains for more than this in one day, whatever the programme says. */
export const MAX_DAILY_MINUTES = 90;
/** No screen sessions under this age. */
export const MIN_SCREEN_AGE = 4;

export type SessionKind = "game" | "exercise" | "film" | "test" | "monitor" | "outdoor";

/** Kinds that count toward the Train ring and the daily cap. */
const TRAINING: SessionKind[] = ["game", "exercise", "film"];
/** Kinds that happen on a screen. */
const ON_SCREEN: SessionKind[] = ["game", "film", "test", "monitor"];

export interface DoseInput {
  kind: SessionKind;
  /** Age in whole years, or null when unknown (adults). */
  age: number | null;
  /** Minutes of training already done today. */
  minutesToday: number;
  /** Minutes a day the programme sets. 0 when not enrolled. */
  dailyMinutes: number;
  /** True when onboarding or triage reported pain, flashes, a sudden change or new double vision. */
  stopFlag: boolean;
  /** True for a child whose guardian has not given consent, or has withdrawn it. */
  consentMissing?: boolean;
  /** True on a counsellor-led programme until a linked counsellor has set the dose. */
  awaitingCounsellor?: boolean;
  /**
   * True only for a staff member's own test household. Staff are trying the product, not being treated,
   * so the daily limits do not close a session on them. No family profile can ever carry this.
   */
  tester?: boolean;
}

export type DoseBlock = "under_age" | "doctor_first" | "needs_consent" | "awaiting_counsellor" | "daily_cap" | "programme_done";

export interface DoseDecision {
  ok: boolean;
  /** Minutes this session may run. */
  minutes: number;
  reason: DoseBlock | null;
}

export function canStart(d: DoseInput): DoseDecision {
  const block = (reason: DoseBlock): DoseDecision => ({ ok: false, minutes: 0, reason });
  if (d.age !== null && d.age < MIN_SCREEN_AGE && ON_SCREEN.includes(d.kind)) return block("under_age");
  if (!TRAINING.includes(d.kind) || d.tester) return { ok: true, minutes: MAX_DAILY_MINUTES, reason: null };
  if (d.stopFlag) return block("doctor_first");
  if (d.consentMissing) return block("needs_consent");
  if (d.awaitingCounsellor) return block("awaiting_counsellor");
  const capLeft = MAX_DAILY_MINUTES - d.minutesToday;
  if (capLeft <= 0) return block("daily_cap");
  if (d.dailyMinutes > 0) {
    const planLeft = Math.min(d.dailyMinutes, MAX_DAILY_MINUTES) - d.minutesToday;
    if (planLeft <= 0) return block("programme_done");
    return { ok: true, minutes: Math.min(planLeft, capLeft), reason: null };
  }
  return { ok: true, minutes: capLeft, reason: null };
}

/** What a member can report mid-session. Any of these ends the session at once. */
export const STOP_SYMPTOMS = ["double_vision", "headache", "eye_pain", "dizzy", "sick"] as const;
export type StopSymptom = (typeof STOP_SYMPTOMS)[number];

/** Stop symptoms that mean "see an eye doctor before training again", not just "rest". */
export const DOCTOR_SYMPTOMS: readonly StopSymptom[] = ["double_vision", "eye_pain"];
export const needsDoctor = (s: StopSymptom) => DOCTOR_SYMPTOMS.includes(s);

export const isStopSymptom = (s: string): s is StopSymptom => (STOP_SYMPTOMS as readonly string[]).includes(s);

/** Which ring a session fills. */
export const ringFor = (kind: SessionKind): "rest" | "train" | "light" =>
  kind === "outdoor" ? "light" : kind === "monitor" ? "rest" : "train";

/** Age in whole years from a birth year. Year only is stored, so this can be one year high. */
export const ageFrom = (birthYear: number | null, today = new Date()) =>
  birthYear === null ? null : today.getFullYear() - birthYear;

/** Share of a ring that is filled, 0 to 1. */
export const ringShare = (done: number, goal: number) => (goal <= 0 ? 0 : Math.max(0, Math.min(1, done / goal)));
