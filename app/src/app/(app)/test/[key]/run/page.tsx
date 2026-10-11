import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { StepFlow } from "@/components/guide/flow";
import { checkupSteps } from "@/components/guide/steps";
import { PageHead } from "@/components/ui";
import { test as c } from "@/copy/test";
import { testByKey } from "@/data";
import { eyeOf, testBlock } from "@/lib/eye-profile";
import { requireMember } from "@/lib/session";
import { setupOf } from "@/lib/setup";
import { SetupGate } from "@/components/setup/setup";
import { isRunKey, needsScreen, runPath } from "../../results";
import { Runner } from "./runner";

type Props = { params: Promise<{ key: string }> };
/** Under this age a grown-up runs the near point check. */
const HELPER_AGE = 12;
/** The check-ups seen through the red-cyan glasses, besides the balance check-up. */
const TWO_EYE = new Set(["stereo", "fusion", "fusion_break", "suppression"]);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = testByKey((await params).key);
  return { title: t && c.run.title(t.name) };
}

export default async function RunPage({ params }: Props) {
  const { key } = await params;
  const t = testByKey(key);
  if (!t?.built) notFound();
  /* one run of the fusion range saves the break and the recovery */
  if (runPath(key) !== `/test/${key}/run`) redirect(runPath(key));
  if (!isRunKey(key)) notFound();
  const m = await requireMember();
  const block = testBlock(m);
  if (block === "seat") notFound();
  /* sizes, depth steps and fusion demand need the true size of this screen and the viewing distance: never guessed */
  if (needsScreen(key) && !m.device) redirect("/setup");
  /* a two-eye check-up waits for setup; the balance check-up is itself a step of setup */
  const s = TWO_EYE.has(key) ? await setupOf(m) : null;
  const head = <PageHead title={c.run.title(t.name)} crumb={[{ href: "/test", label: c.title }, { href: `/test/${key}`, label: t.name }]} />;
  if (s?.held && !block) return <>{head}<SetupGate s={s} name={m.profile.displayName} /></>;
  return (
    <>
      {head}
      {!block && <StepFlow steps={checkupSteps(key, m.eye ? eyeOf(m.eye.cyanEye) : "L")} compact />}
      {block ? <p className="notice" data-b="warn">{c.blocked[block]}</p> : (
        <Runner
          key={m.profile.id} testKey={key}
          screen={m.device && { ppc: m.device.pxPerCm, dist: m.device.distanceCm, gamma: m.device.gamma }}
          /* the eye behind the cyan lens: the weaker eye, or the stronger one when the inks are swapped; the left eye until a weaker eye is known */
          cyanEye={m.eye ? eyeOf(m.eye.cyanEye) : "L"}
          contrast={m.eye?.strongContrast ?? 1}
          swapped={m.eye?.weakInk === "red"}
          young={m.age !== null && m.age < HELPER_AGE}
          child={m.profile.kind === "child"}
        />
      )}
    </>
  );
}
