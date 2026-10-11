// Eyes Opener: Page controller component for the app/src/app/(app)/train/games/[slug] web route.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StepFlow } from "@/components/guide/flow";
import { Facts, Fold, More } from "@/components/guide/more";
import { gameSteps } from "@/components/guide/steps";
import { GlassesNote, labelsFor } from "@/components/play/how-to";
import { History } from "@/components/play/results";
import { DoseLine } from "@/components/play/session-ui";
import { Btn, Card, Chip, Empty, EvidenceChip, PageHead, SceneThumb } from "@/components/ui";
import { guide as gw } from "@/copy/guide";
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

/**
 * The game's own page. On top: the steps, drawn as moving pictures (glasses, when to act, when to stop), then the way
 * in and the member's record. What the game is, who it is for and the glasses in full sit folded under "Read more".
 * The full manual has its own page.
 */
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

  const cyan = m.eye?.cyanEye === "right" ? "R" as const : "L" as const;

  return (
    <>
      <PageHead title={g.name} crumb={film ? [{ href: "/train/cinema", label: t.cinema.title }] : [{ href: "/train", label: t.game.crumb }]} />
      <StepFlow steps={gameSteps({ guide, gear: g.gear, cyan, care: kind === "care" })} />
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
          <div className="row">
            {film && <Chip>{t.cinema.activity}</Chip>}
            <EvidenceChip level={mech.evidence} />
            {(status !== "open" || m.tester) && <Chip tone={status === "open" ? "ok" : status === "counsellor" ? "plain" : "warn"}>{t.game.statusFor[status]}</Chip>}
          </div>
        </Card>
        {kind && kind !== "care" ? (
          <Card title={t.game.results} span={5}>
            <History rows={past} labels={labelsFor(guide, results.game)} lower={lower} score />
          </Card>
        ) : (
          <Card title={x.what} span={5}><p>{guide?.what ?? w.play}</p></Card>
        )}
      </div>
      <More title={gw.moreAbout(g.name)}>
        <Facts items={[{ label: k.for, value: w.who }, { label: k.gear, value: w.gear }, { label: k.session, value: w.session }]} />
        <Fold title={x.what}><p>{guide?.what ?? w.play}</p><p className="muted">{w.purpose}</p></Fold>
        {/red-cyan/i.test(g.gear) && <Fold title={gw.game.glassesMore}><GlassesNote gear={g.gear} cyanEye={cyan} joined={!!guide?.joined} swapped={m.eye?.weakInk === "red"} /></Fold>}
        <p className="small"><Link href={`/train/games/${slug}/manual`}>{x.fullGuide}</Link></p>
      </More>
    </>
  );
}
