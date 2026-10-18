import type { Metadata } from "next";
import { jar as cookieJar } from "@/lib/cookie-jar";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { auth as demo } from "@/copy/auth";
import { signin as t } from "@/copy/signin";
import { db, schema } from "@/db";
import { CHILD_COOKIE, demoHere, demoLoginOn, getViewer, isDemoPerson, type Viewer } from "@/lib/auth";
import { getMember } from "@/lib/session";
import { cleanNext } from "@/lib/signin/flow";
import { holdOf, loginGate } from "@/lib/signin/hold";
import { settingsProblems, signInSettings } from "@/lib/signin/settings";
import { mailSettings } from "@/lib/signin/mail";
import { testersOf } from "@/lib/demo/copy";
import { LoginView, type DemoGroup } from "./view";

export const generateMetadata = (): Metadata => ({ title: t.title, robots: { index: false, follow: false } });

/** The seeded people of the demo, by the side of Eyes Opener each shows. */
async function demoGroups(viewer: Viewer | null): Promise<DemoGroup[]> {
  const users = await db.select().from(schema.appUser).orderBy(asc(schema.appUser.createdAt));
  const sponsors = await db.select({ userId: schema.sponsorUser.userId, name: schema.sponsor.name, status: schema.sponsor.status })
    .from(schema.sponsorUser).innerJoin(schema.sponsor, eq(schema.sponsor.id, schema.sponsorUser.sponsorId));
  /* The seeded households only: a tester's copy (src/lib/demo/copy.ts) is reached through its seeded one. */
  const all = await db.select().from(schema.account).where(eq(schema.account.isDemo, true));
  const households = all.filter((h) => !h.demoCopyOf);
  const demoIds = new Set(households.map((h) => h.id));
  /* Signed in as a person of a tester's copy: that person's seeded original shows as signed in, with the tester's name. */
  const copy = viewer?.user.accountId ? all.find((h) => h.id === viewer.user.accountId && h.demoCopyOf) : undefined;
  const local = (email: string) => email.slice(0, email.lastIndexOf("@")).split("+")[0];
  /* Only seeded people are offered: nobody who signed in for real is ever listed here, and `signInAs` refuses them too. */
  const seeded = users.filter((u) => isDemoPerson(u, !!u.accountId && demoIds.has(u.accountId)));
  const show = (u: (typeof users)[number], role: string) => ({
    id: u.id, name: u.displayName, email: u.email, role,
    current: viewer?.user.id === u.id || (!!copy && copy.demoCopyOf === u.accountId && local(viewer!.user.email) === local(u.email)),
  });
  const family = households[0];
  return [
    {
      ...demo.groups.household, people: seeded.filter((u) => u.accountId && demoIds.has(u.accountId)).map((u) => show(u, demo.seat[u.seat ?? "guardian"])),
      tester: { testers: family ? await testersOf(family.id) : [], mine: copy?.demoTester ?? null },
    },
    { ...demo.groups.staff, people: seeded.filter((u) => u.staffRole).map((u) => show(u, demo.staff[u.staffRole!])) },
    { ...demo.groups.counsellor, people: seeded.filter((u) => u.isCounsellor).map((u) => show(u, u.counsellorVerifiedAt ? demo.counsellor.verified : demo.counsellor.waiting)) },
    { ...demo.groups.sponsor, people: sponsors.flatMap((sp) => { const u = seeded.find((x) => x.id === sp.userId); return u ? [show(u, demo.sponsor[sp.status])] : []; }) },
  ];
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; done?: string; why?: string }> }) {
  const q = await searchParams;
  const settings = signInSettings();
  /* Half-made settings leave sign-in "not set up". The server's log says which one is wrong, never its value. */
  if (!settings) for (const problem of settingsProblems()) console.warn(`[sign-in] ${problem}`);

  /* Child mode: a child cannot reach this page while the app can open for whoever is signed in. */
  const hold = await holdOf((await cookieJar()).get(CHILD_COOKIE)?.value);
  const gate = loginGate(hold.state, hold.state === "live" && !!(await getMember())?.childMode);
  if (gate === "to_today") redirect("/today");

  const viewer = await getViewer();
  return (
    <LoginView
      signIn={settings && { google: settings.googleClientId ? { clientId: settings.googleClientId, script: settings.endpoints.gsi } : null, code: !!mailSettings() }}
      demo={(await demoHere()) ? await demoGroups(viewer) : null}
      demoLocked={demoLoginOn() && !(await demoHere())}
      me={viewer?.real ? { name: viewer.user.displayName, email: viewer.user.email, go: viewer.home === "/login" ? "/login/welcome" : viewer.home } : null}
      held={gate === "sign_in_held"}
      next={cleanNext(q.next)}
      done={typeof q.done === "string" && Object.hasOwn(t.done, q.done) ? t.done[q.done] : undefined}
      why={q.why === "child_mode" ? t.refused.child_mode : q.why === "demo_name" ? demo.tester.need : q.why === "demo_bad" ? demo.tester.bad : q.why === "demo_failed" ? demo.tester.failed : undefined}
    />
  );
}
