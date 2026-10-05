import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signin as t } from "@/copy/signin";
import { getViewer } from "@/lib/auth";
import { WelcomeView } from "../view";

export const metadata: Metadata = { title: t.title, robots: { index: false, follow: false } };

/**
 * Where a person lands when they have signed in and belong nowhere yet: no household, no staff, counsellor or
 * sponsor area. They start a family space or join one. Nothing is made for them before they choose, so an invited
 * person is never left in a household of their own, unable to join the one they were invited to.
 */
export default async function WelcomePage() {
  const viewer = await getViewer();
  if (!viewer?.real) redirect("/login");
  if (viewer.home !== "/login") redirect(viewer.home);
  return <WelcomeView me={{ name: viewer.user.displayName, email: viewer.user.email }} />;
}
