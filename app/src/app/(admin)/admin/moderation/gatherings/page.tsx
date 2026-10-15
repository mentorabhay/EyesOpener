import type { Metadata } from "next";
import type { ClubChoices } from "@/components/gatherings/club-fields";
import { Btn, Card, Chip, PageHead, type Tone } from "@/components/ui";
import { admin } from "@/copy/admin";
import { cinemaClub, CLUB_WEEKDAYS } from "@/copy/cinema-club";
import { gatherings } from "@/copy/gatherings";
import { lightsOn, longDay } from "@/copy/lights-on";
import { dayTime } from "@/copy/site";
import { wishJam } from "@/copy/wish-jam";
import { games } from "@/data";
import { requireStaff } from "@/lib/auth";
import { PLACE_KINDS, PLACE_NAME, startChoices, timeText, type ClubStatus } from "@/lib/cinema-club";
import { staffClubs } from "@/lib/cinema-club-data";
import { waitingGatherings } from "@/lib/gatherings-review";
import { dayIn, HOUR_MAX, HOUR_MIN, worldSightDay } from "@/lib/lights-on";
import { hourChangedAt, readHour } from "@/lib/lights-on-data";
import { isGameKind, isLove, isPlay, staffSteps, type WishStatus } from "@/lib/wish-jam";
import { staffWishes } from "@/lib/wish-jam-data";
import { Confirm } from "../../parts";
import { removeClubAction } from "./actions";
import { HourForm, StaffClubForm, TieGameForm, WishStepForm } from "./forms";

const g = gatherings.staff;
export const generateMetadata = (): Metadata => ({ title: g.title });

const clubTone: Record<ClubStatus, Tone> = { in_review: "warn", listed: "ok", closed: "plain", removed: "none" };
const wishTone: Record<WishStatus, Tone> = { in_review: "warn", listed: "plain", matched: "grad", built: "ok", blocked: "none" };

/**
 * The staff page for the four gatherings, kept in the moderation room: the Lights On Hour, the list of Cinema
 * Clubs, and the Wish Jam wishes a person has approved. New clubs from sponsors, new wishes and names for games
 * wait in the moderation room itself.
 */
