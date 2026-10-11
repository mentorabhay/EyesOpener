// Eyes Opener: The tool for a routine done away from the screen. Starting it opens the session.
"use client";
import { useRef, useState } from "react";
import type { Labels } from "@/components/play/results";
import { canBegin, Clock, mmss, SessionNote, StopButton } from "@/components/play/session-ui";
import { useTrainSession } from "@/components/play/use-session";
import { train as t } from "@/copy/train";
import type { Measure, Tool } from "@/data/guides";
import type { Detail, TrainDose } from "@/lib/sessions";

const x = t.exercise;
export type Hand = Extract<Tool, { kind: "timer" | "count" | "checklist" | "log" }>;

/**
 * The tool for a routine done away from the screen. Starting it opens the session.
 *  - timer: a stopwatch
 *  - count: a countdown with one large button to tap for each cycle
 *  - checklist: a list to tick off
 *  - log: no clock, for a routine that runs through the day: today's numbers are typed and saved
 * The member types the other numbers the guide asks for, and saving keeps them with the session.
 */
export function Routine({ slug, dose, tool, measures, labels, care = false }: { slug: string; dose: TrainDose; tool: Hand; measures: Measure[]; labels: Labels; care?: boolean }) {
  const detail = useRef<Detail | null>(null);
  const s = useTrainSession("exercise", slug, undefined, detail);
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [taps, setTaps] = useState(0);
  const [ticked, setTicked] = useState<boolean[]>([]);
  const active = s.phase === "active";
  const counting = tool.kind === "count", log = tool.kind === "log";
  const left = counting ? Math.max(0, tool.seconds - s.seconds) : 0;
  const timeUp = counting && active && left === 0;
  const asked = measures.filter((m) => m.from === "typed");

  /* The numbers are kept in a ref as they change, so they are saved even when the allowed time ends the session. */
  const keep = (next: { typed?: Record<string, string>; taps?: number; ticked?: boolean[] }) => {
    const ty = next.typed ?? typed, tp = next.taps ?? taps, tk = next.ticked ?? ticked;
    const out: Detail = {};
    for (const m of asked) {
      const v = Number(ty[m.key]);
      if (ty[m.key]?.trim() && Number.isFinite(v) && v >= m.min && v <= m.max) out[m.key] = v;
    }
    /* A count saved before the clock ran out is worked out over the time really used (never under ten seconds). */
    if (tool.kind === "count") out[tool.measure] = tool.per === "minute" ? Math.round((tp * 60) / Math.max(10, Math.min(tool.seconds, s.seconds))) : tp;
    if (tool.kind === "checklist") out[tool.measure] = tk.filter(Boolean).length;
    detail.current = out;
  };
  const start = () => {
    setTaps(0);
    setTicked([]);
    setTyped({});
    detail.current = null;
    void s.begin();
  };
  const tap = () => { if (!timeUp) { setTaps(taps + 1); keep({ taps: taps + 1 }); } };
  const type = (key: string, value: string) => { const next = { ...typed, [key]: value }; setTyped(next); keep({ typed: next }); };
  const tick = (i: number, on: boolean) => { const next = tool.kind === "checklist" ? tool.items.map((_, n) => (n === i ? on : !!ticked[n])) : []; setTicked(next); keep({ ticked: next }); };

  return (
    <div className="stack">
      {!log && (
        <div className="row">
          <div className="hstat">
            <div className="v tnum" role="timer" aria-label={counting ? x.countLeft : x.elapsed}>{mmss(counting ? left : s.seconds)}</div>
            <div className="l">{counting ? x.countLeft : x.elapsed}</div>
          </div>
          {counting && <div className="hstat"><div className="v tnum" aria-live="polite">{taps}</div><div className="l">{x.counted}</div></div>}
          <span className="sp" />
          {active && !counting && <Clock s={s} />}
        </div>
      )}

      {active && counting && (
        <button type="button" className="btn btn-g" style={{ minHeight: 96, fontSize: "1.2em" }} disabled={timeUp} onClick={tap}>{timeUp ? x.timeUp : tool.tap}</button>
      )}
      {active && tool.kind === "checklist" && (
        <div className="stack" role="group" aria-label={x.checklist}>
          {tool.items.map((item, i) => (
            <label key={item} className="row" style={{ alignItems: "flex-start", gap: 10 }}>
              <input type="checkbox" checked={!!ticked[i]} onChange={(e) => tick(i, e.target.checked)} style={{ marginTop: 4 }} />
              <span>{item}</span>
            </label>
          ))}
        </div>
      )}
      {active && asked.map((m) => (
        <div className="field" key={m.key}>
          <label htmlFor={`m-${m.key}`}>{m.label}{m.unit ? `, ${m.unit}` : ""}</label>
          <input id={`m-${m.key}`} className="input" type="number" inputMode="decimal" min={m.min} max={m.max} step={m.step} value={typed[m.key] ?? ""} onChange={(e) => type(m.key, e.target.value)} style={{ maxWidth: 180 }} />
          <span className="muted small">{m.how}</span>
        </div>
      ))}

      <div className="row">
        {active ? (
          <>
            <button type="button" className="btn btn-g" disabled={!log && s.seconds === 0} onClick={() => void s.end("done")}>{log ? x.saveLog : x.log}</button>
            {!counting && !log && <button type="button" className="btn" onClick={() => s.setTicking(!s.ticking)}>{s.ticking ? x.pause : x.resume}</button>}
            {!log && <StopButton s={s} />}
          </>
        ) : canBegin(s, dose) && <button type="button" className="btn btn-g" onClick={start}>{s.phase === "ended" ? (log ? x.againLog : x.again) : counting ? x.startCount : tool.kind === "checklist" ? x.startCheck : log ? x.startLog : x.start}</button>}
      </div>
      <SessionNote s={s} dose={dose} labels={labels} quiet={care} />
    </div>
  );
}
