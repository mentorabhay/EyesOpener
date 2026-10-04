import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { History } from "@/components/play/results";
import { Card, PageHead } from "@/components/ui";
import { train as t } from "@/copy/train";
import { percent } from "@/engine";
import { requireMember } from "@/lib/session";
import { CINEMA, doseFor, pastSessions, statusFor } from "@/lib/sessions";
import { isListed } from "@/lib/status";
import { Player } from "./player";

export const metadata: Metadata = { title: t.cinema.title };

export default async function CinemaPage() {
  const m = await requireMember();
  if (!isListed(await statusFor("film", CINEMA), m.tester)) notFound();
  const [dose, past] = await Promise.all([doseFor(m, "film", CINEMA), pastSessions(m, "film", CINEMA)]);
  const contrast = m.eye?.strongContrast ?? 1;

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
    </>
  );
}
