// Eyes Opener: How to show each measured number: its name and its unit, by key. Keys with no label are not shown. .
import { results as t } from "@/copy/results";
import { bestOf, type Detail, type PastSession } from "@/lib/detail";

/** How to show each measured number: its name and its unit, by key. Keys with no label are not shown. */
export type Labels = Readonly<Record<string, { label: string; unit: string }>>;

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(Math.abs(v) < 10 ? 1 : 0));
export const withUnit = (v: number, unit: string) => (unit === "%" ? `${fmt(v)}%` : unit ? `${fmt(v)} ${unit}` : fmt(v));

/** The numbers one session measured, as a short list. Draws nothing when there is none to show. */
export function Measured({ detail, labels }: { detail: Detail | null | undefined; labels: Labels }) {
  const rows = Object.keys(labels).filter((k) => detail && k in detail);
  if (!rows.length) return null;
  return (
    <dl className="kv">
      {rows.map((k) => <div key={k}><dt>{labels[k].label}</dt><dd className="tnum">{withUnit(detail![k], labels[k].unit)}</dd></div>)}
    </dl>
  );
}

const dayOf = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
function when(at: Date, now = new Date()) {
  const day = dayOf(at);
  const time = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(at);
  if (day === dayOf(now)) return `${t.today}, ${time}`;
  if (day === dayOf(new Date(now.getTime() - 86_400_000))) return `${t.yesterday}, ${time}`;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(at);
}

/**
 * The active profile's own record of one game, exercise or film: the latest sessions and the best so far.
 * `lower` lists the keys where a smaller number is better.
 */
export function History({ rows, labels, lower = [], score = false }: { rows: PastSession[]; labels: Labels; lower?: readonly string[]; score?: boolean }) {
  if (!rows.length) return <p className="muted small">{t.none}</p>;
  const keys = Object.keys(labels).filter((k) => rows.some((r) => r.detail && k in r.detail));
  const showScore = score && rows.some((r) => typeof r.score === "number");
  const best = bestOf(rows, lower);
  const bests = [
    ...(showScore && "score" in best ? [`${labels.score?.label ?? t.score} ${best.score}`] : []),
    ...keys.filter((k) => labels[k] && k in best).map((k) => `${labels[k].label} ${withUnit(best[k], labels[k].unit)}`),
  ];
  return (
    <div className="stack">
      {bests.length > 0 && <p><b>{t.best}.</b> {bests.join(" · ")}</p>}
      <div className="tbwrap">
        <table className="tb">
          <thead><tr><th>{t.when}</th><th className="n">{t.time}</th>{showScore && <th className="n">{labels.score?.label ?? t.score}</th>}{keys.map((k) => <th key={k} className="n">{labels[k].label}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{when(r.at)}{r.endReason && t.ended[r.endReason] ? <span className="muted small"> · {t.ended[r.endReason]}</span> : null}</td>
                <td className="n tnum">{t.minutes(r.minutes)}</td>
                {showScore && <td className="n tnum">{r.score ?? ""}</td>}
                {keys.map((k) => <td key={k} className="n tnum">{r.detail && k in r.detail ? withUnit(r.detail[k], labels[k].unit) : ""}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
