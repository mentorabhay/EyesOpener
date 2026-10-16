/**
 * Who may do what. Pure rules, unit-tested; the server gates in auth.ts and session.ts call these.
 * Guardian seats write, cheer seats only look and encourage, staff see rooms by role,
 * and a route a person may not use answers "not found".
 */

export type Seat = "guardian" | "co_guardian" | "circle";
export type StaffRole = "super_admin" | "ops" | "content";
export type SponsorRole = "owner" | "editor";

/* ───────────── household seats ───────────── */

export const MEMBER_ACTIONS = [
  "view",          // read the household's screens
  "encourage",     // Fusion Mail, give a light
  "train",         // start and finish sessions
  "test",          // onboarding and check-ups
  "share",         // share a story, join an experiment, leave a note
  "manage_family", // add profiles, start or leave programmes, triage, counsellor link, devices
  "consent",       // give or withdraw consent for a child
  "data",          // ask for an export or deletion
  "seats",         // invite or remove co-guardians and cheer seats, set the exit PIN
] as const;
export type MemberAction = (typeof MEMBER_ACTIONS)[number];

const SEAT_CAN: Record<Seat, readonly MemberAction[]> = {
  guardian: MEMBER_ACTIONS,
  co_guardian: MEMBER_ACTIONS.filter((a) => a !== "seats"),
  circle: ["view", "encourage"],
};

/** What a child may do while the device is in child mode. */
const CHILD_MODE_CAN: readonly MemberAction[] = ["view", "train", "test"];

export function memberCan(seat: Seat | null, action: MemberAction, childMode = false): boolean {
  if (!seat) return false;
  if (childMode && !CHILD_MODE_CAN.includes(action)) return false;
  return SEAT_CAN[seat].includes(action);
}

/** Guardian seats: the grown-ups who decide. Never a cheer seat. */
export const isGuardianSeat = (seat: Seat | null) => seat === "guardian" || seat === "co_guardian";

/* ───────────── child mode containment ───────────── */

/**
 * Screens sealed while the device is in child mode. Everything under these prefixes redirects to /today.
 * The sign-in pages are not in this list, and are sealed all the same: the page itself sends a child to /today
 * whenever the app can open for whoever is signed in (`loginGate` in src/lib/signin/hold.ts). Sealing them here,
 * where only a cookie can be read, made a loop: with nobody signed in, /today sent the browser to /login and this
 * list sent it straight back. A grown-up must be able to reach sign-in on a device whose session has ended.
 */
export const SEALED_IN_CHILD_MODE = ["/settings", "/family", "/admin", "/counsellor", "/sponsor", "/together/share", "/together/lights"] as const;

export const isSealedPath = (pathname: string) => SEALED_IN_CHILD_MODE.some((p) => pathname === p || pathname.startsWith(p + "/"));

/* ───────────── staff rooms ───────────── */

export const ADMIN_AREAS = ["overview", "moderation", "hazards", "requests", "counsellors", "sponsors", "households", "enquiries", "catalogue", "manual", "stories", "staff", "research", "screens", "switchboard", "look"] as const;
export type AdminArea = (typeof ADMIN_AREAS)[number];

/** The rooms grouped for the console's menu (the setup plan, 9 October 2026). The overview sits above the groups. */
export const ADMIN_GROUPS = {
  people: ["households", "counsellors", "sponsors", "staff", "requests"],
  library: ["catalogue", "manual", "research"],
  content: ["stories", "moderation", "hazards", "enquiries"],
  system: ["screens", "switchboard", "look"],
} as const satisfies Record<string, readonly AdminArea[]>;

const ROOMS: Record<Exclude<StaffRole, "super_admin">, readonly AdminArea[]> = {
  ops: ["overview", "moderation", "hazards", "requests", "counsellors", "sponsors", "households", "enquiries", "catalogue", "manual", "research", "screens"],
  content: ["overview", "catalogue", "manual", "research", "stories"],
};

export const staffCan = (role: StaffRole | null, area: AdminArea): boolean =>
  !!role && (role === "super_admin" || ROOMS[role].includes(area));

export const staffAreas = (role: StaffRole | null): AdminArea[] => ADMIN_AREAS.filter((a) => staffCan(role, a));

/**
 * The effective staff role. The database column wins. An address listed in ADMIN_EMAILS with no column value
 * is a super admin, so the owner can never be locked out.
 */
export function resolveStaffRole(column: StaffRole | null | undefined, email: string, adminEmails: string): StaffRole | null {
  if (column) return column;
  const list = adminEmails.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase()) ? "super_admin" : null;
}

/* ───────────── sponsors ───────────── */

export type SponsorAction = "view" | "edit_groups" | "manage_team";
export const sponsorCan = (role: SponsorRole | null, action: SponsorAction): boolean =>
  !!role && (action !== "manage_team" || role === "owner");

/** Sponsors see counts only, and no count below this many households. */
export const SPONSOR_MIN_GROUP = 5;

/* ───────────── where each person lands ───────────── */

export interface RoleSet { seat: Seat | null; staff: StaffRole | null; counsellor: boolean; sponsor: boolean }

export function homeFor(r: RoleSet): string {
  if (r.seat) return r.seat === "circle" ? "/circle" : "/today";
  if (r.staff) return "/admin";
  if (r.counsellor) return "/counsellor";
  if (r.sponsor) return "/sponsor";
  return "/login";
}
