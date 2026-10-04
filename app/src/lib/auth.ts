/**
 * Who is signed in, and the gates for each area.
 * Roles are read from the database on every request, a super admin passes every staff gate,
 * and an area a person may not use answers "not found".
 *
 * Sign-in today is the demo sign-in (a signed cookie naming a seeded person). Firebase sign-in replaces
 * `signedInUserId` (tracker task A6); nothing else in this file changes.
 */
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { homeFor, resolveStaffRole, sponsorCan, staffCan, type AdminArea, type Seat, type SponsorAction, type SponsorRole, type StaffRole } from "./roles";
import { secureCookies, signToken, verifyToken } from "./token";

export const USER_COOKIE = "io_user";
export const CHILD_COOKIE = "io_child";
const USER_TTL_MS = 30 * 86_400_000;

/** The demo sign-in is for development and the public demo. Production sets DEMO_LOGIN=off. */
export const demoLoginOn = () => process.env.DEMO_LOGIN !== "off";

async function signedInUserId(): Promise<string | null> {
  // TODO(A6): verify the Firebase session cookie and return the matching appUser id.
  if (!demoLoginOn()) return null;
  return verifyToken<{ userId: string }>((await cookies()).get(USER_COOKIE)?.value)?.userId ?? null;
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
}

/** The signed-in person with their roles, read fresh from the database. Null when nobody is signed in. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const id = await signedInUserId();
  let user = id ? (await db.select().from(schema.appUser).where(eq(schema.appUser.id, id)).limit(1))[0] : undefined;
  if (!user && demoLoginOn()) {
    /* First visit to the demo: the demo household's guardian. */
    const [row] = await db.select({ user: schema.appUser }).from(schema.appUser)
      .innerJoin(schema.account, eq(schema.account.id, schema.appUser.accountId))
      .where(and(eq(schema.account.isDemo, true), eq(schema.appUser.seat, "guardian")))
      .orderBy(asc(schema.appUser.createdAt)).limit(1);
    user = row?.user;
  }
  if (!user) return null;
  const sponsors = await db.select({ sponsorId: schema.sponsor.id, name: schema.sponsor.name, status: schema.sponsor.status, role: schema.sponsorUser.role })
    .from(schema.sponsorUser).innerJoin(schema.sponsor, eq(schema.sponsor.id, schema.sponsorUser.sponsorId))
    .where(eq(schema.sponsorUser.userId, user.id));
  const seat = user.accountId ? user.seat : null;
  const staff = resolveStaffRole(user.staffRole, user.email, process.env.ADMIN_EMAILS ?? "");
  const counsellor = user.isCounsellor && !!user.counsellorVerifiedAt;
  return { user, seat, staff, counsellor, sponsors, home: homeFor({ seat, staff, counsellor, sponsor: sponsors.length > 0 }) };
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

/** Demo sign-in: become one of the seeded people. Refused when the demo sign-in is off. */
export async function signInAs(userId: string): Promise<string | null> {
  if (!demoLoginOn()) return null;
  const [user] = await db.select().from(schema.appUser).where(eq(schema.appUser.id, userId)).limit(1);
  if (!user) return null;
  const jar = await cookies();
  jar.set(USER_COOKIE, signToken({ userId: user.id, exp: Date.now() + USER_TTL_MS }), { path: "/", httpOnly: true, sameSite: "lax", secure: secureCookies(), maxAge: USER_TTL_MS / 1000 });
  jar.delete(CHILD_COOKIE);
  jar.delete("io_profile");
  return user.id;
}

export async function signOut() {
  const jar = await cookies();
  jar.delete(USER_COOKIE); jar.delete(CHILD_COOKIE); jar.delete("io_profile");
}
