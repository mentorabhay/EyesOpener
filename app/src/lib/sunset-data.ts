/**
 * Sunset Rule: reading the active profile's day. Server only. The rules are in sunset.ts.
 * It reads the day's rows and writes nothing. Every query is scoped by `m.profile.id`.
 */
import { and, eq, gte } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { canStart } from "@/engine";
import { readStatuses } from "@/lib/catalogue";
import { dayOf, startOfDay } from "@/lib/league";
import type { Member } from "@/lib/session";
import { isListed, statusOf } from "@/lib/status";
import { sunsetOf, type Sunset } from "@/lib/sunset";
import { OUTDOOR_LOG, SKY_HUNT } from "@/lib/sunset-names";


export interface SunsetView {
  sunset: Sunset;
  /** Today's practice minutes and the Light ring, as the rings show them. */
  minutes: number;
  light: { done: number; goal: number };
  /** Which outdoor pages are there for this member (staff can switch an item off). */
  links: { hunt: boolean; log: boolean };
}

const hourFormat = new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Kolkata" });
/** The hour of the day in India, 0 to 23. The app keeps one clock for now, as `todayKey` does. */
export const hourOf = (at: Date) => Number(hourFormat.format(at)) % 24;

/** What the sky shows for the active profile now. */
export async function sunsetFor(m: Member, now = new Date()): Promise<SunsetView> {
  const today = dayOf(now), D = s.daySummary, S = s.session;
  const [[day], stops, statuses] = await Promise.all([
    db.select({ train: D.trainMinutes, light: D.lightMinutes, lightGoal: D.lightGoal }).from(D).where(and(eq(D.profileId, m.profile.id), eq(D.day, today))),
    db.select({ id: S.id }).from(S).where(and(eq(S.profileId, m.profile.id), eq(S.endReason, "stop_rule"), gte(S.startedAt, startOfDay(today)))).limit(1),
    readStatuses(),
  ]);
  const minutes = day?.train ?? 0, light = { done: day?.light ?? 0, goal: day?.lightGoal ?? 90 };
  const dose = canStart({ kind: "game", minutesToday: minutes, ...m.dose });
  const sunset = sunsetOf({
    reason: dose.reason, tester: m.tester, stoppedToday: stops.length > 0,
    minutes, dailyMinutes: m.enrolment?.dailyMinutes ?? 0, light, hour: hourOf(now),
  });
  return {
    sunset, minutes, light,
    links: { hunt: isListed(statusOf(statuses, "game", SKY_HUNT), m.tester), log: isListed(statusOf(statuses, "exercise", OUTDOOR_LOG), m.tester) },
  };
}
