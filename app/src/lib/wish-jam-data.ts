/**
 * Reading and writing Wish Jam. Server only.
 *
 * - A household reaches only its own wishes: a profile id or a wish id from the browser is only ever matched
 *   against the member's own household.
 * - The public list is built by `toPublic` (src/lib/wish-jam.ts), which carries a code, an age band and the
 *   choices, and nothing else of the row. A wish is on it only after a person approved it, only while the
 *   guardian's consent for the child stands, and never from a staff test household.
 * - Free text (the short line, the game's name) passes the rules in wish-jam.ts and the hazard screen before it is
 *   stored, and waits in the moderation queue before anyone outside the household can read it.
 * - Staff steps hold no gate here: the page and the action call `requireStaff` first, and each write is audited.
 */
import { randomInt } from "node:crypto";
import { and, asc, desc, eq, exists, inArray, isNull, sql } from "drizzle-orm";
import { gameBySlug } from "@/data";
import { db, schema as s } from "@/db";
import { ageFrom } from "@/engine";
import { audit, type Viewer } from "@/lib/auth";
import { screenHazards } from "@/lib/community";
import type { Member } from "@/lib/session";
import {
  ageBand, CODE_ALPHABET, CODE_LENGTH, firstNameOf, isLibraryGame, isOpenWish, lineProblem, nameProblem, nameRefusal, nameStatus, staffStep,
  tidy, toPublic, wishRefusal, wishStatus,
  type AgeBand, type NameStatus, type PublicWish, type StaffStep, type TextProblem, type WishRefusal, type WishStatus,
} from "@/lib/wish-jam";

const W = s.wish;
type Scope = Pick<Member, "account" | "profiles" | "user" | "can" | "tester">;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const standing = (profileId: typeof W.profileId | typeof s.profile.id) =>
  db.select({ one: sql`1` }).from(s.consent).where(and(eq(s.consent.profileId, profileId), eq(s.consent.kind, "parental"), isNull(s.consent.revokedAt)));

/** Child profiles of the household whose guardian's consent stands. */
async function consentedChildren(m: Pick<Member, "account" | "profiles">): Promise<Set<string>> {
  const kids = m.profiles.filter((p) => p.kind === "child").map((p) => p.id);
  if (!kids.length) return new Set();
  const rows = await db.selectDistinct({ id: s.consent.profileId }).from(s.consent)
    .where(and(inArray(s.consent.profileId, kids), eq(s.consent.accountId, m.account.id), eq(s.consent.kind, "parental"), isNull(s.consent.revokedAt)));
  return new Set(rows.map((r) => r.id));
}

/* ───────────── the public list ───────────── */

/**
 * Every wish anyone may read, in the order they were approved. Each is the output of `toPublic`: no id, no
 * household, no profile. Left out: a wish of a child whose consent does not stand, of an archived profile, or of
 * a staff test household.
 */
export async function publicWishes(): Promise<PublicWish[]> {
  const rows = await db.select({ wish: W, displayName: s.profile.displayName, birthYear: s.profile.birthYear }).from(W)
    .innerJoin(s.profile, eq(s.profile.id, W.profileId)).innerJoin(s.account, eq(s.account.id, W.accountId))
    .where(and(inArray(W.status, ["listed", "matched", "built"]), isNull(s.profile.archivedAt), isNull(s.account.previewFor), eq(s.profile.kind, "child"), exists(standing(W.profileId))))
    .orderBy(asc(W.listedAt), asc(W.createdAt));
  return rows.flatMap((r) => toPublic(r.wish, { displayName: r.displayName, age: ageFrom(r.birthYear) }) ?? []);
}

/* ───────────── a household's own wishes ───────────── */

