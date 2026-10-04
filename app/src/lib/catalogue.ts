/**
 * Reads and writes the status of library items (see status.ts). Server only.
 * One row of `setting` holds every change staff made; an item that is not in it has the default status.
 */
import { cache } from "react";
import { eq } from "drizzle-orm";
import { exercises, games } from "@/data";
import { db, schema } from "@/db";
import { cleanStatusMap, DEFAULT_STATUS, itemKey, recommendedStatus, type ItemKind, type Status, type StatusMap } from "./status";

export const STATUS_KEY = "library_status";
/** Every film session uses this slug: the two-eye cinema is one item. */
export const CINEMA_SLUG = "two-eye-cinema";

/** The statuses staff have set. Read once per request. */
export const readStatuses = cache(async (): Promise<StatusMap> => {
  const [row] = await db.select({ value: schema.setting.value }).from(schema.setting).where(eq(schema.setting.key, STATUS_KEY)).limit(1);
  return cleanStatusMap(row?.value);
});

async function write(map: Record<string, Status>) {
  const value = cleanStatusMap(map);
  await db.insert(schema.setting).values({ key: STATUS_KEY, value })
    .onConflictDoUpdate({ target: schema.setting.key, set: { value, updatedAt: new Date() } });
}

/** Every item staff can set a status for. */
export const libraryItems = (): { kind: ItemKind; slug: string; name: string }[] => [
  ...games.map((g) => ({ kind: "game" as const, slug: g.slug, name: g.name })),
  ...exercises.map((e) => ({ kind: "exercise" as const, slug: e.slug, name: e.name })),
  { kind: "film" as const, slug: CINEMA_SLUG, name: "Two-eye cinema" },
];

const known = (kind: ItemKind, slug: string) => libraryItems().some((i) => i.kind === kind && i.slug === slug);

/** Sets one item's status. False when the item is not in the library. */
export async function setItemStatus(kind: ItemKind, slug: string, status: Status): Promise<boolean> {
  if (!known(kind, slug)) return false;
  const [row] = await db.select({ value: schema.setting.value }).from(schema.setting).where(eq(schema.setting.key, STATUS_KEY)).limit(1);
  const map = cleanStatusMap(row?.value);
  if (status === DEFAULT_STATUS) delete map[itemKey(kind, slug)]; else map[itemKey(kind, slug)] = status;
  await write(map);
  return true;
}

/** Sets every item at once: all open, or each to the status the evidence framework recommends. Returns how many are not open afterwards. */
export async function setAllStatuses(to: "open" | "recommended"): Promise<number> {
  const map: Record<string, Status> = {};
  if (to === "recommended") for (const i of libraryItems()) map[itemKey(i.kind, i.slug)] = recommendedStatus(i.kind, i.slug);
  await write(map);
  return Object.keys(cleanStatusMap(map)).length;
}
