// Eyes Opener: Reading and writing Cinema Club listings. Server only.
/**
 * Reading and writing Cinema Club listings. Server only.
 * This file holds no gate: a page or an action calls `requireSponsor`, `requireStaff` or `requireMember` first.
 *
 * - A listing holds a place, a day and a time. Nothing in this file reads or writes a household, a profile or a
 *   person who came: the app has no record of that at all.
 * - A sponsor reaches only its own listings: every sponsor query carries the sponsor's id from the signed-in
 *   person's own seat, never an id from the browser.
 * - A sponsor's listing waits for a person (a `moderation_item` of kind "club"); staff's own is listed at once.
 * - Every write by a sponsor or by staff is recorded with `audit`.
 */
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { audit, type SponsorSeat, type Viewer } from "@/lib/auth";
import { clubStatus, firstStatus, inWeekOrder, isPlaceKind, listingRefusal, type ClubStatus, type ListingRefusal, type PlaceKind } from "@/lib/cinema-club";
import { screenHazards } from "@/lib/community";

const C = s.cinemaClub;
const OPEN: ClubStatus[] = ["in_review", "listed"];
const tidy = (name: string) => name.replace(/\s+/g, " ").trim();

export interface Club { id: string; placeKind: PlaceKind; placeName: string; weekday: number; startMinute: number; isSample: boolean }

/** The clubs a family may see: listed ones, through the week. A place and a time, and nothing else. */
export async function listedClubs(): Promise<Club[]> {
  const rows = await db.select({ id: C.id, placeKind: C.placeKind, placeName: C.placeName, weekday: C.weekday, startMinute: C.startMinute, isSample: C.isSample })
    .from(C).where(eq(C.status, "listed"));
  return inWeekOrder(rows.flatMap((r) => (isPlaceKind(r.placeKind) ? [{ ...r, placeKind: r.placeKind }] : [])));
}

export interface OwnClub extends Club { status: ClubStatus; createdAt: Date }

/** A sponsor's own listings, newest first, each with where it stands. */
export async function sponsorClubs(sponsor: SponsorSeat): Promise<OwnClub[]> {
  const rows = await db.select().from(C).where(eq(C.sponsorId, sponsor.sponsorId)).orderBy(desc(C.createdAt));
  return rows.flatMap((r) => (isPlaceKind(r.placeKind) ? [{ id: r.id, placeKind: r.placeKind, placeName: r.placeName, weekday: r.weekday, startMinute: r.startMinute, isSample: r.isSample, status: clubStatus(r.status), createdAt: r.createdAt }] : []));
}

export interface NewClub { placeKind: unknown; placeName: string; weekday: unknown; startMinute: unknown }
export type ClubResult = { ok: true; id: string; status: ClubStatus } | { ok: false; why: ListingRefusal | "hazard" };

/**
 * Lists a club for a sponsor, or for staff when `sponsor` is null. The rules are checked here again, whatever the
 * form sent: the kind of place, the day, the time, and that the name is a public place and no home.
 */
export async function createClub(viewer: Viewer, sponsor: SponsorSeat | null, input: NewClub): Promise<ClubResult> {
  const by = sponsor ? "sponsor" as const : "staff" as const, placeName = tidy(input.placeName);
  const [{ open }] = sponsor
    ? await db.select({ open: count() }).from(C).where(and(eq(C.sponsorId, sponsor.sponsorId), inArray(C.status, OPEN)))
    : [{ open: 0 }];
  const refused = listingRefusal({ by, approved: sponsor?.status === "approved", open, ...input, placeName });
  if (refused) return { ok: false, why: refused };
  if ((await screenHazards(placeName)).length) return { ok: false, why: "hazard" };

  const status = firstStatus(by), now = new Date();
  const row = await db.transaction(async (tx) => {
    const [made] = await tx.insert(C).values({
      sponsorId: sponsor?.sponsorId ?? null, placeKind: input.placeKind as PlaceKind, placeName, weekday: input.weekday as number, startMinute: input.startMinute as number,
      status, createdBy: viewer.user.id, listedAt: status === "listed" ? now : null,
    }).returning({ id: C.id });
    if (status === "in_review") {
      await tx.insert(s.moderationItem).values({ kind: "club", refId: made.id, reason: "New Cinema Club listing from a sponsor. Passed the hazard screen and the no-home rule; needs a person's approval." });
    }
    return made;
  });
  await audit(viewer, sponsor ? "sponsor.club.list" : "admin.gatherings.club.list", row.id, { ...(sponsor ? { sponsorId: sponsor.sponsorId } : {}), name: placeName, status });
  return { ok: true, id: row.id, status };
}

/** A sponsor closes one of its own clubs. It leaves the list at once, and a listing still waiting is withdrawn. */
export async function closeOwnClub(viewer: Viewer, sponsor: SponsorSeat, clubId: string): Promise<boolean> {
  const row = await db.transaction(async (tx) => {
    const [closed] = await tx.update(C).set({ status: "closed", closedAt: new Date() })
      .where(and(eq(C.id, clubId), eq(C.sponsorId, sponsor.sponsorId), inArray(C.status, OPEN))).returning({ id: C.id, placeName: C.placeName });
    if (closed) await closeReview(tx, closed.id, viewer.user.id);
    return closed ?? null;
  });
  if (!row) return false;
  await audit(viewer, "sponsor.club.close", row.id, { sponsorId: sponsor.sponsorId, name: row.placeName });
  return true;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
/** A review item that still waits for a listing that is gone is closed with it, so nobody is asked to approve it. */
const closeReview = (tx: Tx, clubId: string, by: string) =>
  tx.update(s.moderationItem).set({ status: "removed", reviewerId: by, decidedAt: new Date() })
    .where(and(eq(s.moderationItem.kind, "club"), eq(s.moderationItem.refId, clubId), eq(s.moderationItem.status, "open")));

/* ───────────── staff ───────────── */

export interface StaffClub extends OwnClub { sponsor: string | null }

/** Every listing, for the staff page: what waits first, then what is listed, then the rest. */
export async function staffClubs(): Promise<StaffClub[]> {
  const rows = await db.select({ club: C, sponsor: s.sponsor.name }).from(C).leftJoin(s.sponsor, eq(s.sponsor.id, C.sponsorId)).orderBy(asc(C.placeName));
  const order: Record<ClubStatus, number> = { in_review: 0, listed: 1, closed: 2, removed: 3 };
  return rows.flatMap(({ club: r, sponsor }) => (isPlaceKind(r.placeKind) ? [{
    id: r.id, placeKind: r.placeKind, placeName: r.placeName, weekday: r.weekday, startMinute: r.startMinute, isSample: r.isSample,
    status: clubStatus(r.status), createdAt: r.createdAt, sponsor,
  }] : [])).sort((a, b) => order[a.status] - order[b.status]);
}

/** Staff take a club off the list, whoever listed it. */
export async function removeClub(viewer: Viewer, clubId: string): Promise<boolean> {
  const row = await db.transaction(async (tx) => {
    const [gone] = await tx.update(C).set({ status: "removed", closedAt: new Date() })
      .where(and(eq(C.id, clubId), inArray(C.status, OPEN))).returning({ id: C.id, placeName: C.placeName });
    if (gone) await closeReview(tx, gone.id, viewer.user.id);
    return gone ?? null;
  });
  if (!row) return false;
  await audit(viewer, "admin.gatherings.club.remove", row.id, { name: row.placeName });
  return true;
}
