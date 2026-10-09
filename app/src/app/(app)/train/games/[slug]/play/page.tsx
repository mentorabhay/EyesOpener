import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { planFor } from "@/components/film/chapters";
import { PageHead } from "@/components/ui";
import { GlassesNote, HowToPlay, labelsFor } from "@/components/play/how-to";
import { ScreenWarning } from "@/components/screen/warning";
import { Stage } from "@/components/play/stage";
import { train as t } from "@/copy/train";
import { gameBySlug } from "@/data";
import { gameGuideFor } from "@/data/game-guides";
import { helpFor, kindOf } from "@/games/built";
import { CarePanel } from "@/games/care/panel";
import { CinemaStage } from "@/games/extra-ui";
import { results } from "@/copy/results";
import { currentHero } from "@/lib/hero";
import { requireMember } from "@/lib/session";
import { setupOf } from "@/lib/setup";
import { SetupGate } from "@/components/setup/setup";
import { doseFor, pastSessions, statusFor } from "@/lib/sessions";
import { isListed } from "@/lib/status";
import { gameWords } from "@/data/words";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: gameBySlug((await params).slug)?.name };
}

export default async function PlayPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const g = gameBySlug(slug), kind = kindOf(slug);
  if (!g || !kind) notFound();
  const m = await requireMember();
  if (!isListed(await statusFor("game", slug), m.tester)) notFound();
  const head = <PageHead title={g.name} sub={gameWords(g).play} crumb={[kind === "cinema" ? { href: "/train/cinema", label: t.cinema.title } : { href: "/train", label: t.game.crumb }, { href: `/train/games/${slug}`, label: g.name }]} />;

  const guide = gameGuideFor(slug);
  /* The guide is open for a first visit and folded away once the member has finished a session of this game. */
  const known = guide ? (await pastSessions(m, "game", slug, 1)).length > 0 : false;
  const how = guide && <HowToPlay g={guide} open={!known} locale={m.account.locale} />;

  /* A care companion is a log the family keeps. It is not a screen session, so it has no dose and no glasses. */
  if (kind === "care") return <>{head}{how}<CarePanel slug={slug} m={m} /></>;

  /* a two-eye game waits until this person's setup is done (src/lib/setup-rules.ts); the dose is not touched meanwhile */
  if (/red-cyan/i.test(g.gear)) {
    const s = await setupOf(m);
    if (s.held) return <>{head}<SetupGate s={s} name={m.profile.displayName} />{how}</>;
  }
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
    weakInk: m.eye?.weakInk === "red" ? "red" as const : "cyan" as const,
    /* The hero this profile made in Draw Your Hero, for the games that have a character. */
    hero: await currentHero(m),
  };
  /* A film activity is watched in chapters with eye breaks, as the two-eye cinema is. Only a staff test household may shorten them. */
  const asked = kind === "cinema" ? await searchParams : {};
  const plan = planFor(m.tester, { chapter: asked.chapter, rest: asked.break });
  return (
    <>
      {head}
      <GlassesNote gear={g.gear} cyanEye={eye.cyanEye} joined={!!guide?.joined} swapped={eye.weakInk === "red"} />
      {/red-cyan/i.test(g.gear) && <ScreenWarning m={m} />}
      {!m.eye && <p className="notice" data-b="warn">{t.noEye.body} <Link href="/setup">{t.noEye.cta}</Link></p>}
      {how}
      {kind === "cinema"
        ? <CinemaStage slug={slug} dose={dose} labels={labelsFor(guide, results.game)} plan={plan} profileId={m.profile.id} tester={m.tester} {...eye} />
        : <Stage slug={slug} dose={dose} help={helpFor(slug)} labels={labelsFor(guide, results.game)} joinable={!!guide?.joined} lens={/red-cyan/i.test(g.gear)} {...eye} />}
      {guide && <p className="small"><Link href={`/train/games/${slug}/manual`}>{t.game.guide.fullGuide}</Link></p>}
    </>
  );
}
