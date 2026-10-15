/**
 * What the moderation room needs to know about the three kinds of item the "gatherings" package puts in its queue:
 *   club       a Cinema Club listing a sponsor sent           (refId: cinema_club.id)
 *   wish       a Wish Jam wish a guardian wrote               (refId: wish.id)
 *   wish_name  the name a child gave a built Wish Jam game    (refId: wish.id)
 * Server only. src/lib/admin.ts calls `gatheringSubjects` to show an item and `decideGathering` to act on a decision.
 * The gate and the audit line belong to the moderation room's own action.
 *
 * Privacy: a wish is shown to staff with the household's name (as the Households room shows it) and the first name
 * only when the family chose to show it. The profile's full name is not read out to the page.
 */
import { and, count, eq, inArray } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { ageFrom } from "@/engine";
import { isPlaceKind, type PlaceKind } from "@/lib/cinema-club";
import { afterReview, ageBand, firstNameOf, nameAfterReview, type AgeBand } from "@/lib/wish-jam";

export const GATHERING_KINDS = ["club", "wish", "wish_name"] as const;
export type GatheringKind = (typeof GATHERING_KINDS)[number];
export const isGatheringKind = (v: string): v is GatheringKind => (GATHERING_KINDS as readonly string[]).includes(v);

export type GatheringSubject =
  | { kind: "gathering"; of: "club"; placeKind: PlaceKind | null; placeName: string; weekday: number; startMinute: number; sponsor: string | null }
  | { kind: "gathering"; of: "wish"; code: string; household: string; firstName: string | null; band: AgeBand | null; loves: string; play: string; game: string; line: string }
  | { kind: "gathering"; of: "wish_name"; code: string; household: string; gameName: string; loves: string };

/** The words of a subject that the hazard screen reads again in the moderation room. Null when there are none. */
export function gatheringText(subject: GatheringSubject): string | null {
  if (subject.of === "club") return subject.placeName;
  if (subject.of === "wish") return subject.line || null;
  return subject.gameName;
}

/** A short name for the audit line and the card's heading. It never holds a child's name. */
export const gatheringName = (subject: GatheringSubject): string =>
  subject.of === "club" ? subject.placeName : `wish ${subject.code}`;

const key = (kind: string, refId: string) => `${kind}:${refId}`;

/** How many gatherings items wait for a person in the moderation room. */
export async function waitingGatherings(): Promise<number> {
  const [row] = await db.select({ n: count() }).from(s.moderationItem).where(and(eq(s.moderationItem.status, "open"), inArray(s.moderationItem.kind, [...GATHERING_KINDS])));
  return row?.n ?? 0;
}

/** The subject of each gatherings item, by `kind:refId`. An item whose row is gone has no entry. */
export async function gatheringSubjects(items: readonly { kind: string; refId: string }[]): Promise<Map<string, GatheringSubject>> {
  const out = new Map<string, GatheringSubject>();
  const clubIds = items.filter((i) => i.kind === "club").map((i) => i.refId);
  const wishIds = [...new Set(items.filter((i) => i.kind === "wish" || i.kind === "wish_name").map((i) => i.refId))];
  const [clubs, wishes] = await Promise.all([
    clubIds.length ? db.select({ club: s.cinemaClub, sponsor: s.sponsor.name }).from(s.cinemaClub).leftJoin(s.sponsor, eq(s.sponsor.id, s.cinemaClub.sponsorId)).where(inArray(s.cinemaClub.id, clubIds)) : [],
    wishIds.length ? db.select({ wish: s.wish, household: s.account.displayName, displayName: s.profile.displayName, birthYear: s.profile.birthYear }).from(s.wish)
      .innerJoin(s.profile, eq(s.profile.id, s.wish.profileId)).innerJoin(s.account, eq(s.account.id, s.wish.accountId)).where(inArray(s.wish.id, wishIds)) : [],
  ]);
  for (const { club: c, sponsor } of clubs) {
    out.set(key("club", c.id), { kind: "gathering", of: "club", placeKind: isPlaceKind(c.placeKind) ? c.placeKind : null, placeName: c.placeName, weekday: c.weekday, startMinute: c.startMinute, sponsor });
  }
  for (const { wish: w, household, displayName, birthYear } of wishes) {
    out.set(key("wish", w.id), {
      kind: "gathering", of: "wish", code: w.code, household, firstName: w.showFirstName ? firstNameOf(displayName) : null, band: ageBand(ageFrom(birthYear)),
      loves: w.loves, play: w.play, game: w.game, line: w.line,
    });
    if (w.gameName) out.set(key("wish_name", w.id), { kind: "gathering", of: "wish_name", code: w.code, household, gameName: w.gameName, loves: w.loves });
  }
  return out;
}
export const subjectKey = key;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Carries out a person's decision on one gatherings item, inside the moderation room's own transaction.
 * Approve: a club is listed; a wish goes on the wish list; a name is shown with the game.
 * Remove: the club is kept off the list; the wish stays inside its household; the name is refused and the family
 * may offer another. Each change is made only from the state that waits for review, so a decision on something
 * that has since been withdrawn changes nothing. Returns the name for the audit line.
 */
export async function decideGathering(tx: Tx, item: { kind: string; refId: string }, approved: boolean, now: Date): Promise<string> {
  if (item.kind === "club") {
    const [c] = await tx.update(s.cinemaClub).set(approved ? { status: "listed", listedAt: now } : { status: "removed", closedAt: now })
      .where(and(eq(s.cinemaClub.id, item.refId), eq(s.cinemaClub.status, "in_review"))).returning({ name: s.cinemaClub.placeName });
    return c?.name ?? "a club listing";
  }
  if (item.kind === "wish") {
    const [w] = await tx.update(s.wish).set(approved ? { status: afterReview(true), listedAt: now } : { status: afterReview(false) })
      .where(and(eq(s.wish.id, item.refId), eq(s.wish.status, "in_review"))).returning({ code: s.wish.code });
    return w ? `wish ${w.code}` : "a wish";
  }
  const [w] = await tx.update(s.wish).set(approved ? { nameStatus: nameAfterReview(true), namedAt: now } : { nameStatus: nameAfterReview(false) })
    .where(and(eq(s.wish.id, item.refId), eq(s.wish.status, "built"), eq(s.wish.nameStatus, "in_review"))).returning({ code: s.wish.code });
  return w ? `the name for wish ${w.code}` : "a name for a wish";
}
