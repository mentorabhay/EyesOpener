import type { Metadata } from "next";
import Link from "next/link";
import { Chip, EvidenceChip, PageHead, Pills, SceneThumb } from "@/components/ui";
import { isBuilt, kindOf } from "@/games/built";
import { DoseLine } from "@/components/play/session-ui";
import { train as t } from "@/copy/train";
import { catalogue, games, isStrong, mechanismOf } from "@/data";
import { readStatuses } from "@/lib/catalogue";
import { requireMember } from "@/lib/session";
import { doseFor } from "@/lib/sessions";
import { forWhom, isListed, statusOf } from "@/lib/status";

export const metadata: Metadata = { title: t.games.title };

export default async function TrainPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  /* Everything is shown, strongest evidence first. "Strong evidence" narrows the list. */
  const evidence = sp.evidence === "strong" ? "strong" : "all";
  const tag = catalogue.gameTags.find((g) => g.key === sp.tag)?.key ?? "any";
  const m = await requireMember();
  const [dose, statuses] = await Promise.all([doseFor(m, "game"), readStatuses()]);
  const status = (slug: string) => statusOf(statuses, "game", slug);
  /* A film with a task on top is cinema, not a game: those six are listed on the cinema page. */
  const listed = games.filter((g) => isListed(status(g.slug), m.tester));
  const films = listed.filter((g) => kindOf(g.slug) === "cinema").length;
  const shown = listed.filter((g) => kindOf(g.slug) !== "cinema" && (evidence === "all" || isStrong(g.mechanism)) && (tag === "any" || g.tags.includes(tag)));

  return (
    <>
      <PageHead
        title={t.games.title}
        sub={t.games.sub}
        stats={[{ value: shown.length, label: t.games.shown }, { value: shown.filter((g) => isStrong(g.mechanism)).length, label: t.games.strong }]}
      />
      <DoseLine dose={dose} enrolled={!!m.enrolment} tester={m.tester} />
      <div className="row">
        <Pills items={t.games.evidence} current={evidence} param="evidence" base={`/train?tag=${tag}`} />
        <Pills items={catalogue.gameTags} current={tag} param="tag" base={`/train?evidence=${evidence}`} />
      </div>
      {films > 0 && <p className="notice">{t.games.films(films)} <Link href="/train/cinema">{t.games.toCinema}</Link></p>}
      {shown.length ? (
        <div className="grid-cards">
          {shown.map((g) => (
            <Link key={g.slug} href={`/train/games/${g.slug}`} className="gcard">
              <SceneThumb thumb={g.thumb} label={g.name} />
              <div className="b">
                <h3>{g.name}</h3>
                <div className="row">
                  <EvidenceChip level={mechanismOf(g.mechanism).evidence} />
                  {isBuilt(g.slug) && <Chip tone="grad">{t.games.playable}</Chip>}
                  {status(g.slug) !== "open" && <Chip tone={status(g.slug) === "counsellor" ? "plain" : "warn"}>{t.game.statusFor[status(g.slug)]}</Chip>}
                </div>
                <p>{forWhom(g.for)}</p>
                <p className="small">{g.session}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="notice">{t.games.none} {evidence === "strong" && <Link href={`/train?tag=${tag}&evidence=all`}>{t.games.showAll}</Link>}</p>
      )}
    </>
  );
}
