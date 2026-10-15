"use client";
/**
 * The screen measures itself. Two things a browser can honestly report without anyone judging by eye:
 * how evenly it draws its own pictures, and the finest depth step this screen can show from the seat.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { TrueSize, devicePixels, useDraw, type Draw } from "@/components/measure/canvas";
import { frameStats } from "@/clips/maths";
import { PATTERNS } from "@/clips/patterns";
import { clips as c } from "@/copy/clips";
import { SCENE_FIELD, pixelArcsec, strongInk, weakInk } from "@/engine";
import css from "./clips.module.css";
import type { TaskProps } from "./types";

/** The browser's pictures are timed for this long. */
const FRAME_SECONDS = 10;

function Frames({ onDone }: { onDone: (data: unknown) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const cv = canvas.current!, gaps: number[] = [], began = performance.now();
    /* the pictures are timed whether or not the bar moves: it stays still for a member who asked for less motion */
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let last = began, frame = 0;
    const loop = (now: number) => {
      gaps.push(now - last);
      last = now;
      const k = devicePixels(), w = Math.max(1, Math.round(cv.clientWidth * k)), h = Math.max(1, Math.round(cv.clientHeight * k));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      PATTERNS.smoothing(cv.getContext("2d")!, w, h, { k, gamma: 2.2, t: still ? 0 : (now - began) / 1000 });
      if (now - began < FRAME_SECONDS * 1000) { frame = requestAnimationFrame(loop); return; }
      /* the first few gaps hold the page settling in, not the screen's pace */
      const stats = frameStats(gaps.slice(5));
      if (stats) onDone(stats); else setFailed(true);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [onDone]);
  return (
    <>
      <TrueSize><canvas ref={canvas} className="chart dark" role="img" aria-label={c.what("C25")} /></TrueSize>
      <p role="status">{failed ? c.refused.too_few : c.auto.running}</p>
    </>
  );
}

function DepthStep({ ctx, onDone }: Pick<TaskProps, "ctx" | "onDone">) {
  const screen = ctx.screen!;
  const [dpr] = useState(devicePixels);
  /* two pairs of upright lines, one dot wide: in the upper pair red and cyan share a dot, in the lower they sit one dot apart */
  const draw = useCallback<Draw>((g, w, h) => {
    g.globalCompositeOperation = "source-over";
    g.fillStyle = SCENE_FIELD; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "lighter";
    const x = Math.round(w / 2), tall = Math.round(h * 0.3);
    g.fillStyle = strongInk(1); g.fillRect(x, Math.round(h * 0.12), 1, tall); g.fillRect(x, Math.round(h * 0.58), 1, tall);
    g.fillStyle = weakInk(1); g.fillRect(x, Math.round(h * 0.12), 1, tall); g.fillRect(x + 1, Math.round(h * 0.58), 1, tall);
  }, []);
  return (
    <>
      <TrueSize><canvas ref={useDraw(draw)} className={`chart dark ${css.sharp}`} style={{ height: 120 }} role="img" aria-label={c.auto.depthLabel} /></TrueSize>
      <p><b>{c.auto.depthStep(pixelArcsec(screen, dpr).toFixed(0))}</b></p>
      <p className="muted">{c.auto.depthHow}</p>
      <button type="button" className="btn btn-g" style={{ alignSelf: "flex-start" }} onClick={() => onDone({ dpr })}>{c.count.save}</button>
    </>
  );
}

export function AutoTask({ def, ctx, onDone }: TaskProps) {
  return def.play.template === "auto" && def.play.kind === "frames" ? <Frames onDone={onDone} /> : <DepthStep ctx={ctx} onDone={onDone} />;
}
