/**
 * Cinema Club: volunteers host a weekly film hour at a school or a library, with one screen and a box of glasses.
 * The rules, pure. Tested in cinema-club.test.ts; src/lib/cinema-club-data.ts reads and writes.
 *
 * The rules, in one place:
 * 1. The host kit (the guide, the session sheet and the group screen) opens for a guardian or co-guardian, for an
 *    approved sponsor and for a verified counsellor. Not for a cheer seat and never on a device in child mode:
 *    hosting is a grown-up's job.
 * 2. A club keeps no record of who came. The app has no way to add a child to a club, and the session sheet is
 *    paper with no place for a name.
 * 3. The group screen shows the same full picture to both eyes (GROUP_CONTRAST). A dimmed picture for one eye is a
 *    dose set for one child from that child's own check-up, on a measured screen and seat; a room of children has
 *    neither, and some of them have no weaker eye at all. So the club hour is company. It is nobody's practice,
 *    it is not recorded for anyone, and it uses none of anyone's training minutes.
 * 4. The group screen keeps the cinema's chapters and eye breaks, and stops by itself after one hour of film
 *    (the library's "60 minutes a day in chapters": six chapters of ten minutes).
 * 5. A club may be listed, so that a family can find one. A listing is made by an approved sponsor or by staff,
 *    shows the name of a public place and a time and nothing else, and one made by a sponsor waits for a person at
 *    Eyes Opener. A private home is never listed: the kinds of place have no home among them, and a name that reads
 *    like a home, or carries a phone number or a link, is refused before anyone sees it.
 */
import { BREAK_SECONDS, CHAPTER_SECONDS, chapterAt, STANDARD_PLAN, type ChapterPlan, type ChapterState } from "@/components/film/chapters";
import { isGuardianSeat, type Seat } from "@/lib/roles";

/* ───────────── who may open the host kit ───────────── */

/** A guardian or co-guardian, outside child mode. A staff test household sits in a guardian's seat. */
export const mayOpenKit = (m: { seat: Seat | null; childMode: boolean }) => isGuardianSeat(m.seat) && !m.childMode;

/* ───────────── the group screen ───────────── */

/**
 * The stronger-eye contrast of the group screen: full, the same as the app uses for anyone whose eyes it has not
 * measured ("full contrast for both eyes"). The red and cyan parts of the picture are then equal, so every pair of
 * glasses shows both eyes the same film whichever way round it is worn, and a child with no glasses misses nothing.
 */
export const GROUP_CONTRAST = 1;
/** One club hour: this many chapters of film, each followed by an eye break. */
export const CLUB_CHAPTERS = 6;
export const CLUB_SECONDS = CLUB_CHAPTERS * CHAPTER_SECONDS;

export interface ClubScreen extends ChapterState {
  /** The club hour of film has been watched. The film stays stopped. */
  over: boolean;
  /** Seconds of film left in the hour. */
  left: number;
}

/**
 * Where the group screen stands: which chapter, whether a break is due, and whether the hour is over.
 * In: seconds of film watched (the clock stands still while the film is paused or a break runs) and the breaks taken.
 * `plan` is the cinema's standard plan for every host. Only a staff test household gets a shorter one (`planFor`),
 * to try a break and the end of the hour without waiting; the hour is always CLUB_CHAPTERS chapters of the plan.
 */
export function clubScreen(watchedSeconds: number, breaksTaken: number, plan: ChapterPlan = STANDARD_PLAN): ClubScreen {
  const all = CLUB_CHAPTERS * Math.max(1, plan.chapterSeconds);
  const watched = Math.max(0, Math.min(all, Number.isFinite(watchedSeconds) ? watchedSeconds : 0));
  const state = chapterAt(watched, breaksTaken, plan, all);
  const over = watched >= all;
  return { ...state, chapter: Math.min(CLUB_CHAPTERS, state.chapter), breakDue: !over && state.breakDue, over, left: all - watched };
}

/** The numbers the guide and the sheet print, so no page types them in. */
export const CLUB_PLAN = { chapters: CLUB_CHAPTERS, chapterMinutes: CHAPTER_SECONDS / 60, breakSeconds: BREAK_SECONDS, filmMinutes: CLUB_SECONDS / 60 } as const;

/* ───────────── listings ───────────── */

/** The kinds of place a club can be listed at. There is no home in this list, and none can be added by a form. */
export const PLACE_KINDS = ["school", "library", "community_hall", "clinic"] as const;
export type PlaceKind = (typeof PLACE_KINDS)[number];
export const isPlaceKind = (v: unknown): v is PlaceKind => typeof v === "string" && (PLACE_KINDS as readonly string[]).includes(v);

