"use client";
import { useEffect, useRef, type RefObject } from "react";
import { TrueSize, devicePixels } from "@/components/measure/canvas";
import { MOVING, PATTERNS, SHARP } from "@/clips/patterns";
import { clips as c } from "@/copy/clips";
import css from "./clips.module.css";

/**
 * Draws one "look and answer" picture at the screen's own dots. A still picture is drawn again only when its box
 * changes; the two slow moving ones are drawn for every picture the browser shows.
 * `pulse` holds the time of the last sound cue, for the scene whose ring grows with each sound.
 * With `fill`, the picture can cover the whole screen: a tap or OK brings the page back.
 */
export function PatternCanvas({ scene, gamma, label, fill, pulse, onFilled }: {
  scene: string; gamma: number; label: string; fill?: boolean; pulse?: RefObject<number>; onFilled?: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null), wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cv = canvas.current!, draw = PATTERNS[scene];
    if (!draw) return;
    const began = performance.now();
    const paint = (now: number) => {
      const k = devicePixels(), w = Math.max(1, Math.round(cv.clientWidth * k)), h = Math.max(1, Math.round(cv.clientHeight * k));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      const t = pulse ? (pulse.current < 0 ? 9 : (now - pulse.current) / 1000) : (now - began) / 1000;
      draw(cv.getContext("2d")!, w, h, { k, gamma, t });
    };
    if (MOVING.has(scene)) {
      let frame = requestAnimationFrame(function loop(now) { paint(now); frame = requestAnimationFrame(loop); });
      return () => cancelAnimationFrame(frame);
    }
    const box = new ResizeObserver(() => paint(performance.now()));
    box.observe(cv);
    return () => box.disconnect();
  }, [scene, gamma, pulse]);

  /* out of the full screen on a tap, OK, Enter, Space or Back */
  useEffect(() => {
    if (!fill) return;
    const leave = () => { if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined); };
    const onKey = (e: KeyboardEvent) => { if (document.fullscreenElement && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); leave(); } };
    const el = wrap.current!;
    el.addEventListener("click", leave);
    window.addEventListener("keydown", onKey);
    return () => { el.removeEventListener("click", leave); window.removeEventListener("keydown", onKey); };
  }, [fill]);

  const enter = () => { onFilled?.(); void wrap.current?.requestFullscreen?.().catch(() => undefined); };

  return (
    <>
      <div ref={wrap} className={css.fill}>
        <TrueSize><canvas ref={canvas} className={`chart dark${SHARP.has(scene) ? ` ${css.sharp}` : ""}`} role="img" aria-label={label} /></TrueSize>
        <span className={css.hint}>{c.runner.unfill}</span>
      </div>
      {fill && <button type="button" className="btn" style={{ alignSelf: "flex-start" }} onClick={enter}>{c.runner.fill}</button>}
    </>
  );
}
