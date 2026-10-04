/**
 * The household side of a request: the signed-in person's family, the active profile and its eye settings.
 * Built on auth.ts. Pages call `requireMember()`; actions also check `m.can(action)`.
 */
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { programmeBySlug } from "@/data";
import { ageFrom } from "@/engine";
import { CHILD_COOKIE, getViewer } from "./auth";
import { memberCan, type MemberAction } from "./roles";
import { verifyToken } from "./token";

export const PROFILE_COOKIE = "io_profile";

export type Member = NonNullable<Awaited<ReturnType<typeof getMember>>>;

/**
 * A staff member with no household of their own gets a test household the first time they open the member app:
 * one adult profile, no family data. Everything in the library opens in it and the daily limits do not apply.
 */
async function testHousehold(user: { id: string; displayName: string }) {
  const found = await db.select().from(schema.account).where(eq(schema.account.previewFor, user.id)).limit(1);
  if (found[0]) return found[0];
  const [made] = await db.insert(schema.account).values({ displayName: "Staff test household", previewFor: user.id })
    .onConflictDoNothing({ target: schema.account.previewFor }).returning();
  const account = made ?? (await db.select().from(schema.account).where(eq(schema.account.previewFor, user.id)).limit(1))[0];
  if (made) await db.insert(schema.profile).values({ accountId: account.id, displayName: user.displayName.replace(/\s*\(.*\)\s*$/, "") || "Tester", kind: "adult" });
  return account;
}

/** The household, its profiles, the active profile and that profile's current eye settings. Null without a seat. */
export const getMember = cache(async () => {
  const viewer = await getViewer();
  if (!viewer) return null;
  const own = viewer.seat && viewer.user.accountId ? viewer.user.accountId : null;
  /* Staff with no household of their own try the app in a test household. */
  const tester = !own && !!viewer.staff;
  if (!own && !tester) return null;
  const [account] = own ? await db.select().from(schema.account).where(eq(schema.account.id, own)).limit(1) : [await testHousehold(viewer.user)];
  if (!account) return null;
  const profiles = await db.select().from(schema.profile)
    .where(and(eq(schema.profile.accountId, account.id), isNull(schema.profile.archivedAt)))
    .orderBy(asc(schema.profile.createdAt));
  if (!profiles.length) return null;

  const jar = await cookies();
  /* Child mode pins the device to one child until a grown-up types the exit PIN. */
  const child = verifyToken<{ profileId: string; accountId: string }>(jar.get(CHILD_COOKIE)?.value);
  const childProfile = child?.accountId === account.id ? profiles.find((p) => p.id === child.profileId) : undefined;
  const childMode = !!childProfile;
  const profile = childProfile ?? profiles.find((p) => p.id === jar.get(PROFILE_COOKIE)?.value) ?? profiles[0];

  const [eye] = await db.select().from(schema.eyeProfile)
    .where(and(eq(schema.eyeProfile.profileId, profile.id), eq(schema.eyeProfile.isCurrent, true)))
    .orderBy(desc(schema.eyeProfile.createdAt)).limit(1);
  const [device] = await db.select().from(schema.device)
    .where(and(eq(schema.device.accountId, account.id), eq(schema.device.kind, "web")))
    .orderBy(desc(schema.device.calibratedAt)).limit(1);
  const [enrolment] = await db.select().from(schema.enrolment)
    .where(and(eq(schema.enrolment.profileId, profile.id), eq(schema.enrolment.status, "active")))
    .orderBy(desc(schema.enrolment.startedAt)).limit(1);
  const [triage] = await db.select().from(schema.triage).where(eq(schema.triage.profileId, profile.id)).orderBy(desc(schema.triage.createdAt)).limit(1);
  /* A red flag from onboarding or from the latest triage closes training until it is cleared. */
  const stopFlag = !!(eye?.flags as { stop?: boolean } | undefined)?.stop || !!triage?.redFlag;
  const [consent] = profile.kind === "child" ? await db.select({ id: schema.consent.id }).from(schema.consent)
    .where(and(eq(schema.consent.profileId, profile.id), eq(schema.consent.kind, "parental"), isNull(schema.consent.revokedAt))).limit(1) : [];
  const [link] = await db.select({ id: schema.counsellorLink.id }).from(schema.counsellorLink)
    .where(and(eq(schema.counsellorLink.profileId, profile.id), eq(schema.counsellorLink.status, "active"))).limit(1);
  const level2 = !!enrolment && programmeBySlug(enrolment.programme)?.level === 2;
  /** What the engine's `canStart` needs to know about this profile. */
  const dose = {
    age: ageFrom(profile.birthYear), dailyMinutes: enrolment?.dailyMinutes ?? 0, stopFlag,
    consentMissing: profile.kind === "child" && !consent,
    awaitingCounsellor: level2 && (!link || enrolment.dailyMinutes <= 0),
    tester,
  };
  const seat = viewer.seat ?? ("guardian" as const);
  return {
    viewer, user: viewer.user, seat, childMode,
    /** True in a staff member's own test household: every library item opens and the daily limits are off. */
    tester,
    /** True when a counsellor is linked to the active profile. */
    linked: !!link,
    account, profiles, profile, age: ageFrom(profile.birthYear),
    eye: eye ?? null, device: device ?? null, enrolment: enrolment ?? null, stopFlag, dose,
    /** May this person do this, here and now? Cheer seats only look and encourage; child mode only trains and tests. */
    can: (action: MemberAction) => memberCan(seat, action, childMode),
  };
});

/** Use in household pages. People without a seat are sent to their own area; nobody signed in goes to sign-in. */
export async function requireMember(): Promise<Member> {
  const m = await getMember();
  if (m) return m;
  const viewer = await getViewer();
  redirect(viewer ? (viewer.home === "/today" || viewer.home === "/circle" ? "/login" : viewer.home) : "/login");
}

/** Today's date in the member's timezone as YYYY-MM-DD. India first; a per-household timezone comes later. */
export const todayKey = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);

/** The last `n` days, oldest first, as date keys with a short weekday label. */
export function lastDays(n: number) {
  const now = Date.now();
  return Array.from({ length: n }, (_, i) => {
    const date = new Date(now - (n - 1 - i) * 86_400_000);
    return { key: todayKey(date), label: new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" }).format(date) };
  });
}
