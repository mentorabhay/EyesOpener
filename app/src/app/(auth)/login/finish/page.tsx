import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signin as t } from "@/copy/signin";
import { CHILD_COOKIE } from "@/lib/auth";
import { getMember } from "@/lib/session";
import { cleanNext, looksLikeCode, readPending } from "@/lib/signin/flow";
import { holdOf, loginGate } from "@/lib/signin/hold";
import { signInSettings } from "@/lib/signin/settings";
import { FinishView } from "../view";

/* The address of this page carries a one-time code: it is kept out of search engines, and other sites are never told the address. */
export const metadata: Metadata = { title: t.finish.title, robots: { index: false, follow: false }, referrer: "no-referrer" };

/**
 * The page a sign-in link in an email returns to. Firebase adds `mode=signIn` and the one-time `oobCode`.
 * Opening the page finishes nothing: the form does, so a mail scanner that fetches the link uses nothing up.
 */
export default async function FinishPage({ searchParams }: { searchParams: Promise<{ mode?: string; oobCode?: string; next?: string }> }) {
  const q = await searchParams;
  const jar = await cookies();
  const hold = await holdOf(jar.get(CHILD_COOKIE)?.value);
  const gate = loginGate(hold.state, hold.state === "live" && !!(await getMember())?.childMode);
  if (gate === "to_today") redirect("/today");

  const setUp = !!signInSettings();
  const code = setUp && q.mode === "signIn" && looksLikeCode(q.oobCode) ? q.oobCode : null;
  return <FinishView setUp={setUp} code={code} known={code ? readPending(jar)?.email ?? null : null} held={gate === "sign_in_held"} next={cleanNext(q.next)} />;
}
