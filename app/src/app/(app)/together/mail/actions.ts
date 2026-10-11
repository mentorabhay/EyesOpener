// Eyes Opener: Sends a note from the signed-in person to any profile in their household, the active child included.
"use server";
import { revalidatePath } from "next/cache";
import { jar as cookieJar } from "@/lib/cookie-jar";
import { z } from "zod";
import type { FormState } from "@/components/together/StateForm";
import { together } from "@/copy/together";
import { db, schema } from "@/db";
import { fieldProblems, screenHazards } from "@/lib/community";
import { PROFILE_COOKIE, requireMember } from "@/lib/session";

const t = together.mail;
const Note = z.object({
  to: z.guid(),
  /* Length is checked after upper-casing, because a few letters grow when capitalised. */
  body: z.string().transform((v) => v.replace(/\r\n/g, "\n").trim().toUpperCase()).pipe(z.string().min(1).max(60)),
});

/**
 * Sends a note from the signed-in person to any profile in their household, the active child included.
 * The text is stored once; each reader's device draws it.
 */
export async function sendMail(_: FormState, form: FormData): Promise<FormState> {
  const m = await requireMember();
  if (!m.can("encourage")) return { ok: false, message: together.cannot.encourage };
  const parsed = Note.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: t.invalid, reasons: fieldProblems(parsed.error, t.errors) };
  const to = m.profiles.find((p) => p.id === parsed.data.to);
  if (!to) return { ok: false, message: t.invalid, reasons: [t.errors.to] };
  const reasons = await screenHazards(parsed.data.body);
  if (reasons.length) return { ok: false, message: t.blocked, reasons };

  /* The note is from the person. A profile is recorded beside them only when they picked it themselves, hold a guardian seat
     and are not writing to it: a cheer seat has no profile, and the profile a household opens on is nobody's choice. */
  const picked = (await cookieJar()).get(PROFILE_COOKIE)?.value === m.profile.id;
  await db.insert(schema.fusionMail).values({
    fromUserId: m.user.id, fromName: m.user.displayName.trim().split(/\s+/)[0],
    fromProfileId: picked && m.seat !== "circle" && m.profile.id !== to.id ? m.profile.id : null,
    toProfileId: to.id, body: parsed.data.body,
  });
  revalidatePath("/together/mail");
  return { ok: true, message: t.sent(to.displayName) };
}
