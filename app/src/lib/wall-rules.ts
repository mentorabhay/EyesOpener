// Eyes Opener: Focus Wall: the rules. Pure functions, unit-tested; src/lib/wall.ts reads and writes with them.
/**
 * Focus Wall: the rules. Pure functions, unit-tested; src/lib/wall.ts reads and writes with them.
 *
 * Each month the community brings one picture into focus, tile by tile.
 * - A tile is earned by a finished practice day: the day's training minutes that the programme set were reached
 *   (the same test the show-up league uses). One profile, one day, one tile. Minutes above the day's goal earn
 *   nothing more, and neither does a second session, a score or a level.
 * - The picture is drawn by code (src/components/together/wall-art.tsx): no photograph, no upload, no outside file.
 *   Every calendar month has its own picture, the same one each year.
 * - A wall has as many tiles as the community finished practice days in the month before, so a month like the last
 *   one brings the whole picture into focus. It is never under 32 tiles and never over 512.
 */
import { finishedDay } from "@/lib/league";

/** The twelve pictures, January first. The drawing for each key is in wall-art.tsx, its name in src/copy/wall.ts. */
export const ARTWORKS = ["lighthouse", "sailboat", "balloons", "swing", "sunrise", "reef", "rain", "train", "owl", "kite", "rocket", "tent"] as const;
export type ArtKey = (typeof ARTWORKS)[number];

export const isMonth = (month: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
/** The picture for a month ("YYYY-MM"). Every month has one. */
export const artworkFor = (month: string): ArtKey => ARTWORKS[(Number(month.slice(5, 7)) - 1 + 12) % 12] ?? ARTWORKS[0];

export const monthOf = (day: string) => day.slice(0, 7);
/** The month before or after, as "YYYY-MM". */
export function shiftMonth(month: string, by: number): string {
  const n = Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 + by;
  return `${String(Math.floor(n / 12)).padStart(4, "0")}-${String((n % 12) + 1).padStart(2, "0")}`;
}

/** Sizes a wall can have: each is a grid twice as wide as it is tall (8 by 4 up to 32 by 16). */
export const WALL_SIZES = [32, 72, 128, 200, 288, 392, 512] as const;
/** Tiles for a new month's wall: the largest size the practice days finished last month would have filled. */
export function tilesFor(finishedLastMonth: number): number {
  let size: number = WALL_SIZES[0];
  for (const s of WALL_SIZES) if (s <= finishedLastMonth) size = s;
  return size;
}

/** The grid a wall is laid out on: twice as wide as tall, with room for every tile. */
export function wallGrid(tiles: number): { cols: number; rows: number } {
  const n = Math.max(1, Math.floor(tiles)), cols = Math.max(2, Math.round(Math.sqrt(n * 2)));
  return { cols, rows: Math.ceil(n / cols) };
}

/** Does this day earn a tile? Only a finished practice day does (see `finishedDay` in the league's rules). */
export const earnsTile = (day: { trainMinutes: number; trainGoal: number }) => finishedDay(day);

export interface PracticeDay { profileId: string; day: string; trainMinutes: number; trainGoal: number }
export const tileKey = (t: { profileId: string; day: string }) => `${t.profileId}|${t.day}`;

/**
 * The tiles that are owed: one for every finished practice day that has none yet, oldest day first.
 * `have` holds the keys (`tileKey`) of the days that already have a tile. A day can never be owed two.
 */
export function tilesDue(days: readonly PracticeDay[], have: ReadonlySet<string>): { profileId: string; day: string }[] {
  const seen = new Set(have), due: { profileId: string; day: string }[] = [];
  for (const d of [...days].sort((a, b) => a.day.localeCompare(b.day) || a.profileId.localeCompare(b.profileId))) {
    if (!earnsTile(d) || seen.has(tileKey(d))) continue;
    seen.add(tileKey(d));
    due.push({ profileId: d.profileId, day: d.day });
  }
  return due;
}

/** A tile that is still out of focus, picked by chance so the picture appears in scattered pieces. Null when all are in focus. */
export function freeTile(taken: ReadonlySet<number>, tiles: number, rand: () => number): number | null {
  const free: number[] = [];
  for (let i = 0; i < tiles; i++) if (!taken.has(i)) free.push(i);
  return free.length ? free[Math.min(free.length - 1, Math.floor(rand() * free.length))] : null;
}

/** How much of a wall is in focus, counting only tiles that are on it. */
export function focusOf(tiles: number, sharp: Iterable<number>) {
  const on = new Set([...sharp].filter((i) => Number.isInteger(i) && i >= 0 && i < tiles));
  return { sharp: on, count: on.size, share: tiles > 0 ? on.size / tiles : 0, complete: tiles > 0 && on.size >= tiles };
}
