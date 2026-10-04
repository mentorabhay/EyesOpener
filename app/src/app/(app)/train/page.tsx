import type { Metadata } from "next";
import Link from "next/link";
import { Chip, EvidenceChip, PageHead, Pills, SceneThumb } from "@/components/ui";
import { isBuilt } from "@/games/built";
import { DoseLine } from "@/components/play/session-ui";
import { train as t } from "@/copy/train";
import { catalogue, games, isStrong, mechanismOf } from "@/data";
import { requireMember } from "@/lib/session";
import { doseFor } from "@/lib/sessions";

export const metadata: Metadata = { title: t.games.title };

export default async function TrainPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const evidence = sp.evidence === "all" ? "all" : "strong";
  const tag = catalogue.gameTags.find((g) => g.key === sp.tag)?.key ?? "any";
  const m = await requireMember();
  const dose = await doseFor(m, "game");
  const shown = games.filter((g) => (evidence === "all" || isStrong(g.mechanism)) && (tag === "any" || g.tags.includes(tag)));

  return (
    <>
      <PageHead
        title={t.games.title}
        sub={t.games.sub}
        stats={[{ value: shown.length, label: t.games.shown }, { value: shown.filter((g) => isStrong(g.mechanism)).length, label: t.games.strong }]}
      />
      <DoseLine dose={dose} enrolled={!!m.enrolment} />
      <div className="row">
        <Pills items={t.games.evidence} current={evidence} param="evidence" base={`/train?tag=${tag}`} />
        <Pills items={catalogue.gameTags} current={tag} param="tag" base={`/train?evidence=${evidence}`} />
      </div>
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
                </div>
                <p>{g.for}</p>
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
