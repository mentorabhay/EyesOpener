/**
 * Light the Map: a map of India that lights up as families join. The rules, pure.
 * Tested in map.test.ts; src/lib/map-data.ts reads and writes.
 *
 * Privacy decides the design:
 * 1. Only the first three digits of a PIN code are ever asked for, sent or stored. Three digits name a sorting
 *    district of India Post: a whole district, or a large part of a big city. No street, no locality and no
 *    post office can be worked out from them. The full six digits never leave the family's device.
 * 2. An area is shown to anyone only once MAP_MIN_HOUSEHOLDS households are on it (the same minimum as the sponsor
 *    counts). Below that it is not on the map, it has no count, and its own households are told only that it is
 *    not lit yet. The total across India follows the same rule.
 * 3. Joining is a guardian's choice and can be taken back at any time. Leaving deletes the row.
 * 4. A staff test household is never on the map.
 * 5. The lamp-lighter of an area is the household that has been on it longest. It is worked out, not stored, so it
 *    passes on by itself when that household leaves. It carries one power: to pick a welcome line from a fixed
 *    list for the families that join the area later. There is no free text, and no name is shown to anyone.
 *
 * The drawing is a grid of tiles made in the app: one tile for each group of PIN codes that share their first two
 * digits by state (the table below). It is a simple picture, not a survey map, and no map service is called.
 */
import { SPONSOR_MIN_GROUP } from "@/lib/roles";

/** Households an area needs before it is shown to anyone. */
export const MAP_MIN_HOUSEHOLDS = SPONSOR_MIN_GROUP;

/* ───────────── regions ───────────── */

export interface Region {
  key: string;
  /** The states and territories whose PIN codes start in this range. */
  name: string;
  /** First two digits of the PIN codes in this region, both ends included. */
  from: number;
  to: number;
  /** Where the tile sits in the drawing: column and row, north at the top, west on the left. Not to scale. */
  col: number;
  row: number;
}

/**
 * The first two digits of a PIN code name a postal region; the first three name a sorting district.
 * Source: the table of PIN prefixes in "Postal Index Number", https://en.wikipedia.org/wiki/Postal_Index_Number
 * (read on 5 October 2026). A region here lists every state and territory whose codes start in its range,
 * because a few territories sit inside a neighbour's range (Goa is 403, Puducherry 605, Sikkim 737).
 * Codes that start with 9 belong to the Army Postal Service and name no place. Ranges that the table does not
 * give (10, 29, 35, 54, 55, 86 to 89) are in no region.
 */
export const REGIONS: readonly Region[] = [
  { key: "jk", name: "Jammu and Kashmir, Ladakh", from: 18, to: 19, col: 2, row: 0 },
  { key: "pb", name: "Punjab, Chandigarh", from: 14, to: 16, col: 1, row: 1 },
  { key: "hp", name: "Himachal Pradesh", from: 17, to: 17, col: 2, row: 1 },
  { key: "rj", name: "Rajasthan", from: 30, to: 34, col: 0, row: 2 },
  { key: "hr", name: "Haryana", from: 12, to: 13, col: 1, row: 2 },
  { key: "dl", name: "Delhi", from: 11, to: 11, col: 2, row: 2 },
  { key: "up", name: "Uttar Pradesh, Uttarakhand", from: 20, to: 28, col: 3, row: 2 },
  { key: "br", name: "Bihar, Jharkhand", from: 80, to: 85, col: 4, row: 2 },
  { key: "as", name: "Assam", from: 78, to: 78, col: 5, row: 2 },
  { key: "ne", name: "Arunachal Pradesh, Manipur, Meghalaya, Mizoram, Nagaland, Tripura", from: 79, to: 79, col: 6, row: 2 },
  { key: "gj", name: "Gujarat, Dadra and Nagar Haveli, Daman and Diu", from: 36, to: 39, col: 0, row: 3 },
  { key: "mp", name: "Madhya Pradesh", from: 45, to: 48, col: 1, row: 3 },
  { key: "cg", name: "Chhattisgarh", from: 49, to: 49, col: 2, row: 3 },
  { key: "od", name: "Odisha", from: 75, to: 77, col: 3, row: 3 },
  { key: "wb", name: "West Bengal, Sikkim, Andaman and Nicobar Islands", from: 70, to: 74, col: 4, row: 3 },
  { key: "mh", name: "Maharashtra, Goa", from: 40, to: 44, col: 1, row: 4 },
  { key: "tg", name: "Telangana", from: 50, to: 50, col: 2, row: 4 },
  { key: "ap", name: "Andhra Pradesh", from: 51, to: 53, col: 3, row: 4 },
  { key: "ka", name: "Karnataka", from: 56, to: 59, col: 1, row: 5 },
  { key: "kl", name: "Kerala, Lakshadweep", from: 67, to: 69, col: 1, row: 6 },
  { key: "tn", name: "Tamil Nadu, Puducherry", from: 60, to: 66, col: 2, row: 6 },
];

