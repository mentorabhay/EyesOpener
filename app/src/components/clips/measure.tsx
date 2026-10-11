// Eyes Opener: Measure it yourself: a card against the screen, a ruler checked with a tape, the seat measured with a tape, and.
"use client";
/**
 * Measure it yourself: a card against the screen, a ruler checked with a tape, the seat measured with a tape, and
 * the near point measured with a ruler. The first three set a value of the household's screen. The near point is
 * played by the near point check-up's own part.
 */
import { useRef, useState } from "react";
import { CardBar, TrueSize } from "@/components/measure/canvas";
import { LIMITS } from "@/components/measure/limits";
import { NearPointTest } from "@/components/measure/near-point";
import { ppcFromDiagonal } from "@/clips/maths";
import { clips as c } from "@/copy/clips";
import css from "./clips.module.css";
import type { TaskProps } from "./types";

const m = c.measure;
const numberOf = (text: string, lo: number, hi: number) => { const v = Number(text.replace(",", ".")); return text.trim() && Number.isFinite(v) && v >= lo && v <= hi ? v : null; };

function Card({ ppc: start, onDone }: { ppc: number; onDone: (data: unknown) => void }) {
  const [ppc, setPpc] = useState(start);
  return (
    <div className={css.cal}>
      <CardBar ppc={ppc} />
      <div>
        <label className="field">
          <span className="lab">{m.cardBar}</span>
          <input type="range" min={LIMITS.ppc[0]} max={LIMITS.ppc[1]} step={0.1} value={ppc} onChange={(e) => setPpc(Number(e.target.value))} />
        </label>
        <p className="muted small tnum">{m.size(ppc)}</p>
        <button type="button" className="btn btn-g" style={{ alignSelf: "flex-start" }} onClick={() => onDone({ ppc })}>{m.cardSave}</button>
      </div>
    </div>
  );
}

function Ruler({ onDone }: { onDone: (data: unknown) => void }) {
  const [inches, setInches] = useState("");
  const [shown, setShown] = useState<{ ppc: number; cm: number; widthPx: number; heightPx: number } | null>(null);
  const [measured, setMeasured] = useState("");
  const diagonal = numberOf(inches, 5, 120), tape = numberOf(measured, 2, 120);
  const box = useRef<HTMLDivElement>(null);

  function draw() {
    if (diagonal === null) return;
    const widthPx = window.screen.width, heightPx = window.screen.height, ppc = ppcFromDiagonal(diagonal, widthPx, heightPx);
    /* the longest whole ruler of 30, 20, 10 or 5 cm that fits across this part of the page */
    const room = ((box.current?.clientWidth ?? window.innerWidth * 0.6) - 8) / ppc, cm = room >= 30 ? 30 : room >= 20 ? 20 : room >= 10 ? 10 : 5;
    setShown({ ppc, cm, widthPx, heightPx });
    setMeasured(String(cm));
  }

  return (
    <div className="stack" ref={box}>
      <div className={`field ${css.num}`}>
        <label htmlFor="ruler-inches">{m.inches}</label>
        <input id="ruler-inches" type="number" inputMode="decimal" min={5} max={120} step={0.1} value={inches} aria-invalid={inches !== "" && diagonal === null} onChange={(e) => { setInches(e.target.value); setShown(null); }} />
      </div>
      <p className="muted small">{m.inchesHint}</p>
      {!shown && <button type="button" className="btn btn-g" style={{ alignSelf: "flex-start" }} disabled={diagonal === null} onClick={draw}>{m.showRuler}</button>}
      {shown && (
        <>
          <p><b>{m.ruler(shown.cm)}</b></p>
          <TrueSize><div className={css.ruler} role="img" aria-label={m.rulerLabel} style={{ width: `${(shown.cm * shown.ppc).toFixed(1)}px`, ["--cm" as string]: `${shown.ppc.toFixed(2)}px` }} /></TrueSize>
          <div className={`field ${css.num}`}>
            <label htmlFor="ruler-tape">{m.measured}</label>
            <input id="ruler-tape" type="number" inputMode="decimal" min={2} max={120} step={0.1} value={measured} aria-invalid={measured !== "" && tape === null} onChange={(e) => setMeasured(e.target.value)} />
          </div>
          <p className="muted small">{m.zoom}</p>
          <button
            type="button" className="btn btn-g" style={{ alignSelf: "flex-start" }} disabled={tape === null}
            onClick={() => tape !== null && onDone({ inches: diagonal, widthPx: shown.widthPx, heightPx: shown.heightPx, shownCm: shown.cm, measuredCm: tape })}
          >{m.rulerSave}</button>
        </>
      )}
    </div>
  );
}

function Seat({ dist, onDone }: { dist: number; onDone: (data: unknown) => void }) {
  const [text, setText] = useState("");
  const [lo, hi] = LIMITS.dist, cm = numberOf(text, lo, hi);
  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); if (cm !== null) onDone({ cm: Math.round(cm) }); }}>
      <div className={`field ${css.num}`}>
        <label htmlFor="seat-cm">{m.seat}</label>
        <input id="seat-cm" type="number" inputMode="numeric" min={lo} max={hi} step={1} value={text} required aria-invalid={text !== "" && cm === null} onChange={(e) => setText(e.target.value)} />
      </div>
      <p className="muted small">{m.seatRange(lo, hi)} {m.was(m.dist(dist))}</p>
      <button type="submit" className="btn btn-g" style={{ alignSelf: "flex-start" }} disabled={cm === null}>{m.seatSave}</button>
    </form>
  );
}

export function MeasureTask({ def, ctx, onDone }: TaskProps) {
  const kind = def.play.template === "measure" ? def.play.kind : "card";
  if (kind === "near_point") return <NearPointTest young={ctx.young} onDone={(tries) => onDone({ tries })} />;
  if (kind === "card") return <Card ppc={ctx.screen!.ppc} onDone={onDone} />;
  if (kind === "ruler") return <Ruler onDone={onDone} />;
  return <Seat dist={ctx.screen!.dist} onDone={onDone} />;
}
