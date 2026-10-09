import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cues } from "@/components/play/cue";
import { GlassesNote, labelsFor } from "@/components/play/how-to";
import { History } from "@/components/play/results";
import { DoseLine } from "@/components/play/session-ui";
import { Btn, Card, Chip, Empty, EvidenceChip, PageHead, SceneThumb } from "@/components/ui";
import { results } from "@/copy/results";
import { train as t } from "@/copy/train";
import { gameBySlug, mechanismOf } from "@/data";
import { gameGuideFor } from "@/data/game-guides";
import { kindOf } from "@/games/built";
import { requireMember } from "@/lib/session";
import { doseFor, pastSessions, statusFor } from "@/lib/sessions";
import { isListed } from "@/lib/status";
import { gameWords } from "@/data/words";

type Props = { params: Promise<{ slug: string }> };
const x = t.game.guide;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: gameBySlug((await params).slug)?.name };
}

/** The game's own page: what it is, the pictures of when to act, the member's record, and the way in. The full manual has its own page. */
export default async function GamePage({ params }: Props) {
  const { slug } = await params;
  const g = gameBySlug(slug);
  if (!g) notFound();
  const m = await requireMember();
  const kind = kindOf(slug);
  const status = await statusFor("game", slug);
  if (!isListed(status, m.tester)) notFound();
  const [dose, past] = await Promise.all([doseFor(m, "game", slug), pastSessions(m, "game", slug)]);
  const mech = mechanismOf(g.mechanism);
  /* the catalogue's lines in the reader's language (src/data/words.ts) */
  const w = gameWords(g);
  const guide = gameGuideFor(slug);
  const k = t.game.kv;
  const film = kind === "cinema";
  const lower = guide ? guide.measures.filter((q) => q.better === "lower").map((q) => q.key) : results.lowerIsBetter;

  return (
    <>
      <PageHead title={g.name} sub={w.purpose} crumb={film ? [{ href: "/train/cinema", label: t.cinema.title }] : [{ href: "/train", label: t.game.crumb }]} />
      <div className="row">
        {film && <Chip>{t.cinema.activity}</Chip>}
        <EvidenceChip level={mech.evidence} />
        {(status !== "open" || m.tester) && <Chip tone={status === "open" ? "ok" : status === "counsellor" ? "plain" : "warn"}>{t.game.statusFor[status]}</Chip>}
      </div>
      <GlassesNote gear={g.gear} cyanEye={m.eye?.cyanEye === "right" ? "R" : "L"} joined={!!guide?.joined} swapped={m.eye?.weakInk === "red"} />
      <div className="bento">
        <Card span={7}>
          <SceneThumb thumb={g.thumb} label={g.name} />
          {kind === "care" ? (
            <div className="row"><Btn href={`/train/games/${slug}/play`} kind="g">{t.game.open}</Btn><Btn href={`/train/games/${slug}/manual`}>{t.manual.link}</Btn></div>
          ) : kind ? (
            <div className="row">
              {dose.ok && <Btn href={`/train/games/${slug}/play`} kind="g">{t.game.play}</Btn>}
              <Btn href={`/train/games/${slug}/manual`}>{t.manual.link}</Btn>
              <DoseLine dose={dose} enrolled={!!m.enrolment} tester={m.tester} />
            </div>
          ) : <Empty title={t.game.notBuilt.title}><span>{t.game.notBuilt.body}</span></Empty>}
        </Card>
        <Card title={x.what} span={5}>
          <p>{guide?.what ?? w.play}</p>
          <dl className="kv">
            <div><dt>{k.for}</dt><dd>{w.who}</dd></div>
            <div><dt>{k.gear}</dt><dd>{w.gear}</dd></div>
            <div><dt>{k.session}</dt><dd>{w.session}</dd></div>
          </dl>
        </Card>
        {guide && guide.cues.length > 0 && <Card title={x.cues}><Cues cues={guide.cues} tones={x.tone} /></Card>}
        {kind && kind !== "care" && (
          <Card title={t.game.results}>
            <History rows={past} labels={labelsFor(guide, results.game)} lower={lower} score />
          </Card>
        )}
      </div>
    </>
  );
}
