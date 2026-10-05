import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { History } from "@/components/play/results";
import Link from "next/link";
import { planFor, STANDARD_PLAN } from "@/components/film/chapters";
import { Card, EvidenceChip, PageHead, SceneThumb } from "@/components/ui";
import { cinema as c } from "@/copy/cinema";
import { train as t } from "@/copy/train";
import { games, mechanismOf } from "@/data";
import { percent } from "@/engine";
import { kindOf } from "@/games/built";
import { readStatuses } from "@/lib/catalogue";
import { requireMember } from "@/lib/session";
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
  const [dose, past] = await Promise.all([doseFor(m, "film", CINEMA), pastSessions(m, "film", CINEMA)]);
  const contrast = m.eye?.strongContrast ?? 1;
  const statuses = await readStatuses();
  /* Films with a task on top: the same cinema, with something to do while watching. */
  const activities = games.filter((g) => kindOf(g.slug) === "cinema" && isListed(statusOf(statuses, "game", g.slug), m.tester));

  return (
    <>
      <PageHead title={t.cinema.title} sub={t.cinema.sub} />
      <p className="notice" data-b="warn" role="note"><b>{c.glasses.title}</b> {cyanEye ? c.glasses.way(cyanEye) : c.glasses.unknown} {c.glasses.own}</p>
      {!m.eye && <p className="notice" data-b="warn">{t.noEye.body} <Link href="/onboarding">{t.noEye.cta}</Link></p>}
      {plan.shortened && <p className="notice" role="note">{c.how.test(plan.chapterSeconds, plan.breakSeconds, STANDARD_PLAN)}</p>}
      <div className="bento">
        <Player itemSlug={CINEMA} contrast={contrast} dose={dose} cyanEye={cyanEye} plan={plan} profileId={m.profile.id} tester={m.tester} />
        <Card span={4}>
          <div className="hstat">
            <div className="v tnum">{percent(contrast)}</div>
            <div className="l">{t.cinema.contrast}. {m.eye ? t.cinema.fromProfile : t.cinema.standard}.</div>
          </div>
          <p>{t.cinema.onDevice}</p>
          <p className="muted small">{c.list.onDevice}</p>
          <b>{c.how.title}</b>
          <ul className="muted small" style={{ margin: 0, paddingLeft: 18 }}>
            {c.how.lines(plan.chapterSeconds, plan.breakSeconds).map((line) => <li key={line}>{line}</li>)}
          </ul>
        </Card>
        <Card span={8} title={t.cinema.results}>
          <div className={css.record}><History rows={past} labels={c.labels} /></div>
        </Card>
      </div>
      {activities.length > 0 && (
        <>
          <h2>{t.cinema.activities.title}</h2>
          <p className="muted">{t.cinema.activities.body}</p>
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
    </>
  );
}
