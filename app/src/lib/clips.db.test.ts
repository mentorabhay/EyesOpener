// Eyes Opener: The clips against a real database: what a finished clip stores and for whom, the baseline rule, who may change.
/**
 * The clips against a real database: what a finished clip stores and for whom, the baseline rule, who may change
 * the household's screen, and that one household can never reach another's. It makes two throwaway households and
 * removes them. Where no database with the current tables answers (the checks on GitHub have none), it is skipped.
 */
import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => { try { process.loadEnvFile(".env.local"); } catch { /* no file: the default address is used */ } });

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { memberCan, type MemberAction, type Seat } from "@/lib/roles";
import type { Member } from "@/lib/session";
import { allowClipCamera, cameraAllowed, clipContext, clipPerson, clipResults, doneToday, lastRuns, saveClip } from "./clips";

const up = await db.execute(sql`select code from clip_run limit 0`).then(() => true, () => false);
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });
const x = crypto.randomBytes(4).toString("hex");

describe.skipIf(!up)("the clips, in the database", () => {
  type Row<T extends { $inferSelect: unknown }> = T["$inferSelect"];
  let A: Row<typeof s.account>, B: Row<typeof s.account>, kid: Row<typeof s.profile>, grown: Row<typeof s.profile>, other: Row<typeof s.profile>, gA: Row<typeof s.appUser>, gB: Row<typeof s.appUser>;

  /** The part of a signed-in household these functions read, with the screen and the eye settings as they stand now. */
  async function member(account: Row<typeof s.account>, user: Row<typeof s.appUser>, profile: Row<typeof s.profile>, seat: Seat = "guardian", childMode = false) {
    const [device] = await db.select().from(s.device).where(and(eq(s.device.accountId, account.id), eq(s.device.kind, "web"))).orderBy(desc(s.device.calibratedAt)).limit(1);
    const [eye] = await db.select().from(s.eyeProfile).where(and(eq(s.eyeProfile.profileId, profile.id), eq(s.eyeProfile.isCurrent, true))).orderBy(desc(s.eyeProfile.createdAt)).limit(1);
    const profiles = await db.select().from(s.profile).where(eq(s.profile.accountId, account.id)).orderBy(asc(s.profile.createdAt));
    const age = profile.birthYear ? new Date().getFullYear() - profile.birthYear : null;
    return { account, user, profile, profiles, seat, childMode, age, device: device ?? null, eye: eye ?? null, enrolment: null, can: (a: MemberAction) => memberCan(seat, a, childMode) } as unknown as Member;
  }
  const results = (profileId: string, testKey?: string) => db.select().from(s.testResult)
    .where(and(eq(s.testResult.profileId, profileId), testKey ? eq(s.testResult.testKey, testKey) : undefined)).orderBy(asc(s.testResult.takenAt), asc(s.testResult.eye));
  const runs = (accountId: string) => db.select().from(s.clipRun).where(eq(s.clipRun.accountId, accountId)).orderBy(asc(s.clipRun.takenAt));

  beforeAll(async () => {
    [A, B] = await db.insert(s.account).values([{ displayName: `zz-clips-a-${x}` }, { displayName: `zz-clips-b-${x}` }]).returning();
    [gA, gB] = await db.insert(s.appUser).values([
      { email: `zz-clips-a-${x}@eyesopener.test`, displayName: `Guardian A ${x}`, accountId: A.id, seat: "guardian" },
      { email: `zz-clips-b-${x}@eyesopener.test`, displayName: `Guardian B ${x}`, accountId: B.id, seat: "guardian" },
    ]).returning();
    [kid, grown, other] = await db.insert(s.profile).values([
      { accountId: A.id, displayName: `Kid${x}`, kind: "child", birthYear: new Date().getFullYear() - 7 }, { accountId: A.id, displayName: `Grown${x}`, kind: "adult" },
      { accountId: B.id, displayName: `Other${x}`, kind: "adult" },
    ]).returning();
    await db.insert(s.device).values([
      { accountId: A.id, kind: "web", label: "Laptop", pxPerCm: 37.8, distanceCm: 60 },
      { accountId: B.id, kind: "web", label: "Laptop", pxPerCm: 40, distanceCm: 50 },
    ]);
  });
  afterAll(async () => { await db.delete(s.account).where(inArray(s.account.id, [A.id, B.id])); });

  const parent = () => member(A, gA, kid), adult = () => member(A, gA, grown);

  it("refuses a clip that is not offered, a code that does not exist, and anything that is not a measurement", async () => {
    const m = await parent();
    for (const code of ["C26", "M55", "M69", "M99", "", null, 7]) expect(await saveClip(m, code, { answers: [0] }, null)).toEqual({ ok: false, why: "withheld" });
    expect(await saveClip(m, "M64", { answers: [1, 2] }, null)).toEqual({ ok: false, why: "invalid" });
    expect(await saveClip(m, "M04", { value: 9, note: "" }, null)).toEqual({ ok: false, why: "invalid" });
    expect(await results(kid.id)).toEqual([]);
    expect(await runs(A.id)).toEqual([]);
  });

  it("stores a clip that is a check-up under the check-up's key, with the first result as the baseline", async () => {
    const first = await saveClip(await parent(), "M04", { value: 0.2, note: "" }, null);
    expect(first).toMatchObject({ ok: true, outcome: "saved", results: [{ key: "acuity", eye: "R", value: 0.2 }] });
    await saveClip(await parent(), "M04", { value: 0.1, note: "" }, null);
    await saveClip(await parent(), "M05", { value: 0.5, note: "" }, null);
    const rows = await results(kid.id, "acuity");
    expect(rows.map((r) => [r.eye, r.value, r.isBaseline, r.unit])).toEqual([["right", 0.2, true, "logMAR"], ["right", 0.1, false, "logMAR"], ["left", 0.5, true, "logMAR"]].map(([e, v, b, u]) => [e, expect.closeTo(v as number, 5), b, u]));
    const m = await parent();
    expect(rows.every((r) => r.deviceId === m.device!.id)).toBe(true);
    expect(rows[0].raw).toMatchObject({ clip: "M04", dist: 60 });
    /* both eyes now have a letter size, so the eye settings exist: the left eye read worse and gets the cyan lens */
    expect(m.eye).toMatchObject({ weakEye: "left", cyanEye: "left", source: "weekly_check" });
  });

  it("stores a measurement of the clips' own under its own key, with its own baseline", async () => {
    await saveClip(await parent(), "M08", { value: 0.6, note: "" }, null);
    await saveClip(await parent(), "M08", { value: 0.5, note: "" }, null);
    await saveClip(await parent(), "M65", { answers: Array(10).fill(2) }, null);
    const crowded = await results(kid.id, "acuity_crowded");
    expect(crowded.map((r) => [r.eye, r.isBaseline, r.unit])).toEqual([["right", true, "logMAR"], ["right", false, "logMAR"]]);
    const [strain] = await results(kid.id, "screen_strain");
    expect(strain).toMatchObject({ value: 20, unit: "score", eye: null, isBaseline: true, deviceId: null });
    /* a clip's own key never moves the eye settings */
    const before = (await parent()).eye!.id;
    await saveClip(await parent(), "M17", { x: -0.6 }, null);
    expect((await parent()).eye!.id).toBe(before);
    /* the balance clip does, as the balance check-up does */
    await saveClip(await parent(), "M18", { x: -0.82 }, null);
    const now = (await parent()).eye!;
    expect(now.id).not.toBe(before);
    expect(now.strongContrast).toBeCloseTo(Math.pow(10, -0.82), 2);
  });

  it("keeps a record of every finished clip, and of what a look-and-answer check found", async () => {
    expect(await saveClip(await parent(), "C06", { answers: [1] }, "screen")).toMatchObject({ ok: true, outcome: "fail", results: [] });
    const all = await runs(A.id);
    const edge = all.at(-1)!;
    expect(edge).toMatchObject({ code: "C06", outcome: "fail", setKey: "screen", profileId: kid.id, value: null, detail: { scene: "edges", answers: [1] } });
    expect(all.find((r) => r.code === "M04")).toMatchObject({ outcome: "saved", unit: "logMAR" });
    const last = await lastRuns(await parent());
    expect(last.get("C06")?.outcome).toBe("fail");
    expect(last.get("M08")?.value).toBeCloseTo(0.5, 5);
    expect([...(await doneToday(await parent()))].sort()).toEqual(expect.arrayContaining(["C06", "M04", "M05", "M08", "M18", "M65"]));
    /* a clip about the eyes counts for the profile that did it; a clip about the screen counts for the household */
    const forGrown = await lastRuns(await adult());
    expect(forGrown.has("M04")).toBe(false);
    expect(forGrown.has("C06")).toBe(true);
    expect((await clipResults(await parent(), { ...(await import("@/data/clips")).clipDef("M08")! })).length).toBe(2);
    expect((await clipResults(await adult(), (await import("@/data/clips")).clipDef("M08")!)).length).toBe(0);
  });

  it("lets a guardian set the screen's distance, and works every profile's sizes out again", async () => {
    const before = (await parent()).eye!;
    expect(await saveClip(await parent(), "C03", { cm: 90 }, null)).toMatchObject({ ok: true, outcome: "saved", screen: { dist: 90 } });
    const m = await parent();
    expect(m.device!.distanceCm).toBe(90);
    /* the same letters are larger in centimetres from further away */
    expect(m.eye!.id).not.toBe(before.id);
    expect(m.eye!.letterCm).toBeCloseTo(before.letterCm * 1.5, 1);
    expect(m.eye!.strongContrast).toBeCloseTo(before.strongContrast, 5);
    expect(await saveClip(await parent(), "C01", { ppc: 41 }, null)).toMatchObject({ ok: true, screen: { ppc: 41 } });
    await saveClip(await parent(), "C03", { cm: 60 }, null);
  });

  it("lets nobody but a guardian change the screen: not in child mode, and never a cheer seat", async () => {
    const child = await member(A, gA, kid, "guardian", true), cheer = await member(A, gA, kid, "circle");
    expect(await saveClip(child, "C03", { cm: 200 }, null)).toEqual({ ok: false, why: "guardian" });
    expect(await saveClip(child, "C18", { greys: [182, 190] }, null)).toEqual({ ok: false, why: "guardian" });
    expect(await saveClip(cheer, "M64", { answers: Array(15).fill(0) }, null)).toEqual({ ok: false, why: "seat" });
    expect(await saveClip(cheer, "C03", { cm: 200 }, null)).toEqual({ ok: false, why: "seat" });
    expect((await parent()).device!.distanceCm).toBe(60);
    /* child mode may still take a measurement of the eyes */
    expect(await saveClip(child, "M64", { answers: Array(15).fill(1) }, null)).toMatchObject({ ok: true, results: [{ key: "symptoms", value: 15 }] });
    expect((await clipPerson(child)).guardian).toBe(false);
  });

  it("checks where the screen stands on the server, whatever the browser showed", async () => {
    expect(await saveClip(await parent(), "M01", { value: 0.1, note: "" }, null)).toEqual({ ok: false, why: "need_far" });
    await saveClip(await parent(), "C03", { cm: 250 }, null);
    expect(await saveClip(await parent(), "M01", { value: 0.1, note: "" }, null)).toMatchObject({ ok: true });
    expect(await saveClip(await parent(), "M04", { value: 0.1, note: "" }, null)).toEqual({ ok: false, why: "need_near" });
    await saveClip(await parent(), "C03", { cm: 60 }, null);
  });

  it("saves a screen colour through the screen colours rules, and the leak only when both lenses are matched", async () => {
    expect(await saveClip(await parent(), "C18", { greys: [182, 190] }, null)).toMatchObject({ ok: true, outcome: "saved" });
    const gamma = (await parent()).device!;
    expect(gamma.gammaAt).not.toBeNull();
    expect(gamma.gamma).toBeGreaterThan(1.9);
    expect(await saveClip(await parent(), "C18", { greys: [170, 200] }, null)).toEqual({ ok: false, why: "apart" });

    const half = await saveClip(await parent(), "C09", { match: [80, 84] }, null);
    expect(half).toMatchObject({ ok: true, outcome: "note", say: "other_lens" });
    expect((await parent()).device!.leakAt).toBeNull();
    const whole = await saveClip(await parent(), "C08", { match: "unseen" }, null);
    expect(whole).toMatchObject({ ok: true, outcome: "saved", screen: { leak: { cyan: 0 } } });
    const d = (await parent()).device!;
    expect(d.leakRedLens).toBeGreaterThan(0.05);
    expect(d.leakCyanLens).toBe(0);
    expect(d.leakAt).not.toBeNull();
    expect((await clipContext(await parent())).leak).toMatchObject({ cyan: 0 });
  });

  it("needs a guardian's word for the camera, given once, and reads habits only for a grown-up's profile", async () => {
    expect(await cameraAllowed(await adult())).toBe(false);
    expect(await saveClip(await adult(), "M68", { cm: 55, seconds: 60 }, null)).toEqual({ ok: false, why: "camera" });
    expect(await allowClipCamera(await member(A, gA, grown, "guardian", true))).toBe(false);
    expect(await allowClipCamera(await member(A, gA, grown, "circle"))).toBe(false);
    expect(await allowClipCamera(await adult())).toBe(true);
    expect(await allowClipCamera(await adult())).toBe(true);
    const given = await db.select().from(s.consent).where(and(eq(s.consent.profileId, grown.id), eq(s.consent.kind, "camera")));
    expect(given).toHaveLength(1);
    expect(given[0]).toMatchObject({ userId: gA.id, textVersion: "clips-2026-10" });
    expect(await saveClip(await adult(), "M68", { cm: 55, seconds: 60 }, null)).toMatchObject({ ok: true, results: [{ key: "working_distance", value: 55 }] });
    /* the child's profile was not given it, and a habit reading is never taken for a child */
    expect(await cameraAllowed(await parent())).toBe(false);
    await allowClipCamera(await parent());
    expect(await saveClip(await parent(), "M67", { blinks: 12, seconds: 50 }, null)).toEqual({ ok: false, why: "adult" });
  });

  it("never touches another household", async () => {
    const theirs = await member(B, gB, other);
    expect((await lastRuns(theirs)).size).toBe(0);
    expect((await doneToday(theirs)).size).toBe(0);
    expect(await results(other.id)).toEqual([]);
    expect(theirs.device).toMatchObject({ pxPerCm: 40, distanceCm: 50, gammaAt: null, leakAt: null });
    await saveClip(theirs, "M64", { answers: Array(15).fill(4) }, null);
    expect((await results(other.id)).map((r) => r.value)).toEqual([60]);
    expect((await runs(B.id)).map((r) => [r.code, r.profileId])).toEqual([["M64", other.id]]);
    expect((await results(kid.id, "symptoms")).every((r) => r.value !== 60)).toBe(true);
  });
});
