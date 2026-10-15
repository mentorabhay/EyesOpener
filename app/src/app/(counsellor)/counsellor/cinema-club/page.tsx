import type { Metadata } from "next";
import { ClubList, KitLinks, Limits } from "@/components/gatherings/club-kit";
import { Card, PageHead } from "@/components/ui";
import { cinemaClub as t } from "@/copy/cinema-club";
import { ideaBySlug } from "@/data";
import { requireCounsellor } from "@/lib/auth";
import { listedClubs } from "@/lib/cinema-club-data";

const idea = ideaBySlug("cinema-club")!;
export const metadata: Metadata = { title: idea.name };

/**
 * Cinema Club in the counsellor portal: the host kit to read and print, and the listed clubs.
 * It shows nothing about any member, linked or not: a club keeps no record of who came.
 */
export default async function CounsellorCinemaClubPage() {
  await requireCounsellor();
  const clubs = await listedClubs();
  return (
    <>
      <PageHead title={idea.name} sub={idea.what} />
      <div className="bento">
        <Card title={t.kit.title} span={5} tone="grad">
          <p>{t.kit.lead}</p>
          <KitLinks base="/counsellor/cinema-club" />
        </Card>
        <Card title={t.about.notTitle} span={7}>
          <ul className="stack" style={{ margin: 0, paddingLeft: 18 }}>{t.about.not.map((line) => <li key={line}>{line}</li>)}</ul>
          <p className="muted small">{t.guide.foot}</p>
        </Card>
        <Card title={t.limits.title} span={12}><Limits /></Card>
        <Card title={t.list.title} span={12}>
          <ClubList clubs={clubs} />
          <p className="muted small">{t.list.rule}</p>
        </Card>
      </div>
    </>
  );
}
