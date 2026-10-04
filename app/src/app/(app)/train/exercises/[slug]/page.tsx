import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, EvidenceChip, PageHead } from "@/components/ui";
import { train as t } from "@/copy/train";
import { evidenceOf, exerciseBySlug, mechanismOf } from "@/data";
import { requireMember } from "@/lib/session";
import { doseFor } from "@/lib/sessions";
import { Routine } from "./routine";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: exerciseBySlug((await params).slug)?.name };
}

export default async function ExercisePage({ params }: Props) {
  const { slug } = await params;
  const e = exerciseBySlug(slug);
  if (!e) notFound();
  const dose = await doseFor(await requireMember(), "exercise");
  const mech = mechanismOf(e.mechanism);
  const k = t.exercise.kv;

  return (
    <>
      <PageHead title={e.name} sub={e.group} crumb={[{ href: "/train/exercises", label: t.exercise.crumb }]} />
      <div className="bento">
        <Card title={t.exercise.steps} span={7}>
          <p>{e.how}</p>
          <dl className="kv">
            <div><dt>{k.purpose}</dt><dd>{e.purpose}</dd></div>
            <div><dt>{k.for}</dt><dd>{e.for}</dd></div>
            <div><dt>{k.gear}</dt><dd>{e.gear}</dd></div>
            <div><dt>{k.dose}</dt><dd>{e.dose}</dd></div>
          </dl>
        </Card>
        <Card title={t.exercise.timer} span={5}>
          <p className="muted small">{t.exercise.timerNote}</p>
          <Routine slug={slug} dose={dose} />
        </Card>
        <Card title={t.exercise.evidence} right={<EvidenceChip level={mech.evidence} />}>
          <p><b>{mech.label}.</b> {mech.basis}</p>
          <p className="muted small">{evidenceOf(mech.evidence).meaning}</p>
        </Card>
      </div>
    </>
  );
}
