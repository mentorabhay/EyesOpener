"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { PROFILE_COOKIE, requireMember } from "./session";
import { secureCookies } from "./token";

/** Switch the active family profile. */
export async function switchProfile(formData: FormData) {
  const id = String(formData.get("profileId") ?? "");
  const m = await requireMember();
  /* In child mode the device stays on the child until a grown-up types the exit PIN. */
  if (m.childMode || !m.profiles.some((p) => p.id === id)) return;
  (await cookies()).set(PROFILE_COOKIE, id, { path: "/", sameSite: "lax", httpOnly: true, secure: secureCookies(), maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
}

/** Demo sign-in: become one of the seeded people and go to their area. */
export async function demoSignIn(formData: FormData) {
  const { signInAs, getViewer } = await import("./auth");
  if (!(await signInAs(String(formData.get("userId") ?? "")))) return;
  const { redirect } = await import("next/navigation");
  redirect((await getViewer())?.home ?? "/login");
}
