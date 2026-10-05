"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { cinemaClub } from "@/copy/cinema-club";
import { lightsOn } from "@/copy/lights-on";
import { wishJam } from "@/copy/wish-jam";
import { audit, requireStaff } from "@/lib/auth";
import { createClub, removeClub } from "@/lib/cinema-club-data";
import { isHourSetting } from "@/lib/lights-on";
import { readHour, writeHour } from "@/lib/lights-on-data";
import { isStaffStep } from "@/lib/wish-jam";
import { takeStaffStep, tieGame } from "@/lib/wish-jam-data";
import type { Answer } from "../../answer-form";

/**
 * Staff changes for the four gatherings. The page is kept in the moderation room: that room's gate runs in every
 * action here, and every change that is saved is written to the audit log (by this file for the hour, and inside
 * the data functions for clubs and wishes).
 */
const refresh = () => { revalidatePath("/admin", "layout"); revalidatePath("/together", "layout"); revalidatePath("/wish-jam"); revalidatePath("/sponsor", "layout"); };
const whole = z.coerce.number().int();

export async function setHourAction(_: Answer, form: FormData): Promise<Answer> {
  const viewer = await requireStaff("moderation");
  const t = lightsOn.staff;
  const input = z.object({ weekday: whole, hour: whole }).safeParse({ weekday: form.get("weekday"), hour: form.get("hour") });
  if (!input.success || !isHourSetting(input.data)) return { ok: false, message: t.invalid };
  const before = await readHour();
  if (before.weekday === input.data.weekday && before.hour === input.data.hour) return { ok: false, message: t.same };
  const saved = await writeHour(input.data);
  await audit(viewer, "admin.gatherings.hour.set", "lights_on_hour", { name: lightsOn.weekly(saved.weekday, saved.hour), from: before, to: saved });
  refresh();
  return { ok: true, message: t.saved };
}

export async function listClubAction(_: Answer, form: FormData): Promise<Answer> {
  const viewer = await requireStaff("moderation");
  const t = cinemaClub.sponsor;
  const input = z.object({ placeKind: z.string().max(40), placeName: z.string().max(200), weekday: whole, startMinute: whole })
    .safeParse({ placeKind: form.get("placeKind"), placeName: form.get("placeName"), weekday: form.get("weekday"), startMinute: form.get("startMinute") });
  if (!input.success) return { ok: false, message: t.refused.time };
  const done = await createClub(viewer, null, input.data);
  if (!done.ok) return { ok: false, message: t.refused[done.why] };
  refresh();
  return { ok: true, message: t.add.staffSaved };
}

export async function removeClubAction(form: FormData) {
  const viewer = await requireStaff("moderation");
  const id = z.guid().safeParse(form.get("id"));
  if (!id.success) return;
  await removeClub(viewer, id.data);
  refresh();
}

export async function wishStepAction(_: Answer, form: FormData): Promise<Answer> {
  const viewer = await requireStaff("moderation");
  const t = wishJam.staff;
  const input = z.object({ id: z.guid(), step: z.string().max(20), gameSlug: z.string().max(80).optional() })
    .safeParse({ id: form.get("id"), step: form.get("step"), gameSlug: typeof form.get("gameSlug") === "string" ? form.get("gameSlug") : undefined });
  if (!input.success || !isStaffStep(input.data.step)) return { ok: false, message: t.refused };
  const done = await takeStaffStep(viewer, input.data.id, input.data.step, input.data.gameSlug || null);
  if (!done.ok) return { ok: false, message: done.why === "bad_game" ? t.badGame : t.refused };
  refresh();
  return { ok: true, message: t.saved };
}

export async function tieGameAction(_: Answer, form: FormData): Promise<Answer> {
  const viewer = await requireStaff("moderation");
  const t = wishJam.staff;
  const input = z.object({ id: z.guid(), gameSlug: z.string().max(80) }).safeParse({ id: form.get("id"), gameSlug: form.get("gameSlug") });
  if (!input.success) return { ok: false, message: t.refused };
  const done = await tieGame(viewer, input.data.id, input.data.gameSlug || null);
  if (!done.ok) return { ok: false, message: done.why === "bad_game" ? t.badGame : t.refused };
  refresh();
  return { ok: true, message: t.saved };
}
