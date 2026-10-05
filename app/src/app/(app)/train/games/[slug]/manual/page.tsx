import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GlassesNote } from "@/components/play/how-to";
import { GameManual } from "@/components/play/manual";
import { Btn, PageHead } from "@/components/ui";
import { train as t } from "@/copy/train";
import { gameBySlug } from "@/data";
import { gameGuideFor } from "@/data/game-guides";
import { kindOf } from "@/games/built";
import { requireMember } from "@/lib/session";
import { statusFor } from "@/lib/sessions";
import { isListed } from "@/lib/status";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = gameBySlug((await params).slug);
  return { title: g ? t.manual.title(g.name) : undefined };
}

/** The manual of one game, on a page of its own: everything a member or a helper may want to know before or after playing. */
export default async function GameManualPage({ params }: Props) {
  const { slug } = await params;
  const g = gameBySlug(slug);
  if (!g || !kindOf(slug)) notFound();
  const m = await requireMember();
  if (!isListed(await statusFor("game", slug), m.tester)) notFound();
  const film = kindOf(slug) === "cinema";
  return (
    <>
      <PageHead
        title={t.manual.title(g.name)} sub={t.manual.sub}
        crumb={[film ? { href: "/train/cinema", label: t.cinema.title } : { href: "/train", label: t.game.crumb }, { href: `/train/games/${slug}`, label: g.name }]}
      />
      <div className="row"><Btn href={`/train/games/${slug}/play`} kind="g">{kindOf(slug) === "care" ? t.game.open : t.game.play}</Btn><Btn href={`/train/games/${slug}`}>{t.manual.back}</Btn></div>
      <GlassesNote gear={g.gear} cyanEye={m.eye?.cyanEye === "right" ? "R" : "L"} joined={!!gameGuideFor(slug)?.joined} />
      <GameManual slug={slug} locale={m.account.locale} />
    </>
  );
}