export interface OwnWish {
  id: string; profileId: string; child: string; code: string;
  loves: string; play: string; game: string; line: string; showFirstName: boolean;
  /** The first name the list shows, when the guardian chose to show one. */
  firstName: string | null;
  status: WishStatus; nameStatus: NameStatus | null; gameName: string | null;
  /** The library game staff tied to the wish, when it is in the library. */
  game_: { slug: string; name: string } | null;
  createdAt: Date;
  /** Still on its way: a child has one such wish at a time. */
  open: boolean;
  /** The guardian's consent for the child stands. Without it the wish is off the public list. */
  consented: boolean;
}

export interface WishChild { profileId: string; name: string; firstName: string | null; age: number | null; consented: boolean; hasOpen: boolean }

/** The household's wishes, newest first, and its children with whether each can have a new wish. */
export async function householdWishes(m: Pick<Member, "account" | "profiles">): Promise<{ wishes: OwnWish[]; children: WishChild[] }> {
  const [rows, consented] = await Promise.all([
    db.select().from(W).where(eq(W.accountId, m.account.id)).orderBy(desc(W.createdAt)),
    consentedChildren(m),
  ]);
  const wishes = rows.flatMap((r): OwnWish[] => {
    const child = m.profiles.find((p) => p.id === r.profileId);
    if (!child) return [];
    const tied = r.gameSlug ? gameBySlug(r.gameSlug) : undefined;
    return [{
      id: r.id, profileId: r.profileId, child: child.displayName, code: r.code, loves: r.loves, play: r.play, game: r.game, line: r.line, showFirstName: r.showFirstName,
      firstName: r.showFirstName ? firstNameOf(child.displayName) : null,
      status: wishStatus(r.status), nameStatus: nameStatus(r.nameStatus), gameName: r.gameName,
      game_: tied ? { slug: tied.slug, name: tied.name } : null, createdAt: r.createdAt, open: isOpenWish(r), consented: consented.has(r.profileId),
    }];
  });
  const children = m.profiles.filter((p) => p.kind === "child").map((p) => ({
    profileId: p.id, name: p.displayName, firstName: firstNameOf(p.displayName), age: ageFrom(p.birthYear), consented: consented.has(p.id),
    hasOpen: wishes.some((w) => w.profileId === p.id && w.open),
  }));
  return { wishes, children };
}

const newCode = () => Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");

export interface NewWish { profileId: string; loves: unknown; play: unknown; game: unknown; line: string; showFirstName: boolean }
export type WishResult =
  | { ok: true; id: string; code: string }
  | { ok: false; why: WishRefusal }
  | { ok: false; why: "text"; problem: TextProblem }
  | { ok: false; why: "hazard"; reasons: string[] };

/**
 * A guardian writes a wish for a child of the household. Everything is checked here again, whatever the form sent.
 * Nothing is stored unless every rule passes; then the wish waits for a person (`moderation_item` of kind "wish").
 */
export async function makeWish(m: Scope, input: NewWish): Promise<WishResult> {
  const profile = m.profiles.find((p) => p.id === input.profileId) ?? null;
  const consented = profile ? (await consentedChildren(m)).has(profile.id) : false;
  const line = tidy(input.line);
  /* who may, before what was typed: a seat that may not write learns nothing about the rules for the words */
  const first = wishRefusal({ canShare: m.can("share"), tester: m.tester, profile: profile && { kind: profile.kind, age: ageFrom(profile.birthYear) }, consented, hasOpen: false, loves: input.loves, play: input.play, game: input.game });
  if (first || !profile) return { ok: false, why: first ?? "not_found" };
  const problem = lineProblem(line, [profile.displayName, m.account.displayName]);
  if (problem) return { ok: false, why: "text", problem };
  const reasons = line ? await screenHazards(line) : [];
  if (reasons.length) return { ok: false, why: "hazard", reasons };

  return db.transaction(async (tx) => {
    /* one writer at a time for the child, so two taps cannot leave two wishes on their way */
    await tx.select({ id: s.profile.id }).from(s.profile).where(and(eq(s.profile.id, profile.id), eq(s.profile.accountId, m.account.id))).for("update");
    const mine = await tx.select({ status: W.status, nameStatus: W.nameStatus }).from(W).where(eq(W.profileId, profile.id));
    if (mine.some(isOpenWish)) return { ok: false as const, why: "already" as const };
    for (let attempt = 0; attempt < 6; attempt++) {
      const [row] = await tx.insert(W).values({
        accountId: m.account.id, profileId: profile.id, code: newCode(), loves: input.loves as string, play: input.play as string, game: input.game as string,
        line, showFirstName: input.showFirstName, createdBy: m.user.id,
      }).onConflictDoNothing({ target: W.code }).returning({ id: W.id, code: W.code });
      if (!row) continue;
      await tx.insert(s.moderationItem).values({ kind: "wish", refId: row.id, reason: "New Wish Jam wish from a family. Passed the hazard screen and the no-names rule; needs a person's approval." });
      return { ok: true as const, id: row.id, code: row.code };
    }
    throw new Error("no free wish code");
  });
}

