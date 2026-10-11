// Eyes Opener: Today in ten-minute steps: distance, blinks and breaks as three small charts on one time line.
"use client";
/**
 * Today in ten-minute steps: distance, blinks and breaks as three small charts on one time line.
 * One measure, one chart: no chart here has two scales. Hatching marks a step in which nothing was measured.
 * A step is read by moving over the chart or with the arrow keys, and every number is also in the table under it.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { monitor as copy } from "@/copy/monitor";
import { BIN_MIN, RULE, type Bin } from "@/lib/monitor-rules";
import css from "./monitor.module.css";

const t = copy.after.charts;
const LEFT = 34, RIGHT = 10, TITLE = 18;
const H = { distance: 104, blinks: 74, breaks: 40, axis: 22, gap: 16 };

const hhmm = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
const nice = (v: number, step: number, up: boolean) => (up ? Math.ceil(v / step) : Math.floor(v / step)) * step;

export function DayChart({ from, to, bins }: { from: number; to: number; bins: Bin[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [at, setAt] = useState<number | null>(null);
  const id = useId();

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const watch = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  const plotW = width - LEFT - RIGHT, n = bins.length, bw = plotW / Math.max(1, n);
  const x = (i: number) => LEFT + (i + 0.5) * bw;
  const top = { distance: TITLE, blinks: TITLE + H.distance + H.gap + TITLE, breaks: TITLE + H.distance + H.gap + TITLE + H.blinks + H.gap + TITLE };
  const height = top.breaks + H.breaks + H.axis;

  /* distance: a scale that always holds the 50 cm line */
  const ds = bins.flatMap((b) => (b.distanceCm === null ? [] : [b.distanceCm]));
  const dLo = Math.min(35, nice(Math.min(...ds, 35) - 2, 5, false)), dHi = Math.max(75, nice(Math.max(...ds, 75) + 2, 5, true));
  const dy = (v: number) => top.distance + H.distance - ((v - dLo) / (dHi - dLo)) * H.distance;
  /* blinks: from zero */
  const bs = bins.flatMap((b) => (b.blinksPerMin === null ? [] : [b.blinksPerMin]));
  const bHi = Math.max(20, nice(Math.max(...bs, 0), 10, true));
  const by = (v: number) => top.blinks + H.blinks - (v / bHi) * H.blinks;

  /* the distance line breaks wherever a step has no distance: nothing is drawn across a gap */
  const runs: number[][] = [];
  bins.forEach((b, i) => { if (b.distanceCm === null) return; const last = runs[runs.length - 1]; if (last && last[last.length - 1] === i - 1) last.push(i); else runs.push([i]); });
  const dots = bw >= 9;
  const barW = Math.max(2, Math.min(12, bw - 2));

  const hours = Array.from({ length: to - from + 1 }, (_, k) => from + k);
  /* an hour label is about 34 dots wide: show every hour only when there is room */
  const perHour = plotW / Math.max(1, to - from);
  const everyHour = perHour >= 46 ? 1 : perHour >= 23 ? 2 : perHour >= 15 ? 3 : 4;
  const panels = [[top.distance, H.distance], [top.blinks, H.blinks], [top.breaks, H.breaks]] as const;

  const pick = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientX - box.left - LEFT) / bw);
    setAt(i >= 0 && i < n ? i : null);
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const move = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (move) { e.preventDefault(); setAt((v) => Math.max(0, Math.min(n - 1, (v ?? (move > 0 ? -1 : n)) + move))); }
    else if (e.key === "Home") { e.preventDefault(); setAt(0); }
    else if (e.key === "End") { e.preventDefault(); setAt(n - 1); }
    else if (e.key === "Escape") setAt(null);
  };
  const b = at === null ? null : bins[at];
  const tipLeft = at === null ? 0 : Math.max(0, Math.min(width - 190, x(at) + (x(at) > width / 2 ? -200 : 12)));

  /* the table: one row an hour */
  const rows = hours.slice(0, -1).map((h) => {
    const mine = bins.filter((q) => q.start >= h * 60 && q.start < (h + 1) * 60);
    const mid = (v: number[]) => { if (!v.length) return null; const s = [...v].sort((p, q) => p - q), m = s.length >> 1; return Math.round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2); };
    return {
      h, measured: mine.reduce((s, q) => s + q.measured, 0),
      distance: mid(mine.flatMap((q) => (q.distanceCm === null ? [] : [q.distanceCm]))), blinks: mid(mine.flatMap((q) => (q.blinksPerMin === null ? [] : [q.blinksPerMin]))),
      due: mine.reduce((s, q) => s + q.due, 0), taken: mine.reduce((s, q) => s + q.taken, 0),
    };
  });

  return (
    <div className="stack">
      <div
        ref={wrap} className={css.chart} tabIndex={0} role="group" aria-label={t.alt} aria-describedby={`${id}-hint`}
        onPointerMove={pick} onPointerDown={pick} onPointerLeave={() => setAt(null)} onKeyDown={key} onBlur={() => setAt(null)}
      >
        <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true">
          <defs>
            <pattern id={`${id}-h`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" className={css.hatchLine} /></pattern>
          </defs>

          {/* nothing measured: hatched through all three charts */}
          {bins.map((q, i) => q.measured === 0 && panels.map(([y, h]) => <rect key={`${i}-${y}`} x={LEFT + i * bw} y={y} width={bw + 0.5} height={h} fill={`url(#${id}-h)`} />))}

          <text x={LEFT} y={top.distance - 6} className={css.label}>{t.distance}</text>
          {[dLo, RULE.closeCm, dHi].map((v) => (
            <g key={v}>
              <line x1={LEFT} x2={width - RIGHT} y1={dy(v)} y2={dy(v)} className={v === RULE.closeCm ? css.guide : css.grid} />
              <text x={LEFT - 6} y={dy(v) + 4} textAnchor="end" className={css.axis}>{v}</text>
            </g>
          ))}
          {runs.map((run) => run.length > 1 && <polyline key={run[0]} className={css.line} points={run.map((i) => `${x(i).toFixed(1)},${dy(bins[i].distanceCm!).toFixed(1)}`).join(" ")} />)}
          {runs.map((run) => run.map((i) => (dots || run.length === 1) && <circle key={i} cx={x(i)} cy={dy(bins[i].distanceCm!)} r={dots ? 3.5 : 3} className={css.dot} />))}

          <text x={LEFT} y={top.blinks - 6} className={css.label}>{t.blinks}</text>
          {[0, bHi / 2, bHi].map((v) => (
            <g key={v}>
              <line x1={LEFT} x2={width - RIGHT} y1={by(v)} y2={by(v)} className={css.grid} />
              <text x={LEFT - 6} y={by(v) + 4} textAnchor="end" className={css.axis}>{v}</text>
            </g>
          ))}
          {bins.map((q, i) => {
            if (q.blinksPerMin === null) return null;
            const y0 = by(0), y1 = Math.min(y0 - 1.5, by(q.blinksPerMin)), r = Math.min(3, barW / 2, y0 - y1), l = x(i) - barW / 2;
            return <path key={i} className={css.mark} d={`M${l},${y0}V${y1 + r}q0,${-r} ${r},${-r}h${barW - 2 * r}q${r},0 ${r},${r}V${y0}z`} />;
          })}

          <text x={LEFT} y={top.breaks - 6} className={css.label}>{t.breaks}</text>
          <line x1={LEFT} x2={width - RIGHT} y1={top.breaks + H.breaks} y2={top.breaks + H.breaks} className={css.grid} />
          {bins.map((q, i) => (
            <g key={i}>
              {q.due > 0 && <circle cx={x(i)} cy={top.breaks + 11} r={4} className={css.ring} />}
              {q.taken > 0 && <circle cx={x(i)} cy={top.breaks + 28} r={4.5} className={css.dot} />}
            </g>
          ))}

          {hours.map((h, k) => k % everyHour === 0 && (
            <text key={h} x={LEFT + (k * 60 / BIN_MIN) * bw} y={height - 5} textAnchor={k === 0 ? "start" : k === hours.length - 1 ? "end" : "middle"} className={css.axis}>{hhmm(h * 60)}</text>
          ))}

          {at !== null && <line x1={x(at)} x2={x(at)} y1={top.distance} y2={top.breaks + H.breaks} className={css.cross} />}
        </svg>

        {b && (
          <div className={css.tip} style={{ left: tipLeft }} role="status">
            <b className="tnum">{hhmm(b.start)} to {hhmm(b.start + BIN_MIN)}</b>
            {b.measured === 0 ? <span>{t.tip.none}</span> : (
              <>
                <span className="tnum">{t.tip.distance(b.distanceCm)}</span>
                <span className="tnum">{t.tip.blinks(b.blinksPerMin)}</span>
                <span className="muted tnum">{t.tip.measured(b.measured)}</span>
              </>
            )}
            {(b.due > 0 || b.taken > 0) && <span className="tnum">{t.tip.breaks(b.due, b.taken)}</span>}
          </div>
        )}
      </div>

      <div className={css.key}>
        <span><svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="4" className={css.ring} /></svg>{t.due}</span>
        <span><svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="4.5" className={css.dot} /></svg>{t.taken}</span>
        <span><i className={css.swatch} aria-hidden="true" />{t.hatch}</span>
      </div>
      <p className="small muted" id={`${id}-hint`}>{t.hint}</p>

      <details>
        <summary className="small">{t.table}</summary>
        <div className="tbwrap">
          <table className="tb">
            <thead><tr><th>{t.cols.hour}</th><th className="n">{t.cols.measured}</th><th className="n">{t.cols.distance}</th><th className="n">{t.cols.blinks}</th><th className="n">{t.cols.due}</th><th className="n">{t.cols.taken}</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.h}>
                  <td className="tnum">{hhmm(r.h * 60)}</td>
                  <td className="n tnum">{r.measured}</td>
                  <td className="n tnum">{r.distance ?? <span className="void" role="img" aria-label={t.tip.none} />}</td>
                  <td className="n tnum">{r.blinks ?? <span className="void" role="img" aria-label={t.tip.none} />}</td>
                  <td className="n tnum">{r.due}</td>
                  <td className="n tnum">{r.taken}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
