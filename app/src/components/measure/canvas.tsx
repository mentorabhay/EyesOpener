// Eyes Opener: The test drawings. Sizes here are true screen sizes: a stroke is a whole number of device pixels.
"use client";
/**
 * The test drawings. Sizes here are true screen sizes: a stroke is a whole number of device pixels.
 */
import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { SCENE_FIELD, balanceContrasts, strongInk, weakInk } from "@/engine";
import { measure as t } from "@/copy/test";
import css from "./measure.module.css";

export const devicePixels = () => (typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);

/** The way the legs of the E point: 0 right, 1 down, 2 left, 3 up. */
export type Turn = 0 | 1 | 2 | 3;

function cancelZoom(el: HTMLDivElement | null) {
  if (!el) return;
  let zoom = 1;
  for (let up = el.parentElement; up; up = up.parentElement) zoom *= Number(getComputedStyle(up).zoom) || 1;
  el.style.zoom = String(1 / zoom);
}

/** The app enlarges its own text with CSS zoom. Anything that must keep its true size sits in this wrapper, which cancels the zoom. */
export const TrueSize = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div ref={cancelZoom} className={className}>{children}</div>
);

export type Draw = (g: CanvasRenderingContext2D, width: number, height: number) => void;

/** Sizes a canvas to its box in device pixels and draws; draws again whenever the box or the picture changes. */
export function useDraw(draw: Draw) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const paint = () => {
      const k = devicePixels();
      cv.width = Math.max(1, Math.round(cv.clientWidth * k));
      cv.height = Math.max(1, Math.round(cv.clientHeight * k));
      draw(cv.getContext("2d")!, cv.width, cv.height);
    };
    const box = new ResizeObserver(paint);
    box.observe(cv);
    return () => box.disconnect();
  }, [draw]);
  return ref;
}

/** A tumbling E, five strokes tall, in the middle of the panel. `stroke` is in device pixels. */
export function ECanvas({ stroke: s, turn, ink, field }: { stroke: number; turn: Turn; ink: string; field: string }) {
  const draw = useCallback<Draw>((g, w, h) => {
    const x = Math.round(w / 2 - 2.5 * s), y = Math.round(h / 2 - 2.5 * s);
    g.fillStyle = field;
    g.fillRect(0, 0, w, h);
    g.fillStyle = ink;
    if (turn % 2 === 0) {
      g.fillRect(turn === 0 ? x : x + 4 * s, y, s, 5 * s);
      for (let k = 0; k < 3; k++) g.fillRect(x, y + 2 * k * s, 5 * s, s);
    } else {
      g.fillRect(x, turn === 1 ? y : y + 4 * s, 5 * s, s);
      for (let k = 0; k < 3; k++) g.fillRect(x + 2 * k * s, y, s, 5 * s);
    }
  }, [s, turn, ink, field]);
  return <TrueSize><canvas ref={useDraw(draw)} className="chart" role="img" aria-label={t.letterLabel} /></TrueSize>;
}

/**
 * Two letters on top of each other on the black field: `pair[0]` in red for the red-lens eye, `pair[1]` in cyan.
 * `x` is the balance value: the engine turns it into the contrast of each ink.
 */
export function BalanceCanvas({ pair, x, gamma }: { pair: string; x: number; gamma?: number }) {
  const draw = useCallback<Draw>((g, w, h) => {
    const c = balanceContrasts(x);
    g.globalCompositeOperation = "source-over";
    g.fillStyle = SCENE_FIELD;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "lighter";
    g.font = `700 ${Math.round(h * 0.74)}px Verdana, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = strongInk(c.red, gamma);
    g.fillText(pair[0], w / 2, h / 2);
    g.fillStyle = weakInk(c.cyan, gamma);
    g.fillText(pair[1], w / 2, h / 2);
  }, [pair, x, gamma]);
  return <TrueSize><canvas ref={useDraw(draw)} className="chart dark" role="img" aria-label={t.balanceLabel} /></TrueSize>;
}

/** The short edge of a bank card, in centimetres. */
const CARD_SHORT_CM = 5.398;

/** A bar as tall as a bank card's short edge when `ppc` matches this screen. */
export const CardBar = ({ ppc }: { ppc: number }) => (
  <TrueSize><div className={css.bar} style={{ height: `${(CARD_SHORT_CM * ppc).toFixed(1)}px` }} role="img" aria-label={t.cardBar} /></TrueSize>
);
