/**
 * What the summary for an eye exam shows, read once. The page draws these values, and the plain-words paragraph
 * an assistant may write is built from the same values and from nothing else (`examFacts`).
 */
import { and, desc, eq, gte, isNotNull } from "drizzle-orm";
import { test as c } from "@/copy/test";
import { programmeBySlug, tests, type TestDef } from "@/data";
import { db, schema } from "@/db";
import type { ExamFacts } from "@/lib/assist/types";
import { todayKey, type Member } from "@/lib/session";
import { changesOf, dayText, reading, resultsOf, seriesOf, type Series } from "../results";

const s = c.summary;
export const SUMMARY_DAYS = 28;
const DAY_MS = 86_400_000;

export const fullDay = (d: Date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(d);

export interface SummaryLine { t: TestDef; line: Series; changed: boolean }

/** Everything the page shows for the active profile. */
export async function summaryData(m: Member, now = new Date()) {
  const profileId = m.profile.id, from = new Date(now.getTime() - (SUMMARY_DAYS - 1) * DAY_MS);
  const [rows, days, stops] = await Promise.all([
    resultsOf(profileId),
    db.select({ day: schema.daySummary.day, minutes: schema.daySummary.trainMinutes }).from(schema.daySummary)
      .where(and(eq(schema.daySummary.profileId, profileId), gte(schema.daySummary.day, todayKey(from)))),
    db.select({ symptom: schema.session.stopSymptom, at: schema.session.startedAt }).from(schema.session)
      .where(and(eq(schema.session.profileId, profileId), isNotNull(schema.session.stopSymptom), gte(schema.session.startedAt, new Date(from.getTime() - DAY_MS))))
      .orderBy(desc(schema.session.startedAt)),
  ]);
  const practised = days.filter((d) => d.minutes > 0);
  const minutes = Math.round(practised.reduce((sum, d) => sum + d.minutes, 0));
  const programme = m.enrolment && programmeBySlug(m.enrolment.programme);
  /* only stops inside the 28 days, by the member's own calendar */
  const recent = stops.filter((x) => todayKey(x.at) >= todayKey(from));
  const lines: SummaryLine[] = tests.flatMap((t) => {
    const series = seriesOf(t, rows), changed = changesOf(t, series);
    return series.map((line) => ({ t, line, changed: changed.some((x) => x.eye === line.eye) }));
  });
  return { now, lines, minutes, practisedDays: practised.length, programme: programme ?? null, recent };
}
export type SummaryData = Awaited<ReturnType<typeof summaryData>>;

/** The name of a line as the table prints it: the check-up, and the eye for a check-up taken one eye at a time. */
export const lineName = (x: SummaryLine) => `${x.t.name}${x.line.eye ? `, ${c.eye[x.line.eye].toLowerCase()}` : ""}`;
/** The earlier result the table prints beside the latest one, when there is one. */
export const firstOf = (x: SummaryLine) => (x.line.first && x.line.last && x.line.first.id !== x.line.last.id ? x.line.first : undefined);
export const symptomText = (key: string | null) => s.symptom[key ?? ""] ?? key ?? "";

/**
 * The page's numbers as plain strings, written the way the page writes them. No name and no age go in:
 * a paragraph is about the measurements, and the page itself says whose they are.
 */
export function examFacts(m: Member, d: SummaryData): ExamFacts {
  const withResult = d.lines.filter((x) => x.line.last);
  return {
    results: withResult.map((x) => {
      const last = x.line.last!, first = firstOf(x);
      return {
        name: lineName(x), latest: reading(x.t, last), latestDay: fullDay(last.takenAt),
        first: first ? reading(x.t, first) : null, firstDay: first ? fullDay(first.takenAt) : null,
        count: x.line.rows.length, changed: x.changed,
      };
    }),
    notTaken: d.lines.filter((x) => !x.line.last).map(lineName),
    practice: {
      programme: d.programme && m.enrolment ? s.programmeLine(d.programme.name, m.enrolment.week, m.enrolment.dailyMinutes, m.enrolment.daysPerWeek) : null,
      minutes: d.minutes, days: d.practisedDays, windowDays: SUMMARY_DAYS,
    },
    stops: d.recent.map((x) => ({ symptom: symptomText(x.symptom), day: dayText(x.at) })),
  };
}
