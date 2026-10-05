"use client";
/**
 * One match: two patches side by side, and three answers. Saying which side looks brighter moves one of them a
 * small step toward the other; "They look the same" ends the match. No number is shown, so nothing pulls the eye
 * toward an expected answer. Nothing here moves by itself, and nothing flashes: a patch changes only while a
 * button or an arrow key is held, one small step at a time.
 *
 * Touch and mouse: press, or keep pressed to move faster. Keys and a TV remote: left and right arrows are the two
 * side buttons, OK (Enter) presses the button in focus, which starts as "They look the same". Up and down walk
 * through every button of the step: the flow around the match handles those.
 */
import { useCallback, useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { TrueSize, useDraw, type Draw } from "@/components/measure/canvas";
import { screen as c } from "@/copy/screen";
import css from "./screen.module.css";

const t = c.match;
/** Wait before a held button starts to repeat, the time between repeats, and the shortest time between two key steps. */
const HOLD_MS = 380, REPEAT_MS = 75, KEY_MS = 45;

function Scene({ draw, label, dark, sharp }: { draw: Draw; label: string; dark?: boolean; sharp?: boolean }) {
  return <TrueSize><canvas ref={useDraw(draw)} className={`chart${dark ? " dark" : ""}${sharp ? ` ${css.sharp}` : ""}`} role="img" aria-label={label} /></TrueSize>;
}

export interface MatchProps {
  /** Draws both sides for a setting. */
  draw: (value: number) => Draw;
  label: string;
  dark?: boolean;
  /** True for the fine-line scene: it must not be smoothed. */
  sharp?: boolean;
  min: number;
  max: number;
  step: number;
  start: number;
  /** What "left is brighter" does to the setting: 1 raises it, -1 lowers it. */
  left: 1 | -1;
  onDone: (value: number) => void;
  /** More answers for this match, shown under the three. */
  children?: ReactNode;
}

export function Match({ draw, label, dark, sharp, min, max, step, start, left, onDone, children }: MatchProps) {
  const last = Math.round((max - min) / step);
  /* the setting is kept as a whole number of steps, so fractions never drift */
  const [i, setI] = useState(() => Math.max(0, Math.min(last, Math.round((start - min) / step))));
  const value = Math.round((min + i * step) * 1e4) / 1e4;
  const same = useRef<HTMLButtonElement>(null);
  const timers = useRef<{ wait?: ReturnType<typeof setTimeout>; tick?: ReturnType<typeof setInterval> }>({});
  const keyAt = useRef(0);
  /* the first leak match starts at black, which is an end of the scale: say so only once the person has moved */
  const [moved, setMoved] = useState(false);
  const scene = useCallback<Draw>((g, w, h) => draw(value)(g, w, h), [draw, value]);

  const move = useCallback((dir: 1 | -1) => { setMoved(true); setI((was) => Math.max(0, Math.min(last, was + dir))); }, [last]);
  const release = useCallback(() => { clearTimeout(timers.current.wait); clearInterval(timers.current.tick); timers.current = {}; }, []);
  const hold = (dir: 1 | -1) => {
    release();
    move(dir);
    timers.current.wait = setTimeout(() => { timers.current.tick = setInterval(() => move(dir), REPEAT_MS); }, HOLD_MS);
  };
  useEffect(() => release, [release]);
  /* a button that reaches its end is switched off and may never see the finger lift */
  useEffect(() => { if (i <= 0 || i >= last) release(); }, [i, last, release]);
  useEffect(() => { same.current?.focus({ preventScroll: true }); }, []);

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      if (e.timeStamp - keyAt.current < KEY_MS) return;
      keyAt.current = e.timeStamp;
      move(e.key === "ArrowLeft" ? left : (-left as 1 | -1));
    }
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const side = (dir: 1 | -1, words: string) => (
    <button
      type="button" className="btn" disabled={dir > 0 ? i >= last : i <= 0}
      onPointerDown={(e) => { if (e.button === 0) hold(dir); }} onPointerUp={release} onPointerLeave={release} onPointerCancel={release}
      /* a press from the keyboard or a remote arrives as a click with no pointer: it moves one step */
      onClick={(e) => { if (e.detail === 0) move(dir); }}
      onContextMenu={(e) => e.preventDefault()}
    >{words}</button>
  );

  return (
    <div className="stack">
      <Scene draw={scene} label={label} dark={dark} sharp={sharp} />
      <p><b>{t.ask}</b></p>
      <div className={css.pick} role="group" aria-label={t.group}>
        {side(left, t.left)}
        <button type="button" className="btn btn-g" ref={same} onClick={() => onDone(value)}>{t.same}</button>
        {side(-left as 1 | -1, t.right)}
      </div>
      {moved && (i <= 0 || i >= last) && <p className="muted small" role="status">{t.end}</p>}
      {children && <div className={css.more}>{children}</div>}
      <p className="muted small">{t.hold} {t.keys}</p>
    </div>
  );
}
