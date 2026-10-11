// Eyes Opener: The status of each thing in the library: who may use it. Pure rules, unit-tested.
/**
 * The status of each thing in the library: who may use it. Pure rules, unit-tested.
 * Staff set it in the Catalogue room of the admin console; `src/lib/catalogue.ts` stores it.
 *
 *  - open        everyone, inside the dose rules
 *  - counsellor  shown to everyone; opens for a member a linked counsellor has put on the matching plan
 *  - staff       hidden from members; staff can open it in their own test household
 *  - off         hidden from members; staff still see it, marked as off
 */
import { exerciseBySlug, gameBySlug, gameLevel, type Exercise } from "@/data";

export const STATUSES = ["open", "counsellor", "staff", "off"] as const;
export type Status = (typeof STATUSES)[number];
export const ITEM_KINDS = ["game", "exercise", "film"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];
/** What staff changed, by `kind:slug`. An item that is not listed has the default status. */
export type StatusMap = Readonly<Record<string, Status>>;

/** Everything is open until staff say otherwise (set by the owner, 5 October 2026). */
export const DEFAULT_STATUS: Status = "open";

export const itemKey = (kind: ItemKind, slug: string) => `${kind}:${slug}`;
export const isStatus = (v: unknown): v is Status => (STATUSES as readonly unknown[]).includes(v);

/** Level of an exercise, read from its "who it is for" line the same way a game's is. */
export const exerciseLevel = (e: Exercise): 0 | 1 | 2 => Number(/level (\d)/.exec(e.for)?.[1] ?? 0) as 0 | 1 | 2;

/**
 * The status the evidence framework recommends: counsellor-led for level 2 (squint, after concussion, after stroke),
 * open for the rest. The Catalogue room shows it beside each item, so staff can see where they have left it.
 */
export function recommendedStatus(kind: ItemKind, slug: string): Status {
  const level = kind === "game" ? (gameBySlug(slug) ? gameLevel(gameBySlug(slug)!) : 0) : kind === "exercise" ? (exerciseBySlug(slug) ? exerciseLevel(exerciseBySlug(slug)!) : 0) : 0;
  return level >= 2 ? "counsellor" : "open";
}

export const statusOf = (map: StatusMap, kind: ItemKind, slug: string): Status => map[itemKey(kind, slug)] ?? DEFAULT_STATUS;

/** May this person see the item in a list? Members never see "staff" or "off"; a staff tester sees everything. */
export const isListed = (status: Status, tester: boolean) => tester || status === "open" || status === "counsellor";

/** Cleans a stored value: keeps only known keys' shapes and known statuses, and drops entries equal to the default. */
export function cleanStatusMap(value: unknown): Record<string, Status> {
  const out: Record<string, Status> = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    if (/^(game|exercise|film):[a-z0-9-]{1,80}$/.test(key) && isStatus(v) && v !== DEFAULT_STATUS) out[key] = v;
  }
  return out;
}

/** The "who it is for" line without its level note: the status chip says that part now. */
export const forWhom = (line: string) => line.replace(/\s*·\s*level \d(, counsellor plan)?/i, "").trim();
