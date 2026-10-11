// Eyes Opener: Which way do the dots drift: the balance point found with moving dots. One eye's ink carries dots that all drift.
"use client";
/**
 * Which way do the dots drift: the balance point found with moving dots. One eye's ink carries dots that all drift
 * the same way (the signal); the other eye's ink carries dots that drift every way (the noise). A right answer means
 * the signal eye won, so its ink is dimmed; a wrong answer means the noise eye won, so that ink is dimmed. The
 * engine's balance staircase settles where the answer is as often right with the signal in one eye as in the other.
 *
 * The dots glide and wrap round the edges. None blink on or off, and nothing is timed: they drift until answered.
 */
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { TrueSize, devicePixels } from "@/components/measure/canvas";
import { clips as c } from "@/copy/clips";
import { SCENE_FIELD, answerBalance, balanceContrasts, startBalance, strongInk, weakInk } from "@/engine";
import css from "./clips.module.css";

type Ink = "red" | "cyan";
/** Dots for each eye, their size as a share of the panel's height, and how far they drift in a second as a share of its width. */
const DOTS = 50, DOT = 0.022, SPEED = 0.14;
interface Dot { x: number; y: number; a: number }
interface Trial { signal: Ink; way: -1 | 1; dots: Dot[] }

function newTrial(): Trial {
  const way = Math.random() < 0.5 ? -1 : 1;
  /* the first half are the signal dots, the second half the noise dots */
  const dots = Array.from({ length: 2 * DOTS }, (_, i): Dot => ({ x: Math.random(), y: Math.random(), a: i < DOTS ? (way > 0 ? 0 : Math.PI) : Math.random() * 2 * Math.PI }));
  return { signal: Math.random() < 0.5 ? "red" : "cyan", way, dots };
}

export function DotsTest({ gamma, onDone }: { gamma?: number; onDone: (x: number) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState(startBalance);
  const [trial, setTrial] = useState(newTrial);
  const live = useRef({ trial, x: state.x });
  useEffect(() => { live.current = { trial, x: state.x }; }, [trial, state.x]);

  useEffect(() => {
    const cv = canvas.current!, slow = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0.35 : 1;
    let frame = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const k = devicePixels(), w = Math.max(1, Math.round(cv.clientWidth * k)), h = Math.max(1, Math.round(cv.clientHeight * k));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      const g = cv.getContext("2d")!, { trial: tr, x } = live.current, con = balanceContrasts(x), r = Math.max(2, DOT * h * 0.5);
      g.globalCompositeOperation = "source-over";
      g.fillStyle = SCENE_FIELD; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = "lighter";
      tr.dots.forEach((d, i) => {
        d.x = (d.x + Math.cos(d.a) * SPEED * slow * dt + 1) % 1;
        d.y = (d.y + ((Math.sin(d.a) * SPEED * slow * dt * w) / h) + 1) % 1;
        const ink: Ink = (i < DOTS) === (tr.signal === "red") ? "red" : "cyan";
        g.fillStyle = ink === "red" ? strongInk(con.red, gamma) : weakInk(con.cyan, gamma);
        g.beginPath(); g.arc(d.x * w, d.y * h, r, 0, 2 * Math.PI); g.fill();
      });
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [gamma]);

  /** `way` is the direction given, or null for "cannot tell", which counts as the noise eye winning. */
  function answer(way: -1 | 1 | null) {
    const right = way === trial.way, noise: Ink = trial.signal === "red" ? "cyan" : "red";
    const next = answerBalance(state, right ? trial.signal : noise);
    if (next.result !== null) return onDone(next.result);
    setState(next);
    setTrial(newTrial());
  }
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if ((e.key !== "ArrowLeft" && e.key !== "ArrowRight") || e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    answer(e.key === "ArrowLeft" ? -1 : 1);
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <TrueSize><canvas ref={canvas} className={`chart dark ${css.tall}`} role="img" aria-label={c.choose.dotsLabel} /></TrueSize>
      <p><b>{c.choose.dotsAsk}</b> {c.choose.dotsKeys}</p>
      <div className={css.three} role="group" aria-label={c.choose.dotsGroup}>
        <button type="button" className="btn" onClick={() => answer(-1)}>← {c.choose.left}</button>
        <button type="button" className="btn" onClick={() => answer(null)}>{c.choose.cannot}</button>
        <button type="button" className="btn" onClick={() => answer(1)}>{c.choose.right} →</button>
      </div>
      <p className="muted small">{c.choose.pair(state.trials + 1)}</p>
    </>
  );
}
