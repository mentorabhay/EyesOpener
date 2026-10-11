// Eyes Opener: Reading and writing Class Mission. Server only.
/**
 * Reading and writing Class Mission. Server only.
 * Everything is scoped by the member's household: a profile id or a mission id from the browser is only ever
 * matched against the household's own profiles. Two things are stored and nothing else: that a guardian gave a
 * child the mission, and the day it was run. Nothing about a class, a school or a classmate can be written here.
 */
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { doneRefusal, giveRefusal, missionState, takeBackRefusal, type Mission, type MissionRefusal, type MissionState } from "@/lib/class-mission";
import { dayOf } from "@/lib/league";
import { todayKey, type Member } from "@/lib/session";

const M = s.classMission;
type Scope = Pick<Member, "account" | "profiles" | "user" | "can">;

/** Child profiles of the household whose guardian's consent stands. */
async function consentedChildren(m: Pick<Member, "account" | "profiles">): Promise<Set<string>> {
  const kids = m.profiles.filter((p) => p.kind === "child").map((p) => p.id);
  if (!kids.length) return new Set();
  const rows = await db.selectDistinct({ id: s.consent.profileId }).from(s.consent)
    .where(and(inArray(s.consent.profileId, kids), eq(s.consent.accountId, m.account.id), eq(s.consent.kind, "parental"), isNull(s.consent.revokedAt)));
  return new Set(rows.map((r) => r.id));
}

export interface ChildMissions {
  profileId: string;
  name: string;
  /** A guardian's consent for this child stands. Without it no mission can be given and none is shown as open. */
  consented: boolean;
  state: MissionState;
  /** The mission that has not been run yet, if there is one. */
  open: Mission | null;
  /** Missions that were run, newest first. */
  done: Mission[];
}

/** Every child of the household with where each stands, the active profile's own first. */
export async function householdMissions(m: Pick<Member, "account" | "profiles" | "profile">): Promise<ChildMissions[]> {
  const kids = m.profiles.filter((p) => p.kind === "child");
  if (!kids.length) return [];
  const [consented, rows] = await Promise.all([
    consentedChildren(m),
    db.select({ id: M.id, profileId: M.profileId, givenAt: M.givenAt, doneOn: M.doneOn }).from(M)
      .where(inArray(M.profileId, kids.map((k) => k.id))).orderBy(desc(M.doneOn), desc(M.givenAt)),
  ]);
  return kids.map((k) => {
    const mine = rows.filter((r) => r.profileId === k.id);
    return { profileId: k.id, name: k.displayName, consented: consented.has(k.id), state: missionState(mine), open: mine.find((r) => r.doneOn === null) ?? null, done: mine.filter((r) => r.doneOn !== null) };
  }).sort((a, b) => Number(b.profileId === m.profile.id) - Number(a.profileId === m.profile.id));
}

export type MissionResult = { ok: true; name: string } | { ok: false; why: MissionRefusal };

/** A guardian gives a child of the household the mission. One at a time: the child's row is held while this is checked. */
export async function giveMission(m: Scope, profileId: string): Promise<MissionResult> {
  const profile = m.profiles.find((p) => p.id === profileId) ?? null;
  const consented = profile ? (await consentedChildren(m)).has(profile.id) : false;
  return db.transaction(async (tx) => {
    if (profile) await tx.select({ id: s.profile.id }).from(s.profile).where(and(eq(s.profile.id, profile.id), eq(s.profile.accountId, m.account.id))).for("update");
    const [open] = profile ? await tx.select({ id: M.id }).from(M).where(and(eq(M.profileId, profile.id), isNull(M.doneOn))).limit(1) : [];
    const refused = giveRefusal({ canManage: m.can("manage_family"), profile, consented, open: !!open });
    if (refused || !profile) return { ok: false as const, why: refused ?? "not_found" };
    await tx.insert(M).values({ profileId: profile.id, givenBy: m.user.id });
    return { ok: true as const, name: profile.displayName };
  });
}

/** The household's own mission with this id, with the child it belongs to. Null when it is not theirs. */
async function ownMission(m: Scope, missionId: string) {
  const ids = m.profiles.map((p) => p.id);
  if (!ids.length) return null;
  const [row] = await db.select().from(M).where(and(eq(M.id, missionId), inArray(M.profileId, ids))).limit(1);
  return row ? { ...row, name: m.profiles.find((p) => p.id === row.profileId)?.displayName ?? "" } : null;
}

/** A guardian takes back a mission that has not been run. The row is deleted: nothing of it is kept. */
export async function takeBackMission(m: Scope, missionId: string): Promise<MissionResult> {
  const mission = await ownMission(m, missionId);
  const refused = takeBackRefusal({ canManage: m.can("manage_family"), mission });
  if (refused || !mission) return { ok: false, why: refused ?? "not_found" };
  const gone = await db.delete(M).where(and(eq(M.id, mission.id), isNull(M.doneOn))).returning({ id: M.id });
  return gone.length ? { ok: true, name: mission.name } : { ok: false, why: "already" };
}

/** A guardian marks the day a mission was run. The day lies between the day it was given and today (India time). */
export async function markMissionDone(m: Scope, missionId: string, day: string, today = todayKey()): Promise<MissionResult> {
  const mission = await ownMission(m, missionId);
  const refused = doneRefusal({ canManage: m.can("manage_family"), mission: mission && { doneOn: mission.doneOn, givenOn: dayOf(mission.givenAt) }, day, today });
  if (refused || !mission) return { ok: false, why: refused ?? "not_found" };
  /* "still not run" is tested again in the update, so two taps cannot both mark it */
  const saved = await db.update(M).set({ doneOn: day }).where(and(eq(M.id, mission.id), isNull(M.doneOn))).returning({ id: M.id });
  return saved.length ? { ok: true, name: mission.name } : { ok: false, why: "already" };
}