/**
 * Review items that point at a wish. `only: "open"` removes what still waits (a name that goes with a wish taken
 * off the list). `only: "all"` removes every item, decided ones too: a wish a guardian takes back leaves nothing
 * behind that points at it. The decisions themselves stay in the audit log, by the wish's code.
 */
const dropReview = (tx: Tx, wishId: string, kinds: ("wish" | "wish_name")[], only: "open" | "all") =>
  tx.delete(s.moderationItem).where(and(inArray(s.moderationItem.kind, kinds), eq(s.moderationItem.refId, wishId), only === "open" ? eq(s.moderationItem.status, "open") : undefined));

/** A guardian takes a wish back. The row is deleted, with every review item that pointed at it. */
export async function withdrawWish(m: Scope, wishId: string): Promise<{ ok: true } | { ok: false; why: WishRefusal }> {
  if (!m.can("share")) return { ok: false, why: "not_allowed" };
  return db.transaction(async (tx) => {
    const gone = await tx.delete(W).where(and(eq(W.id, wishId), eq(W.accountId, m.account.id))).returning({ id: W.id });
    if (!gone.length) return { ok: false as const, why: "not_found" as const };
    await dropReview(tx, wishId, ["wish", "wish_name"], "all");
    return { ok: true as const };
  });
}

export type NameResult = { ok: true } | { ok: false; why: WishRefusal } | { ok: false; why: "text"; problem: TextProblem } | { ok: false; why: "hazard"; reasons: string[] };

/** A guardian types the name the child gives the built game. It waits for a person (`moderation_item` of kind "wish_name"). */
export async function offerName(m: Scope, wishId: string, typed: string): Promise<NameResult> {
  const [wish] = await db.select().from(W).where(and(eq(W.id, wishId), eq(W.accountId, m.account.id))).limit(1);
  const profile = wish ? m.profiles.find((p) => p.id === wish.profileId) ?? null : null;
  const consented = profile ? (await consentedChildren(m)).has(profile.id) : false;
  const refused = nameRefusal({ canShare: m.can("share"), consented, wish: wish && profile ? wish : null });
  if (refused || !wish || !profile) return { ok: false, why: refused ?? "not_found" };
  const name = tidy(typed);
  const problem = nameProblem(name, [profile.displayName, m.account.displayName]);
  if (problem) return { ok: false, why: "text", problem };
  const reasons = await screenHazards(name);
  if (reasons.length) return { ok: false, why: "hazard", reasons };
  return db.transaction(async (tx) => {
    /* "built, and no name waiting or approved" is tested again in the update, so two sends cannot both land */
    const [saved] = await tx.update(W).set({ gameName: name, nameStatus: "in_review" })
      .where(and(eq(W.id, wish.id), eq(W.accountId, m.account.id), eq(W.status, "built"), sql`${W.nameStatus} is distinct from 'in_review'`, sql`${W.nameStatus} is distinct from 'approved'`))
      .returning({ id: W.id });
    if (!saved) return { ok: false as const, why: "waiting" as const };
    await tx.insert(s.moderationItem).values({ kind: "wish_name", refId: wish.id, reason: "A name for a Wish Jam game. Passed the hazard screen and the no-names rule; needs a person's approval." });
    return { ok: true as const };
  });
}