export const CLUB_STATUSES = ["in_review", "listed", "removed", "closed"] as const;
export type ClubStatus = (typeof CLUB_STATUSES)[number];
export const clubStatus = (v: string): ClubStatus => ((CLUB_STATUSES as readonly string[]).includes(v) ? (v as ClubStatus) : "removed");

export const PLACE_NAME = { min: 6, max: 80 } as const;
/** A club hour may start between 8 in the morning and 7 in the evening, on a quarter hour. */
export const START_MIN = 8 * 60, START_MAX = 19 * 60, START_STEP = 15;
/** Listings one sponsor may have open (waiting or listed) at a time. */
export const SPONSOR_CLUBS_MAX = 12;

export type PlaceProblem = "length" | "home" | "contact";

const HOME = [
  /\b(my|our|his|her|their|your)\s+(own\s+)?(home|house|flat|place|apartment|residence|bungalow|villa)\b/i,
  /\b(flat|apartment|apt|house|bungalow|villa|plot|door)\s*(no\.?|number|#)?\s*[a-z]?-?\d/i,
  /\bresiden(ce|tial)\b/i,
  /\b(at|in)\s+(home|a home|someone's home)\b/i,
  /\b(living|drawing)\s+room\b/i,
  /\b\w+['’]s\s+(home|house|flat|place|apartment)\b/i,
];
const CONTACT = [/\d[\d\s-]{5,}\d/, /@/, /\bhttps?:/i, /\bwww\./i];

/**
 * Why a place name is refused, or null. A listing shows the name of a public place and nothing else, so a name that
 * reads like someone's home, or that carries a phone number, an email address or a link, does not go through.
 * This catches the plain cases; the person who approves the listing is the second check.
 */
export function placeProblem(name: string): PlaceProblem | null {
  const text = name.replace(/\s+/g, " ").trim();
  if (text.length < PLACE_NAME.min || text.length > PLACE_NAME.max) return "length";
  if (CONTACT.some((p) => p.test(text))) return "contact";
  return HOME.some((p) => p.test(text)) ? "home" : null;
}

export const isWeekday = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 6;
export const isStart = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= START_MIN && v <= START_MAX && v % START_STEP === 0;

/** Every start a form offers, in minutes after midnight. */
export const startChoices = (): number[] => Array.from({ length: (START_MAX - START_MIN) / START_STEP + 1 }, (_, i) => START_MIN + i * START_STEP);

/** "5:30 pm". */
export function timeText(startMinute: number): string {
  const h = Math.floor(startMinute / 60), m = startMinute % 60;
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

export type ListingRefusal = "not_approved" | "too_many" | "kind" | "day" | "time" | PlaceProblem;

export interface ListingInput {
  /** Who is listing: an approved sponsor's person, or staff. */
  by: "sponsor" | "staff";
  /** For a sponsor: the Eyes Opener team has approved it. */
  approved: boolean;
  /** For a sponsor: listings it already has waiting or listed. */
  open: number;
  placeKind: unknown; placeName: string; weekday: unknown; startMinute: unknown;
}

/** Why a listing is refused, or null when it may be saved. */
export function listingRefusal(i: ListingInput): ListingRefusal | null {
  if (i.by === "sponsor" && !i.approved) return "not_approved";
  if (i.by === "sponsor" && i.open >= SPONSOR_CLUBS_MAX) return "too_many";
  if (!isPlaceKind(i.placeKind)) return "kind";
  if (!isWeekday(i.weekday)) return "day";
  if (!isStart(i.startMinute)) return "time";
  return placeProblem(i.placeName);
}

/** A listing by staff is shown at once: staff are the people who approve. One by a sponsor waits for a person. */
export const firstStatus = (by: "sponsor" | "staff"): ClubStatus => (by === "staff" ? "listed" : "in_review");

export interface ClubRow { placeName: string; weekday: number; startMinute: number }

/** The order clubs are shown in: by day of the week from Monday, then by time, then by name. Never by size: a club has none. */
export function inWeekOrder<T extends ClubRow>(clubs: readonly T[]): T[] {
  const fromMonday = (d: number) => (d + 6) % 7;
  return [...clubs].sort((a, b) => fromMonday(a.weekday) - fromMonday(b.weekday) || a.startMinute - b.startMinute || a.placeName.localeCompare(b.placeName));
}
