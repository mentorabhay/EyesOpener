"use client";
/**
 * The fourth step: the inks tuned for one pair of glasses (src/engine/tune.ts). One lens at a time, the grown-up
 * looks at shapes in the other eye's ink and makes them fainter until they are gone, or as faint as they get.
 * Red lens: green is taken out of the cyan ink. Cyan lens: a ceiling is set for the red ink in training.
 * Nothing moves by itself and nothing flashes: the shapes change only when a button or an arrow key is pressed,
 * one small step at a time. The values are saved on the server, which checks them again.
 */
import { useCallback, useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { TrueSize, useDraw, type Draw } from "@/components/measure/canvas";
import { screen as c } from "@/copy/screen";
import { SCENE_FIELD, TUNE, channel, weakInk, weakLight } from "@/engine";
import { Lenses } from "./lenses";
import css from "./screen.module.css";

const t = c.tune;
type Lens = "red" | "cyan";
/** Below this share of its light kept, the page warns that the weaker eye is losing a lot. */
const DIM_WARN = 0.5;
const KEY_MS = 45;

/** Three plain shapes on the black field, in one ink: a disc, a square and a ring, spread across the scene. */
export const shapes = (fill: string): Draw => (g, w, h) => {
  const s = Math.round(Math.min(h * 0.4, w * 0.18)), y = Math.round(h / 2);
  g.fillStyle = SCENE_FIELD;
  g.fillRect(0, 0, w, h);
  g.fillStyle = fill;
  g.strokeStyle = fill;
  g.beginPath(); g.arc(w * 0.22, y, s / 2, 0, 6.2832); g.fill();
  g.fillRect(Math.round(w * 0.5 - s / 2), Math.round(y - s / 2), s, s);
  g.lineWidth = Math.max(4, s * 0.16);
  g.beginPath(); g.arc(w * 0.78, y, s / 2 - g.lineWidth / 2, 0, 6.2832); g.stroke();
};

/** The cyan ink with this much green, and the red ink at this much light. Neither uses the screen's present tuning. */
const cyanAt = (green: number, gamma: number) => weakInk(1, gamma, { green, redTop: 1 });
const redAt = (top: number, gamma: number) => `rgb(${channel(top, gamma)} 0 0)`;

function Fade({ lens, gamma, start, onDone, children }: { lens: Lens; gamma: number; start: number; onDone: (v: number) => void; children?: ReactNode }) {
  const [lo, hi] = lens === "red" ? TUNE.green : TUNE.redTop;
  const last = Math.round((hi - lo) / TUNE.step);
  /* steps counted down from full: 0 is the ink as usual */
  const [i, setI] = useState(() => Math.max(0, Math.min(last, Math.round((hi - start) / TUNE.step))));
  const value = Math.round((hi - i * TUNE.step) * 100) / 100;
  const words = t.lens[lens];
  const done = useRef<HTMLButtonElement>(null), keyAt = useRef(0);
  const move = useCallback((dir: 1 | -1) => setI((was) => Math.max(0, Math.min(last, was + dir))), [last]);
  const draw = useCallback<Draw>((g, w, h) => shapes(lens === "red" ? cyanAt(value, gamma) : redAt(value, gamma))(g, w, h), [lens, value, gamma]);
  useEffect(() => { done.current?.focus({ preventScroll: true }); }, []);
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    e.preventDefault();
    if (e.timeStamp - keyAt.current < KEY_MS) return;
    keyAt.current = e.timeStamp;
    move(e.key === "ArrowLeft" ? 1 : -1);
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const kept = weakLight(value);
  return (
    <div className="stack">
      <TrueSize><canvas ref={useDraw(draw)} className="chart dark" role="img" aria-label={words.scene} /></TrueSize>
      <div className={css.pick} role="group" aria-label={words.head}>
        <button type="button" className="btn" disabled={i >= last} onClick={() => move(1)}>{words.fainter}</button>
        <button type="button" className="btn btn-g" ref={done} onClick={() => onDone(value)}>{words.done}</button>
        <button type="button" className="btn" disabled={i <= 0} onClick={() => move(-1)}>{words.back}</button>
      </div>
      {i >= last && <p className="muted small" role="status">{t.end}</p>}
      {lens === "red" && i > 0 && <p className="small" role="status">{t.keeps(kept)}{kept < DIM_WARN && ` ${t.dimWarn}`}</p>}
      {lens === "red" && <p className="muted small">{t.lens.red.noHelp}</p>}
      {children && <div className={css.more}>{children}</div>}
      <p className="muted small">{t.keys}</p>
    </div>
  );
}

const Todo = ({ lines }: { lines: string[] }) => <ol className={css.list}>{lines.map((l) => <li key={l}>{l}</li>)}</ol>;

/** Both lenses, red first. `onSave` gets the two settings; `skip` is the flow's own skip button. */
export function TuneStep({ gamma, green, redTop, onSave, skip }: { gamma: number; green: number; redTop: number; onSave: (green: number, redTop: number) => void; skip: ReactNode }) {
  const [lens, setLens] = useState<Lens>("red");
  const [g, setG] = useState(green);
  const words = t.lens[lens];
  const finish = (v: number) => (lens === "red" ? (setG(v), setLens("cyan")) : onSave(g, v));
  return (
    <>
      <div className={css.head}><h2>{t.title}</h2><span className={css.nth}>{t.nth(lens === "red" ? 1 : 2)}</span></div>
      {lens === "red" && <p>{t.why}</p>}
      <div className={css.lens}>
        <Lenses look={lens} label={words.picture} />
        <div><b>{words.head}</b>{lens === "cyan" && <span className="muted small">{t.redOnly}</span>}</div>
      </div>
      <Todo lines={words.todo} />
      <Fade key={lens} lens={lens} gamma={gamma} start={lens === "red" ? green : redTop} onDone={finish}>
        <button type="button" className="btn btn-sm" onClick={() => finish(1)}>{words.nothing}</button>
        {skip}
      </Fade>
    </>
  );
}
