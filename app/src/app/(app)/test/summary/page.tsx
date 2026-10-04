import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, desc, eq, gte, isNotNull } from "drizzle-orm";
import { Btn, Card, PageHead } from "@/components/ui";
import { test as c } from "@/copy/test";
import { common } from "@/copy/common";
import { programmeBySlug, tests } from "@/data";
import { db, schema } from "@/db";
import { requireMember, todayKey } from "@/lib/session";
import { changesOf, dayText, reading, resultsOf, seriesOf, type Result } from "../results";
import { PrintButton } from "./print-button";
import css from "./summary.module.css";

const s = c.summary;
export const metadata: Metadata = { title: s.title };

const DAYS = 28, DAY_MS = 86_400_000;
const fullDay = (d: Date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(d);

/** Everything an eye doctor may want from the home measurements, on one printable page. Read-only: anyone who may look may open it. */
export default async function SummaryPage() {
  const m = await requireMember();
  if (!m.can("view")) notFound();
  const profileId = m.profile.id, now = new Date(), from = new Date(now.getTime() - (DAYS - 1) * DAY_MS);

  const [rows, days, stops] = await Promise.all([
    resultsOf(profileId),
    db.select({ day: schema.daySummary.day, minutes: schema.daySummary.trainMinutes }).from(schema.daySummary)
      .where(and(eq(schema.daySummary.profileId, profileId), gte(schema.daySummary.day, todayKey(from)))),
    db.select({ symptom: schema.session.stopSymptom, at: schema.session.startedAt }).from(schema.session)
      .where(and(eq(schema.session.profileId, profileId), isNotNull(schema.session.stopSymptom), gte(schema.session.startedAt, new Date(from.getTime() - DAY_MS))))
      .orderBy(desc(schema.session.startedAt)),
  ]);
  const practised = days.filter((d) => d.minutes > 0);
  const minutes = Math.round(practised.reduce((sum, d) => sum + d.minutes, 0));
  const programme = m.enrolment && programmeBySlug(m.enrolment.programme);
  /* only stops inside the 28 days, by the member's own calendar */
  const recent = stops.filter((x) => todayKey(x.at) >= todayKey(from));

  const lines = tests.flatMap((t) => {
    const series = seriesOf(t, rows), changed = changesOf(t, series);
    return series.map((line) => ({ t, line, changed: changed.some((x) => x.eye === line.eye) }));
  });
  const cell = (r: Result | undefined, line: (typeof lines)[number]) =>
    (r ? <>{reading(line.t, r)}<small>{fullDay(r.takenAt)}</small></> : <span className="muted">{s.none}</span>);

  return (
    <div className={css.sheet}>
      <PageHead title={s.title} sub={s.sub} crumb={[{ href: "/test", label: c.title }]} />
      <div className={`row ${css.hide}`}>
        <PrintButton label={s.print} />
        <Btn href="/test" kind="gh" small>{s.back}</Btn>
      </div>
      <p><b>{s.who(m.profile.displayName, m.age)}</b><br /><span className="muted small">{s.made(fullDay(now))}</span></p>
      <p className="notice">{s.notMedical}</p>

      <Card title={s.results}>
        <div className="tbwrap">
          <table className="tb">
            <thead><tr><th>{s.test}</th><th>{s.latest}</th><th>{s.first}</th><th className="n">{s.count}</th></tr></thead>
            <tbody>
              {lines.map((x) => {
                const { t, line } = x, first = line.first && line.last && line.first.id !== line.last.id ? line.first : undefined;
                return (
                  <tr key={`${t.key} ${line.eye}`}>
                    <td>
                      {t.name}{line.eye && `, ${c.eye[line.eye].toLowerCase()}`}
                      {line.rows.length > 1 && <small>{s.span(dayText(line.rows[0].takenAt), dayText(line.rows.at(-1)!.takenAt))}</small>}
                      {x.changed && <small className={css.mark}>{s.changedMark}</small>}
                    </td>
                    <td className="tnum">{cell(line.last, x)}</td>
                    <td className="tnum">{line.last ? (first ? cell(first, x) : <span className="muted">{c.first}</span>) : null}</td>
                    <td className="n tnum">{line.rows.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="bento">
        <Card title={s.screen} span={6}>
          {m.device ? (
            <>
              <p>{s.screenLine(m.device.label, m.device.pxPerCm.toFixed(1), m.device.distanceCm)}</p>
              <p className="muted small">{s.screenSet(fullDay(m.device.calibratedAt))}</p>
            </>
          ) : <p className="muted">{s.noScreen}</p>}
          {m.eye && <p className="muted small">{s.lenses(m.eye.cyanEye)}</p>}
        </Card>
        <Card title={s.practice} span={6}>
          <dl className="kv">
            <div><dt>{s.programme}</dt><dd>{programme && m.enrolment ? s.programmeLine(programme.name, m.enrolment.week, m.enrolment.dailyMinutes, m.enrolment.daysPerWeek) : s.noProgramme}</dd></div>
            <div><dt>{s.minutes}</dt><dd className="tnum">{s.minutesLine(minutes, practised.length)}</dd></div>
            <div>
              <dt>{s.stops}</dt>
              <dd>
                {recent.length
                  ? <ul className={css.list}>{recent.map((x, i) => <li key={i}>{s.stopLine(s.symptom[x.symptom ?? ""] ?? x.symptom ?? "", dayText(x.at))}</li>)}</ul>
                  : s.noStops}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card title={s.notes}>
        <p>{s.howMeasured}</p>
        <p className="muted small">{common.notMedical}</p>
      </Card>
    </div>
  );
}
