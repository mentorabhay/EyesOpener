import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { History } from "@/components/play/results";
import Link from "next/link";
import { Card, EvidenceChip, PageHead, SceneThumb } from "@/components/ui";
import { train as t } from "@/copy/train";
import { games, mechanismOf } from "@/data";
import { percent } from "@/engine";
import { kindOf } from "@/games/built";
import { readStatuses } from "@/lib/catalogue";
import { requireMember } from "@/lib/session";
import { CINEMA, doseFor, pastSessions, statusFor } from "@/lib/sessions";
import { forWhom, isListed, statusOf } from "@/lib/status";
import { Player } from "./player";

export const metadata: Metadata = { title: t.cinema.title };

export default async function CinemaPage() {
  const m = await requireMember();
  if (!isListed(await statusFor("film", CINEMA), m.tester)) notFound();
  const [dose, past] = await Promise.all([doseFor(m, "film", CINEMA), pastSessions(m, "film", CINEMA)]);
  const contrast = m.eye?.strongContrast ?? 1;
  const statuses = await readStatuses();
  /* Films with a task on top: the same cinema, with something to do while watching. */
  const activities = games.filter((g) => kindOf(g.slug) === "cinema" && isListed(statusOf(statuses, "game", g.slug), m.tester));

  return (
    <>
      <PageHead title={t.cinema.title} sub={t.cinema.sub} />
      <div className="bento">
        <Card span={8}>
          <Player itemSlug={CINEMA} contrast={contrast} dose={dose} />
        </Card>
        <Card span={4}>
          <div className="hstat">
            <div className="v tnum">{percent(contrast)}</div>
            <div className="l">{t.cinema.contrast}. {m.eye ? t.cinema.fromProfile : t.cinema.standard}.</div>
          </div>
          <p>{t.cinema.onDevice}</p>
          <p className="muted small">{t.cinema.clockNote}</p>
        </Card>
        <Card title={t.cinema.results}>
          <History rows={past} labels={{}} />
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
