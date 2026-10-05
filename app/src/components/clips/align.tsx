"use client";
/**
 * Line up two marks: one short line is shown to each eye, and the member moves the right eye's line until it looks
 * in line with the left eye's. How far apart the two really are then is where the eyes rest.
 *
 *  - Without a lock (`lock` false) the two lines stand alone on black, on the whole screen where the browser
 *    allows it, so the eyes have as little as possible to hold on to. That reads the resting position.
 *  - With a lock, a white ring and frame that both eyes see keep the eyes joined, and the lines sit above and below
 *    the ring. That reads the small misaim left while the eyes are joined.
 *
 * No pull is put on the eyes: nothing is moved except by the member, one dot of the screen at a time. The red
 * line is at the member's own contrast, as in training. Three settings; the server keeps the middle one.
 */
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { TrueSize, devicePixels } from "@/components/measure/canvas";
import { eyeInks } from "@/components/measure/scenes";
import { arcminOfDots, prismOfDots } from "@/clips/maths";
import { clips as c } from "@/copy/clips";
import { SCENE_FIELD, SHARED_INK } from "@/engine";
import css from "./clips.module.css";
import type { TaskProps } from "./types";

const a = c.align;
const SETTINGS = 3;
/** The movable line starts this many real dots to one side, at random, and cannot be pushed past a fifth of the panel. */
const START = [14, 46] as const, LIMIT_SHARE = 0.2;
const startAt = () => (Math.random() < 0.5 ? -1 : 1) * (START[0] + Math.floor(Math.random() * (START[1] - START[0])));

export interface Aligned { offsets: number[]; dpr: number }

