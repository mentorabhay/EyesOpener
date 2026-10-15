"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/together/StateForm";
import { cinemaClub } from "@/copy/cinema-club";
import { requireSponsor } from "@/lib/auth";
import { closeOwnClub, createClub } from "@/lib/cinema-club-data";
import { approvedOnly } from "@/lib/sponsor";

/**
 * A sponsor lists a Cinema Club and closes one of its own. The sponsor is always the signed-in person's own: the
 * forms send a place, a day and a time, or the id of a club, and that id is only ever matched against this
 * sponsor's clubs. Both writes are audited inside the data functions.
 */
const t = cinemaClub.sponsor;
const whole = z.coerce.number().int();
const refresh = () => { revalidatePath("/sponsor", "layout"); revalidatePath("/admin", "layout"); revalidatePath("/together/cinema-club"); };

export async function listClubAction(_: FormState, form: FormData): Promise<FormState> {
  const { viewer, sponsor } = await requireSponsor("edit_groups");
  approvedOnly(sponsor);
  const input = z.object({ placeKind: z.string().max(40), placeName: z.string().max(200), weekday: whole, startMinute: whole })
    .safeParse({ placeKind: form.get("placeKind"), placeName: form.get("placeName"), weekday: form.get("weekday"), startMinute: form.get("startMinute") });
  if (!input.success) return { ok: false, message: t.refused.time };
  const done = await createClub(viewer, sponsor, input.data);
  if (!done.ok) return { ok: false, message: t.refused[done.why] };
  refresh();
  return { ok: true, message: t.add.saved };
}

export async function closeClubAction(form: FormData) {
  const { viewer, sponsor } = await requireSponsor("edit_groups");
  approvedOnly(sponsor);
  const id = z.guid().safeParse(form.get("id"));
  if (!id.success) return;
  await closeOwnClub(viewer, sponsor, id.data);
  refresh();
}
