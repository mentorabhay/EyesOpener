"use client";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent, type Ref } from "react";
import { TrueSize } from "@/components/measure/canvas";
import type { Labels } from "@/components/play/results";
import { canBegin, Clock, SessionNote, StopButton } from "@/components/play/session-ui";
import { useTrainSession } from "@/components/play/use-session";
import { tools } from "@/copy/drills-tools";
import type { Detail, TrainDose } from "@/lib/sessions";
import { blankMarks, cellAt, countMarks, DEFAULT_PPC, GRID, GRID_CELLS, GRID_CM, gridDetail, holdDistanceCm, moveCursor, toggleMark } from "./helpers";

const t = tools.grid;
type Eye = "right" | "left";
type Step = "right_look" | "right_mark" | "left_look" | "left_mark" | "summary";
const STEP_NUMBER: Record<Step, number> = { right_look: 1, right_mark: 2, left_look: 3, left_mark: 3, summary: 4 };
/** One square is 10 units; the picture has a small rim so the outer lines are drawn whole. */
const CELL = 10, SIDE = GRID * CELL, RIM = 2, BOX = SIDE + 2 * RIM;
const LINES = Array.from({ length: GRID + 1 }, (_, i) => i * CELL);
const TINT = "#8b31f0";
const MIDDLE = (GRID / 2) * GRID + GRID / 2;

/** The grid itself: dark lines on a light panel, a dot in the middle, the marked squares tinted. */
export function Grid({ marks, label, width, cursor, onCell, onKey, onFocus, describedBy, boxRef }: {
  marks: readonly boolean[]; label: string; width: number | string;
  cursor?: number | null; onCell?: (cell: number) => void; onKey?: (e: KeyboardEvent<SVGSVGElement>) => void;
  onFocus?: (keyboard: boolean) => void; describedBy?: string; boxRef?: Ref<SVGSVGElement>;
}) {
  const live = !!onCell;
  const click = (e: MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const cell = cellAt((((e.clientX - r.left) / r.width) * BOX - RIM) / SIDE, (((e.clientY - r.top) / r.height) * BOX - RIM) / SIDE);
    if (cell === null) return;
    onFocus?.(false);
    onCell?.(cell);
  };
  return (
    <svg
      ref={boxRef}
      className="chart"
      viewBox={`${-RIM} ${-RIM} ${BOX} ${BOX}`}
      role={live ? "application" : "img"}
      aria-label={label}
      aria-describedby={describedBy}
      tabIndex={live ? 0 : undefined}
      onClick={live ? click : undefined}
      onKeyDown={live ? onKey : undefined}
      onFocus={live ? (e) => onFocus?.(e.currentTarget.matches(":focus-visible")) : undefined}
      onBlur={live ? () => onFocus?.(false) : undefined}
      style={{ width, maxWidth: "100%", height: "auto", aspectRatio: "1 / 1", touchAction: "manipulation", cursor: live ? "pointer" : undefined }}
    >
      {marks.map((on, i) => on && <rect key={i} x={(i % GRID) * CELL} y={Math.floor(i / GRID) * CELL} width={CELL} height={CELL} fill={TINT} fillOpacity="0.5" />)}
      <g stroke="#111418" strokeWidth="0.6">
        {LINES.map((p) => <line key={`h${p}`} x1="0" y1={p} x2={SIDE} y2={p} />)}
        {LINES.map((p) => <line key={`v${p}`} x1={p} y1="0" x2={p} y2={SIDE} />)}
      </g>
      <circle cx={SIDE / 2} cy={SIDE / 2} r="2.6" fill="#111418" />
      {typeof cursor === "number" && <rect x={(cursor % GRID) * CELL} y={Math.floor(cursor / GRID) * CELL} width={CELL} height={CELL} fill="none" stroke={TINT} strokeWidth="2.4" />}
    </svg>
  );
}

/**
 * A home check of the centre of vision, one eye at a time. The member looks at the dot and marks the squares
 * where the lines look bent, blurred or missing. The tool keeps the number of squares marked for each eye.
 * It says when to see an eye doctor. It names no disease: IOpener does not diagnose.
 */
