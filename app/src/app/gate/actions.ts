"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { gate as t } from "@/copy/gate";
import { GATE_COOKIE, GATE_DAYS, gateMark, phraseMatches, safeNext, siteLock } from "@/lib/gate";
import { secureCookies, signToken } from "@/lib/token";

/** Checks the access phrase. A right answer sets the cookie and goes on; a wrong one waits a moment and says so. */
export async function openGate(_: { error: string } | null, form: FormData): Promise<{ error: string }> {
  const lock = siteLock();
  const next = safeNext(String(form.get("next") ?? ""));
  if (!lock) redirect(next);
  if (!phraseMatches(String(form.get("phrase") ?? ""), lock)) {
    await new Promise((r) => setTimeout(r, 800));
    return { error: t.wrong };
  }
  const seconds = GATE_DAYS * 86_400;
  (await cookies()).set(GATE_COOKIE, signToken({ gate: gateMark(lock), exp: Date.now() + seconds * 1000 }), { path: "/", httpOnly: true, sameSite: "lax", secure: secureCookies(), maxAge: seconds });
  redirect(next);
}
