import type { Metadata } from "next";
import { StepFlow } from "@/components/guide/flow";
import { Icon } from "@/components/guide/icons";
import { More } from "@/components/guide/more";
import { checkupSteps } from "@/components/guide/steps";
import { PageHead } from "@/components/ui";
import { setup as su } from "@/copy/setup";
import { onboarding as o } from "@/copy/onboarding";
import { settingsOf, testBlock, weakInkOf } from "@/lib/eye-profile";
import { suggestInk } from "@/lib/lens-choice";
import { mayCalibrate, screenFacts } from "@/lib/screen-rules";
import { requireMember } from "@/lib/session";
import { setupOf } from "@/lib/setup";
import { Flow } from "./flow";

export const generateMetadata = (): Metadata => ({ title: o.title });

/** /setup/eyes: the screen's size, the safety questions and the eye check for the active profile, then the lens choice and the balance. */
export default async function EyeCheckPage() {
  const m = await requireMember();
  const block = testBlock(m);
  const s = await setupOf(m);
  const leak = m.device ? screenFacts(m.device).leak : null;
  return (
    <>
      <PageHead title={o.title} crumb={[{ href: "/setup", label: o.crumb }]} />
      {!block && (
        <StepFlow compact steps={[
          ...checkupSteps("acuity", "L").slice(0, 3),
          { title: su.steps.lens.name, text: su.steps.lens.what, pic: <Icon k="swap" /> },
          { title: su.steps.balance.name, text: su.steps.balance.what, pic: <Icon k="eye" /> },
        ]} />
      )}
      {block ? <p className="notice" data-b="warn">{o.blocked[block]}</p> : (
        <Flow
          key={m.profile.id}
          screen={m.device && { ppc: m.device.pxPerCm, dist: m.device.distanceCm, gamma: m.device.gamma }}
          saved={m.eye && settingsOf(m.eye)}
          weakInk={weakInkOf(m.profile.weakInk)}
          choose={mayCalibrate(m) ? suggestInk(leak) : null}
          glassesReady={s.screenReady || m.tester}
        />
      )}
      <More hint={o.sub}><p>{o.sub}</p></More>
    </>
  );
}
