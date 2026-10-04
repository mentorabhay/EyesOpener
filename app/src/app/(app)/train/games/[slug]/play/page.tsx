import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHead } from "@/components/ui";
import { Stage } from "@/components/play/stage";
import { train as t } from "@/copy/train";
import { gameBySlug } from "@/data";
import { helpFor, kindOf } from "@/games/built";
import { CarePanel } from "@/games/care/panel";
import { CinemaStage } from "@/games/extra-ui";
import { results } from "@/copy/results";
import { requireMember } from "@/lib/session";
import { doseFor, statusFor } from "@/lib/sessions";
import { isListed } from "@/lib/status";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: gameBySlug((await params).slug)?.name };
}

export default async function PlayPage({ params }: Props) {
  const { slug } = await params;
  const g = gameBySlug(slug), kind = kindOf(slug);
  if (!g || !kind) notFound();
  const m = await requireMember();
  if (!isListed(await statusFor("game", slug), m.tester)) notFound();
  const head = <PageHead title={g.name} sub={g.play} crumb={[{ href: "/train", label: t.game.crumb }, { href: `/train/games/${slug}`, label: g.name }]} />;

  /* A care companion is a log the family keeps. It is not a screen session, so it has no dose and no glasses. */
  if (kind === "care") return <>{head}<CarePanel slug={slug} m={m} /></>;

  const dose = await doseFor(m, "game", slug);
  const ppc = m.device?.pxPerCm ?? 0;
  const eye = {
    contrast: m.eye?.strongContrast ?? 1,
    gamma: m.device?.gamma ?? 2.2,
    targetPx: (m.eye?.targetCm ?? 0) * ppc,
    letterPx: (m.eye?.letterCm ?? 0) * ppc,
    ppc,
    distCm: m.device?.distanceCm ?? 0,
    cyanEye: m.eye?.cyanEye === "right" ? "R" as const : "L" as const,
  };
  return (
    <>
      {head}
      {!m.eye && <p className="notice" data-b="warn">{t.noEye.body} <Link href="/onboarding">{t.noEye.cta}</Link></p>}
      {kind === "cinema"
        ? <CinemaStage slug={slug} dose={dose} {...eye} />
        : <Stage slug={slug} dose={dose} help={helpFor(slug)} labels={results.game} {...eye} />}
    </>
  );
}
