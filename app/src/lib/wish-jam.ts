/**
 * Wish Jam: developers and students build a game for one child's wish; the child tries it and names it.
 * The rules, pure. Tested in wish-jam.test.ts; src/lib/wish-jam-data.ts reads and writes.
 *
 * The rules, in one place:
 * 1. A guardian or co-guardian writes the wish for a child of the household, from a guided form: what the child
 *    loves, what the child likes to do in a game and what kind of game, each chosen from a fixed list, and one
 *    short line in their own words. Not a cheer seat, not a device in child mode, not a staff test household.
 *    A child profile only, aged 4 or more (no screen sessions under 4), and only while a guardian's consent stands.
 * 2. The short line never carries a name of the family, a school or a class, a phone number, an email address or a
 *    link (`lineProblem`). It then passes the hazard screen, and the whole wish waits for a person at Eyes Opener.
 *    Nobody outside the household reads any of it before that person approves it.
 * 3. The public list shows a wish by a short code, an age band and the choices. It shows the child's first name
 *    only when the guardian ticked that, and never more than the first word of the profile's name. It never shows
 *    a family name, a school, a city or a picture: the form has no field for any of them.
 * 4. One wish at a time for a child. The guardian can take a wish back at any time; it is then deleted.
 *    If consent is taken back, the wish leaves the public list until consent returns.
 * 5. A builder writes in through the public enquiry form (kind "wish_jam"). Builders have no accounts. Staff mark a
 *    wish as taken on, and as built. No game is added to the library by this: staff add it by the normal route,
 *    and may then tie the wish to that game so the family gets a link to it.
 * 6. When the wish is built, the guardian types the name the child gives the game. The name passes the same rules
 *    and the same review as the short line. It is shown outside the household only once approved.
 * 7. Wishes are never ranked. The list is in the order they were approved.
 */
import { gameBySlug } from "@/data";
import { promiseWording } from "@/lib/discovery";

/* ───────────── the lists a guardian chooses from ───────────── */

/** What the child loves. Words for each: src/copy/wish-jam.ts. */
export const LOVES = ["trains", "animals", "dinosaurs", "space", "sea", "cricket", "football", "cars", "music", "dance", "cooking", "gardens", "birds", "robots", "stories", "festivals"] as const;
export type Love = (typeof LOVES)[number];
/** What the child likes to do in a game. */
export const PLAYS = ["catch", "steer", "find", "match", "build", "race"] as const;
export type Play = (typeof PLAYS)[number];
/**
 * The kind of game wished for, by the families of the open game kit (docs/CONTRACT.md, "Ink carries the therapy"):
 * two-eye balanced play, pulling the eyes together, depth, and games with no glasses. "any" leaves it to the builder.
 */
export const GAME_KINDS = ["any", "two_eye", "pull_in", "depth", "no_glasses"] as const;
export type GameKind = (typeof GAME_KINDS)[number];

const among = <T extends string>(list: readonly T[]) => (v: unknown): v is T => typeof v === "string" && (list as readonly string[]).includes(v);
export const isLove = among(LOVES), isPlay = among(PLAYS), isGameKind = among(GAME_KINDS);

export const LINE_MAX = 120;
export const NAME = { min: 2, max: 24, words: 4 } as const;
/** Screen sessions start at this age, so a wish for a game does too. */
export const WISH_MIN_AGE = 4;

/* ───────────── what a guardian may type ───────────── */

export type TextProblem = "length" | "contact" | "name" | "place" | "promise" | "shape";

const CONTACT = [/\d[\d\s-]{4,}\d/, /@/, /\bhttps?:/i, /\bwww\./i];
const PLACE = /\b(school|college|academy|vidyalaya|vidyalay|kindergarten|nursery|playschool|pre-?school|tuition|coaching|class\s*\d+|std\.?\s*\d+|standard\s*\d+|grade\s*\d+)\b/i;
/** Words in a household's or a profile's name that name nobody. */
const NOT_A_NAME = new Set(["family", "household", "home", "house", "the", "and", "our", "test", "sample"]);

/** The words of the names a text must not carry: three letters or more, without words that name nobody. */
export function nameWords(names: readonly string[]): string[] {
  const words = names.flatMap((n) => n.toLowerCase().split(/[^\p{L}\p{M}]+/u)).filter((w) => w.length >= 3 && !NOT_A_NAME.has(w));
  return [...new Set(words)];
}
const carriesName = (text: string, names: readonly string[]) => {
  const said = new Set(text.toLowerCase().split(/[^\p{L}\p{M}]+/u));
  return nameWords(names).some((w) => said.has(w));
};

