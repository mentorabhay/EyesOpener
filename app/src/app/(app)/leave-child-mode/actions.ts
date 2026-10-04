"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/together/StateForm";
import { leave as t } from "@/copy/family";
import { CHILD_COOKIE } from "@/lib/auth";
import { requireMember } from "@/lib/session";
import { checkPin, signToken, verifyToken } from "@/lib/token";

const TRIES_COOKIE = "io_exit_tries";
const MAX_WRONG = 5;
const LOCK_MS = 5 * 60_000;
const TRIES_KEPT_MS = 60 * 60_000;

/** The right PIN ends child mode. Five wrong tries in a row close the form for five minutes. */
export async function leaveChildMode(_: FormState, formData: FormData): Promise<FormState> {
  const m = await requireMember();
  if (!m.childMode) redirect(m.viewer.home);
  const jar = await cookies();
  const now = Date.now();
  const tries = verifyToken<{ wrong: number; lockedUntil: number }>(jar.get(TRIES_COOKIE)?.value) ?? { wrong: 0, lockedUntil: 0 };
  if (tries.lockedUntil > now) return { ok: false, message: t.locked(Math.ceil((tries.lockedUntil - now) / 60_000)) };

  const pin = z.string().regex(/^\d{4,6}$/).safeParse(formData.get("pin"));
  if (pin.success && checkPin(pin.data, m.account.exitPinHash)) {
    jar.delete(CHILD_COOKIE);
    jar.delete(TRIES_COOKIE);
    revalidatePath("/", "layout");
    redirect("/family");
  }
  const wrong = tries.wrong + 1;
  const locked = wrong >= MAX_WRONG;
  jar.set(TRIES_COOKIE, signToken({ wrong: locked ? 0 : wrong, lockedUntil: locked ? now + LOCK_MS : 0, exp: now + TRIES_KEPT_MS }), { path: "/", httpOnly: true, sameSite: "lax" });
  return { ok: false, message: locked ? t.locked(LOCK_MS / 60_000) : t.wrong };
}
