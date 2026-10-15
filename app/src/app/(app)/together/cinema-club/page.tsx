import { More } from "@/components/guide/more";
import type { Metadata } from "next";
import { ClubList, KitLinks, kitNumbers, Limits } from "@/components/gatherings/club-kit";
import { Card, PageHead } from "@/components/ui";
import { cinemaClub as t } from "@/copy/cinema-club";
import { together } from "@/copy/together";
import { ideaBySlug } from "@/data";
import { mayOpenKit } from "@/lib/cinema-club";
import { listedClubs } from "@/lib/cinema-club-data";
import { requireMember } from "@/lib/session";

const idea = ideaBySlug("cinema-club")!;
export const metadata: Metadata = { title: idea.name };

/**
 * Cinema Club in the member app. Everyone with a seat may read what a club is and where the listed clubs are.
 * The host kit opens for a guardian or co-guardian outside child mode. Nothing is written from this page:
 * a family does not join a club in the app, and no club knows who came.
 */
export default async function CinemaClubPage() {
  const m = await requireMember();
  const clubs = await listedClubs();
  const host = mayOpenKit(m), n = kitNumbers();
  return (
    <>
      <PageHead
        title={idea.name} crumb={[together.crumb]}
        stats={[{ value: clubs.length, label: t.stats.clubs }, { value: n.filmMinutes, label: t.stats.film }]}
      />
      <div className="bento">
        <Card title={t.about.title} span={7}>
          <ul className="stack" style={{ margin: 0, paddingLeft: 18 }}>{t.about.points.map((line) => <li key={line}>{line}</li>)}</ul>
          <h3>{t.about.notTitle}</h3>
          <ul className="stack" style={{ margin: 0, paddingLeft: 18 }}>{t.about.not.map((line) => <li key={line}>{line}</li>)}</ul>
          <p className="muted small">{idea.why}</p>
        </Card>
        <Card title={t.kit.title} span={5} tone="grad">
          <p>{t.kit.lead}</p>
          {host ? <KitLinks base="/together/cinema-club" /> : <p className="notice">{t.kit.guardiansOnly}</p>}
        </Card>
        <Card title={t.list.title} span={12}>
          <ClubList clubs={clubs} />
          <p className="muted small">{t.list.rule}</p>
          {clubs.length > 0 && <p className="muted small">{t.list.ask}</p>}
        </Card>
        <Card title={t.limits.title} span={12}><Limits /></Card>
      </div>
      <More><p>{idea.what}</p></More>
    </>
  );
}
