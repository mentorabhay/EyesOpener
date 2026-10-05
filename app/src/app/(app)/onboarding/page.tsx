import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import { onboarding as o } from "@/copy/onboarding";
import { settingsOf, testBlock } from "@/lib/eye-profile";
import { requireMember } from "@/lib/session";
import { Flow } from "./flow";

export const generateMetadata = (): Metadata => ({ title: o.title });

export default async function OnboardingPage() {
  const m = await requireMember();
  const block = testBlock(m);
  return (
    <>
      <PageHead title={o.title} sub={o.sub} />
      {block ? <p className="notice" data-b="warn">{o.blocked[block]}</p> : (
        <Flow
          key={m.profile.id}
          screen={m.device && { ppc: m.device.pxPerCm, dist: m.device.distanceCm, gamma: m.device.gamma }}
          saved={m.eye && settingsOf(m.eye)}
        />
      )}
    </>
  );
}
