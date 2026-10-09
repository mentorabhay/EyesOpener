/**
 * Saving and reading the colour calibration of the household's screen.
 * The screen is always the member's own (`member.device`, found from the session): no id comes from the browser.
 * A guardian or co-guardian measures it; a cheer seat and child mode may only look. The rules: src/lib/screen-rules.ts.
 */
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Member } from "@/lib/session";
import { clearStep, mayCalibrate, profileEffect, resolveStep, screenFacts, stepInput, stepSchema, type ProfileEffect, type ScreenFacts } from "./screen-rules";

export type SaveError = "seat" | "no_screen" | "invalid" | "apart" | "range" | "dim";
export type Saved = { ok: true; facts: ScreenFacts } | { ok: false; why: SaveError; lens?: "red" | "cyan" };

async function write(member: Member, set: Partial<typeof schema.device.$inferInsert>) {
  const device = member.device!;
  const [row] = await db.update(schema.device).set(set)
    .where(and(eq(schema.device.id, device.id), eq(schema.device.accountId, member.account.id))).returning();
  return row;
}

/** Saves one finished step for the household's screen. Nothing is written unless the engine accepts the matches. */
export async function saveStep(member: Member, input: unknown): Promise<Saved> {
  if (!mayCalibrate(member)) return { ok: false, why: "seat" };
  if (!member.device) return { ok: false, why: "no_screen" };
  const parsed = stepInput.safeParse(input);
  if (!parsed.success) return { ok: false, why: "invalid" };
  const resolved = resolveStep(parsed.data, member.device, new Date());
  if (!resolved.ok) return resolved;
  const row = await write(member, resolved.set);
  return row ? { ok: true, facts: screenFacts(row) } : { ok: false, why: "no_screen" };
}

/** Puts one step back to "not measured", so the usual value is used again. */
export async function forgetStep(member: Member, step: unknown): Promise<Saved> {
  if (!mayCalibrate(member)) return { ok: false, why: "seat" };
  if (!member.device) return { ok: false, why: "no_screen" };
  const parsed = stepSchema.safeParse(step);
  if (!parsed.success) return { ok: false, why: "invalid" };
  const row = await write(member, clearStep(parsed.data, member.device));
  return row ? { ok: true, facts: screenFacts(row) } : { ok: false, why: "no_screen" };
}

export interface ProfileLine extends ProfileEffect { id: string; name: string; active: boolean }

/** What the screen's colours mean for each profile of the household: the ghost each one sees, and who should take the balance check-up again. */
export async function profileLines(member: Member, facts: ScreenFacts): Promise<ProfileLine[]> {
  const ids = member.profiles.map((p) => p.id);
  if (!ids.length) return [];
  const e = schema.eyeProfile, t = schema.testResult;
  const [eyes, balances] = await Promise.all([
    db.selectDistinctOn([e.profileId], { profileId: e.profileId, strongContrast: e.strongContrast }).from(e)
      .where(and(inArray(e.profileId, ids), eq(e.isCurrent, true))).orderBy(e.profileId, desc(e.createdAt)),
    db.selectDistinctOn([t.profileId], { profileId: t.profileId, takenAt: t.takenAt }).from(t)
      .where(and(inArray(t.profileId, ids), eq(t.testKey, "balance"))).orderBy(t.profileId, desc(t.takenAt)),
  ]);
  return member.profiles.map((p) => ({
    id: p.id, name: p.displayName, active: p.id === member.profile.id,
    ...profileEffect(facts, eyes.find((x) => x.profileId === p.id) ?? null, balances.find((x) => x.profileId === p.id)?.takenAt ?? null),
  }));
}
