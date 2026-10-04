import type { Metadata } from "next";
import { Card, PageHead } from "@/components/ui";
import { train as t } from "@/copy/train";
import { percent } from "@/engine";
import { requireMember } from "@/lib/session";
import { CINEMA, doseFor } from "@/lib/sessions";
import { Player } from "./player";

export const metadata: Metadata = { title: t.cinema.title };

export default async function CinemaPage() {
  const m = await requireMember();
  const dose = await doseFor(m, "film");
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
      </div>
    </>
  );
}
