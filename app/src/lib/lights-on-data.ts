// Eyes Opener: Reading Lights On Hour, and the one write staff make. Server only.
/**
 * Reading Lights On Hour, and the one write staff make. Server only.
 *
 * The privacy rule lives in the queries, not only in the page:
 * - the number of households practising leaves the database only when it is LIGHTS_MIN or more
 *   (`having count(distinct ...) >= ...`), so a page cannot show a smaller one;
 * - no query here selects a household's name, a profile, a session's result or a person;
 * - the one household looked at by id is the member's own, to say whether its own lantern is up;
 * - a staff test household is left out of the count, and a child's session counts only while a guardian's
 *   consent for that child stands.
 * Taking part writes nothing: a lantern is read from the practice sessions that already exist.
 * The browser sends nothing that names a household.
 */
import { cache } from "react";
import { and, countDistinct, eq, exists, gte, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import {
  cleanHour, hourAt, lastHour, LIGHTS_MIN, PREVIEW_LANTERNS, worldSightDay, dayIn,
  type HourSetting, type Occurrence, type Preview,
} from "@/lib/lights-on";
import type { Member } from "@/lib/session";
import { TRAIN_KINDS } from "@/lib/sessions";

export const HOUR_KEY = "lights_on_hour";

/** The hour staff set, or the default. Read once per request. */
export const readHour = cache(async (): Promise<HourSetting> => {
  const [row] = await db.select({ value: s.setting.value }).from(s.setting).where(eq(s.setting.key, HOUR_KEY)).limit(1);
  return cleanHour(row?.value);
});

/** When staff last set the hour. Null while it is still the starting value. */
export async function hourChangedAt(): Promise<Date | null> {
  const [row] = await db.select({ updatedAt: s.setting.updatedAt }).from(s.setting).where(eq(s.setting.key, HOUR_KEY)).limit(1);
  return row?.updatedAt ?? null;
}

/** Staff set the hour. The caller has checked the staff gate and the values, and writes the audit line. */
export async function writeHour(hour: HourSetting): Promise<HourSetting> {
  const value = { weekday: hour.weekday, hour: hour.hour }, updatedAt = new Date();
  await db.insert(s.setting).values({ key: HOUR_KEY, value, updatedAt }).onConflictDoUpdate({ target: s.setting.key, set: { value, updatedAt } });
  return value;
}

const S = s.session, P = s.profile;

/** Practice sessions (games, exercises, film; not care routines) started or finished inside the window, by profiles that count. */
function practisedIn(window: { start: Date; end: Date }) {
  const inside = (column: typeof S.startedAt | typeof S.endedAt) => and(gte(column, window.start), lt(column, window.end));
  const consent = db.select({ one: sql`1` }).from(s.consent)
    .where(and(eq(s.consent.profileId, P.id), eq(s.consent.kind, "parental"), isNull(s.consent.revokedAt)));
  return and(
    inArray(S.kind, TRAIN_KINDS), eq(S.ring, "train"), or(inside(S.startedAt), inside(S.endedAt)),
    isNull(P.archivedAt), or(eq(P.kind, "adult"), exists(consent)),
  );
}

/**
 * How many households practised inside the window. Null when fewer than LIGHTS_MIN did: the smaller number never
 * leaves the database.
 */
export async function householdsIn(window: { start: Date; end: Date }): Promise<number | null> {
  const n = countDistinct(P.accountId);
  const rows = await db.select({ n }).from(S)
    .innerJoin(P, eq(P.id, S.profileId)).innerJoin(s.account, eq(s.account.id, P.accountId))
    .where(and(practisedIn(window), isNull(s.account.previewFor)))
    .having(gte(n, LIGHTS_MIN));
  return rows[0]?.n ?? null;
}

/** Whether the member's own household practised inside the window. A household may always know this about itself. */
export async function ownLantern(m: Pick<Member, "account">, window: { start: Date; end: Date }): Promise<boolean> {
  const [row] = await db.select({ id: S.id }).from(S).innerJoin(P, eq(P.id, S.profileId))
    .where(and(practisedIn(window), eq(P.accountId, m.account.id))).limit(1);
  return !!row;
}

export interface LightsOn {
  setting: HourSetting;
  /** True while the hour is running. */
  on: boolean;
  /** The hour that is running, or the next one. */
  hour: Occurrence;
  /** Households practising in the running hour. Null when the hour is not on, or when too few are. */
  households: number | null;
  /** The member's own household has practised in the running hour. */
  own: boolean;
  /** The latest hour that ended, and how many households practised in it (null when too few). */
  last: { hour: Occurrence; households: number | null };
  /** World Sight Day this year, or next year's once this year's has passed. */
  festivalDay: string;
  /** Set for a staff preview: the scene is drawn with sample lanterns and counts nobody. */
  preview: Preview | null;
}

/** Everything the page shows. With a staff preview the scene is on, with sample lanterns, and the database is not counted. */
export async function lightsOnFor(m: Pick<Member, "account">, now = new Date(), preview: Preview | null = null): Promise<LightsOn> {
  const setting = await readHour();
  const at = hourAt(now, setting), before = lastHour(now, setting);
  const today = dayIn(now), thisYear = worldSightDay(Number(today.slice(0, 4)));
  const festivalDay = today <= thisYear ? thisYear : worldSightDay(Number(today.slice(0, 4)) + 1);
  const lastCount = await householdsIn(before);
  if (preview) {
    return { setting, on: true, hour: { ...at.hour, festival: preview === "festival" }, households: PREVIEW_LANTERNS, own: true, last: { hour: before, households: lastCount }, festivalDay, preview };
  }
  const [households, own] = at.on ? await Promise.all([householdsIn(at.hour), ownLantern(m, at.hour)]) : [null, false];
  return { setting, on: at.on, hour: at.hour, households, own, last: { hour: before, households: lastCount }, festivalDay, preview: null };
}
