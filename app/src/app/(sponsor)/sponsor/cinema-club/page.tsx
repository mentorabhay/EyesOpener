// Eyes Opener: Cinema Club in the sponsor portal: the host kit, and the clubs this sponsor has listed.
import type { Metadata } from "next";
import { ClubFields, type ClubChoices } from "@/components/gatherings/club-fields";
import { KitLinks, Limits } from "@/components/gatherings/club-kit";
import { StateForm } from "@/components/together/StateForm";
import { Card, Chip, PageHead, type Tone } from "@/components/ui";
import { cinemaClub as c, CLUB_WEEKDAYS } from "@/copy/cinema-club";
import { requireSponsor } from "@/lib/auth";
import { PLACE_KINDS, PLACE_NAME, startChoices, timeText, type ClubStatus } from "@/lib/cinema-club";
import { sponsorClubs } from "@/lib/cinema-club-data";
import { sponsorCan } from "@/lib/roles";
import { approvedOnly } from "@/lib/sponsor";
import { closeClubAction, listClubAction } from "./actions";

const t = c.sponsor;
export const generateMetadata = (): Metadata => ({ title: t.title });

const tone: Record<ClubStatus, Tone> = { in_review: "warn", listed: "ok", closed: "plain", removed: "none" };

/**
 * Cinema Club in the sponsor portal: the host kit, and the clubs this sponsor has listed.
 * There are no numbers of families on this page, of any size: the app keeps no record of who comes to a club.
 */
export default async function SponsorCinemaClubPage() {
  const { sponsor } = await requireSponsor("view");
  approvedOnly(sponsor);
  const clubs = await sponsorClubs(sponsor);
  const mayEdit = sponsorCan(sponsor.role, "edit_groups");
  const choices: ClubChoices = {
    kinds: PLACE_KINDS.map((key) => ({ key, label: c.list.kind[key] })),
    starts: startChoices().map((minute) => ({ minute, label: timeText(minute) })),
    name: PLACE_NAME,
  };
  return (
    <>
      <PageHead title={t.title} sub={t.sub} crumb={[{ href: "/sponsor", label: sponsor.name }]} />
      <p className="notice">{t.counts}</p>
      <div className="bento">
        <Card title={t.kitTitle} span={5} tone="grad">
          <p>{c.kit.lead}</p>
          <KitLinks base="/sponsor/cinema-club" />
        </Card>

        <Card title={t.yours} span={7}>
          {clubs.length === 0 ? <p className="muted">{t.none}</p> : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {clubs.map((x) => (
                <li className="ins" key={x.id}>
                  <div className="tx">
                    <b>{x.placeName}</b>
                    <div className="sub tnum">{c.list.kind[x.placeKind]} · {CLUB_WEEKDAYS[x.weekday]}, {timeText(x.startMinute)}</div>
                    {mayEdit && (x.status === "listed" || x.status === "in_review") && (
                      <details style={{ marginTop: 8 }}>
                        <summary className="btn btn-sm" aria-label={t.closeOf(x.placeName)}>{t.close}</summary>
                        <div className="stack" style={{ marginTop: 8 }}>
                          <p className="small">{t.closeWarn}</p>
                          <form action={closeClubAction}><input type="hidden" name="id" value={x.id} /><button className="btn btn-sm btn-d">{t.closeYes}</button></form>
                        </div>
                      </details>
                    )}
                  </div>
                  <span className="row" style={{ justifyContent: "flex-end" }}>
                    {x.isSample && <Chip tone="warn">{c.list.sample}</Chip>}
                    <Chip tone={tone[x.status]}>{t.status[x.status]}</Chip>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="muted small">{c.list.rule}</p>
        </Card>

        {mayEdit && (
          <Card title={t.add.title} span={5}>
            <StateForm action={listClubAction} submit={t.add.submit}><ClubFields choices={choices} idPrefix="club" /></StateForm>
          </Card>
        )}
        <Card title={c.limits.title} span={mayEdit ? 7 : 12}><Limits /></Card>
      </div>
    </>
  );
}
