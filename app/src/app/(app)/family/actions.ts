"use server";
import { jar as cookieJar } from "@/lib/cookie-jar";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/together/StateForm";
import { family as t } from "@/copy/family";
import { CHILD_COOKIE } from "@/lib/auth";
import { childToHandTo, createInvite, giveConsent, INVITE_SEATS, joinGroup, leaveGroup, revokeInvite, setExitPin, withdrawConsent } from "@/lib/family";
import { KIDS_HOME } from "@/lib/kids";
import { requireMember } from "@/lib/session";
import { secureCookies, signToken } from "@/lib/token";

const CHILD_MODE_MS = 12 * 60 * 60_000;
const id = (formData: FormData, name: string) => z.uuid().safeParse(formData.get(name));

export async function consentGive(formData: FormData) {
  const m = await requireMember();
  const input = z.object({ profileId: z.uuid(), confirm: z.literal("on") }).safeParse(Object.fromEntries(formData));
  if (!m.can("consent") || !input.success) return;
  await giveConsent(m, input.data.profileId);
  revalidatePath("/", "layout");
}

export async function consentWithdraw(formData: FormData) {
  const m = await requireMember();
  const profileId = id(formData, "profileId");
  if (!m.can("consent") || !profileId.success) return;
  await withdrawConsent(m, profileId.data);
  revalidatePath("/", "layout");
}

export async function inviteCreate(formData: FormData) {
  const m = await requireMember();
  const seat = z.enum(INVITE_SEATS).safeParse(formData.get("seat"));
  if (!m.can("seats") || !seat.success) return;
  await createInvite(m, seat.data);
  revalidatePath("/family");
}

export async function inviteRevoke(formData: FormData) {
  const m = await requireMember();
  const inviteId = id(formData, "inviteId");
  if (!m.can("seats") || !inviteId.success) return;
  await revokeInvite(m, inviteId.data);
  revalidatePath("/family");
}

export async function pinSet(_: FormState, formData: FormData): Promise<FormState> {
  const m = await requireMember();
  if (!m.can("seats")) return { ok: false, message: t.notAllowed };
  const pin = z.string().regex(/^\d{4,6}$/).safeParse(formData.get("pin"));
  if (!pin.success) return { ok: false, message: t.childMode.pinBad };
  await setExitPin(m, pin.data);
  revalidatePath("/family");
  return { ok: true, message: t.childMode.pinSaved };
}

/** Child mode: this device stays on one child until a grown-up types the exit PIN, or 12 hours pass. */
export async function handOver(formData: FormData) {
  const m = await requireMember();
  const profileId = id(formData, "profileId");
  if (!m.can("manage_family") || !profileId.success) return;
  const child = await childToHandTo(m, profileId.data);
  if (!child) return;
  (await cookieJar()).set(CHILD_COOKIE, signToken({ profileId: child.id, accountId: m.account.id, exp: Date.now() + CHILD_MODE_MS }),
    { path: "/", httpOnly: true, sameSite: "lax", secure: secureCookies(), maxAge: CHILD_MODE_MS / 1000 });
  revalidatePath("/", "layout");
  redirect(KIDS_HOME);
}

/**
 * Child mode in one step from the person's menu in the top bar (Ved, 18 October 2026: it was buried on the Family
 * page). With no exit PIN yet, a guardian types one in the same step and it is saved first. Anything that stops the
 * hand-over (no consent yet, no PIN and no right to set one) opens the Family page, which says what is missing.
 */
export async function handOverQuick(formData: FormData) {
  const m = await requireMember();
  const profileId = id(formData, "profileId");
  if (!m.can("manage_family") || !profileId.success) redirect("/family");
  let hasPin = !!m.account.exitPinHash;
  if (!hasPin) {
    const pin = z.string().regex(/^\d{4,6}$/).safeParse(formData.get("pin"));
    if (!m.can("seats") || !pin.success) redirect("/family");
    await setExitPin(m, pin.data);
    hasPin = true;
  }
  /* the member was read before the PIN was saved: hand over with the PIN as it is now */
  const child = await childToHandTo({ ...m, account: { ...m.account, exitPinHash: hasPin ? (m.account.exitPinHash ?? "set") : null } }, profileId.data);
  if (!child) redirect("/family");
  (await cookieJar()).set(CHILD_COOKIE, signToken({ profileId: child.id, accountId: m.account.id, exp: Date.now() + CHILD_MODE_MS }),
    { path: "/", httpOnly: true, sameSite: "lax", secure: secureCookies(), maxAge: CHILD_MODE_MS / 1000 });
  revalidatePath("/", "layout");
  redirect(KIDS_HOME);
}

export async function groupJoin(_: FormState, formData: FormData): Promise<FormState> {
  const m = await requireMember();
  if (!m.can("manage_family")) return { ok: false, message: t.notAllowed };
  const code = z.string().trim().min(1).max(20).safeParse(formData.get("code"));
  const result = code.success ? await joinGroup(m, code.data) : "group_not_found";
  revalidatePath("/family");
  return { ok: result === "done", message: t.sponsor.result[result] };
}

export async function groupLeave(formData: FormData) {
  const m = await requireMember();
  const groupId = id(formData, "groupId");
  if (!m.can("manage_family") || !groupId.success) return;
  await leaveGroup(m, groupId.data);
  revalidatePath("/family");
}
