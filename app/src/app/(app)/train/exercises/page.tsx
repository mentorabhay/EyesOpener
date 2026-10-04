import type { Metadata } from "next";
import Link from "next/link";
import { Card, EvidenceChip, PageHead, Pills } from "@/components/ui";
import { DoseLine } from "@/components/play/session-ui";
import { train as t } from "@/copy/train";
import { exerciseGroups, exercises, isStrong, mechanismOf } from "@/data";
import { requireMember } from "@/lib/session";
import { doseFor } from "@/lib/sessions";

export const metadata: Metadata = { title: t.exercises.title };

export default async function ExercisesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const evidence = sp.evidence === "all" ? "all" : "strong";
  const group = exerciseGroups.find((g) => g === sp.group) ?? "any";
  const m = await requireMember();
  const dose = await doseFor(m, "exercise");
  const shown = exercises.filter((e) => (evidence === "all" || isStrong(e.mechanism)) && (group === "any" || e.group === group));
  const l = t.exercises.labels;

  return (
    <>
      <PageHead
        title={t.exercises.title}
        sub={t.exercises.sub}
        stats={[{ value: shown.length, label: t.exercises.shown }, { value: shown.filter((e) => isStrong(e.mechanism)).length, label: t.exercises.strong }]}
      />
      <DoseLine dose={dose} enrolled={!!m.enrolment} />
      <div className="row">
        <Pills items={t.games.evidence} current={evidence} param="evidence" base={`/train/exercises?group=${encodeURIComponent(group)}`} />
        <Pills items={[{ key: "any", label: t.exercises.allGroups }, ...exerciseGroups.map((g) => ({ key: g, label: g }))]} current={group} param="group" base={`/train/exercises?evidence=${evidence}`} />
      </div>
      {shown.length ? (
        <Card>
          <div>
            {shown.map((e) => (
              <div className="ins" key={e.slug}>
                <div className="tx">
                  <div className="row"><Link href={`/train/exercises/${e.slug}`}><b>{e.name}</b></Link><EvidenceChip level={mechanismOf(e.mechanism).evidence} /></div>
                  <div>{e.how}</div>
                  <div className="sub">{l.for}: {e.for} · {l.gear}: {e.gear} · {l.dose}: {e.dose}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <p className="notice">{t.exercises.none} {evidence === "strong" && <Link href={`/train/exercises?group=${encodeURIComponent(group)}&evidence=all`}>{t.games.showAll}</Link>}</p>
      )}
    </>
  );
}
