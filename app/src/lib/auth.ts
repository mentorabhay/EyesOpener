/**
 * Who is signed in, and the gates for each area.
 * Roles are read from the database on every request, a super admin passes every staff gate,
 * and an area a person may not use answers "not found".
 *
 * A person signs in with Google or with an email link (Firebase Authentication vouches for them; see
 * docs/SIGN-IN.md and src/lib/signin/). The server then gives the browser Eyes Opener's own signed cookie, which names
 * the `app_user` and says when the session began. The demo sign-in (a seeded person picked from a list) gives the
 * same kind of cookie, marked as a demo session, and counts only while DEMO_LOGIN is on.
 * When a session stops counting is in src/lib/signin/session-rules.ts.
 */
import { cache } from "react";
import { jar as cookieJar } from "@/lib/cookie-jar";
import { GATE_COOKIE, gatePassed, lockScope } from "./gate";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { homeFor, resolveStaffRole, sponsorCan, staffCan, type AdminArea, type Seat, type SponsorAction, type SponsorRole, type StaffRole } from "./roles";
import { HOLD_COOKIE, holdOf, mayResume } from "./signin/hold";
import { endedEverywhere, PROFILE_COOKIE, readSession, sessionCookie, tooOldForRole, USER_COOKIE, type Session } from "./signin/session-rules";

export { USER_COOKIE };
export const CHILD_COOKIE = HOLD_COOKIE;

/** The demo sign-in is for development and the public demo. Production sets DEMO_LOGIN=off. */
export const demoLoginOn = () => process.env.DEMO_LOGIN !== "off";

/**
 * Whether the demo is on for this browser: switched on, and, when the site lock covers only the demo people
 * (SITE_LOCK_SCOPE=demo), opened here with the access phrase. Without it a demo session counts for nothing, a first
 * visit is not the demo guardian, and nobody can sign in as a demo person.
 */
export async function demoHere(): Promise<boolean> {
  if (!demoLoginOn()) return false;
  if (lockScope() !== "demo") return true;
  return gatePassed((await cookieJar()).get(GATE_COOKIE)?.value);
}

/** The session this browser carries, if its cookie is good. Whether it still counts for the person is decided in `getViewer`. */
async function signedIn(): Promise<Session | null> {
  return readSession((await cookieJar()).get(USER_COOKIE)?.value, await demoHere());
}

export interface SponsorSeat { sponsorId: string; name: string; status: "pending" | "approved" | "suspended"; role: SponsorRole }

export interface Viewer {
  user: typeof schema.appUser.$inferSelect;
  seat: Seat | null;
  staff: StaffRole | null;
  /** True only for a counsellor that ops has verified. */
  counsellor: boolean;
  sponsors: SponsorSeat[];
  home: string;
  /** True when the person signed in with Google or an email link. False for a demo session and for the demo's first visit. */
  real: boolean;
}

/** A person with their roles, read fresh from the database. */
export async function viewerOf(user: typeof schema.appUser.$inferSelect, real: boolean): Promise<Viewer> {
  const sponsors = await db.select({ sponsorId: schema.sponsor.id, name: schema.sponsor.name, status: schema.sponsor.status, role: schema.sponsorUser.role })
    .from(schema.sponsorUser).innerJoin(schema.sponsor, eq(schema.sponsor.id, schema.sponsorUser.sponsorId))
    .where(eq(schema.sponsorUser.userId, user.id));
  const seat = user.accountId ? user.seat : null;
  const staff = resolveStaffRole(user.staffRole, user.email, process.env.ADMIN_EMAILS ?? "");
  const counsellor = user.isCounsellor && !!user.counsellorVerifiedAt;
  return { user, seat, staff, counsellor, sponsors, home: homeFor({ seat, staff, counsellor, sponsor: sponsors.length > 0 }), real };
}

/** Can this person see more than their own family? Then their session lasts a working day, not a month. */
export const seesBeyondFamily = (v: Viewer): boolean => !!v.staff || v.user.isCounsellor || v.sponsors.length > 0;

