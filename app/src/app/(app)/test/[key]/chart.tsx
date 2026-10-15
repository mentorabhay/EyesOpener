import { test as c } from "@/copy/test";
import type { TestDef } from "@/data";
import { axisText, dayText, reading, shown, type Series } from "../results";
import css from "../test.module.css";

const h = c.historyOf;
const WIDTH = 400, HEIGHT = 230, LEFT = 54, RIGHT = 348, TOP = 18, BOTTOM = 194;
const colourOf = (s: Series) => (s.eye === "right" ? "var(--s2)" : "var(--s1)");
const nameOf = (s: Series) => (s.eye ? c.eye[s.eye] : h.all);

/** Results over time, one line per eye. Better results sit higher, whichever way the numbers run. */
export function Chart({ t, series }: { t: TestDef; series: Series[] }) {
  const lines = series.filter((s) => s.rows.length);
  const values = lines.flatMap((s) => s.rows.map((r) => shown(t, r.value)));
  const times = lines.flatMap((s) => s.rows.map((r) => r.takenAt.getTime()));
  const min = Math.min(...values), max = Math.max(...values), flat = max - min < 1e-6;
  /* a flat line sits in the middle of the plot with one labelled level */
  const lo = flat ? min - 1 : min, hi = flat ? max + 1 : max;
  const from = Math.min(...times), to = Math.max(...times);
  const [firstDay, lastDay] = [from, to].map((ms) => dayText(new Date(ms)));
  const x = (ms: number) => (to === from ? (LEFT + RIGHT) / 2 : LEFT + ((ms - from) / (to - from)) * (RIGHT - LEFT));
  const y = (v: number) => TOP + ((t.lowerIsBetter ? v - lo : hi - v) / (hi - lo)) * (BOTTOM - TOP);
  const point = (s: Series, i: number) => ({ px: x(s.rows[i].takenAt.getTime()), py: y(shown(t, s.rows[i].value)) });

  /* end labels: when two lines finish close together the labels move apart just enough to be read */
  const ends = lines.map((s) => point(s, s.rows.length - 1).py);
  if (ends.length === 2 && Math.abs(ends[0] - ends[1]) < 14) {
    const up = ends[0] <= ends[1] ? 0 : 1, mid = (ends[0] + ends[1]) / 2;
    ends[up] = mid - 7;
    ends[1 - up] = mid + 7;
  }
  const label = h.chartLabel(t.name, lines.map((s) => h.line(nameOf(s), reading(t, s.first!), reading(t, s.last!), s.rows.length)));

  return (
    <>
      <ul className={css.legend}>
        {lines.length > 1 && lines.map((s) => <li key={s.eye}><i style={{ borderColor: colourOf(s) }} />{nameOf(s)}</li>)}
        <li><i className={css.ring} />{h.firstKey}</li>
      </ul>
      <svg className={css.plot} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label}>
        {(flat ? [min] : [lo, (lo + hi) / 2, hi]).map((v) => (
          <g key={v}>
            <line x1={LEFT} x2={RIGHT} y1={y(v)} y2={y(v)} stroke="var(--line-2)" strokeWidth="1" />
            <text x={LEFT - 10} y={y(v) + 4} textAnchor="end" fill="currentColor">{axisText(t, v)}</text>
          </g>
        ))}
        {firstDay === lastDay
          ? <text x={(LEFT + RIGHT) / 2} y={HEIGHT - 10} textAnchor="middle" fill="currentColor">{firstDay}</text>
          : <><text x={LEFT} y={HEIGHT - 10} fill="currentColor">{firstDay}</text><text x={RIGHT} y={HEIGHT - 10} textAnchor="end" fill="currentColor">{lastDay}</text></>}
        {lines.map((s, n) => {
          const colour = colourOf(s), base = y(shown(t, s.first!.value));
          return (
            <g key={s.eye ?? "all"}>
              <line x1={LEFT} x2={RIGHT} y1={base} y2={base} stroke={colour} strokeWidth="1" strokeOpacity=".45" />
              <polyline points={s.rows.map((_, i) => `${point(s, i).px.toFixed(1)},${point(s, i).py.toFixed(1)}`).join(" ")} fill="none" stroke={colour} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {s.rows.map((r, i) => {
                const { px, py } = point(s, i);
                return (
                  <g key={r.id}>
                    {r.id === s.first!.id && <circle cx={px} cy={py} r="8" fill="none" stroke={colour} strokeWidth="1.5" />}
                    <circle cx={px} cy={py} r="4" fill={colour} stroke="var(--card)" strokeWidth="2" />
                    <circle cx={px} cy={py} r="12" fill="transparent"><title>{`${dayText(r.takenAt)}: ${nameOf(s)} ${reading(t, r)}`}</title></circle>
                  </g>
                );
              })}
              {lines.length > 1 && <text x={RIGHT + 12} y={ends[n] + 4} fill="currentColor">{c.eyeShort[s.eye!]}</text>}
            </g>
          );
        })}
      </svg>
      <p className="muted small">{h.upIsBetter}{t.unit in c.units && ` ${h.valuesIn(c.units[t.unit])}`}</p>
    </>
  );
}
