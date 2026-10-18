"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { changeReminderFor, saveReminderFor, type Actor } from "@/lib/notify/manage";
import type { Member } from "@/lib/session";
import { requireMember } from "@/lib/session";

const PAGE = "/settings/reminders";
const back = (q: string) => redirect(`${PAGE}?${q}`);

function actor(m: Member): Actor {
  return { userId: m.user.id, role: m.seat, childMode: m.childMode };
}
function target(m: Member, profileId: string) {
  const p = m.profiles.find((x) => x.id === profileId);
  return p ? { accountId: m.account.id, profile: { id: p.id, kind: p.kind, needsHelp: p.needsHelp } } : null;
}

/** Adds or changes a reminder for one profile of the household (rules.ts, `maySetReminder`). */
export async function saveReminder(formData: FormData) {
  const m = await requireMember();
  const to = target(m, String(formData.get("profile") ?? ""));
  const problem = to ? await saveReminderFor(actor(m), to, formData) : "badProfile";
  revalidatePath(PAGE);
  back(problem ? `err=${problem}` : "saved=1");
}

/** Pauses, turns back on, or removes one of the household's reminders. */
export async function changeReminder(formData: FormData) {
  const m = await requireMember();
  const to = target(m, String(formData.get("profile") ?? ""));
  const problem = to ? await changeReminderFor(actor(m), to, String(formData.get("id") ?? ""), String(formData.get("what") ?? "")) : "badProfile";
  revalidatePath(PAGE);
  back(problem ? `err=${problem}` : String(formData.get("what")) === "remove" ? "removed=1" : "saved=1");
}

/** A guardian ticks, or unticks, a grown-up profile as needing help with reminders (an older person, say). */
export async function setNeedsHelp(formData: FormData) {
  const m = await requireMember();
  if (!m.can("manage_family")) back("err=notAllowed");
  const p = m.profiles.find((x) => x.id === String(formData.get("profile") ?? ""));
  if (!p || p.kind !== "adult") back("err=badProfile");
  await db.update(schema.profile).set({ needsHelp: formData.get("needsHelp") === "on" })
    .where(and(eq(schema.profile.id, p!.id), eq(schema.profile.accountId, m.account.id)));
  revalidatePath(PAGE);
  back("saved=1");
}