export default async function GatheringsStaffPage() {
  await requireStaff("moderation");
  const [hour, changedAt, clubs, wishes, waiting] = await Promise.all([readHour(), hourChangedAt(), staffClubs(), staffWishes(), waitingGatherings()]);
  const h = lightsOn.staff, c = cinemaClub.staff, w = wishJam.staff;
  const today = dayIn(new Date()), thisYear = worldSightDay(Number(today.slice(0, 4)));
  const festival = today <= thisYear ? thisYear : worldSightDay(Number(today.slice(0, 4)) + 1);
  const choices: ClubChoices = {
    kinds: PLACE_KINDS.map((key) => ({ key, label: cinemaClub.list.kind[key] })),
    starts: startChoices().map((minute) => ({ minute, label: timeText(minute) })),
    name: PLACE_NAME,
  };
  const library = games.map((x) => ({ slug: x.slug, name: x.name }));

  return (
    <>
      <PageHead
        title={g.title} sub={g.sub} crumb={[{ href: "/admin", label: admin.back }, { href: "/admin/moderation", label: g.back }]}
        stats={[
          { value: clubs.filter((x) => x.status === "listed").length, label: g.stats.clubs },
          { value: wishes.length, label: g.stats.wishes },
          { value: waiting, label: g.stats.waiting },
        ]}
      />
      <div className="bento">
        <Card title={h.title} span={5}>
          <p><b>{h.now(hour.weekday, hour.hour)}</b></p>
          <p className="muted small">{changedAt ? h.changed(dayTime(changedAt)) : h.isDefault}</p>
          <HourForm weekday={hour.weekday} hour={hour.hour} from={HOUR_MIN} to={HOUR_MAX} />
          <p className="muted small">{h.note}</p>
          <p className="muted small">{h.festival(longDay(festival))}</p>
          <div className="row">
            <Btn href="/together/lights-on?preview=hour" small>{h.preview}</Btn>
            <Btn href="/together/lights-on?preview=festival" small>{h.previewFestival}</Btn>
          </div>
          <p className="muted small">{h.previewNote}</p>
        </Card>

        <Card title={c.title} span={7}>
          <p className="muted small">{c.intro}</p>
          {clubs.length === 0 ? <p className="muted">{c.none}</p> : (
            <div className="tbwrap">
              <table className="tb">
                <thead><tr><th scope="col">{c.cols.place}</th><th scope="col">{c.cols.when}</th><th scope="col">{c.cols.by}</th><th scope="col">{c.cols.status}</th></tr></thead>
                <tbody>
                  {clubs.map((x) => (
                    <tr key={x.id}>
                      <td><b>{x.placeName}</b><div className="muted small">{cinemaClub.list.kind[x.placeKind]}</div>{x.isSample && <Chip tone="warn">{cinemaClub.list.sample}</Chip>}</td>
                      <td className="tnum">{CLUB_WEEKDAYS[x.weekday]}, {timeText(x.startMinute)}</td>
                      <td>{x.sponsor ?? c.team}</td>
                      <td>
                        <Chip tone={clubTone[x.status]}>{cinemaClub.sponsor.status[x.status]}</Chip>
                        {x.status === "listed" && (
                          <Confirm ask={c.remove} label={c.removeOf(x.placeName)} warn={c.removeWarn}>
                            <form action={removeClubAction}><input type="hidden" name="id" value={x.id} /><button className="btn btn-sm btn-d">{c.removeYes}</button></form>
                          </Confirm>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <details>
            <summary className="btn btn-sm">{cinemaClub.sponsor.add.title}</summary>
            <div style={{ marginTop: 12 }}><StaffClubForm choices={choices} /></div>
          </details>
        </Card>

        <Card title={w.title} span={12}>
          <p className="muted small">{w.intro}</p>
          {wishes.length === 0 ? <p className="muted">{w.none}</p> : (
            <div className="tbwrap">
              <table className="tb">
                <thead><tr><th scope="col">{w.cols.wish}</th><th scope="col">{w.cols.from}</th><th scope="col">{w.cols.status}</th><th scope="col">{w.cols.action}</th></tr></thead>
                <tbody>
                  {wishes.map((x) => {
                    const steps = staffSteps(x.status), tied = x.gameSlug ? library.find((l) => l.slug === x.gameSlug) : undefined;
                    return (
                      <tr key={x.id}>
                        <td>
                          <b className="tnum">{wishJam.own.code(x.code)}</b> {x.isSample && <Chip tone="warn">{wishJam.site.list.sample}</Chip>}
                          <div className="small">{isLove(x.loves) ? wishJam.loves[x.loves] : x.loves} · {isPlay(x.play) ? wishJam.plays[x.play] : x.play}</div>
                          <div className="muted small">{isGameKind(x.game) ? wishJam.games[x.game] : x.game}</div>
                          {x.line && <div className="small">&ldquo;{x.line}&rdquo;</div>}
                        </td>
                        <td>{x.household}<div className="muted small">{x.firstName ?? w.review.notShown}{x.band ? ` · ${wishJam.band(x.band)}` : ""}</div></td>
                        <td>
                          <Chip tone={wishTone[x.status]}>{wishJam.own.status[x.status]}</Chip>
                          {tied && <div className="small">{w.tied(tied.name)}</div>}
                          {x.nameStatus === "approved" && x.gameName && <div className="small">{w.named(x.gameName)}</div>}
                          {x.nameStatus === "in_review" && x.gameName && <div className="small muted">{w.nameWaiting(x.gameName)}</div>}
                        </td>
                        <td>
                          <div className="stack" style={{ minWidth: 220 }}>
                            {steps.filter((s) => s !== "unlist").map((s) => (
                              <details key={s}>
                                <summary className="btn btn-sm" aria-label={w.stepOf(w.step[s], x.code)}>{w.step[s]}</summary>
                                <div style={{ marginTop: 10 }}><WishStepForm wishId={x.id} step={s} label={w.step[s]} games={s === "built" ? library : undefined} /></div>
                              </details>
                            ))}
                            {x.status === "built" && (
                              <details>
                                <summary className="btn btn-sm" aria-label={w.stepOf(w.tie, x.code)}>{w.tie}</summary>
                                <div style={{ marginTop: 10 }}><TieGameForm wishId={x.id} current={x.gameSlug} games={library} /></div>
                              </details>
                            )}
                            {steps.includes("unlist") && (
                              <Confirm ask={w.step.unlist} label={w.stepOf(w.step.unlist, x.code)} warn={w.unlistWarn}>
                                <WishStepForm wishId={x.id} step="unlist" label={w.unlistYes} />
                              </Confirm>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title={g.mission.title} span={12}><p className="muted">{g.mission.body}</p></Card>
      </div>
    </>
  );
}
