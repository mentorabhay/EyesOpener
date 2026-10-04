import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Btn, Card, Empty, EvidenceChip, PageHead, SceneThumb } from "@/components/ui";
import { kindOf } from "@/games/built";
import { DoseLine } from "@/components/play/session-ui";
import { train as t } from "@/copy/train";
import { evidenceOf, gameBySlug, mechanismOf } from "@/data";
import { requireMember } from "@/lib/session";
import { doseFor } from "@/lib/sessions";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: gameBySlug((await params).slug)?.name };
}

export default async function GamePage({ params }: Props) {
  const { slug } = await params;
  const g = gameBySlug(slug);
  if (!g) notFound();
  const m = await requireMember();
  const kind = kindOf(slug);
  const dose = await doseFor(m, "game", slug);
  const mech = mechanismOf(g.mechanism);
  const k = t.game.kv;

  return (
    <>
      <PageHead title={g.name} sub={g.purpose} crumb={[{ href: "/train", label: t.game.crumb }]} />
      <div className="bento">
        <Card span={7}>
          <SceneThumb thumb={g.thumb} label={g.name} />
          {kind === "care" ? (
            <div className="row"><Btn href={`/train/games/${slug}/play`} kind="g">{t.game.open}</Btn></div>
          ) : kind ? (
            <div className="row">
              {dose.ok && <Btn href={`/train/games/${slug}/play`} kind="g">{t.game.play}</Btn>}
              <DoseLine dose={dose} enrolled={!!m.enrolment} />
            </div>
          ) : <Empty title={t.game.notBuilt.title}><span>{t.game.notBuilt.body}</span></Empty>}
        </Card>
        <Card span={5}>
          <dl className="kv">
            <div><dt>{k.play}</dt><dd>{g.play}</dd></div>
            <div><dt>{k.purpose}</dt><dd>{g.purpose}</dd></div>
            <div><dt>{k.for}</dt><dd>{g.for}</dd></div>
            <div><dt>{k.playsOn}</dt><dd>{g.playsOn}</dd></div>
            <div><dt>{k.gear}</dt><dd>{g.gear}</dd></div>
            <div><dt>{k.session}</dt><dd>{g.session}</dd></div>
          </dl>
        </Card>
        <Card title={t.game.evidence} right={<EvidenceChip level={mech.evidence} />}>
          <p><b>{mech.label}.</b> {mech.basis}</p>
          <p className="muted small">{evidenceOf(mech.evidence).meaning}</p>
        </Card>
      </div>
    </>
  );
}
