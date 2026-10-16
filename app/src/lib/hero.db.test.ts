/**
 * Draw Your Hero against a real database: who may keep, choose and delete a hero, what is stored, and that one
 * household can never reach another's. It makes two throwaway households and removes them.
 * Where no database with the current tables answers (the checks on GitHub have none), it is skipped.
 */
import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => { try { process.loadEnvFile(".env.local"); } catch { /* no file: the default address is used */ } });

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { starter } from "@/games/hero";
import { memberCan, type MemberAction, type Seat } from "@/lib/roles";
import type { Member } from "@/lib/session";
import { CAMERA_CONSENT_VERSION, allowCamera, cameraConsent, currentHero, dropHero, heroesOf, keepHero, pickHero, stopCamera } from "./hero";
import { HERO_KEEP } from "./hero-rules";

const up = await db.execute(sql`select sprite from hero limit 0`).then(() => true, () => false);
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });
const x = crypto.randomBytes(4).toString("hex");

describe.skipIf(!up)("Draw Your Hero, in the database", () => {
  type Row<T extends { $inferSelect: unknown }> = T["$inferSelect"];
  let A: Row<typeof s.account>, B: Row<typeof s.account>, kid: Row<typeof s.profile>, grown: Row<typeof s.profile>, other: Row<typeof s.profile>, gA: Row<typeof s.appUser>, gB: Row<typeof s.appUser>;
  /** The part of a signed-in household these functions read. */
  const member = (account: Row<typeof s.account>, user: Row<typeof s.appUser>, profile: Row<typeof s.profile>, seat: Seat = "guardian", childMode = false) =>
    ({ account, user, profile, profiles: [profile], seat, childMode, can: (a: MemberAction) => memberCan(seat, a, childMode) }) as unknown as Member;
  const cat = () => JSON.parse(JSON.stringify(starter("cat"))) as unknown;

  beforeAll(async () => {
    [A, B] = await db.insert(s.account).values([{ displayName: `zz-hero-a-${x}` }, { displayName: `zz-hero-b-${x}` }]).returning();
    [gA, gB] = await db.insert(s.appUser).values([
      { email: `zz-hero-a-${x}@eyesopener.test`, displayName: `Guardian A ${x}`, accountId: A.id, seat: "guardian" },
      { email: `zz-hero-b-${x}@eyesopener.test`, displayName: `Guardian B ${x}`, accountId: B.id, seat: "guardian" },
    ]).returning();
    [kid, grown, other] = await db.insert(s.profile).values([
      { accountId: A.id, displayName: `Kid${x}`, kind: "child", birthYear: 2019 }, { accountId: A.id, displayName: `Grown${x}`, kind: "adult" },
      { accountId: B.id, displayName: `Other${x}`, kind: "child", birthYear: 2018 },
    ]).returning();
    await db.insert(s.consent).values({ profileId: other.id, accountId: B.id, userId: gB.id, kind: "parental", textVersion: "test" });
  });
  afterAll(async () => { await db.delete(s.account).where(inArray(s.account.id, [A.id, B.id])); });

  const parent = () => member(A, gA, kid), childMode = () => member(A, gA, kid, "guardian", true), cheer = () => member(A, gA, kid, "circle");

  it("needs the household's parental consent before a child's hero is kept", async () => {
    expect(await keepHero(parent(), { sprite: cat(), via: "starter" })).toEqual({ ok: false, why: "consent" });
    expect(await keepHero(member(A, gA, grown), { sprite: cat(), via: "starter" })).toEqual({ ok: true });
    await db.insert(s.consent).values({ profileId: kid.id, accountId: A.id, userId: gA.id, kind: "parental", textVersion: "test" });
    expect(await keepHero(parent(), { sprite: cat(), via: "starter" })).toEqual({ ok: true });
  });

  it("stores the grid and nothing else that the browser sent", async () => {
    const sent = { ...(cat() as object), name: "Aarav", photo: "data:image/png;base64,AAAA" };
    expect(await keepHero(parent(), { sprite: sent, via: "photo" })).toEqual({ ok: true });
    const [row] = await db.select().from(s.hero).where(and(eq(s.hero.profileId, kid.id), eq(s.hero.isCurrent, true)));
    expect(Object.keys(row.sprite as object).sort()).toEqual(["h", "rows", "v", "w"]);
    expect(JSON.stringify(row.sprite)).not.toMatch(/Aarav|data:/);
    expect(await currentHero(parent())).toEqual(starter("cat"));
  });

  it("refuses a shape that is not a hero, and a way of making one that it does not know", async () => {
    for (const sprite of [null, "x", { v: 1, w: 48, h: 48, rows: [] }, { v: 1, w: 4000, h: 4000, rows: [[0, 4000]] }]) expect(await keepHero(parent(), { sprite, via: "screen" })).toEqual({ ok: false, why: "shape" });
    expect(await keepHero(parent(), { sprite: cat(), via: "upload" })).toEqual({ ok: false, why: "shape" });
  });

  it("makes the newest hero the one that plays, and keeps the earlier ones", async () => {
    const before = await heroesOf(parent());
    expect(await keepHero(parent(), { sprite: JSON.parse(JSON.stringify(starter("robot"))), via: "screen" })).toEqual({ ok: true });
    const after = await heroesOf(parent());
    expect(after.length).toBe(before.length + 1);
    expect(after.filter((h) => h.isCurrent).length).toBe(1);
    expect(after[0].isCurrent).toBe(true);
    expect(after[0].sprite).toEqual(starter("robot"));
  });

  it("needs a guardian at the device to make or delete one: not child mode, not a cheer seat", async () => {
    const [h] = await heroesOf(parent());
    for (const m of [childMode(), cheer()]) {
      expect(await keepHero(m, { sprite: cat(), via: "starter" })).toEqual({ ok: false, why: "guardian" });
      expect(await dropHero(m, h.id)).toBe(false);
    }
    expect((await heroesOf(parent())).some((k) => k.id === h.id)).toBe(true);
  });

  it("lets a child in child mode choose which hero plays, or the game's own runner", async () => {
    const list = await heroesOf(childMode()), old = list[list.length - 1];
    expect(await pickHero(childMode(), old.id)).toBe(true);
    expect((await heroesOf(parent())).filter((h) => h.isCurrent).map((h) => h.id)).toEqual([old.id]);
    expect(await pickHero(childMode(), null)).toBe(true);
    expect(await currentHero(parent())).toBeNull();
    expect(await pickHero(cheer(), old.id)).toBe(false);
    expect(await pickHero(parent(), list[0].id)).toBe(true);
  });

  it("needs the camera consent for the camera, given and withdrawn by a guardian only", async () => {
    expect(await keepHero(parent(), { sprite: cat(), via: "camera" })).toEqual({ ok: false, why: "camera" });
    expect(await allowCamera(childMode())).toBe(false);
    expect(await allowCamera(cheer())).toBe(false);
    expect(await cameraConsent(parent())).toBeNull();
    expect(await allowCamera(parent())).toBe(true);
    expect(await allowCamera(parent())).toBe(true);
    const rows = await db.select().from(s.consent).where(and(eq(s.consent.profileId, kid.id), eq(s.consent.kind, "camera"), isNull(s.consent.revokedAt)));
    expect(rows).toMatchObject([{ accountId: A.id, userId: gA.id, textVersion: CAMERA_CONSENT_VERSION }]);
    expect((await cameraConsent(parent()))?.by).toBe(gA.displayName);
    expect(await keepHero(parent(), { sprite: cat(), via: "camera" })).toEqual({ ok: true });
    /* The consent is this profile's: it opens nothing for another profile, in this household or any other. */
    expect(await cameraConsent(member(A, gA, grown))).toBeNull();
    expect(await cameraConsent(member(B, gB, other))).toBeNull();
    expect(await stopCamera(childMode())).toBe(false);
    expect(await stopCamera(parent())).toBe(true);
    expect(await keepHero(parent(), { sprite: cat(), via: "camera" })).toEqual({ ok: false, why: "camera" });
    /* Withdrawing the camera leaves the parental consent standing. */
    expect(await keepHero(parent(), { sprite: cat(), via: "photo" })).toEqual({ ok: true });
  });

  it("shows a hero to its own household only: another family cannot read, choose or delete it", async () => {
    const theirs = member(B, gB, other), [mine] = await heroesOf(parent());
    expect(await heroesOf(theirs)).toEqual([]);
    expect(await currentHero(theirs)).toBeNull();
    expect(await pickHero(theirs, mine.id)).toBe(false);
    expect(await dropHero(theirs, mine.id)).toBe(false);
    /* Nor can a brother or sister's profile in the same household: a hero belongs to one profile. */
    const sibling = member(A, gA, grown), before = await heroesOf(sibling);
    expect(before.some((h) => h.id === mine.id)).toBe(false);
    expect(await dropHero(sibling, mine.id)).toBe(false);
    expect((await heroesOf(parent())).some((h) => h.id === mine.id && h.isCurrent)).toBe(true);
    expect(await pickHero(parent(), "not-an-id")).toBe(false);
  });

  it("keeps twelve heroes at most, and passes the game to the newest one left when the one playing is deleted", async () => {
    let n = (await heroesOf(parent())).length;
    for (; n < HERO_KEEP; n++) expect(await keepHero(parent(), { sprite: cat(), via: "starter" })).toEqual({ ok: true });
    expect(await keepHero(parent(), { sprite: cat(), via: "starter" })).toEqual({ ok: false, why: "full" });
    const list = await heroesOf(parent());
    expect(list.length).toBe(HERO_KEEP);
    expect(await dropHero(parent(), list[0].id)).toBe(true);
    const left = await heroesOf(parent());
    expect(left.length).toBe(HERO_KEEP - 1);
    expect(left.filter((h) => h.isCurrent).map((h) => h.id)).toEqual([left[0].id]);
    expect(await dropHero(parent(), list[0].id)).toBe(false);
  });
});
