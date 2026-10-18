import type { Metadata } from "next";
import Link from "next/link";
import { StepFlow } from "@/components/guide/flow";
import { listSteps } from "@/components/guide/steps";
import { guide as gw } from "@/copy/guide";
import { PageHead, Pills } from "@/components/ui";
import { kindOf } from "@/games/built";
import { DoseLine } from "@/components/play/session-ui";
import { train as t } from "@/copy/train";
import { catalogue, games, isStrong } from "@/data";
import { readStatuses } from "@/lib/catalogue";
import { requireMember } from "@/lib/session";
import { doseFor } from "@/lib/sessions";
import { isListed, statusOf } from "@/lib/status";
import { GameLibrary } from "@/components/library/lists";
import { forYou } from "@/lib/for-you";

export const generateMetadata = (): Metadata => ({ title: t.games.title });

export default async function TrainPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  /* Everything is shown, strongest evidence first. "Strong evidence" narrows the list. */
  const evidence = sp.evidence === "strong" ? "strong" : "all";
  const tag = catalogue.gameTags.find((g) => g.key === sp.tag)?.key ?? "any";
  const m = await requireMember();
  const [dose, statuses, top] = await Promise.all([doseFor(m, "game"), readStatuses(), forYou(m, "game")]);
  const status = (slug: string) => statusOf(statuses, "game", slug);
  /* A film with a task on top is cinema, not a game: those six are listed on the cinema page. */
  const listed = games.filter((g) => isListed(status(g.slug), m.tester));
  const films = listed.filter((g) => kindOf(g.slug) === "cinema").length;
  const shown = listed.filter((g) => kindOf(g.slug) !== "cinema" && (evidence === "all" || isStrong(g.mechanism)) && (tag === "any" || g.tags.includes(tag)));

  return (
    <>
      <PageHead
        title={t.games.title}
        stats={[{ value: shown.length, label: t.games.shown }, { value: shown.filter((g) => isStrong(g.mechanism)).length, label: t.games.strong }]}
      />
      <StepFlow steps={listSteps(gw.games, ["tap", "glasses", "chart"])} compact />
      <DoseLine dose={dose} enrolled={!!m.enrolment} tester={m.tester} />
      {shown.length ? (
        <GameLibrary list={shown} top={top} status={status} flat={evidence !== "all" || tag !== "any"} name={m.profile.displayName} between={<>
          <div className="row">
            <Pills items={t.games.evidence} current={evidence} param="evidence" base={`/train?tag=${tag}`} />
            <Pills items={catalogue.gameTags} current={tag} param="tag" base={`/train?evidence=${evidence}`} />
          </div>
          {films > 0 && <p className="notice">{t.games.films(films)} <Link href="/train/cinema">{t.games.toCinema}</Link></p>}
        </>} />
      ) : (
        <>
          <div className="row">
            <Pills items={t.games.evidence} current={evidence} param="evidence" base={`/train?tag=${tag}`} />
            <Pills items={catalogue.gameTags} current={tag} param="tag" base={`/train?evidence=${evidence}`} />
          </div>
          {films > 0 && <p className="notice">{t.games.films(films)} <Link href="/train/cinema">{t.games.toCinema}</Link></p>}
          <p className="notice">{t.games.none} {evidence === "strong" && <Link href={`/train?tag=${tag}&evidence=all`}>{t.games.showAll}</Link>}</p>
        </>
      )}
    </>
  );
}
