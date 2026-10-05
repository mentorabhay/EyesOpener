import type { Metadata } from "next";
import { Btn, Card, Chip, Empty, PageHead } from "@/components/ui";
import { StateForm } from "@/components/together/StateForm";
import shared from "@/components/together/together.module.css";
import { league as t } from "@/copy/league";
import { together } from "@/copy/together";
import { programmeBySlug } from "@/data";
import { switchProfile } from "@/lib/actions";
import { dayText } from "@/lib/community";
import { requireMember } from "@/lib/session";
import { leagueView } from "@/lib/teams";
import { changeLeagueTeam, joinLeague, leaveLeague } from "./actions";
import css from "./league.module.css";

export const generateMetadata = (): Metadata => ({ title: t.title });

const bandText = (band: string) => t.bands[band] ?? band;
const programmeName = (slug: string) => programmeBySlug(slug)?.name ?? slug;

const How = ({ span }: { span: 4 | 5 }) => (
  <Card title={t.how.title} span={span}>
    <ul className={css.points}>{t.how.points.map((p) => <li key={p}>{p}</li>)}</ul>
  </Card>
);

/** Days as words and as a bar. The bar only repeats the words, so it is hidden from screen readers. */
const Days = ({ done, possible }: { done: number; possible: number }) => (
  <div className={shared.days}>
    <span className="tnum">{t.table.daysOf(done, possible)}</span>
    <div className="seg" aria-hidden="true">{Array.from({ length: possible }, (_, i) => <i key={i} className={i < done ? "on" : undefined} />)}</div>
  </div>
);

const Place = ({ place, tied, of }: { place: number; tied: boolean; of?: number }) => (
  <span className={`tnum ${css.place}`}>{of ? t.history.placeOf(place, of) : place}{tied && <span className="muted small"> {t.table.shared}</span>}</span>
);

