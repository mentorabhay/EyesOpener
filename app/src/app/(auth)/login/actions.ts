"use server";
/**
 * The server side of the sign-in pages. Each action reads the request, calls the tested step in
 * src/lib/signin/flow.ts, and turns its answer into a sentence or a move to the next page.
 * Server Actions are refused by Next.js unless the request comes from this site's own pages, which is what stops
 * another site from signing a visitor in as someone else.
 */
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import { signin as t } from "@/copy/signin";
import { CHILD_COOKIE, endSessionsEverywhere, getViewer, signOut } from "@/lib/auth";
import { askFlow, googleFlow, homeOf, landing, linkFlow, type Ctx, type Entered, type Refusal } from "@/lib/signin/flow";
import { holdOf } from "@/lib/signin/hold";
import { networkAddress } from "@/lib/signin/limit";
import { startFamily } from "@/lib/signin/people";
import { signInSettings } from "@/lib/signin/settings";

/** What a sign-in form shows after it was sent: a sentence when it was refused, or the address a link went to. */
export type SignInAnswer = { ok: false; why: Refusal | "bad_address" | "not_sent"; message: string } | { ok: true; sentTo: string } | null;

async function ctx(): Promise<Ctx> {
  const settings = signInSettings();
  return { jar: await cookies(), settings, net: networkAddress((await headers()).get("x-forwarded-for"), settings?.proxyHops ?? 0) };
}

const refused = (out: Extract<Entered, { ok: false }>): SignInAnswer =>
  ({ ok: false, why: out.why, message: out.why === "slow_down" && out.waitMin ? t.slowDown(out.waitMin) : t.refused[out.why] });

/** The person is signed in: on to their pages. The sign-in page leaves the browser's history, so Back does not return to a used link. */
async function arrive(out: Extract<Entered, { ok: true }>): Promise<never> {
  const home = await homeOf(out.userId);
  revalidatePath("/", "layout");
  redirect(landing({ held: out.held, home, next: out.next }), RedirectType.replace);
}

/** The Google button's answer. `credential` is what Google's script hands the page. */
export async function googleSignIn(credential: string, next: string | null): Promise<SignInAnswer> {
  const out = await googleFlow({ credential, next }, await ctx());
  return out.ok ? arrive(out) : refused(out);
}

/** Emails a sign-in link. The answer never says whether the address has an account. */
export async function askForLink(_: SignInAnswer, form: FormData): Promise<SignInAnswer> {
  const out = await askFlow({ email: form.get("email"), next: form.get("next") }, await ctx());
  if (out.ok) return { ok: true, sentTo: out.email };
  if (out.why === "slow_down") return { ok: false, why: "slow_down", message: t.slowDown(out.waitMin) };
  if (out.why === "bad_address") return { ok: false, why: "bad_address", message: t.badAddress };
  if (out.why === "unavailable") return { ok: false, why: "not_sent", message: t.notSent };
  return { ok: false, why: "not_set_up", message: t.refused.not_set_up };
}

/** The page an email link returns to sends this. */
export async function finishLink(_: SignInAnswer, form: FormData): Promise<SignInAnswer> {
  const out = await linkFlow({ oobCode: form.get("code"), email: form.get("email"), next: form.get("next") }, await ctx());
  return out.ok ? arrive(out) : refused(out);
}

/** True on a device in child mode: a grown-up leaves child mode with the exit PIN before signing out. */
const held = async () => (await holdOf((await cookies()).get(CHILD_COOKIE)?.value)).state === "live";

export async function signOutHere() {
  if (await held()) redirect("/today");
  await signOut();
  revalidatePath("/", "layout");
  redirect("/login?done=out");
}

export async function signOutEverywhere() {
  if (await held()) redirect("/today");
  const viewer = await getViewer();
  /* Only for a person who signed in for real: the demo people are shared by every visitor. */
  if (viewer?.real) await endSessionsEverywhere(viewer.user.id);
  await signOut();
  revalidatePath("/", "layout");
  redirect(viewer?.real ? "/login?done=everywhere" : "/login?done=out");
}

/** The welcome page's first choice: a new household with this person as its guardian, then onboarding. */
export async function startFamilySpace() {
  const viewer = await getViewer();
  if (!viewer?.real) redirect("/login");
  const out = await startFamily(viewer.user.id, t.welcome.household);
  revalidatePath("/", "layout");
  redirect(out === "started" ? "/setup" : out === "has_household" ? viewer.home : "/login");
}
