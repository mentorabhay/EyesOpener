import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { STANDARD_PLAN } from "@/components/film/chapters";
import { GroupScreen, HostGuide, isKitPart, SessionSheet } from "@/components/gatherings/club-kit";
import paper from "@/components/gatherings/paper.module.css";
import { PageHead } from "@/components/ui";
import { cinemaClub as t } from "@/copy/cinema-club";
import { requireCounsellor } from "@/lib/auth";

type Props = { params: Promise<{ part: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { part } = await params;
  return { title: isKitPart(part) ? t.kit[part].name : undefined };
}

/** One part of the Cinema Club host kit, for a verified counsellor: the guide, the session sheet or the group screen. */
export default async function CounsellorClubKitPage({ params }: Props) {
  await requireCounsellor();
  const { part } = await params;
  if (!isKitPart(part)) notFound();
  const crumb = [{ href: "/counsellor/cinema-club", label: t.kit.back }];
  if (part === "screen") return <><PageHead title={t.screen.title} sub={t.screen.sub} crumb={crumb} /><GroupScreen plan={STANDARD_PLAN} /></>;
  return (
    <>
      <div className={paper.hide}><PageHead title={t.kit[part].name} sub={t.kit[part].what} crumb={crumb} /></div>
      {part === "guide" ? <HostGuide /> : <SessionSheet />}
    </>
  );
}
