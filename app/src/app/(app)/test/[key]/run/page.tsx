import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHead } from "@/components/ui";
import { test as c } from "@/copy/test";
import { testByKey } from "@/data";
import { eyeOf, testBlock } from "@/lib/eye-profile";
import { requireMember } from "@/lib/session";
import { isRunKey, needsScreen, runPath } from "../../results";
import { Runner } from "./runner";

type Props = { params: Promise<{ key: string }> };
/** Under this age a grown-up runs the near point check. */
const HELPER_AGE = 12;

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
  if (needsScreen(key) && !m.device) redirect("/onboarding");
  return (
    <>
      <PageHead title={c.run.title(t.name)} sub={t.what} crumb={[{ href: "/test", label: c.title }, { href: `/test/${key}`, label: t.name }]} />
      {block ? <p className="notice" data-b="warn">{c.blocked[block]}</p> : (
        <Runner
          key={m.profile.id} testKey={key}
          screen={m.device && { ppc: m.device.pxPerCm, dist: m.device.distanceCm, gamma: m.device.gamma }}
          /* the weaker eye wears the cyan lens; the left eye until a weaker eye is known */
          cyanEye={m.eye ? eyeOf(m.eye.cyanEye) : "L"}
          contrast={m.eye?.strongContrast ?? 1}
          young={m.age !== null && m.age < HELPER_AGE}
          child={m.profile.kind === "child"}
        />
      )}
    </>
  );
}
