import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintButton } from "@/app/(app)/test/summary/print-button";
import { reading, resultsOf, seriesOf, type Result } from "@/app/(app)/test/results";
import { HeroShape } from "@/components/together/hero-art";
import { Btn, Card, PageHead } from "@/components/ui";
import { common } from "@/copy/common";
import { graduation as t } from "@/copy/graduation";
import { test as c } from "@/copy/test";
import { tests } from "@/data";
import { defaultHero } from "@/games/hero";
import { dayText } from "@/lib/community";
import { graduateOf, journeyFor } from "@/lib/graduation-data";
import { currentHero } from "@/lib/hero";
import { startOfDay } from "@/lib/league";
import { requireMember } from "@/lib/session";
import css from "./book.module.css";

export const metadata: Metadata = { title: t.book.title };

const DAY_MS = 86_400_000;
/** Check-ups from two weeks before the course to two weeks after it: the first ones are often taken before the start, the last ones just after the end. */
const AROUND_DAYS = 14;

/**
 * The journey book of the active profile's finished course: one page to print. It gives the weeks, the days with
 * practice and what each check-up measured on its day, and no reason for any number. Read-only. A profile with no
 * finished course has no book.
 */
export default async function BookPage() {
  const m = await requireMember();
  if (!m.can("view")) notFound();
  const g = await graduateOf(m.profile.id);
  if (!g) notFound();
  const [journey, hero, all] = await Promise.all([journeyFor(g), currentHero(m), resultsOf(m.profile.id)]);
  const from = startOfDay(journey.startDay).getTime() - AROUND_DAYS * DAY_MS, to = startOfDay(journey.lastDay).getTime() + (AROUND_DAYS + 1) * DAY_MS;
  const rows = all.filter((r) => r.takenAt.getTime() >= from && r.takenAt.getTime() < to);
  const lines = tests.flatMap((test) => seriesOf(test, rows).map((line) => ({ test, line }))).filter((x) => x.line.rows.length > 0);
  const cell = (test: (typeof tests)[number], r: Result) => <>{reading(test, r)}<small>{dayText(r.takenAt)}</small></>;
  const b = t.book, name = m.profile.displayName;

  return (
    <div className={css.sheet}>
      <PageHead title={b.head(name)} sub={b.course(g.programme.name, dayText(journey.startDay), dayText(journey.lastDay))} crumb={[{ href: "/together/graduation", label: b.back }]} />
      <div className={`row ${css.hide}`}>
        <PrintButton label={b.print} />
        <Btn href="/together/graduation" kind="gh" small>{b.back}</Btn>
      </div>

      <div className={css.top}>
        <div className={`scene ${css.hero}`}><HeroShape sprite={hero ?? defaultHero()} label={b.hero} /></div>
        <div className="stack">
          <p><b>{t.done.title(name, g.programme.name)}</b></p>
          <p>{t.done.careful}</p>
          <p className="muted small">{b.made(dayText(new Date()))}{!hero && ` ${b.noHero}`}</p>
        </div>
      </div>

      <Card title={b.numbers}>
        <dl className="kv">
          <div><dt>{b.weeks}</dt><dd className="tnum">{journey.weeks}</dd></div>
          <div><dt>{b.practised}</dt><dd className="tnum">{journey.practised}</dd></div>
          <div><dt>{b.finished}</dt><dd className="tnum">{journey.finished}</dd></div>
          <div><dt>{b.weeksWith}</dt><dd className="tnum">{journey.weeksWithPractice}</dd></div>
        </dl>
        {journey.stopDays > 0 && <p className="small">{b.stops(journey.stopDays)}</p>}
      </Card>

      <Card title={b.byWeek}>
        {journey.practised === 0 && <p className="muted">{b.noPractice}</p>}
        <ol className={css.weeks}>
          {journey.byWeek.map((w) => (
            <li key={w.week} aria-label={b.weekAlt(w.week, w.practised)}>
              <b>{b.week} {w.week}</b>
              <span className={css.dots} aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <i key={i} data-on={i < w.practised} />)}</span>
              <span className="small tnum">{b.weekDays(w.practised)}</span>
            </li>
          ))}
        </ol>
      </Card>

      <Card title={b.checkups}>
        <p className="muted small">{b.window(dayText(new Date(from)), dayText(new Date(to - DAY_MS)))}</p>
        {lines.length === 0 ? <p className="muted">{b.noCheckups}</p> : (
          <div className="tbwrap">
            <table className="tb">
              <thead><tr><th>{b.checkup}</th><th>{b.first}</th><th>{b.last}</th><th className="n">{b.taken}</th></tr></thead>
              <tbody>
                {lines.map(({ test, line }) => {
                  const first = line.rows[0], last = line.rows.at(-1)!;
                  return (
                    <tr key={`${test.key} ${line.eye}`}>
                      <td>{test.name}{line.eye && `, ${c.eye[line.eye].toLowerCase()}`}</td>
                      <td className="tnum">{cell(test, first)}</td>
                      <td className="tnum">{last.id === first.id ? <span className="muted">{b.onlyOne}</span> : cell(test, last)}</td>
                      <td className="n tnum">{line.rows.length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="notice">{b.honest}</p>
      </Card>

      <p>{b.whatNext}</p>
      <p className="muted small">{common.notMedical}</p>
    </div>
  );
}
