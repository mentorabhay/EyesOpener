// Eyes Opener: Reading check-up results: one place for how a stored value is shown, compared and scheduled.
/**
 * Reading check-up results: one place for how a stored value is shown, compared and scheduled.
 */
import { and, asc, eq } from "drizzle-orm";
import { test as c } from "@/copy/test";
import type { TestDef } from "@/data";
import { db, schema } from "@/db";
import { SURVEY_TOP_SCORE, acuityText, blankEye, changeCheck, contrastText, hasChangeRule, percent, type ChangeCheck } from "@/engine";

export type Result = typeof schema.testResult.$inferSelect;
export type Side = "left" | "right";
export interface Series { eye: Side | null; rows: Result[]; first: Result | undefined; last: Result | undefined }

const DAY = 86_400_000;

/** The active profile's results, oldest first: every test, or one. */
export const resultsOf = (profileId: string, testKey?: string) =>
  db.select().from(schema.testResult)
    .where(and(eq(schema.testResult.profileId, profileId), testKey ? eq(schema.testResult.testKey, testKey) : undefined))
    .orderBy(asc(schema.testResult.takenAt));

/** One line per eye for a per-eye test, else one line. `first` is the baseline. */
export function seriesOf(t: TestDef, rows: Result[]): Series[] {
  const mine = rows.filter((r) => r.testKey === t.key);
  return (t.perEye ? (["left", "right"] as const) : [null]).map((eye) => {
    const of = mine.filter((r) => r.eye === eye);
    return { eye, rows: of, first: of.find((r) => r.isBaseline) ?? of[0], last: of.at(-1) };
  });
}

/** The number that is drawn and compared. Balance is stored as a log ratio and shown as stronger-eye contrast. */
export const shown = (t: TestDef, value: number) => (t.unit === "log_ratio" ? Math.pow(10, -Math.abs(value)) : value);

/** A result in the words a member reads. */
export function reading(t: TestDef, r: { value: number; note?: string | null; raw?: unknown }): string {
  if (t.unit === "logMAR") return acuityText({ ...blankEye(), va: r.value, note: r.note === "floor" || r.note === "worse" ? r.note : "" });
  if (t.unit === "logCS") return contrastText({ ...blankEye(), cs: r.value });
  if (t.unit === "log_ratio") return percent(shown(t, r.value));
  if (t.key === "suppression") {
    /* the stored answer says exactly how many dots; the score alone cannot tell two from three */
    const dots = (r.raw as { dots?: unknown } | null | undefined)?.dots;
    return (typeof dots === "number" && c.dotsExact[dots]) || c.dotsSeen[r.value] || String(r.value);
  }
  if (t.key === "symptoms") return c.outOf(r.value, SURVEY_TOP_SCORE);
  const plain = `${number(r.value)} ${c.units[t.unit]}`;
  /* at an end of what the test could show, the result says which way the true value lies */
  if (t.unit === "arcsec") return r.note === "floor" ? c.atEnd.finer(plain) : r.note === "worse" ? c.atEnd.coarser(plain) : plain;
  if (t.unit === "prism_dioptre" && r.note === "floor") return c.atEnd.more(plain);
  return plain;
}

/** A stored value without stray decimal places. */
export const number = (v: number) => String(Math.round(v * 10) / 10);

export function change(t: TestDef, first: Result, last: Result): "better" | "worse" | "same" {
  const d = shown(t, last.value) - shown(t, first.value);
  if (Math.abs(d) < 0.005) return "same";
  return d < 0 === t.lowerIsBetter ? "better" : "worse";
}

/** Whole days until the test is due again. Zero or less means due now; never taken is due now. */
export function dueIn(t: TestDef, series: Series[], now = Date.now()): number {
  const last = Math.max(...series.map((s) => s.last?.takenAt.getTime() ?? -Infinity));
  return Math.ceil((last + t.everyDays * DAY - now) / DAY);
}

export const dayText = (d: Date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(d);

/** A short label for a drawn value on the chart's axis: the number without its unit words. */
export function axisText(t: TestDef, v: number): string {
  if (t.unit === "log_ratio") return percent(v);
  if (t.unit === "logMAR") return reading(t, { value: v });
  /* the engine writes "4.5% contrast"; the axis keeps the percentage */
  return t.unit === "logCS" ? reading(t, { value: v }).split(" ")[0] : String(Math.round(v * 10) / 10);
}

/** One eye's (or the whole test's) change check: the latest result against the one before it and against the baseline. */
export interface Changed extends ChangeCheck { eye: Side | null }

/** The change checks of a test that raised an alert. Empty for a first result, a steady result or an improvement. */
export function changesOf(t: TestDef, series: Series[]): Changed[] {
  if (!hasChangeRule(t.key)) return [];
  return series.flatMap((s): Changed[] => {
    if (!s.last || s.rows.length < 2) return [];
    const previous = s.rows.at(-2)!, baseline = s.first && s.first.id !== s.last.id ? s.first : null;
    const check = changeCheck(t.key, s.last.value, previous.value, baseline?.value ?? null);
    return check.alert ? [{ ...check, eye: s.eye }] : [];
  });
}

/** fusion_recovery has a history but no run of its own: the fusion_break run saves both rows. */
const RUN_KEYS = ["acuity", "contrast", "balance", "stereo", "fusion_break", "near_point", "suppression", "symptoms"] as const;
export type RunKey = (typeof RUN_KEYS)[number];
/** The check-ups this app can run today. */
export const isRunKey = (key: string): key is RunKey => (RUN_KEYS as readonly string[]).includes(key);
/** Where a test's run lives. */
export const runPath = (key: string) => `/test/${key === "fusion_recovery" ? "fusion_break" : key}/run`;
/** Check-ups done away from the screen or with no drawing: they need no measured screen. */
export const needsScreen = (key: RunKey) => key !== "near_point" && key !== "symptoms";

/** What a stored result says, in plain words: one short paragraph each. Empty for the tests that need no explaining. */
export function meaningOf(t: TestDef, r: Result): string[] {
  const m = c.meaning, v = number(r.value);
  switch (t.key) {
    case "stereo":
      return [r.note === "floor" ? m.stereo.floor(v) : r.note === "worse" ? m.stereo.worse(v) : m.stereo.plain(v)];
    case "fusion_break":
      return [r.note === "floor" ? m.fusion_break.floor(v) : m.fusion_break.plain(v)];
    case "fusion_recovery":
      return [r.note === "floor" ? m.fusion_recovery.floor() : r.value === 0 ? m.fusion_recovery.zero : m.fusion_recovery.plain(v)];
    case "near_point":
      return [m.near_point(v)];
    case "suppression": {
      const raw = (r.raw ?? {}) as { dots?: unknown; bottom?: unknown; unseenLens?: unknown; unseenEye?: unknown };
      const lens = raw.unseenLens === "red" || raw.unseenLens === "cyan" ? raw.unseenLens : null;
      const eye = raw.unseenEye === "L" || raw.unseenEye === "R" ? raw.unseenEye : null;
      const bottom = raw.bottom === "red" || raw.bottom === "cyan" || raw.bottom === "mix" ? raw.bottom : null;
      return [
        [m.suppression(r.value, typeof raw.dots === "number" ? raw.dots : undefined), lens && eye && m.unseen(lens, eye), bottom && m.bottom[bottom]].filter(Boolean).join(" "),
        m.reported,
      ];
    }
    case "symptoms":
      return [m.symptoms(r.value, SURVEY_TOP_SCORE)];
    default:
      return [];
  }
}