/** The signed-in person with their roles, read fresh from the database. Null when nobody is signed in. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await signedIn();
  let user = session ? (await db.select().from(schema.appUser).where(eq(schema.appUser.id, session.userId)).limit(1))[0] : undefined;
  /* "Sign out on every device" ended this session. */
  if (user && session && endedEverywhere(session, user.sessionsValidAfter)) user = undefined;
  let viewer = user && session ? await viewerOf(user, session.via === "signin") : null;
  if (viewer && session && tooOldForRole(session, seesBeyondFamily(viewer))) viewer = null;
  if (!viewer && (await demoHere())) {
    /* First visit to the demo: the demo household's guardian. */
    const [row] = await db.select({ user: schema.appUser }).from(schema.appUser)
      .innerJoin(schema.account, eq(schema.account.id, schema.appUser.accountId))
      .where(and(eq(schema.account.isDemo, true), eq(schema.appUser.seat, "guardian")))
      .orderBy(asc(schema.appUser.createdAt)).limit(1);
    if (row) viewer = await viewerOf(row.user, false);
  }
  return viewer;
});

/** Anyone signed in, or off to the sign-in page. */
export async function requireViewer(): Promise<Viewer> {
  return (await getViewer()) ?? redirect("/login");
}

/** Staff gate for one room of the admin console. Not permitted means not found. */
export async function requireStaff(area: AdminArea): Promise<Viewer & { staff: StaffRole }> {
  const v = await getViewer();
  if (!v || !staffCan(v.staff, area)) notFound();
  return v as Viewer & { staff: StaffRole };
}

/** Counsellor gate: a counsellor ops has verified. */
export async function requireCounsellor(): Promise<Viewer> {
  const v = await getViewer();
  if (!v || !v.counsellor) notFound();
  return v;
}

/** Sponsor gate. Returns the sponsor this person belongs to; a suspended sponsor is not found. */
export async function requireSponsor(action: SponsorAction = "view"): Promise<{ viewer: Viewer; sponsor: SponsorSeat }> {
  const v = await getViewer();
  const sponsor = v?.sponsors.find((s) => s.status !== "suspended");
  if (!v || !sponsor || !sponsorCan(sponsor.role, action)) notFound();
  return { viewer: v, sponsor };
}

/** Record what a staff member, counsellor or sponsor did. */
export async function audit(v: Viewer, action: string, target?: string, meta?: Record<string, unknown>) {
  await db.insert(schema.auditLog).values({ userId: v.user.id, action, target: target ?? null, meta: meta ?? null });
}

/**
 * Who the demo sign-in may become: a seeded person, never someone who signed in for real.
 * A seeded person is in the demo family, or has an address under ".test", a name no real mailbox can have.
 * Where the demo and real sign-in run side by side (a staging copy), this is what keeps the demo page from
 * listing real people, and from signing anyone in as one.
 */
export const isDemoPerson = (user: { email: string; firebaseUid: string | null }, inDemoHousehold: boolean): boolean =>
  !user.firebaseUid && (inDemoHousehold || user.email.trim().toLowerCase().endsWith(".test"));

/**
 * Demo sign-in: become one of the seeded people. Refused when the demo sign-in is off.
 *
 * Child mode holds in the demo as it does anywhere: only the exit PIN ends it. So this never removes the
 * child-mode cookie, and on a device in child mode it lets in only a person of that child's household.
 * Before, it removed the cookie, which let anyone who could send this form end child mode without the PIN.
 */
export async function signInAs(userId: string): Promise<string | null> {
  if (!(await demoHere()) || !/^[0-9a-f-]{36}$/i.test(userId)) return null;
  const [user] = await db.select().from(schema.appUser).where(eq(schema.appUser.id, userId)).limit(1);
  if (!user) return null;
  const [household] = user.accountId ? await db.select({ isDemo: schema.account.isDemo }).from(schema.account).where(eq(schema.account.id, user.accountId)).limit(1) : [];
  if (!isDemoPerson(user, !!household?.isDemo)) return null;
  const jar = await cookieJar();
  const hold = await holdOf(jar.get(CHILD_COOKIE)?.value);
  if (hold.state === "live" && !mayResume(hold, user)) return null;
  const c = sessionCookie(user.id, "demo");
  jar.set(c.name, c.value, c.options);
  jar.delete(PROFILE_COOKIE);
  /* A child-mode cookie whose household is gone holds nothing and could never be ended with a PIN. */
  if (hold.state === "dead") jar.delete(CHILD_COOKIE);
  return user.id;
}

/** Ends the session on this browser. Child mode is not touched: only the exit PIN ends it. */
export async function signOut() {
  const jar = await cookieJar();
  jar.delete(USER_COOKIE); jar.delete(PROFILE_COOKIE);
}

/** "Sign out on every device": every session of this person that began before now stops counting, on the next request each makes. */
export async function endSessionsEverywhere(userId: string, now = new Date()) {
  await db.update(schema.appUser).set({ sessionsValidAfter: now }).where(eq(schema.appUser.id, userId));
}
