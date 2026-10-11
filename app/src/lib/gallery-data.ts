// Eyes Opener: Locked Gallery: reading the active profile's gallery and keeping its marks. Server only. The rules are in gallery.ts.
/**
 * Locked Gallery: reading the active profile's gallery and keeping its marks. Server only. The rules are in gallery.ts.
 *
 * Privacy. The gallery is worked out from one profile's own check-up results and practice days, and it is shown
 * only inside that profile's household. Every query here is scoped by `m.profile.id`; no function takes an id from
 * the browser, and nothing here is read by a counsellor, a sponsor or staff.
 *
 * A mark (`gallery_unlock`) is written here, from the rows, when the page is read. No action writes one, so no
 * press can reach a picture. A mark is never removed: a later result that is worse leaves the gallery as it was.
 */
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { GALLERY_ITEMS, effortOf, effortProgress, latestDepth, latestFaint, reached, type DepthResult, type FaintResult, type GalleryItem, type Side } from "@/lib/gallery";
import { startOfDay } from "@/lib/league";
import type { Member } from "@/lib/session";

export type Shown = GalleryItem & {
  /** When the member's own results or practice days first reached it. Null while they have not. */
  reachedAt: Date | null;
  /** For an effort trophy: how far along it is. */
  progress?: { done: number; of: number };
};

export interface GalleryView {
  items: Shown[];
  /** The latest Depth check-up, or null when none was taken. */
  depth: DepthResult | null;
  /** The latest Faint letters result of each eye the faint pictures are meant for. */
  faint: { eye: Side; value: number | null }[];
  weakEye: Side | null;
  effort: { days: number; weeks: number };
}

/** The facts the gallery is worked out from: the profile's own rows and nothing else. */
async function factsOf(profileId: string) {
  const T = s.testResult, D = s.daySummary;
  const [results, days] = await Promise.all([
    db.select({ testKey: T.testKey, eye: T.eye, value: T.value, note: T.note, takenAt: T.takenAt }).from(T)
      .where(and(eq(T.profileId, profileId), inArray(T.testKey, ["stereo", "contrast"]))).orderBy(asc(T.takenAt)),
    db.select({ day: D.day, trainMinutes: D.trainMinutes, trainGoal: D.trainGoal }).from(D).where(eq(D.profileId, profileId)),
  ]);
  const depth: DepthResult[] = results.filter((r) => r.testKey === "stereo").map((r) => ({ value: r.value, note: r.note, takenAt: r.takenAt }));
  const faint: FaintResult[] = results.filter((r) => r.testKey === "contrast").map((r) => ({ eye: r.eye, value: r.value, takenAt: r.takenAt }));
  return { depth, faint, days };
}

/**
 * Brings the profile's marks up to date with its rows and returns them by slug. Safe to run any number of times:
 * a mark that is already there is left exactly as it is.
 */
export async function syncGallery(profileId: string, weakEye: Side | null) {
  const G = s.galleryUnlock;
  const facts = await factsOf(profileId);
  const now = reached({ ...facts, weakEye, startOfDay });
  const have = await db.select({ slug: G.itemSlug, at: G.unlockedAt }).from(G).where(eq(G.profileId, profileId));
  const missing = now.filter((r) => !have.some((h) => h.slug === r.slug));
  if (missing.length) {
    await db.insert(G).values(missing.map((r) => ({ profileId, itemSlug: r.slug, unlockedAt: r.at }))).onConflictDoNothing();
  }
  const marks = new Map<string, Date>([...missing.map((r) => [r.slug, r.at] as const), ...have.map((h) => [h.slug, h.at] as const)]);
  return { facts, marks };
}

/** The active profile's gallery. Reading it also keeps its marks. */
export async function galleryFor(m: Member): Promise<GalleryView> {
  const weakEye = m.eye?.weakEye ?? null;
  const { facts, marks } = await syncGallery(m.profile.id, weakEye);
  const effort = effortOf(facts.days);
  return {
    items: GALLERY_ITEMS.map((item): Shown => ({
      ...item, reachedAt: marks.get(item.slug) ?? null,
      ...(item.kind === "days" || item.kind === "weeks" ? { progress: effortProgress(item, effort) } : {}),
    })),
    depth: latestDepth(facts.depth),
    faint: latestFaint(facts.faint, weakEye),
    weakEye,
    effort: { days: effort.days.length, weeks: effort.weeks.length },
  };
}