export default async function LeaguePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const m = await requireMember();
  const [view, sp] = await Promise.all([leagueView(m), searchParams]);
  const name = m.profile.displayName;
  const mayMove = m.can("share");
  /* Links to screens that child mode seals are left out there. */
  const grownUp = m.can("manage_family");
  const { entry, family } = view;

  const Family = family.length > 0 && (
    <Card title={t.family.title} span={12}>
      <div>
        {family.map((f) => (
          <div className="ins" key={f.profileId}>
            <div className="tx">{t.family.on(f.name, f.team)}</div>
            {!m.childMode && (
              <form action={switchProfile}>
                <input type="hidden" name="profileId" value={f.profileId} />
                <button className="btn btn-sm">{t.family.see(f.name)}</button>
              </form>
            )}
          </div>
        ))}
      </div>
    </Card>
  );

  if (!view.seat) {
    return (
      <>
        <PageHead title={t.title} sub={t.rule} crumb={[together.crumb]} />
        {sp.did === "left" && <p className="notice" data-b="ok" role="status">{t.done.left(name)}</p>}
        <div className="bento">
          <Card title={t.join.title(name)} span={7}>
            {entry.ok ? (
              <div className="stack">
                <p>{t.join.offer(name, programmeName(entry.programme), bandText(entry.band))}</p>
                <ul className={css.points}>{t.join.points.map((p) => <li key={p}>{p}</li>)}</ul>
                {mayMove ? <StateForm action={joinLeague} submit={t.join.submit} primary /> : <p className="muted">{t.cannot}</p>}
              </div>
            ) : (
              <div className="stack">
                <p className="notice">{t.blocked[entry.reason](name)}</p>
                {grownUp && entry.reason === "no_programme" && <div className="row"><Btn href="/settings">{t.links.programme}</Btn></div>}
                {grownUp && entry.reason === "needs_consent" && <div className="row"><Btn href="/family">{t.links.family}</Btn></div>}
              </div>
            )}
          </Card>
          <How span={5} />
          {Family}
        </div>
      </>
    );
  }

  const { seat, table, history, own } = view;
  const mine = table.find((r) => r.mine);
  return (
    <>
      <PageHead
        title={t.title} sub={t.rule} crumb={[together.crumb]}
        stats={mine && [
          { value: mine.place, label: mine.tied ? `${t.table.yourPlace}, ${t.table.shared}` : t.table.yourPlace },
          { value: t.table.daysOf(mine.daysFinished, mine.daysPossible), label: t.table.days },
        ]}
      />
      {sp.did === "joined" && <p className="notice" data-b="ok" role="status">{t.done.joined(name, seat.team)}</p>}
      {sp.did === "changed" && <p className="notice" data-b="ok" role="status">{t.done.changed(name, seat.team)}</p>}
      <div className="bento">
        <Card title={t.table.title} right={<span className="small muted">{t.table.weekOf(dayText(view.week))}</span>} span={8}>
          <p className="muted small">{t.leagueOf(programmeName(seat.programme), bandText(seat.ageBand))}</p>
          {table.length === 0 ? <Empty title={t.table.empty}><span>{t.table.emptyWhy}</span></Empty> : (
            <>
              <div className="tbwrap">
                <table className="tb">
                  <thead><tr><th>{t.table.place}</th><th>{t.table.team}</th><th>{t.table.days}</th></tr></thead>
                  <tbody>
                    {table.map((r) => (
                      <tr key={r.id} className={r.mine ? shared.mine : undefined} aria-current={r.mine ? "true" : undefined}>
                        <td><Place place={r.place} tied={r.tied} /></td>
                        <td>{r.name} {r.mine && <Chip>{t.table.yours}</Chip>}<div className="muted small">{t.table.members(r.members)}</div></td>
                        <td><Days done={r.daysFinished} possible={r.daysPossible} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="muted small">{t.table.tie}</p>
            </>
          )}
        </Card>

        <Card title={t.team.title} span={4}>
          <div className="stack">
            <div>
              <div className={css.teamName}>{seat.team}</div>
              <div className="muted small">{t.table.members(seat.members)}</div>
            </div>
            {!entry.ok ? <p className="notice" data-b="warn">{t.team.notCounted(name)} {t.blocked[entry.reason](name)}</p>
              : entry.programme !== seat.programme ? <p className="notice" data-b="warn">{t.team.notCounted(name)} {t.team.otherProgramme(name)}</p>
              : !seat.counted ? <p className="notice">{t.team.startsOn(name, dayText(seat.countsFrom!))}{!mine && ` ${t.team.waiting}`}</p>
              : own && <p>{t.team.ownDays(name, own.finished)}</p>}
            {!mayMove ? <p className="muted small">{t.cannot}</p> : (
              <div className={css.moves}>
                {entry.ok && (view.mayChange
                  ? <StateForm action={changeLeagueTeam} submit={t.team.change}><p className="muted small">{t.team.changeHint}</p></StateForm>
                  : <p className="muted small">{t.team.changeLater(dayText(view.nextChange))}</p>)}
                <StateForm action={leaveLeague} submit={t.team.leave}><p className="muted small">{t.team.leaveHint}</p></StateForm>
              </div>
            )}
          </div>
        </Card>

        <Card title={t.history.title} span={8}>
          {history.length === 0 ? <p className="muted">{t.history.none}</p> : (
            <>
              <div className="tbwrap">
                <table className="tb">
                  <thead><tr><th>{t.history.week}</th><th>{t.history.days}</th><th>{t.history.place}</th></tr></thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.week}>
                        <td>{dayText(h.week)}</td>
                        <td><Days done={h.daysFinished} possible={h.daysPossible} /></td>
                        <td><Place place={h.place} tied={h.tied} of={h.teams} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="muted small">{t.history.since}</p>
            </>
          )}
        </Card>
        <How span={4} />
        {Family}
      </div>
    </>
  );
}
