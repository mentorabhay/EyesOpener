// Eyes Opener: The eye break between two chapters, drawn over the paused film: what to do, and a slow countdown.
"use client";
import { useEffect, useState } from "react";
import { cinema as c } from "@/copy/cinema";
import { BREAK_METRES, breakLeft, clock, type ChapterPlan } from "./chapters";
import { Glasses, lensLine } from "./controls";
import css from "./film.module.css";

const r = c.rest;

/**
 * The eye break between two chapters, drawn over the paused film: what to do, and a slow countdown.
 * Nothing on it flashes: one number changes once a second and a bar empties evenly.
 * "Carry on" answers only when the countdown has ended, so a break cannot be skipped by a stray press;
 * "End the session here" always answers. The caller keeps the film paused while this is shown.
 */
export function ChapterBreak({ chapter, plan, cyan, onCarryOn, onEnd }: {
  /** The chapter that has just been watched to its end, counted from 1. */
  chapter: number; plan: ChapterPlan; cyan: "L" | "R" | null; onCarryOn: () => void; onEnd: () => void;
}) {
  const total = plan.breakSeconds;
  const [left, setLeft] = useState(total);
  /* The break runs on the clock, not on the screen: it goes on while the tab is hidden or the member is away. */
  useEffect(() => {
    const started = performance.now();
    const timer = setInterval(() => setLeft(breakLeft(started, performance.now(), total)), 250);
    return () => clearInterval(timer);
  }, [total]);
  const over = left <= 0;

  return (
    <div className={`${css.card} ${css.solid}`} role="group" aria-label={r.title} data-film-break={over ? "over" : "running"}>
      <p className={css.soft}>{r.finished(chapter)}</p>
      <h3>{r.title}</h3>
      {over
        ? (
          <>
            <p role="status"><b>{r.over}</b> {r.back(lensLine(cyan))}</p>
            <Glasses cyan={cyan} />
          </>
        )
        : (
          <>
            <p>{r.look(BREAK_METRES)}</p>
            <div className={css.count} role="timer" aria-label={`${r.countdown}: ${r.seconds(left)}`}>{clock(left)}</div>
            <div className={css.drain} aria-hidden="true"><i style={{ transform: `scaleX(${Math.max(0, left - 1) / Math.max(1, total - 1)})` }} /></div>
            <p className={css.soft}>{r.wait}</p>
          </>
        )}
      <div className="row">
        {/* Kept focusable while it waits, so a remote's OK lands here and simply does nothing until the break is over. */}
        <button type="button" className="btn btn-g" autoFocus aria-disabled={!over} onClick={() => { if (over) onCarryOn(); }} data-film-carry-on>{r.carryOn}</button>
        <button type="button" className="btn" onClick={onEnd}>{r.end}</button>
      </div>
    </div>
  );
}