/* ───────────── staff ───────────── */

export interface StaffWish {
  id: string; code: string; household: string; firstName: string | null; band: AgeBand | null;
  loves: string; play: string; game: string; line: string;
  status: WishStatus; nameStatus: NameStatus | null; gameName: string | null; gameSlug: string | null; isSample: boolean; listedAt: Date | null;
}

/**
 * The wishes staff move on: everything a person has approved. The household is named, as it is in the Households
 * room; the child is not, unless the family chose to show the first name.
 */
export async function staffWishes(): Promise<StaffWish[]> {
  const rows = await db.select({ wish: W, household: s.account.displayName, displayName: s.profile.displayName, birthYear: s.profile.birthYear }).from(W)
    .innerJoin(s.profile, eq(s.profile.id, W.profileId)).innerJoin(s.account, eq(s.account.id, W.accountId))
    .where(inArray(W.status, ["listed", "matched", "built"])).orderBy(asc(W.listedAt), asc(W.createdAt));
  return rows.map(({ wish: r, household, displayName, birthYear }) => ({
    id: r.id, code: r.code, household, firstName: r.showFirstName ? firstNameOf(displayName) : null, band: ageBand(ageFrom(birthYear)),
    loves: r.loves, play: r.play, game: r.game, line: r.line, status: wishStatus(r.status), nameStatus: nameStatus(r.nameStatus), gameName: r.gameName,
    gameSlug: r.gameSlug, isSample: r.isSample, listedAt: r.listedAt,
  }));
}

export type StepResult = { ok: true; code: string; to: WishStatus } | { ok: false; why: "not_allowed" | "bad_game" };

/**
 * Staff move a wish one step. "built" may carry the slug of a game that is already in the library; nothing is ever
 * added to the library from here. The step is taken only from a status it starts from, tested again in the update.
 */
export async function takeStaffStep(viewer: Viewer, wishId: string, step: StaffStep, gameSlug: string | null = null): Promise<StepResult> {
  if (gameSlug !== null && (step !== "built" || !isLibraryGame(gameSlug))) return { ok: false, why: "bad_game" };
  const now = new Date();
  const out = await db.transaction(async (tx) => {
    const [wish] = await tx.select({ id: W.id, status: W.status, code: W.code }).from(W).where(eq(W.id, wishId)).for("update");
    const to = wish ? staffStep(wish.status, step) : null;
    if (!wish || !to) return null;
    const set = step === "match" ? { status: to, matchedAt: now } : step === "unmatch" ? { status: to, matchedAt: null }
      : step === "built" ? { status: to, builtAt: now, gameSlug } : { status: to };
    await tx.update(W).set(set).where(eq(W.id, wish.id));
    /* a wish taken off the list takes its waiting name with it */
    if (step === "unlist") await dropReview(tx, wish.id, ["wish_name"], "open");
    return { code: wish.code, from: wish.status, to };
  });
  if (!out) return { ok: false, why: "not_allowed" };
  await audit(viewer, `admin.gatherings.wish.${step}`, wishId, { name: `wish ${out.code}`, from: out.from, to: out.to, ...(gameSlug ? { gameSlug } : {}) });
  return { ok: true, code: out.code, to: out.to };
}

/** Staff tie a built wish to a game that has since been added to the library, or untie it (null). */
export async function tieGame(viewer: Viewer, wishId: string, gameSlug: string | null): Promise<StepResult> {
  if (gameSlug !== null && !isLibraryGame(gameSlug)) return { ok: false, why: "bad_game" };
  const [row] = await db.update(W).set({ gameSlug }).where(and(eq(W.id, wishId), eq(W.status, "built"))).returning({ code: W.code });
  if (!row) return { ok: false, why: "not_allowed" };
  await audit(viewer, "admin.gatherings.wish.tie", wishId, { name: `wish ${row.code}`, gameSlug });
  return { ok: true, code: row.code, to: "built" };
}
