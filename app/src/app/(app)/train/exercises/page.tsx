import type { Metadata } from "next";
import Link from "next/link";
import { Card, Chip, EvidenceChip, PageHead, Pills } from "@/components/ui";
import { DoseLine } from "@/components/play/session-ui";
import { train as t } from "@/copy/train";
import { exerciseGroups, exercises, isStrong, mechanismOf } from "@/data";
import { guideFor } from "@/data/guides";
import { readStatuses } from "@/lib/catalogue";
import { requireMember } from "@/lib/session";
import { doseFor } from "@/lib/sessions";
import { isListed, statusOf } from "@/lib/status";
import { exerciseWords } from "@/data/words";

export const generateMetadata = (): Metadata => ({ title: t.exercises.title });

export default async function ExercisesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  /* Everything is shown, strongest evidence first. "Strong evidence" narrows the list. */
  const evidence = sp.evidence === "strong" ? "strong" : "all";
  const group = exerciseGroups.find((g) => g === sp.group) ?? "any";
  const m = await requireMember();
  const [dose, statuses] = await Promise.all([doseFor(m, "exercise"), readStatuses()]);
  const status = (slug: string) => statusOf(statuses, "exercise", slug);
  const shown = exercises.filter((e) => isListed(status(e.slug), m.tester) && (evidence === "all" || isStrong(e.mechanism)) && (group === "any" || e.group === group));
  const l = t.exercises.labels;

  return (
    <>
      <PageHead
        title={t.exercises.title}
        sub={t.exercises.sub}
        stats={[{ value: shown.length, label: t.exercises.shown }, { value: shown.filter((e) => isStrong(e.mechanism)).length, label: t.exercises.strong }]}
      />
      <DoseLine dose={dose} enrolled={!!m.enrolment} tester={m.tester} />
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
                  <div className="row">
                    <Link href={`/train/exercises/${e.slug}`}><b>{e.name}</b></Link>
                    <EvidenceChip level={mechanismOf(e.mechanism).evidence} />
                    {guideFor(e.slug) && <Chip>{t.exercise.tool[guideFor(e.slug)!.tool.kind]}</Chip>}
                    {status(e.slug) !== "open" && <Chip tone={status(e.slug) === "counsellor" ? "plain" : "warn"}>{t.exercise.statusFor[status(e.slug)]}</Chip>}
                  </div>
                  <div>{exerciseWords(e).how}</div>
                  <div className="sub">{l.for}: {exerciseWords(e).who} · {l.gear}: {exerciseWords(e).gear} · {l.dose}: {exerciseWords(e).dose}</div>
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
