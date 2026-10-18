"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCounsellor } from "@/lib/auth";
import { linkedProfile } from "@/lib/counsellor";
import { changeReminderFor, saveReminderFor } from "@/lib/notify/manage";

const linkOf = (f: FormData) => { const v = String(f.get("link") ?? ""); return /^[0-9a-f-]{36}$/.test(v) ? v : null; };

async function scope(f: FormData) {
  const viewer = await requireCounsellor();
  const link = linkOf(f);
  const p = link ? await linkedProfile(viewer, link) : null;
  if (!link || !p || p.id !== String(f.get("profile") ?? "")) redirect("/counsellor");
  return { link, by: { userId: viewer.user.id, role: "counsellor" as const, linked: true }, to: { accountId: p.accountId, profile: { id: p.id, kind: p.kind, needsHelp: p.needsHelp } } };
}

/** A linked counsellor adds or changes a reminder for the linked profile. */
export async function counsellorSaveReminder(f: FormData) {
  const { link, by, to } = await scope(f);
  const problem = await saveReminderFor(by, to, f);
  revalidatePath(`/counsellor/members/${link}/reminders`);
  redirect(`/counsellor/members/${link}/reminders?${problem ? `err=${problem}` : "saved=1"}`);
}

/** A linked counsellor pauses, turns back on or removes one of the linked profile's reminders. */
export async function counsellorChangeReminder(f: FormData) {
  const { link, by, to } = await scope(f);
  const what = String(f.get("what") ?? "");
  const problem = await changeReminderFor(by, to, String(f.get("id") ?? ""), what);
  revalidatePath(`/counsellor/members/${link}/reminders`);
  redirect(`/counsellor/members/${link}/reminders?${problem ? `err=${problem}` : what === "remove" ? "removed=1" : "saved=1"}`);
}