export function AlignTask({ axis, lock, ctx, onDone }: { axis: "h" | "v"; lock: boolean; ctx: TaskProps["ctx"]; onDone: (r: Aligned) => void }) {
  const screen = ctx.screen!;
  const wrap = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(lock);
  const [n, setN] = useState(0);
  const [over, setOver] = useState(false);
  const [dpr] = useState(devicePixels);
  /* where the fixed line sits (a share of the panel, new for each setting) and how far the movable one is from it, in real dots */
  const live = useRef({ fixed: 0.5, pos: startAt(), offsets: [] as number[] });
  const repeat = useRef<ReturnType<typeof setInterval>>(undefined);

  const paint = useCallback(() => {
    const cv = canvas.current;
    if (!cv) return;
    const k = devicePixels(), w = Math.max(1, Math.round(cv.clientWidth * k)), h = Math.max(1, Math.round(cv.clientHeight * k));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    const g = cv.getContext("2d")!, [left, right] = eyeInks(ctx.cyanEye, ctx.contrast, screen.gamma), s = live.current;
    const t = Math.max(2, Math.round(0.05 * screen.ppc * k));
    g.globalCompositeOperation = "source-over";
    g.fillStyle = SCENE_FIELD; g.fillRect(0, 0, w, h);
    if (lock) {
      const cx = Math.round(w / 2), cy = Math.round(h / 2), r = Math.round(Math.min(h * 0.2, 1.2 * screen.ppc * k)), len = Math.round(r * 0.8), gap = Math.round(r * 0.35);
      g.strokeStyle = SHARED_INK; g.lineWidth = t;
      g.strokeRect(6 * k, 6 * k, w - 12 * k, h - 12 * k);
      g.beginPath(); g.arc(cx, cy, r, 0, 2 * Math.PI); g.stroke();
      g.fillStyle = left; g.fillRect(cx - t / 2, cy - r - gap - len, t, len);
      g.fillStyle = right; g.fillRect(cx - t / 2 + s.pos, cy + r + gap, t, len);
    } else if (axis === "h") {
      const x = Math.round(w * s.fixed);
      g.fillStyle = left; g.fillRect(x - t / 2, Math.round(h * 0.22), t, Math.round(h * 0.24));
      g.fillStyle = right; g.fillRect(x - t / 2 + s.pos, Math.round(h * 0.54), t, Math.round(h * 0.24));
    } else {
      const y = Math.round(h * s.fixed);
      g.fillStyle = left; g.fillRect(Math.round(w * 0.2), y - t / 2, Math.round(w * 0.26), t);
      g.fillStyle = right; g.fillRect(Math.round(w * 0.54), y - t / 2 + s.pos, Math.round(w * 0.26), t);
    }
  }, [axis, lock, ctx.cyanEye, ctx.contrast, screen]);

  useEffect(() => {
    const cv = canvas.current!;
    const box = new ResizeObserver(paint);
    box.observe(cv);
    return () => box.disconnect();
  }, [paint]);
  useEffect(() => () => { clearInterval(repeat.current); if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined); }, []);

  const limit = () => { const cv = canvas.current; return cv ? Math.round((axis === "h" || lock ? cv.width : cv.height) * LIMIT_SHARE) : 200; };
  const move = (dir: -1 | 1, dots = 1) => { const s = live.current, most = limit(); s.pos = Math.max(-most, Math.min(most, s.pos + dir * dots)); paint(); };
  function confirm() {
    const s = live.current;
    s.offsets.push(s.pos);
    if (s.offsets.length >= SETTINGS) {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
      setRunning(false);
      setOver(true);
      return onDone({ offsets: s.offsets, dpr });
    }
    s.fixed = 0.4 + Math.random() * 0.2;
    s.pos = startAt();
    setN(s.offsets.length);
    paint();
  }
  const begin = (fill: boolean) => {
    live.current = { fixed: 0.4 + Math.random() * 0.2, pos: startAt(), offsets: [] };
    setN(0); setRunning(true);
    if (fill) void wrap.current?.requestFullscreen?.().catch(() => undefined);
    requestAnimationFrame(paint);
  };

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (!running || e.altKey || e.ctrlKey || e.metaKey) return;
    const back = axis === "v" && !lock ? "ArrowUp" : "ArrowLeft", on = axis === "v" && !lock ? "ArrowDown" : "ArrowRight";
    if (e.key === back || e.key === on) { e.preventDefault(); move(e.key === back ? -1 : 1, e.repeat ? 2 : 1); }
    else if (e.key === "Enter" || e.key === " ") {
      /* a key pressed on a button already presses that button */
      if (e.target instanceof Element && e.target.closest("button, a, input")) return;
      e.preventDefault();
      if (!e.repeat) confirm();
    }
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /* touch on the panel: the middle third confirms, the thirds beside it move the line; a finger held down keeps moving it */
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!running) return;
    const box = e.currentTarget.getBoundingClientRect(), share = axis === "v" && !lock ? (e.clientY - box.top) / box.height : (e.clientX - box.left) / box.width;
    if (share > 1 / 3 && share < 2 / 3) return confirm();
    const dir = share < 0.5 ? -1 : 1;
    move(dir);
    clearInterval(repeat.current);
    repeat.current = setInterval(() => move(dir), 90);
  };
  const up = () => clearInterval(repeat.current);
  const upright = axis === "h" || lock;

  return (
    <div className="stack">
      {!running && !lock && !over && (
        <>
          <div className={css.acts}>
            <button type="button" className={`btn btn-g ${css.big}`} onClick={() => begin(true)}>{a.fill}</button>
            <button type="button" className="btn" onClick={() => begin(false)}>{a.inline}</button>
          </div>
          <p className="muted small">{a.inlineNote}</p>
        </>
      )}
      <div ref={wrap} className={css.fill}>
        <TrueSize>
          <canvas
            ref={canvas} className={`chart dark ${css.tall}`} role="img" aria-label={lock ? a.label.lock : a.label[axis]} style={{ touchAction: "none" }}
            onPointerDown={down} onPointerUp={up} onPointerLeave={up} onPointerCancel={up}
          />
        </TrueSize>
      </div>
      {running && (
        <>
          <div className={css.three} role="group" aria-label={lock ? a.label.lock : a.label[axis]}>
            <button type="button" className="btn" onClick={() => move(-1)}>{upright ? a.leftBtn : a.upBtn}</button>
            <button type="button" className="btn btn-g" onClick={confirm}>{a.ok}</button>
            <button type="button" className="btn" onClick={() => move(1)}>{upright ? a.rightBtn : a.downBtn}</button>
          </div>
          <p className="muted small tnum">{a.nth(n + 1, SETTINGS)}. {upright ? a.keysH : a.keysV} {lock ? a.oneDot(arcminOfDots(1, screen, dpr).toFixed(1), "arcmin") : a.oneDot(prismOfDots(1, screen, dpr).toFixed(2), "prism_dioptre")}</p>
        </>
      )}
    </div>
  );
}

export function AlignClip({ def, ctx, onDone }: TaskProps) {
  if (def.play.template !== "align") return null;
  return <AlignTask axis={def.play.axis} lock={def.play.lock} ctx={ctx} onDone={onDone} />;
}
