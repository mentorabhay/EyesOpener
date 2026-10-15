"use client";
/**
 * Which way do the stripes run: a small round patch of soft-edged stripes on mid grey, fading on the letter
 * check-up's staircase. Contrast is set in real light through the screen's tone curve. The patch gives out the same
 * light as the field around it, so only the stripes tell it apart. It is still: nothing swaps, drifts or flickers.
 */
import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { TrueSize, devicePixels, useDraw, type Draw } from "@/components/measure/canvas";
import { PATCH_DEG, canDrawStripes, cycleDots, dotsPerDegree } from "@/clips/maths";
import { clips as c } from "@/copy/clips";
import { answerStaircase, contrastLevels, startStaircase, type Screen } from "@/engine";
import css from "./clips.module.css";

/** 0 upright, 1 flat, 2 leaning right (like /), 3 leaning left (like \). */
type Way = 0 | 1 | 2 | 3;
const KEYS: Record<string, Way> = { ArrowUp: 0, ArrowDown: 1, ArrowRight: 2, ArrowLeft: 3 };
/** The light changes along this direction for each way the stripes run (y grows downward). */
const ACROSS: [number, number][] = [[1, 0], [0, 1], [Math.SQRT1_2, Math.SQRT1_2], [Math.SQRT1_2, -Math.SQRT1_2]];
/** The strongest step is left out: the patch never starts as full black and white. */
const LEVELS = contrastLevels().slice(1);
const pickWay = () => Math.floor(Math.random() * 4) as Way;

const Icon = ({ way }: { way: Way }) => (
  <svg viewBox="0 0 30 30" aria-hidden="true">
    <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${[0, 90, 45, -45][way]} 15 15)`}>
      <path d="M9 4v22M15 4v22M21 4v22" />
    </g>
  </svg>
);

export interface StripesValue { value: number; note: "" | "floor" | "worse"; dpr: number }

/** The test, or the plain reason this screen cannot draw stripes this fine from the seat. */
export function GratingTest({ screen, cpd, onDone }: { screen: Screen; cpd: number; onDone: (r: StripesValue) => void }) {
  const [dpr] = useState(devicePixels);
  if (!canDrawStripes(screen, dpr, cpd)) return <p className="notice" data-b="warn">{c.choose.tooCoarse(cpd, cycleDots(screen, dpr, cpd).toFixed(1))}</p>;
  return <Stripes screen={screen} cpd={cpd} dpr={dpr} onDone={onDone} />;
}

function Stripes({ screen, cpd, dpr, onDone }: { screen: Screen; cpd: number; dpr: number; onDone: (r: StripesValue) => void }) {
  const [stair, setStair] = useState(() => startStaircase(LEVELS.length));
  const [shown, setShown] = useState(() => ({ way: pickWay(), phase: Math.random() * 2 * Math.PI }));
  const contrast = Math.pow(10, -LEVELS[stair.level]), gamma = screen.gamma ?? 2.2;

  const draw = useCallback<Draw>((g, w, h) => {
    const field = Math.round(255 * Math.pow(0.5, 1 / gamma));
    g.fillStyle = `rgb(${field} ${field} ${field})`; g.fillRect(0, 0, w, h);
    const r = Math.floor(Math.min((PATCH_DEG / 2) * dotsPerDegree(screen, dpr), w / 2 - 4, h / 2 - 4)), side = 2 * r;
    if (r < 8) return;
    const img = g.createImageData(side, side), k = (2 * Math.PI) / cycleDots(screen, dpr, cpd), [ax, ay] = ACROSS[shown.way];
    for (let y = 0; y < side; y++) {
      for (let x = 0; x < side; x++) {
        const dx = x - r + 0.5, dy = y - r + 0.5, far = Math.hypot(dx, dy) / r;
        /* a soft edge: full strength out to 70% of the radius, then a smooth fall to nothing */
        const soft = far >= 1 ? 0 : far <= 0.7 ? 1 : 0.5 * (1 + Math.cos(((far - 0.7) / 0.3) * Math.PI));
        const light = 0.5 * (1 + contrast * soft * Math.sin(k * (dx * ax + dy * ay) + shown.phase));
        const v = Math.round(255 * Math.pow(light, 1 / gamma)), i = 4 * (y * side + x);
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, Math.round(w / 2) - r, Math.round(h / 2) - r);
  }, [screen, dpr, cpd, gamma, contrast, shown]);

  function answer(given: Way | null) {
    const next = answerStaircase(stair, given === shown.way);
    if (next.result === null) { setStair(next); setShown({ way: pickWay(), phase: Math.random() * 2 * Math.PI }); return; }
    const i = next.result;
    onDone(i < 0 ? { value: 0, note: "worse", dpr } : { value: LEVELS[i], note: i === LEVELS.length - 1 ? "floor" : "", dpr });
  }
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    const way = KEYS[e.key];
    if (way === undefined || e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    answer(way);
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const canvas = useDraw(draw);
  const btn = (way: Way, label: string) => <button type="button" aria-label={label} onClick={() => answer(way)}><Icon way={way} /></button>;
  return (
    <>
      <TrueSize><canvas ref={canvas} className={`chart ${css.tall}`} role="img" aria-label={c.choose.stripesLabel} /></TrueSize>
      <p><b>{c.choose.stripesAsk}</b> {c.choose.stripesKeys}</p>
      <div className={css.pad} role="group" aria-label={c.choose.stripesGroup}>
        <span />{btn(0, c.choose.way.up)}<span />
        {btn(3, c.choose.way.left)}
        <button type="button" className={css.mid} onClick={() => answer(null)}>{c.choose.cannot}</button>
        {btn(2, c.choose.way.right)}
        <span />{btn(1, c.choose.way.flat)}<span />
      </div>
      <p className="muted small">{c.choose.count(stair.trials + 1)}</p>
    </>
  );
}