export const GRID = { cols: 7, rows: 7 } as const;

/** The region a three-digit area is in, or null when its first two digits are not allocated. */
export function regionOf(area: string): Region | null {
  const two = Number(area.slice(0, 2));
  return REGIONS.find((r) => two >= r.from && two <= r.to) ?? null;
}

/* ───────────── the area a family gives ───────────── */

export type AreaProblem = "format" | "army" | "unknown";
export type ParsedArea = { ok: true; area: string; region: Region } | { ok: false; why: AreaProblem };

/**
 * Reads what a guardian typed as the first three digits of a PIN code. Exactly three digits are accepted:
 * a longer number is refused, not shortened, so a full PIN code is never taken in by accident.
 */
export function parseArea(typed: string): ParsedArea {
  const digits = typed.replace(/\s+/g, "");
  if (!/^\d{3}$/.test(digits)) return { ok: false, why: "format" };
  if (digits[0] === "9") return { ok: false, why: "army" };
  const region = regionOf(digits);
  return region ? { ok: true, area: digits, region } : { ok: false, why: "unknown" };
}

/** True for a stored area: three digits in a known region. */
export const isArea = (area: string) => parseArea(area).ok && area.length === 3;

/* ───────────── what may be shown ───────────── */

/** A count of households, or null when it covers too few to show. */
export const shown = (households: number, min = MAP_MIN_HOUSEHOLDS): number | null => (households >= min ? households : null);

export interface LitArea { area: string; households: number; region: Region }

/** The areas that may be shown: those with enough households, in a known region. Ordered by area, never by size. */
export function litAreas(counts: readonly { area: string; households: number }[], min = MAP_MIN_HOUSEHOLDS): LitArea[] {
  return counts.flatMap((c) => {
    const region = regionOf(c.area);
    return region && /^\d{3}$/.test(c.area) && c.households >= min ? [{ area: c.area, households: c.households, region }] : [];
  }).sort((a, b) => a.area.localeCompare(b.area));
}

export interface Tile extends Region {
  /** Lit areas inside this region. 0 means the tile is not lit. */
  lit: number;
  /** Households in those lit areas. */
  households: number;
}

/** The drawing: every region as a tile, with what is lit inside it. Areas that are not lit add nothing. */
export function tiles(lit: readonly LitArea[]): Tile[] {
  return REGIONS.map((r) => {
    const inside = lit.filter((a) => a.region.key === r.key);
    return { ...r, lit: inside.length, households: inside.reduce((n, a) => n + a.households, 0) };
  });
}

/* ───────────── the lamp-lighter and the welcome ───────────── */

/**
 * The household that has been on an area longest. Two that joined at the same instant are told apart by id, so
 * the answer is the same on every read.
 */
export function lampLighter<P extends { accountId: string; joinedAt: Date }>(places: readonly P[]): P | null {
  return [...places].sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime() || a.accountId.localeCompare(b.accountId))[0] ?? null;
}

/** The welcome lines a lamp-lighter can choose from. The words are in src/copy/map.ts. Nobody types a welcome. */
export const WELCOME_KEYS = ["hello", "not_alone", "small_steps", "first_week", "wave"] as const;
export type WelcomeKey = (typeof WELCOME_KEYS)[number];
export const isWelcomeKey = (v: unknown): v is WelcomeKey => typeof v === "string" && (WELCOME_KEYS as readonly string[]).includes(v);

export type MapRefusal = "not_allowed" | "tester" | "already" | "not_on_map" | "not_first" | "bad_line";

/** May this household put itself on the map? Joining is a guardian's choice; a staff test household never joins. */
export function joinRefusal(i: { canShare: boolean; tester: boolean; onMap: boolean }): MapRefusal | null {
  if (!i.canShare) return "not_allowed";
  if (i.tester) return "tester";
  return i.onMap ? "already" : null;
}

/**
 * May this household set the welcome line of its area? Only the lamp-lighter, and only to a line from the list
 * (or to none). Being first gives nothing else.
 */
export function welcomeRefusal(i: { canShare: boolean; accountId: string; onMap: boolean; first: string | null; line: string }): MapRefusal | null {
  if (!i.canShare) return "not_allowed";
  if (!i.onMap) return "not_on_map";
  if (i.first !== i.accountId) return "not_first";
  return i.line === "" || isWelcomeKey(i.line) ? null : "bad_line";
}

/**
 * The welcome a household sees: the line the lamp-lighter of its area chose, when that is another household.
 * A lamp-lighter is not welcomed by itself, and a line that is not on the list is never shown.
 */
export function welcomeFor(accountId: string, first: { accountId: string; welcome: string | null } | null): WelcomeKey | null {
  if (!first || first.accountId === accountId) return null;
  return isWelcomeKey(first.welcome) ? first.welcome : null;
}