/**
 * Why the short line is refused, or null. An empty line is fine: the choices alone make a wish.
 * `names` are the child's name and the household's name. This catches the plain cases; the hazard screen and the
 * person who approves the wish come after it.
 */
export function lineProblem(line: string, names: readonly string[]): TextProblem | null {
  const text = line.replace(/\s+/g, " ").trim();
  if (text.length > LINE_MAX) return "length";
  if (!text) return null;
  if (CONTACT.some((p) => p.test(text))) return "contact";
  if (carriesName(text, names)) return "name";
  if (PLACE.test(text)) return "place";
  return promiseWording(text) ? "promise" : null;
}

/**
 * Why a name for the game is refused, or null. Letters of any script (with their marks), digits and spaces, a few
 * words at most, and nobody's name.
 */
export function nameProblem(name: string, names: readonly string[]): TextProblem | null {
  const text = name.replace(/\s+/g, " ").trim();
  if (text.length < NAME.min || text.length > NAME.max) return "length";
  if (!/^[\p{L}\p{N}][\p{L}\p{M}\p{N} '’-]*$/u.test(text) || text.split(" ").length > NAME.words || /\d{4,}/.test(text)) return "shape";
  if (carriesName(text, names)) return "name";
  if (PLACE.test(text)) return "place";
  return promiseWording(text) ? "promise" : null;
}

/** How the line and the name are stored: one line, single spaces. */
export const tidy = (text: string) => text.replace(/\s+/g, " ").trim();

/* ───────────── who the wish is for ───────────── */

export const AGE_BANDS = ["4 to 6", "7 to 9", "10 to 12", "13 to 17"] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

/** The band a builder is shown, never the age. Null when the year of birth is not known, or the age is outside the bands. */
export function ageBand(age: number | null): AgeBand | null {
  if (age === null || age < WISH_MIN_AGE || age > 17) return null;
  return age <= 6 ? "4 to 6" : age <= 9 ? "7 to 9" : age <= 12 ? "10 to 12" : "13 to 17";
}

/** The first word of a profile's name, letters only, and nothing when there is none. A family name is never part of it. */
export function firstNameOf(displayName: string): string | null {
  const first = /\p{L}[\p{L}\p{M}'’-]*/u.exec(displayName.trim())?.[0] ?? "";
  return first.length >= 2 ? first.slice(0, 20) : null;
}

/* ───────────── where a wish stands ───────────── */

export const WISH_STATUSES = ["in_review", "listed", "matched", "built", "blocked"] as const;
export type WishStatus = (typeof WISH_STATUSES)[number];
export const wishStatus = (v: string): WishStatus => ((WISH_STATUSES as readonly string[]).includes(v) ? (v as WishStatus) : "blocked");
export type NameStatus = "in_review" | "approved" | "blocked";
export const nameStatus = (v: string | null): NameStatus | null => (v === "in_review" || v === "approved" || v === "blocked" ? v : null);

export interface WishState { status: string; nameStatus: string | null }

/** A wish that is still on its way: waiting, listed, taken on, or built and not yet named. A child has one at a time. */
export const isOpenWish = (w: WishState) => {
  const s = wishStatus(w.status);
  return s === "in_review" || s === "listed" || s === "matched" || (s === "built" && nameStatus(w.nameStatus) !== "approved");
};

/** True for a wish that may be shown outside its household: a person approved it, and it was not taken off the list. */
export const isPublicStatus = (status: string) => { const s = wishStatus(status); return s === "listed" || s === "matched" || s === "built"; };

export type PublicState = "waiting" | "matched" | "built" | "named";
/** What the public list says about a wish. Null for a wish that is not shown. */
export function publicState(w: WishState): PublicState | null {
  const s = wishStatus(w.status);
  if (s === "listed") return "waiting";
  if (s === "matched") return "matched";
  if (s === "built") return nameStatus(w.nameStatus) === "approved" ? "named" : "built";
  return null;
}

export interface PublicWish {
  code: string;
  /** The child's first name, only when the guardian chose to show it. */
  firstName: string | null;
  band: AgeBand | null;
  loves: Love; play: Play; game: GameKind;
  line: string;
  state: PublicState;
  /** The name the child gave the game, once a person approved it. */
  gameName: string | null;
  isSample: boolean;
}

export interface WishRow extends WishState {
  code: string; loves: string; play: string; game: string; line: string; showFirstName: boolean; gameName: string | null; isSample: boolean;
}

/**
 * A wish as anyone may read it. Everything else about the row stays behind: its id, the household, the profile,
 * who wrote it and when. Null when the wish is not public or holds a choice that is not on the lists.
 */
export function toPublic(w: WishRow, child: { displayName: string; age: number | null }): PublicWish | null {
  const state = publicState(w);
  if (!state || !isLove(w.loves) || !isPlay(w.play) || !isGameKind(w.game)) return null;
  return {
    code: w.code, firstName: w.showFirstName ? firstNameOf(child.displayName) : null, band: ageBand(child.age),
    loves: w.loves, play: w.play, game: w.game, line: w.line, state,
    gameName: state === "named" ? w.gameName : null, isSample: w.isSample,
  };
}

/* ───────────── making a wish, naming the game ───────────── */

export type WishRefusal = "not_allowed" | "tester" | "not_found" | "not_child" | "too_young" | "needs_consent" | "already" | "bad_choice" | "not_built" | "waiting" | "named";

export interface WishInput {
  /** `m.can("share")`: a guardian or co-guardian, outside child mode. */
  canShare: boolean;
  /** A staff member's own test household. */
  tester: boolean;
  /** The profile as the server found it in the member's own household. Null when it is not there. */
  profile: { kind: "adult" | "child"; age: number | null } | null;
  /** A guardian's consent for the child stands. */
  consented: boolean;
  /** The child already has a wish on its way. */
  hasOpen: boolean;
  loves: unknown; play: unknown; game: unknown;
}

/** Why a wish cannot be made, or null. */
export function wishRefusal(i: WishInput): WishRefusal | null {
  if (!i.canShare) return "not_allowed";
  if (i.tester) return "tester";
  if (!i.profile) return "not_found";
  if (i.profile.kind !== "child") return "not_child";
  if (i.profile.age !== null && i.profile.age < WISH_MIN_AGE) return "too_young";
  if (!i.consented) return "needs_consent";
  if (i.hasOpen) return "already";
  return isLove(i.loves) && isPlay(i.play) && isGameKind(i.game) ? null : "bad_choice";
}

/** Why a name cannot be offered for the game, or null. Only for a built wish, and one name at a time. */
export function nameRefusal(i: { canShare: boolean; consented: boolean; wish: WishState | null }): WishRefusal | null {
  if (!i.canShare) return "not_allowed";
  if (!i.wish) return "not_found";
  if (!i.consented) return "needs_consent";
  if (wishStatus(i.wish.status) !== "built") return "not_built";
  const n = nameStatus(i.wish.nameStatus);
  return n === "in_review" ? "waiting" : n === "approved" ? "named" : null;
}

/* ───────────── what staff do ───────────── */

export const STAFF_STEPS = ["match", "unmatch", "built", "unlist"] as const;
export type StaffStep = (typeof STAFF_STEPS)[number];
export const isStaffStep = among(STAFF_STEPS);

const STEP_FROM: Record<StaffStep, readonly WishStatus[]> = { match: ["listed"], unmatch: ["matched"], built: ["listed", "matched"], unlist: ["listed", "matched", "built"] };
const STEP_TO: Record<StaffStep, WishStatus> = { match: "matched", unmatch: "listed", built: "built", unlist: "blocked" };

/** The status a staff step leads to, or null when the wish is not in a state the step starts from. */
export const staffStep = (status: string, step: StaffStep): WishStatus | null => (STEP_FROM[step].includes(wishStatus(status)) ? STEP_TO[step] : null);
/** The steps staff may take from here. */
export const staffSteps = (status: string): StaffStep[] => STAFF_STEPS.filter((s) => staffStep(status, s) !== null);

/** A game a wish may be tied to: one that is in the library. Tying a wish adds nothing to the library. */
export const isLibraryGame = (slug: string) => !!gameBySlug(slug);

/** What a person's decision does to a wish that waited, and to a name that waited. */
export const afterReview = (approved: boolean): WishStatus => (approved ? "listed" : "blocked");
export const nameAfterReview = (approved: boolean): NameStatus => (approved ? "approved" : "blocked");

/* ───────────── the code a builder quotes ───────────── */

/** Letters and digits that cannot be mistaken for each other: no 0, O, 1 or I. */
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;
export const isWishCode = (v: string) => v.length === CODE_LENGTH && [...v].every((ch) => CODE_ALPHABET.includes(ch));
