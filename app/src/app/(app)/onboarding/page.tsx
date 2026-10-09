import { redirect } from "next/navigation";

/** Onboarding is now Setup (decision D of the setup plan, 9 October 2026): the old address opens it. */
export default function OnboardingPage() {
  redirect("/setup");
}
