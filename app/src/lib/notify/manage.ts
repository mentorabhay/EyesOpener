/**
 * Saving and changing reminders, shared by the household's page (/settings/reminders) and the counsellor's page
 * (/counsellor/members/<link>/reminders). Server only. The caller has already worked out who is acting and for
 * which household; this checks the rule (rules.ts, `maySetReminder`) and writes.
 */
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { NOTE_MAX, clock, daysFrom, isKind, keptQuiet, maySetReminder, parseClock, quietClock, type Setter } from "./rules";

export type Problem = "notAllowed" | "badKind" | "badTime" | "badDays" | "badNote" | "badProfile";
export interface Actor { userId: string; role: Setter; linked?: boolean; childMode?: boolean }
export interface Target { accountId: string; profile: { id: string; kind: string; needsHelp: boolean } }

/** Adds a reminder, or changes one of this household's for this profile. */
export async function saveReminderFor(by: Actor, to: Target, form: FormData): Promise<Problem | null> {
  if (!maySetReminder(by, to.profile)) return "notAllowed";
  const id = String(form.get("id") ?? "");
  const kind = String(form.get("kind") ?? "");
  const at = parseClock(String(form.get("at") ?? ""));
  const days = daysFrom(form.getAll("day").map((d) => Number(d)));
  const note = String(form.get("note") ?? "").replace(/\s+/g, " ").trim();
  if (!isKind(kind)) return "badKind";
  if (at === null) return "badTime";
  if (!days) return "badDays";
  if (kind === "custom" && (!note || note.length > NOTE_MAX)) return "badNote";
  const values = {
    kind, at: clock(keptQuiet(to.profile) ? quietClock(at) : at), days, note: kind === "custom" ? note : null,
    inApp: form.get("inApp") === "on", email: form.get("email") === "on",
    setBy: by.userId, setByRole: by.role, updatedAt: new Date(),
  };
  if (/^[0-9a-f-]{36}$/.test(id)) {
    await db.update(schema.reminder).set({ ...values, lastSentOn: null })
      .where(and(eq(schema.reminder.id, id), eq(schema.reminder.accountId, to.accountId), eq(schema.reminder.profileId, to.profile.id)));
  } else {
    await db.insert(schema.reminder).values({ ...values, accountId: to.accountId, profileId: to.profile.id });
  }
  return null;
}

/** Pauses, turns back on, or removes one reminder of this profile. */
export async function changeReminderFor(by: Actor, to: Target, id: string, what: string): Promise<Problem | null> {
  if (!maySetReminder(by, to.profile)) return "notAllowed";
  if (!/^[0-9a-f-]{36}$/.test(id)) return "badProfile";
  const mine = and(eq(schema.reminder.id, id), eq(schema.reminder.accountId, to.accountId), eq(schema.reminder.profileId, to.profile.id));
  if (what === "remove") await db.delete(schema.reminder).where(mine);
  else if (what === "pause" || what === "resume") await db.update(schema.reminder).set({ active: what === "resume", setBy: by.userId, setByRole: by.role, updatedAt: new Date() }).where(mine);
  return null;
}
