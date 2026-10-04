import type { Metadata } from "next";
import { Card, Chip, PageHead } from "@/components/ui";
import s from "@/components/together/together.module.css";
import { together } from "@/copy/together";
import { programmeBySlug } from "@/data";
import { dayText, leagueFor } from "@/lib/community";
import { requireMember } from "@/lib/session";

const t = together.league;
export const metadata: Metadata = { title: t.title };

export default async function LeaguePage() {
  const m = await requireMember();
  const found = await leagueFor(m);
  const mine = found?.table.find((r) => r.mine);

  return (
    <>
      <PageHead
        title={t.title} sub={t.rule} crumb={[together.crumb]}
        stats={mine && [{ value: mine.place, label: t.yourPlace }, { value: `${mine.daysFinished} ${t.of} ${mine.daysPossible}`, label: t.days }]}
      />
      <div className="bento">
        {!found ? <Card span={8}><p className="notice">{t.noTeam}</p></Card> : (
          <Card
            title={`${programmeBySlug(found.league.programme)?.name ?? found.league.name}, ${t.ages(found.league.ageBand)}`}
            right={<span className="small muted">{t.weekOf(dayText(found.week))}</span>} span={8}
          >
            <div className="tbwrap">
              <table className="tb">
                <thead><tr><th>{t.place}</th><th>{t.team}</th><th>{t.days}</th></tr></thead>
                <tbody>
                  {found.table.map((r) => (
                    <tr key={r.id} className={r.mine ? s.mine : undefined} aria-current={r.mine ? "true" : undefined}>
                      <td className="tnum">{r.place}</td>
                      <td>{r.name} {r.mine && <Chip>{t.yours}</Chip>}</td>
                      <td>
                        <div className={s.days}>
                          <span className="tnum">{r.daysFinished} {t.of} {r.daysPossible}</span>
                          <div className="seg" aria-hidden="true">{Array.from({ length: r.daysPossible }, (_, i) => <i key={i} className={i < r.daysFinished ? "on" : undefined} />)}</div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted small">{t.tie}</p>
          </Card>
        )}
      </div>
    </>
  );
}
