"use server";
import { and, eq, gt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/together/StateForm";
import { together } from "@/copy/together";
import { db, schema } from "@/db";
import { fieldProblems, lightCandidates, screenHazards } from "@/lib/community";
import { requireMember, todayKey } from "@/lib/session";
import { notifyHousehold } from "@/lib/notify/service";
import { notify as nw } from "@/copy/notify";

const t = together.lights;
const Gift = z.object({ to: z.guid(), note: z.string().trim().max(80) });

/** Spends one of the active profile's lights on someone else and records the gift for today. A light is never spent on oneself. */
export async function giveLight(_: FormState, form: FormData): Promise<FormState> {
  const m = await requireMember();
  if (!m.can("encourage")) return { ok: false, message: together.cannot.encourage };
  const parsed = Gift.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: t.invalid, reasons: fieldProblems(parsed.error, t.errors) };
  const to = (await lightCandidates(m)).find((p) => p.id === parsed.data.to);
  if (!to) return { ok: false, message: t.invalid, reasons: [t.errors.to] };
  const reasons = await screenHazards(parsed.data.note);
  if (reasons.length) return { ok: false, message: t.blocked, reasons };

  const gift = { fromProfileId: m.profile.id, toProfileId: to.id, forDay: todayKey() };
  const outcome = await db.transaction(async (tx) => {
    const [given] = await tx.select({ id: schema.lightGift.id }).from(schema.lightGift)
      .where(and(eq(schema.lightGift.fromProfileId, gift.fromProfileId), eq(schema.lightGift.toProfileId, gift.toProfileId), eq(schema.lightGift.forDay, gift.forDay))).limit(1);
    if (given) return t.already(to.name);
    /* The count is lowered and checked in one statement, so two taps cannot spend a light that is not there. */
    const [spent] = await tx.update(schema.streak).set({ lights: sql`${schema.streak.lights} - 1` })
      .where(and(eq(schema.streak.profileId, m.profile.id), gt(schema.streak.lights, 0))).returning({ lights: schema.streak.lights });
    if (!spent) return t.none;
    await tx.insert(schema.lightGift).values({ ...gift, note: parsed.data.note || null });
    return null;
  });
  if (outcome) return { ok: false, message: outcome };
  /* the household of the one who got the light hears of it, without the giver's name (src/lib/notify) */
  const [home] = await db.select({ accountId: schema.profile.accountId }).from(schema.profile).where(eq(schema.profile.id, to.id)).limit(1);
  const c = nw.community.light;
  if (home) await notifyHousehold(home.accountId, { kind: "community.light", title: c.title(to.name), body: c.body, href: c.href, key: `light:${gift.fromProfileId}:${to.id}:${gift.forDay}`, profileId: to.id }, m.user.id);
  revalidatePath("/together/lights");
  return { ok: true, message: t.given(to.name) };
}
