import type { Metadata } from "next";
import Link from "next/link";
import { StepFlow } from "@/components/guide/flow";
import { listSteps } from "@/components/guide/steps";
import { guide as gw } from "@/copy/guide";
import { PageHead, Pills } from "@/components/ui";
import { DoseLine } from "@/components/play/session-ui";
import { train as t } from "@/copy/train";
import { exerciseGroups, exercises, isStrong, programmeBySlug } from "@/data";
import { guideFor } from "@/data/guides";
import { readStatuses } from "@/lib/catalogue";
import { requireMember } from "@/lib/session";
import { doseFor } from "@/lib/sessions";
import { isListed, statusOf } from "@/lib/status";
import { ExerciseLibrary } from "@/components/library/lists";
import { forYou } from "@/lib/for-you";

export const generateMetadata = (): Metadata => ({ title: t.exercises.title });

export default async function ExercisesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  /* Everything is shown, strongest evidence first. "Strong evidence" narrows the list. */
  const evidence = sp.evidence === "strong" ? "strong" : "all";
  const group = exerciseGroups.find((g) => g === sp.group) ?? "any";
  const m = await requireMember();
  const [dose, statuses, top] = await Promise.all([doseFor(m, "exercise"), readStatuses(), forYou(m, "exercise")]);
  const status = (slug: string) => statusOf(statuses, "exercise", slug);
  const shown = exercises.filter((e) => isListed(status(e.slug), m.tester) && (evidence === "all" || isStrong(e.mechanism)) && (group === "any" || e.group === group));
  const tool = (slug: string) => { const g = guideFor(slug); return g ? t.exercise.tool[g.tool.kind] : undefined; };
  const mine = m.enrolment ? programmeBySlug(m.enrolment.programme)?.group ?? null : null;

  return (
    <>
      <PageHead
        title={t.exercises.title}
        stats={[{ value: shown.length, label: t.exercises.shown }, { value: shown.filter((e) => isStrong(e.mechanism)).length, label: t.exercises.strong }]}
      />
      <StepFlow steps={listSteps(gw.exercises, ["list", "timer", "chart"])} compact />
      <DoseLine dose={dose} enrolled={!!m.enrolment} tester={m.tester} />
      {shown.length ? (
        <ExerciseLibrary list={shown} top={top} status={status} tool={tool} flat={evidence !== "all" || group !== "any"} name={m.profile.displayName} mine={mine} between={<>
          <div className="row">
            <Pills items={t.games.evidence} current={evidence} param="evidence" base={`/train/exercises?group=${encodeURIComponent(group)}`} />
            <Pills items={[{ key: "any", label: t.exercises.allGroups }, ...exerciseGroups.map((g) => ({ key: g, label: g }))]} current={group} param="group" base={`/train/exercises?evidence=${evidence}`} />
          </div>
        </>} />
      ) : (
        <>
          <div className="row">
            <Pills items={t.games.evidence} current={evidence} param="evidence" base={`/train/exercises?group=${encodeURIComponent(group)}`} />
            <Pills items={[{ key: "any", label: t.exercises.allGroups }, ...exerciseGroups.map((g) => ({ key: g, label: g }))]} current={group} param="group" base={`/train/exercises?evidence=${evidence}`} />
          </div>
          <p className="notice">{t.exercises.none} {evidence === "strong" && <Link href={`/train/exercises?group=${encodeURIComponent(group)}&evidence=all`}>{t.games.showAll}</Link>}</p>
        </>
      )}
    </>
  );
}
