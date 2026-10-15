/**
 * Draw Your Hero: reading and writing a profile's heroes. Server only. The rules are in hero-rules.ts.
 *
 * Privacy. A hero is a child's own drawing reduced to a grid of squares. It is shown only inside the child's own
 * household and is never shared with the community, so it is not moderated. Every query here is scoped by the
 * active profile of the signed-in household (`m.profile.id`): no function takes a profile id from the browser,
 * none reads another household's heroes, and none joins `hero` to anything a counsellor, a sponsor or staff reads.
 * A hero id sent by the browser is only ever used together with `m.profile.id`.
 *
 * What is stored is the shape after `cleanSprite`: the picture it was traced from never reaches the server.
 */
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/db";
import { cleanSprite, type Sprite } from "@/games/hero";
import { mayJoin } from "@/lib/community";
import type { Member } from "@/lib/session";
import { isHeroVia, keepBlock, mayAllowCamera, mayDropHero, mayPickHero, type HeroBlock } from "./hero-rules";

/** The version of the words a guardian agrees to when allowing the camera (src/copy/hero.ts, `camera`). */
export const CAMERA_CONSENT_VERSION = "hero-2026-10";

const mine = (m: Member) => eq(s.hero.profileId, m.profile.id);
const liveCamera = (m: Member) =>
  and(eq(s.consent.profileId, m.profile.id), eq(s.consent.accountId, m.account.id), eq(s.consent.kind, "camera"), isNull(s.consent.revokedAt));

export interface KeptHero { id: string; sprite: Sprite; isCurrent: boolean; createdAt: Date }

/** The active profile's heroes, newest first. A stored row that is not a hero's shape is left out. */
export async function heroesOf(m: Member): Promise<KeptHero[]> {
  const rows = await db.select().from(s.hero).where(mine(m)).orderBy(desc(s.hero.createdAt));
  return rows.flatMap((r) => { const sprite = cleanSprite(r.sprite); return sprite ? [{ id: r.id, sprite, isCurrent: r.isCurrent, createdAt: r.createdAt }] : []; });
}

/** The hero the active profile plays as, or null when it has none or has chosen the game's own runner. */
export async function currentHero(m: Member): Promise<Sprite | null> {
  const [row] = await db.select({ sprite: s.hero.sprite }).from(s.hero).where(and(mine(m), eq(s.hero.isCurrent, true))).orderBy(desc(s.hero.createdAt)).limit(1);
  return row ? cleanSprite(row.sprite) : null;
}

/** The camera consent that stands for the active profile, with who gave it. Null when there is none. */
export async function cameraConsent(m: Member) {
  const [row] = await db.select({ grantedAt: s.consent.grantedAt, by: s.appUser.displayName }).from(s.consent)
    .leftJoin(s.appUser, eq(s.appUser.id, s.consent.userId))
    .where(liveCamera(m)).orderBy(desc(s.consent.grantedAt)).limit(1);
  return row ?? null;
}

/** Records this guardian's consent to use the camera for the active profile, unless one already stands. */
export async function allowCamera(m: Member): Promise<boolean> {
  if (!mayAllowCamera(m.can("consent"))) return false;
  if (!(await cameraConsent(m))) await db.insert(s.consent).values({ profileId: m.profile.id, accountId: m.account.id, userId: m.user.id, kind: "camera", textVersion: CAMERA_CONSENT_VERSION });
  return true;
}

export async function stopCamera(m: Member): Promise<boolean> {
  if (!mayAllowCamera(m.can("consent"))) return false;
  await db.update(s.consent).set({ revokedAt: new Date() }).where(liveCamera(m));
  return true;
}

export type KeepResult = { ok: true } | { ok: false; why: HeroBlock };

/**
 * Keeps a new hero for the active profile and makes it the one that plays. `input` is whatever the browser sent:
 * the shape is checked and rewritten here, and nothing else from the browser is stored.
 */
export async function keepHero(m: Member, input: { sprite: unknown; via: unknown }): Promise<KeepResult> {
  const sprite = cleanSprite(input.sprite), via = isHeroVia(input.via) ? input.via : null;
  const [[{ kept }], parental, camera] = await Promise.all([
    db.select({ kept: count() }).from(s.hero).where(mine(m)),
    mayJoin(m),
    via === "camera" ? cameraConsent(m) : null,
  ]);
  const why = keepBlock({
    guardianHere: m.can("share"), child: m.profile.kind === "child", parental,
    via: via ?? "starter", cameraAllowed: !!camera, shapeOk: !!sprite && !!via, kept,
  });
  if (why || !sprite) return { ok: false, why: why ?? "shape" };
  await db.transaction(async (tx) => {
    await tx.update(s.hero).set({ isCurrent: false }).where(and(mine(m), eq(s.hero.isCurrent, true)));
    await tx.insert(s.hero).values({ profileId: m.profile.id, sprite, isCurrent: true });
  });
  return { ok: true };
}

const Id = z.guid();

/** Chooses which kept hero plays. `id` null means the game's own runner. An id that is not this profile's changes nothing. */
export async function pickHero(m: Member, id: string | null): Promise<boolean> {
  if (!mayPickHero(m.can("train"))) return false;
  if (id !== null && !Id.safeParse(id).success) return false;
  return db.transaction(async (tx) => {
    if (id !== null) {
      const [own] = await tx.select({ id: s.hero.id }).from(s.hero).where(and(mine(m), eq(s.hero.id, id)));
      if (!own) return false;
    }
    await tx.update(s.hero).set({ isCurrent: false }).where(and(mine(m), eq(s.hero.isCurrent, true)));
    if (id !== null) await tx.update(s.hero).set({ isCurrent: true }).where(and(mine(m), eq(s.hero.id, id)));
    return true;
  });
}

/** Deletes one of this profile's heroes. When it was the one playing, the newest hero left takes its place. */
export async function dropHero(m: Member, id: string): Promise<boolean> {
  if (!mayDropHero(m.can("share")) || !Id.safeParse(id).success) return false;
  return db.transaction(async (tx) => {
    const [gone] = await tx.delete(s.hero).where(and(mine(m), eq(s.hero.id, id))).returning({ wasCurrent: s.hero.isCurrent });
    if (!gone) return false;
    if (gone.wasCurrent) {
      const [next] = await tx.select({ id: s.hero.id }).from(s.hero).where(mine(m)).orderBy(desc(s.hero.createdAt)).limit(1);
      if (next) await tx.update(s.hero).set({ isCurrent: true }).where(and(mine(m), eq(s.hero.id, next.id)));
    }
    return true;
  });
}
