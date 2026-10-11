// Eyes Opener: Mark what looks wrong: the grid check for one eye, drawn by the exercise library's own grid.
"use client";
/**
 * Mark what looks wrong: the grid check for one eye, drawn by the exercise library's own grid
 * (src/drills/tools/grid.tsx) with its own arithmetic. The member looks at the dot and marks the squares where the
 * lines look bent, blurred or missing. It names no disease: IOpener does not diagnose.
 */
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { TrueSize } from "@/components/measure/canvas";
import { clips as c } from "@/copy/clips";
import { Grid } from "@/drills/tools/grid";
import { GRID, GRID_CELLS, GRID_CM, blankMarks, countMarks, holdDistanceCm, moveCursor, toggleMark } from "@/drills/tools/helpers";
import type { TaskProps } from "./types";

const MIDDLE = (GRID / 2) * GRID + GRID / 2;

export function GridTask({ def, ctx, onDone }: TaskProps) {
  const eye = def.play.template === "grid" ? def.play.eye : "R";
  const ppc = ctx.screen!.ppc;
  const [marks, setMarks] = useState(blankMarks);
  const [cursor, setCursor] = useState(MIDDLE);
  const [focused, setFocused] = useState(false);
  const [drawn, setDrawn] = useState(0);
  const grid = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = grid.current;
    if (!el) return;
    const watch = new ResizeObserver(([entry]) => setDrawn(entry.contentRect.width));
    watch.observe(el);
    el.focus({ preventScroll: true });
    return () => watch.disconnect();
  }, []);

  const toggle = (cell: number) => { if (cell >= 0 && cell < GRID_CELLS) { setCursor(cell); setMarks(toggleMark(marks, cell)); } };
  const key = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const press = e.key === " " || e.key === "Enter";
    if (!press && !e.key.startsWith("Arrow") && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    setFocused(true);
    if (press) toggle(cursor); else setCursor(moveCursor(cursor, e.key));
  };
  const count = countMarks(marks);
  /* on a narrow screen the grid is smaller than 10 cm, so it is held closer: always three times its width away */
  const hold = holdDistanceCm(drawn > 0 ? drawn / ppc : GRID_CM);

  return (
    <>
      <TrueSize>
        <Grid boxRef={grid} marks={marks} label={c.grid.label(eye)} width={Math.round(GRID_CM * ppc)} cursor={focused ? cursor : null} onCell={toggle} onKey={key} onFocus={setFocused} />
      </TrueSize>
      <p><b>{c.grid.hold(hold)}</b></p>
      <p className="small tnum" role="status"><b>{c.grid.marked(count)}.</b> <span className="muted">{c.grid.keys}</span></p>
      <button type="button" className="btn btn-g" style={{ alignSelf: "flex-start" }} onClick={() => onDone({ cells: marks.flatMap((on, i) => (on ? [i] : [])) })}>{c.grid.done}</button>
    </>
  );
}
