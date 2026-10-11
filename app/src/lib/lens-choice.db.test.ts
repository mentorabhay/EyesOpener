// Eyes Opener: The lens choice against a real database: swapping the inks and deriving the eye settings again keeps the weaker eye.
/**
 * The lens choice against a real database: swapping the inks and deriving the eye settings again keeps the weaker eye
 * where it is, however many times the settings are derived, including from a balance row too old to say which eye wore
 * the cyan lens. It makes one throwaway household and removes it. Where no database with the current tables answers
 * (the checks on GitHub have none), it is skipped.
 */
import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => { try { process.loadEnvFile(".env.local"); } catch { /* no file: the default address is used */ } });

import { and, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import type { Member } from "@/lib/session";
import { recomputeFromResults } from "./eye-profile";

const up = await db.execute(sql`select weak_ink from profile limit 0`).then(() => true, () => false);
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });
const x = crypto.randomBytes(4).toString("hex");

describe.skipIf(!up)("the lens choice, in the database", () => {
  let accountId = "", profileId = "";

  /** The part of a signed-in household recomputeFromResults reads, as it stands now. */
  async function member(): Promise<Member> {
    const [profile] = await db.select().from(s.profile).where(eq(s.profile.id, profileId));
    const [device] = await db.select().from(s.device).where(eq(s.device.accountId, accountId));
    const [eye] = await db.select().from(s.eyeProfile).where(and(eq(s.eyeProfile.profileId, profileId), eq(s.eyeProfile.isCurrent, true)));
    return { profile, device, eye: eye ?? null } as unknown as Member;
  }
  const swapTo = async (ink: "cyan" | "red") => {
    await db.update(s.profile).set({ weakInk: ink, weakInkAt: new Date() }).where(eq(s.profile.id, profileId));
    return recomputeFromResults(await member(), "lens_choice");
  };

  beforeAll(async () => {
    const [a] = await db.insert(s.account).values({ displayName: `zz-lens-${x}` }).returning();
    accountId = a.id;
    const [p] = await db.insert(s.profile).values({ accountId, displayName: `Kid${x}`, kind: "child", birthYear: new Date().getFullYear() - 8 }).returning();
    profileId = p.id;
    const [device] = await db.insert(s.device).values({ accountId, kind: "web", label: "Laptop", pxPerCm: 37.8, distanceCm: 60 }).returning();
    /* a left eye two lines worse, and a balance row from before the swap existed: no note of the cyan eye */
    await db.insert(s.testResult).values([
      { profileId, deviceId: device.id, testKey: "acuity", eye: "left", value: 0.5, unit: "logMAR" },
      { profileId, deviceId: device.id, testKey: "acuity", eye: "right", value: 0, unit: "logMAR" },
      { profileId, deviceId: device.id, testKey: "balance", eye: null, value: -0.8, unit: "log" },
    ]);
    await recomputeFromResults(await member());
  });
  afterAll(async () => { await db.delete(s.account).where(eq(s.account.id, accountId)); });

  it("starts the usual way, with the cyan lens on the weaker left eye", async () => {
    const { eye } = await member();
    expect([eye!.weakEye, eye!.cyanEye, eye!.weakInk]).toEqual(["left", "left", "cyan"]);
  });
  it("moves only the cyan lens when the inks are swapped, and keeps it there when the settings are derived again", async () => {
    await swapTo("red");
    for (let i = 0; i < 2; i++) {
      const { eye } = await member();
      expect([eye!.weakEye, eye!.cyanEye, eye!.weakInk, eye!.source]).toEqual(["left", "right", "red", i ? "weekly_check" : "lens_choice"]);
      await recomputeFromResults(await member());
    }
  });
  it("comes back to the usual way with the same weaker eye", async () => {
    await swapTo("cyan");
    const { eye } = await member();
    expect([eye!.weakEye, eye!.cyanEye, eye!.weakInk]).toEqual(["left", "left", "cyan"]);
  });
});
