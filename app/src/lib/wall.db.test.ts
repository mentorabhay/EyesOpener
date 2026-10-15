/**
 * The Focus Wall's rule against a real database: one finished practice day, one tile, however the days are counted.
 * It makes a throwaway household and a wall for a month long past, touches nobody else's rows and removes what it made.
 * Where no database with the current tables answers (the checks on GitHub have none), it is skipped.
 */
import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => { try { process.loadEnvFile(".env.local"); } catch { /* no file: the default address is used */ } });

import { and, eq, inArray, sql } from "drizzle-orm";
import { wall as words } from "@/copy/wall";
import { db, schema as s } from "@/db";
import { ensureWall, settleTiles, wallOf } from "./wall";

const up = await db.execute(sql`select day from focus_tile limit 0`).then(() => true, () => false);
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const x = crypto.randomBytes(4).toString("hex");
/* A month no real wall will ever have, different on every run so two runs cannot meet. */
const MONTH = `19${String(10 + (parseInt(x, 16) % 80))}-03`, day = (d: number) => `${MONTH}-${String(d).padStart(2, "0")}`, END = day(31);

describe.skipIf(!up)("the Focus Wall, in the database", () => {
  let home: string, staffHome: string, p1: string, p2: string, tester: string;
  const mine = () => [p1, p2, tester];
  const tiles = async () => {
    const wall = await wallOf(MONTH);
    return wall ? db.select().from(s.focusTile).where(eq(s.focusTile.wallId, wall.id)) : [];
  };
  const practise = (profileId: string, d: number, trainMinutes: number, trainGoal: number) =>
    db.insert(s.daySummary).values({ profileId, day: day(d), trainMinutes, trainGoal })
      .onConflictDoUpdate({ target: [s.daySummary.profileId, s.daySummary.day], set: { trainMinutes, trainGoal } });

  beforeAll(async () => {
    const [a, b] = await db.insert(s.account).values([{ displayName: `zz-wall-${x}` }, { displayName: `zz-wall-staff-${x}`, previewFor: crypto.randomUUID() }]).returning();
    home = a.id; staffHome = b.id;
    const made = await db.insert(s.profile).values([
      { accountId: home, displayName: `One${x}`, kind: "child", birthYear: 2019 }, { accountId: home, displayName: `Two${x}`, kind: "adult" },
      { accountId: staffHome, displayName: `Tester${x}`, kind: "adult" },
    ]).returning();
    [p1, p2, tester] = made.map((p) => p.id);
    await practise(p1, 1, 60, 60);   // finished
    await practise(p1, 2, 90, 30);   // finished, with an hour more than asked
    await practise(p1, 3, 20, 60);   // not finished
    await practise(p1, 4, 45, 0);    // no minutes set
    await practise(p2, 1, 30, 30);   // finished
    await practise(tester, 1, 60, 60); // a staff member's test household
  });

  afterAll(async () => {
    await db.delete(s.focusWall).where(eq(s.focusWall.month, MONTH));
    await db.delete(s.account).where(inArray(s.account.id, [home, staffHome]));
  });

  it("opens a month's wall once, with that month's picture, drawn by IOpener", async () => {
    const wall = await ensureWall(MONTH);
    expect(wall).toMatchObject({ month: MONTH, title: words.art.balloons.title, artist: words.artist, pictureUrl: null, tiles: 32 });
    expect((await ensureWall(MONTH)).id).toBe(wall.id);
  });

  it("gives each finished practice day one tile, and nothing to an unfinished day or a day with no minutes set", async () => {
    expect(await settleTiles(MONTH, { today: END, profileIds: mine() })).toBe(3);
    const got = await tiles();
    expect(got.map((t) => `${t.profileId === p1 ? "one" : "two"} ${t.day}`).sort()).toEqual([`one ${day(1)}`, `one ${day(2)}`, `two ${day(1)}`]);
    expect(new Set(got.map((t) => t.idx)).size).toBe(3);
    for (const t of got) { expect(t.idx).toBeGreaterThanOrEqual(0); expect(t.idx).toBeLessThan(32); }
  });

  it("leaves a staff member's test household out", async () => {
    expect((await tiles()).some((t) => t.profileId === tester)).toBe(false);
  });

  it("adds nothing when the days are counted again, and nothing for more minutes on a day that has its tile", async () => {
    expect(await settleTiles(MONTH, { today: END, profileIds: mine() })).toBe(0);
    await practise(p1, 1, 90, 60);
    await practise(p2, 1, 89, 30);
    expect(await settleTiles(MONTH, { today: END, profileIds: mine() })).toBe(0);
    expect(await settleTiles(MONTH, { today: END })).toBe(0);
    expect((await tiles()).length).toBe(3);
  });

  it("gives the tile when a day is finished later, and never for a day that has not come", async () => {
    await practise(p1, 3, 60, 60);
    await practise(p2, 9, 30, 30);
    expect(await settleTiles(MONTH, { today: day(8), profileIds: mine() })).toBe(1);
    expect(await settleTiles(MONTH, { today: END, profileIds: mine() })).toBe(1);
    expect((await tiles()).length).toBe(5);
  });

  it("is refused by the database itself: a second tile for the same profile and day cannot be written", async () => {
    const wall = (await wallOf(MONTH))!, taken = new Set((await tiles()).map((t) => t.idx));
    const idx = Array.from({ length: 32 }, (_, i) => i).find((i) => !taken.has(i))!;
    await expect(db.insert(s.focusTile).values({ wallId: wall.id, idx, profileId: p1, day: day(1) })).rejects.toThrow();
    expect((await tiles()).length).toBe(5);
  });

  it("stops when every tile is in focus: a finished day adds nothing to a whole picture", async () => {
    const wall = (await wallOf(MONTH))!, have = await tiles();
    await db.update(s.focusWall).set({ tiles: Math.max(...have.map((t) => t.idx)) + 1 }).where(eq(s.focusWall.id, wall.id));
    const free = Math.max(...have.map((t) => t.idx)) + 1 - have.length;
    /* More finished days than there are tiles left: 42 of them, for at most 31 free tiles. */
    for (let d = 10; d <= 30; d++) for (const p of [p1, p2]) await practise(p, d, 30, 30);
    expect(await settleTiles(MONTH, { today: END, profileIds: mine() })).toBe(free);
    expect(await settleTiles(MONTH, { today: END, profileIds: mine() })).toBe(0);
    const after = await tiles();
    expect(after.length).toBe(have.length + free);
    expect(after.every((t) => t.idx < Math.max(...have.map((h) => h.idx)) + 1)).toBe(true);
  });

  it("does nothing for a month that has not begun, or for nobody", async () => {
    expect(await settleTiles("2999-01", { today: END })).toBe(0);
    expect(await wallOf("2999-01")).toBeNull();
    expect(await settleTiles(MONTH, { today: END, profileIds: [] })).toBe(0);
    expect((await db.select().from(s.focusTile).where(and(eq(s.focusTile.profileId, tester)))).length).toBe(0);
  });
});
