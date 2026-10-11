// Eyes Opener: The letter test with other targets: the E with a bar close on each side, the four matching letters for a young.
"use client";
/**
 * The letter test with other targets: the E with a bar close on each side, the four matching letters for a young
 * child, and the pale grey E. The sizes, the staircase and the way a result is recorded are the letter check-up's
 * own (src/engine/measure.ts); only the drawing differs.
 */
import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { ArrowPad } from "@/components/measure/arrow-pad";
import { TrueSize, devicePixels, useDraw, type Draw, type Turn } from "@/components/measure/canvas";
import { LIMITS } from "@/components/measure/limits";
import { clips as c } from "@/copy/clips";
import { measure as t } from "@/copy/test";
import { acuityLevels, answerStaircase, channel, startStaircase, type Screen } from "@/engine";
import css from "./clips.module.css";

export type OptotypeKind = "crowded" | "shapes" | "faint";
export interface LetterValue { value: number; note: "" | "floor" | "worse" }

const SHAPES = ["H", "O", "T", "V"] as const;
/** The panel's height in page dots, and the bars' distance from the letter in strokes: half a letter's width. */
const PANEL = 300, BAR_GAP = 2.5;
/** A letter with bars takes 12 strokes each way: the letter is five, and each side has a gap of two and a half and a bar of one. */
const WITH_BARS = 5 + 2 * (BAR_GAP + 1);
/** The pale letter gives out nine tenths of the light of the white page around it. */
const FAINT_LIGHT = 0.9;

/** A letter on a grid five strokes wide and five tall. `x`, `y` are its top left corner; `s` is one stroke in real dots. */
function letter(g: CanvasRenderingContext2D, which: number, x: number, y: number, s: number, isE: boolean) {
  const r = (cx: number, cy: number, w: number, h: number) => g.fillRect(x + cx * s, y + cy * s, w * s, h * s);
  if (isE) {
    const turn = which as Turn;
    if (turn % 2 === 0) { r(turn === 0 ? 0 : 4, 0, 1, 5); for (let k = 0; k < 3; k++) r(0, 2 * k, 5, 1); }
    else { r(0, turn === 1 ? 0 : 4, 5, 1); for (let k = 0; k < 3; k++) r(2 * k, 0, 1, 5); }
    return;
  }
  const name = SHAPES[which];
  if (name === "H") { r(0, 0, 1, 5); r(4, 0, 1, 5); r(0, 2, 5, 1); }
  else if (name === "T") { r(0, 0, 5, 1); r(2, 0, 1, 5); }
  else if (name === "O") { g.lineWidth = s; g.strokeStyle = g.fillStyle; g.beginPath(); g.arc(x + 2.5 * s, y + 2.5 * s, 2 * s, 0, 2 * Math.PI); g.stroke(); }
  else {
    g.beginPath();
    for (const [px, py] of [[0, 0], [1, 0], [2.5, 3.9], [4, 0], [5, 0], [3, 5], [2, 5]]) g.lineTo(x + px * s, y + py * s);
    g.closePath(); g.fill();
  }
}

const within = ([lo, hi]: readonly [number, number], v: number) => Math.round(Math.max(lo, Math.min(hi, v)) * 100) / 100;
const pick4 = () => Math.floor(Math.random() * 4);

export function OptotypeTest({ kind, screen, onDone }: { kind: OptotypeKind; screen: Screen; onDone: (r: LetterValue) => void }) {
  const bars = kind !== "faint", isE = kind !== "shapes";
  const [levels] = useState(() => acuityLevels(screen, devicePixels(), bars ? Math.floor((PANEL * 0.92 * 5) / WITH_BARS) : 190));
  const [stair, setStair] = useState(() => startStaircase(levels.length));
  const [which, setWhich] = useState(pick4);
  const s = levels[stair.level].stroke;
  const ink = kind === "faint" ? `rgb(${Array(3).fill(channel(FAINT_LIGHT, screen.gamma)).join(" ")})` : "#000";

  const draw = useCallback<Draw>((g, w, h) => {
    const x = Math.round(w / 2 - 2.5 * s), y = Math.round(h / 2 - 2.5 * s);
    g.fillStyle = "#fff"; g.fillRect(0, 0, w, h);
    g.fillStyle = ink;
    letter(g, which, x, y, s, isE);
    if (!bars) return;
    const gap = Math.round(BAR_GAP * s);
    g.fillRect(x, y - gap - s, 5 * s, s); g.fillRect(x, y + 5 * s + gap, 5 * s, s);
    g.fillRect(x - gap - s, y, s, 5 * s); g.fillRect(x + 5 * s + gap, y, s, 5 * s);
  }, [s, which, ink, isE, bars]);

  function answer(given: number | null) {
    const next = answerStaircase(stair, given === which);
    if (next.result === null) { setStair(next); setWhich(pick4()); return; }
    const i = next.result;
    if (i < 0) onDone({ value: within(LIMITS.va, levels[0].logMar + 0.1), note: "worse" });
    else onDone({ value: within(LIMITS.va, levels[i].logMar), note: i === levels.length - 1 ? "floor" : "" });
  }
  /* the four letter keys answer too */
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (isE || e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
    const i = SHAPES.indexOf(e.key.toUpperCase() as (typeof SHAPES)[number]);
    if (i >= 0) { e.preventDefault(); answer(i); }
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <TrueSize><canvas ref={useDraw(draw)} className="chart" style={bars ? { height: PANEL } : undefined} role="img" aria-label={c.choose.letterLabel} /></TrueSize>
      {isE ? (
        <>
          <p><b>{t.letterAsk}</b> {t.letterKeys}</p>
          <ArrowPad onAnswer={answer} />
        </>
      ) : (
        <>
          <p id="shape-ask"><b>{c.choose.shapesAsk}</b></p>
          <div className={css.four} role="group" aria-labelledby="shape-ask">
            {SHAPES.map((name, i) => <button type="button" key={name} onClick={() => answer(i)}>{name}</button>)}
          </div>
          <button type="button" className="btn" style={{ alignSelf: "center" }} onClick={() => answer(null)}>{c.choose.cannot}</button>
        </>
      )}
      <p className="muted small">{c.choose.count(stair.trials + 1)}</p>
    </>
  );
}
