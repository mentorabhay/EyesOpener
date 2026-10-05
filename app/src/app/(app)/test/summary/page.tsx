import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Btn, Card, PageHead } from "@/components/ui";
import { test as c } from "@/copy/test";
import { common } from "@/copy/common";
import { assist } from "@/lib/assist/extra";
import { requireMember } from "@/lib/session";
import { dayText, reading, type Result } from "../results";
import { firstOf, fullDay, lineName, summaryData, symptomText, type SummaryLine } from "./facts";
import { PlainWords } from "./plain-words";
import { PrintButton } from "./print-button";
import css from "./summary.module.css";

const s = c.summary;
export const metadata: Metadata = { title: s.title };

/** Everything an eye doctor may want from the home measurements, on one printable page. Read-only: anyone who may look may open it. */
export default async function SummaryPage() {
  const m = await requireMember();
  if (!m.can("view")) notFound();
  const { now, lines, minutes, practisedDays, programme, recent } = await summaryData(m);
  /* Only an edition with an assistant offers a paragraph in plain words, only to a grown-up, and only while it can answer. */
  const plain = assist.available && !m.childMode && m.can("test") && (await assist.ready("exam").catch(() => false));
  const cell = (r: Result | undefined, line: SummaryLine) =>
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
                const { t, line } = x, first = firstOf(x);
                return (
                  <tr key={`${t.key} ${line.eye}`}>
                    <td>
                      {lineName(x)}
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
            <div><dt>{s.minutes}</dt><dd className="tnum">{s.minutesLine(minutes, practisedDays)}</dd></div>
            <div>
              <dt>{s.stops}</dt>
              <dd>
                {recent.length
                  ? <ul className={css.list}>{recent.map((x, i) => <li key={i}>{s.stopLine(symptomText(x.symptom), dayText(x.at))}</li>)}</ul>
                  : s.noStops}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      {plain && <PlainWords />}

      <Card title={s.notes}>
        <p>{s.howMeasured}</p>
        <p className="muted small">{common.notMedical}</p>
      </Card>
    </div>
  );
}
