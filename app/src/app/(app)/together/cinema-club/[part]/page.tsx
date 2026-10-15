import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { planFor } from "@/components/film/chapters";
import { GroupScreen, HostGuide, isKitPart, SessionSheet } from "@/components/gatherings/club-kit";
import paper from "@/components/gatherings/paper.module.css";
import { PageHead } from "@/components/ui";
import { cinemaClub as t } from "@/copy/cinema-club";
import { together } from "@/copy/together";
import { mayOpenKit } from "@/lib/cinema-club";
import { requireMember } from "@/lib/session";

type Props = { params: Promise<{ part: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { part } = await params;
  return { title: isKitPart(part) ? t.kit[part].name : undefined };
}

/**
 * One part of the host kit: the guide, the session sheet or the group screen.
 * For a guardian or co-guardian outside child mode; for anyone else the page does not exist.
 */
export default async function ClubKitPage({ params, searchParams }: Props) {
  const m = await requireMember();
  const { part } = await params;
  if (!isKitPart(part) || !mayOpenKit(m)) notFound();
  const crumb = [together.crumb, { href: "/together/cinema-club", label: t.kit.back }];
  if (part === "screen") {
    /* The plan is the cinema's own for every host. Only a staff test household may shorten it, to try a break without waiting. */
    const asked = await searchParams;
    return (
      <>
        <PageHead title={t.screen.title} sub={t.screen.sub} crumb={crumb} />
        <GroupScreen plan={planFor(m.tester, { chapter: asked.chapter, rest: asked.break })} />
      </>
    );
  }
  return (
    <>
      <div className={paper.hide}><PageHead title={t.kit[part].name} sub={t.kit[part].what} crumb={crumb} /></div>
      {part === "guide" ? <HostGuide /> : <SessionSheet />}
    </>
  );
}
