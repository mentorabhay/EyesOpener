// Eyes Opener: Page controller component for the app/src/app/(app)/train/cinema web route.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { History } from "@/components/play/results";
import Link from "next/link";
import { planFor, STANDARD_PLAN } from "@/components/film/chapters";
import { StepFlow } from "@/components/guide/flow";
import { Icon } from "@/components/guide/icons";
import { Fold, More } from "@/components/guide/more";
import { Card, EvidenceChip, PageHead, SceneThumb } from "@/components/ui";
import { guide as gw } from "@/copy/guide";
import { cinema as c } from "@/copy/cinema";
import { train as t } from "@/copy/train";
import { games, mechanismOf } from "@/data";
import { percent } from "@/engine";
import { kindOf } from "@/games/built";
import { readStatuses } from "@/lib/catalogue";
import { requireMember } from "@/lib/session";
import { setupOf } from "@/lib/setup";
import { SetupGate } from "@/components/setup/setup";
import { CINEMA, doseFor, pastSessions, statusFor } from "@/lib/sessions";
import { forWhom, isListed, statusOf } from "@/lib/status";
import css from "./cinema.module.css";
import { Player } from "./player";

export const generateMetadata = (): Metadata => ({ title: t.cinema.title });

export default async function CinemaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const m = await requireMember();
  if (!isListed(await statusFor("film", CINEMA), m.tester)) notFound();
  /* Chapters and breaks are the same for every family. Only a staff test household may shorten them, to try a break without waiting. */
  const asked = await searchParams;
  const plan = planFor(m.tester, { chapter: asked.chapter, rest: asked.break });
  const cyanEye = m.eye ? (m.eye.cyanEye === "right" ? "R" as const : "L" as const) : null;
  const [dose, past, setup] = await Promise.all([doseFor(m, "film", CINEMA), pastSessions(m, "film", CINEMA), setupOf(m)]);
  const contrast = m.eye?.strongContrast ?? 1;
  const statuses = await readStatuses();
  /* Films with a task on top: the same cinema, with something to do while watching. */
  const activities = games.filter((g) => kindOf(g.slug) === "cinema" && isListed(statusOf(statuses, "game", g.slug), m.tester));

  return (
    <>
      <PageHead title={t.cinema.title} />
      <StepFlow steps={[
        { title: gw.cinema[0].title, text: gw.cinema[0].text, pic: <Icon k="film" /> },
        { title: gw.cinema[1].title, text: cyanEye ? gw.game.glassesWay(cyanEye) : gw.cinema[1].text, pic: <Icon k="glasses" cyan={cyanEye ?? "L"} /> },
        { title: gw.cinema[2].title, text: gw.cinema[2].text, pic: <Icon k="far" /> },
      ]} compact />
      {!m.eye && <p className="notice" data-b="warn">{t.noEye.body} <Link href="/setup">{t.noEye.cta}</Link></p>}
      {plan.shortened && <p className="notice" role="note">{c.how.test(plan.chapterSeconds, plan.breakSeconds, STANDARD_PLAN)}</p>}
      {setup.held && <SetupGate s={setup} name={m.profile.displayName} />}
      <div className="bento">
        {!setup.held && <Player itemSlug={CINEMA} contrast={contrast} dose={dose} cyanEye={cyanEye} weakInk={m.eye?.weakInk === "red" ? "red" : "cyan"} plan={plan} profileId={m.profile.id} tester={m.tester} />}
        <Card span={4}>
          <div className="hstat">
            <div className="v tnum">{percent(contrast)}</div>
            <div className="l">{t.cinema.contrast}. {m.eye ? t.cinema.fromProfile : t.cinema.standard}.</div>
          </div>
          <p className="small">{t.cinema.onDevice}</p>
        </Card>
        <Card span={8} title={t.cinema.results}>
          <div className={css.record}><History rows={past} labels={c.labels} /></div>
        </Card>
      </div>
      {activities.length > 0 && (
        <>
          <h2>{t.cinema.activities.title}</h2>
          <div className="grid-cards">
            {activities.map((g) => (
              <Link key={g.slug} href={`/train/games/${g.slug}`} className="gcard">
                <SceneThumb thumb={g.thumb} label={g.name} />
                <div className="b">
                  <h3>{g.name}</h3>
                  <div className="row"><EvidenceChip level={mechanismOf(g.mechanism).evidence} /></div>
                  <p>{g.purpose}</p>
                  <p className="small">{forWhom(g.for)}</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
      <More title={gw.moreAbout(t.cinema.title)} hint={t.cinema.sub}>
        <Fold title={gw.game.glassesMore}><p><b>{c.glasses.title}</b> {cyanEye ? c.glasses.way(cyanEye) : c.glasses.unknown} {c.glasses.own}</p></Fold>
        <Fold title={c.how.title}>
          <ul>{c.how.lines(plan.chapterSeconds, plan.breakSeconds).map((line) => <li key={line}>{line}</li>)}</ul>
          <p className="muted small">{c.list.onDevice}</p>
        </Fold>
        {activities.length > 0 && <Fold title={t.cinema.activities.title}><p>{t.cinema.activities.body}</p></Fold>}
      </More>
    </>
  );
}
