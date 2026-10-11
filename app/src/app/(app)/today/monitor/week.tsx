// Eyes Opener: The last seven days as four small charts of seven columns each. Each column carries its own number, so nothing.
/**
 * The last seven days as four small charts of seven columns each. Each column carries its own number, so nothing
 * has to be read off an axis. A day with nothing measured is hatched. Server-rendered: no client code.
 */
import { monitor as copy } from "@/copy/monitor";
import { RULE, type DayTotals } from "@/lib/monitor-rules";
import css from "./monitor.module.css";

const t = copy.after.week;
type Day = { key: string; label: string; totals: DayTotals };
const pct = (share: number) => `${Math.max(0, Math.min(100, share * 100)).toFixed(1)}%`;

function Columns({ title, days, cell }: { title: string; days: Day[]; cell: (d: DayTotals) => { text: string; plot: React.ReactNode } | null }) {
  return (
    <figure>
      <figcaption>{title}</figcaption>
      <div className={css.cols} role="list">
        {days.map((d) => {
          const c = d.totals.measured > 0 ? cell(d.totals) : null;
          return (
            <div className={css.col} key={d.key} role="listitem" aria-label={`${d.label}: ${c ? c.text : t.none}`}>
              <span className={`${css.v} tnum`} aria-hidden="true">{c?.text ?? ""}</span>
              <div className={css.plot} aria-hidden="true">{c ? c.plot : <i className={css.none} />}</div>
              <span className={css.d} aria-hidden="true">{d.label}</span>
            </div>
          );
        })}
      </div>
    </figure>
  );
}

export function Week({ days }: { days: Day[] }) {
  const most = Math.max(60, ...days.map((d) => d.totals.measured));
  const blinkTop = Math.max(20, ...days.map((d) => d.totals.blinksPerMin ?? 0));
  const dueTop = Math.max(4, ...days.map((d) => d.totals.due));
  const ds = days.flatMap((d) => (d.totals.distanceCm === null ? [] : [d.totals.distanceCm]));
  const lo = Math.min(35, ...ds.map((v) => v - 5)), hi = Math.max(75, ...ds.map((v) => v + 5));
  const at = (v: number) => pct((v - lo) / (hi - lo));
  return (
    <div className="stack">
      <div className={css.week}>
        <Columns title={t.measured} days={days} cell={(d) => ({ text: String(d.measured), plot: <i className={css.bar} style={{ height: pct(d.measured / most) }} /> })} />
        <Columns title={t.breaks} days={days} cell={(d) => ({
          text: `${d.taken}/${d.due}`,
          plot: d.due > 0 ? <span className={css.back} style={{ height: pct(d.due / dueTop) }}><i className={css.bar} style={{ height: pct(d.taken / d.due) }} /></span> : null,
        })} />
        <Columns title={t.distance} days={days} cell={(d) => (d.distanceCm === null ? null : {
          text: String(d.distanceCm),
          plot: <><i className={css.rule} style={{ bottom: at(RULE.closeCm) }} /><i className={css.pin} style={{ bottom: at(d.distanceCm) }} /></>,
        })} />
        <Columns title={t.blinks} days={days} cell={(d) => (d.blinksPerMin === null ? null : { text: String(d.blinksPerMin), plot: <i className={css.bar} style={{ height: pct(d.blinksPerMin / blinkTop) }} /> })} />
      </div>
      <p className="small muted">{t.note}</p>
    </div>
  );
}