export function GridTool({ slug, dose, labels, ppc }: { slug: string; dose: TrainDose; labels: Labels; ppc: number }) {
  const detail = useRef<Detail | null>(null);
  const s = useTrainSession("exercise", slug, undefined, detail);
  const [step, setStep] = useState<Step>("right_look");
  const [marks, setMarks] = useState({ right: blankMarks(), left: blankMarks() });
  const [done, setDone] = useState({ right: false, left: false });
  const [cursor, setCursor] = useState(MIDDLE);
  const [focused, setFocused] = useState(false);
  const [drawnPx, setDrawnPx] = useState(0);
  const grid = useRef<SVGSVGElement>(null);
  const stepId = useId();
  const active = s.phase === "active";
  const ended = s.phase === "ended";

  const measured = ppc > 0;
  const perCm = measured ? ppc : DEFAULT_PPC;
  const wanted = Math.round(GRID_CM * perCm);
  /* On a narrow screen the grid is smaller than 10 cm, so it is held closer: always three times its width away. */
  const hold = holdDistanceCm(drawnPx > 0 ? drawnPx / perCm : GRID_CM);

  const eye: Eye = step === "left_look" || step === "left_mark" ? "left" : "right";
  const marking = active && (step === "right_mark" || step === "left_mark");
  const counts = { right: countMarks(marks.right), left: countMarks(marks.left) };
  const summary = (active && step === "summary") || (ended && (done.right || counts.right + counts.left > 0));

  useEffect(() => {
    const el = grid.current;
    if (!el) return;
    const watch = new ResizeObserver(([entry]) => setDrawnPx(entry.contentRect.width));
    watch.observe(el);
    return () => watch.disconnect();
  }, [summary]);
  /* The grid takes the focus when marking begins, so the arrow keys work at once. The cursor square shows only for a keyboard. */
  useEffect(() => { if (marking) grid.current?.focus({ preventScroll: true }); }, [marking]);

  const start = () => {
    detail.current = null;
    setMarks({ right: blankMarks(), left: blankMarks() });
    setDone({ right: false, left: false });
    setStep("right_look");
    setCursor(MIDDLE);
    void s.begin();
  };
  const toggle = (cell: number) => {
    if (!marking || cell < 0 || cell >= GRID_CELLS) return;
    setCursor(cell);
    setMarks({ ...marks, [eye]: toggleMark(marks[eye], cell) });
  };
  const key = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const space = e.key === " " || e.key === "Enter";
    if (!space && !e.key.startsWith("Arrow") && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    setFocused(true);
    if (space) toggle(cursor);
    else setCursor(moveCursor(cursor, e.key));
  };
  /* Each eye's number is kept the moment that eye is done, so it is saved even when the allowed time ends the session. */
  const finish = (which: Eye) => {
    const next = { ...done, [which]: true };
    setDone(next);
    detail.current = gridDetail(next.right ? counts.right : null, next.left ? counts.left : null);
    setCursor(MIDDLE);
    setStep(which === "right" ? "left_look" : "summary");
  };

  const row = Math.floor(cursor / GRID) + 1, column = (cursor % GRID) + 1;
  const anyMarked = counts.right + counts.left > 0;

  return (
    <div className="stack">
      {!active && !summary && <p>{t.intro}</p>}

      {active && (
        <div className="row">
          <span className="chip" data-b="plain">{t.step(STEP_NUMBER[step])}</span>
          {step !== "summary" && <b>{t.eye[eye]}</b>}
          {step === "summary" && <b>{t.summary}</b>}
          <span className="sp" />
          <Clock s={s} />
        </div>
      )}
      {active && step !== "summary" && (
        <p id={stepId} style={{ fontSize: "1.15em", fontWeight: 500 }} aria-live="polite">
          {marking ? t.mark : t.cover[eye]}
        </p>
      )}

      {!summary && (
        <>
          <TrueSize>
            <Grid
              boxRef={grid}
              marks={active ? marks[eye] : marks.right}
              label={active ? t.label[eye] : t.label.plain}
              width={wanted}
              cursor={marking && focused ? cursor : null}
              onCell={marking ? toggle : undefined}
              onKey={key}
              onFocus={setFocused}
              describedBy={active ? stepId : undefined}
            />
          </TrueSize>
          <p className="muted small">{t.hold(hold)}{!measured && ` ${t.notMeasured}`}</p>
        </>
      )}
      {marking && (
        <>
          <p className="small tnum" role="status">
            <b>{t.marked(counts[eye])}.</b>{focused ? ` ${t.cell(row, column, marks[eye][cursor])}` : ""} <span className="muted">{t.clear}</span>
          </p>
          <p className="muted small">{t.keys}</p>
        </>
      )}

      {summary && (
        <div className="stack">
          <div className="row" style={{ alignItems: "flex-start", gap: 16 }}>
            {(["right", "left"] as const).map((e) => (
              <div key={e} className="stack" style={{ flex: "1 1 130px", maxWidth: 220, gap: 6 }}>
                <b>{t.eye[e]}</b>
                <Grid marks={marks[e]} label={`${t.eye[e]}: ${done[e] ? t.marked(counts[e]) : t.notChecked}`} width="100%" />
                <span className="small tnum">{done[e] ? t.marked(counts[e]) : t.notChecked}</span>
              </div>
            ))}
          </div>
          {anyMarked
            ? <p className="notice" data-b="warn">{t.warn}</p>
            : <p className="notice" data-b={done.right && done.left ? "ok" : undefined}>{done.right && done.left ? t.none : t.unfinished}</p>}
          <p className="muted small">{t.notExam}</p>
        </div>
      )}

      <div className="row">
        {active ? (
          <>
            {(step === "right_look" || step === "left_look") && <button type="button" className="btn btn-g" onClick={() => setStep(step === "right_look" ? "right_mark" : "left_mark")}>{t.ready}</button>}
            {marking && <button type="button" className="btn btn-g" onClick={() => finish(eye)}>{t.done[eye]}</button>}
            {step === "summary" && <button type="button" className="btn btn-g" onClick={() => void s.end("done")}>{t.save}</button>}
            <StopButton s={s} />
          </>
        ) : canBegin(s, dose) && <button type="button" className="btn btn-g" onClick={start}>{ended ? t.again : t.start}</button>}
      </div>
      <SessionNote s={s} dose={dose} labels={labels} />
    </div>
  );
}
