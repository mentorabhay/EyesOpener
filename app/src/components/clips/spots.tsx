"use client";
/**
 * Did you see the spot: the eye looks at a cross while a spot eases in at one of a set of places, or at none.
 *  - "field": one eye, a grey spot on black, for the middle of that eye's view.
 *  - "map": both eyes through the glasses. Red rings mark every place for the stronger eye; the spot is cyan, which
 *    only the weaker eye can see. A place where it is missed is a place where the weaker eye's picture went missing.
 * A few trials show nothing at all: a "yes" there is a guess, and too many of them mean the run is not kept.
 *
 * Nothing flashes: a spot eases in over half a second and stays until it is answered, and the panel rests for a
 * moment between two spots. The app cannot see where the eye looks; the words say so.
 */
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { TrueSize, devicePixels } from "@/components/measure/canvas";
import { CATCHES, FIELD_DEG, dotsPerDegree, spotPlaces } from "@/clips/maths";
import { clips as c } from "@/copy/clips";
import { SCENE_FIELD, SHARED_INK, channel, strongInk, weakInk } from "@/engine";
import { SPOT_RINGS } from "@/lib/clip-rules";
import css from "./clips.module.css";
import type { TaskProps } from "./types";

/** Seconds a spot takes to ease in, and the rest between an answer and the next spot. */
const RISE = 0.5, REST_MS = 700;
/** The spot is this many degrees across, and never under four real dots. */
const SPOT_DEG = 0.45;

function shuffled(n: number): number[] {
  const list = [...Array.from({ length: n }, (_, i) => i), ...Array<number>(CATCHES).fill(-1)];
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list;
}

export function SpotsTask({ def, ctx, onDone }: TaskProps) {
  const kind = def.play.template === "spots" ? def.play.kind : "field";
  const screen = ctx.screen!;
  const [places] = useState(() => spotPlaces(SPOT_RINGS[kind]));
  const [order] = useState(() => shuffled(places.length));
  const [at, setAt] = useState(0);
  const [resting, setResting] = useState(false);
  const [radiusDeg, setRadiusDeg] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const seen = useRef<boolean[]>(places.map(() => false)), falseYes = useRef(0), since = useRef(0), rest = useRef<ReturnType<typeof setTimeout>>(undefined);
  const live = useRef({ place: order[0], resting: false });
  useEffect(() => { live.current = { place: order[at] ?? -1, resting }; since.current = performance.now(); }, [at, resting, order]);
  useEffect(() => () => clearTimeout(rest.current), []);

  useEffect(() => {
    const cv = canvas.current!;
    let frame = 0, told = 0;
    const loop = (now: number) => {
      const k = devicePixels(), w = Math.max(1, Math.round(cv.clientWidth * k)), h = Math.max(1, Math.round(cv.clientHeight * k));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      const g = cv.getContext("2d")!, per = dotsPerDegree(screen, k), cx = w / 2, cy = h / 2;
      const reach = Math.min(FIELD_DEG * per, Math.min(w, h) / 2 - 10 * k), spot = Math.max(2, (SPOT_DEG / 2) * per);
      const deg = Math.round((reach / per) * 10) / 10;
      if (deg !== told) { told = deg; setRadiusDeg(deg); }
      g.globalCompositeOperation = "source-over";
      g.fillStyle = SCENE_FIELD; g.fillRect(0, 0, w, h);
      /* the cross to look at: both eyes see it */
      g.fillStyle = SHARED_INK;
      const arm = Math.max(6, 0.3 * per), thick = Math.max(2, Math.round(1.5 * k));
      g.fillRect(cx - arm, cy - thick / 2, 2 * arm, thick); g.fillRect(cx - thick / 2, cy - arm, thick, 2 * arm);
      if (kind === "map") {
        /* a ring at every place, in the stronger eye's ink at the member's own contrast: that eye always has something to see */
        g.strokeStyle = strongInk(ctx.contrast, screen.gamma); g.lineWidth = Math.max(2, 1.5 * k);
        for (const p of places) { g.beginPath(); g.arc(cx + p.x * reach, cy + p.y * reach, spot * 2.6, 0, 2 * Math.PI); g.stroke(); }
      }
      const { place, resting: wait } = live.current;
      if (!wait && place >= 0) {
        const p = places[place], rise = Math.min(1, (now - since.current) / 1000 / RISE);
        g.globalAlpha = rise;
        g.fillStyle = kind === "map" ? weakInk(1, screen.gamma) : `rgb(${Array(3).fill(channel(0.35, screen.gamma)).join(" ")})`;
        g.beginPath(); g.arc(cx + p.x * reach, cy + p.y * reach, spot, 0, 2 * Math.PI); g.fill();
        g.globalAlpha = 1;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [screen, kind, places, ctx.contrast]);

  function answer(yes: boolean) {
    if (resting || at >= order.length || performance.now() - since.current < RISE * 1000) return;
    const place = order[at];
    if (place < 0) { if (yes) falseYes.current += 1; } else seen.current[place] = yes;
    if (at + 1 >= order.length) return onDone({ seen: seen.current, falseYes: falseYes.current, radiusDeg: Math.max(1, Math.min(FIELD_DEG, radiusDeg)) });
    setResting(true);
    rest.current = setTimeout(() => { setAt((n) => n + 1); setResting(false); }, REST_MS);
  }
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if ((e.key !== "ArrowLeft" && e.key !== "ArrowRight") || e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    answer(e.key === "ArrowRight");
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <TrueSize><canvas ref={canvas} className={`chart dark ${css.square}`} role="img" aria-label={c.spots.label[kind]} /></TrueSize>
      <p><b>{c.spots.ask}</b> <span className="muted">{resting ? c.spots.wait : c.spots.keys}</span></p>
      <div className={css.two} role="group" aria-label={c.spots.ask}>
        <button type="button" className="btn" disabled={resting} onClick={() => answer(false)}>{c.spots.no}</button>
        <button type="button" className="btn btn-g" disabled={resting} onClick={() => answer(true)}>{c.spots.yes}</button>
      </div>
      <p className="muted small tnum">{c.spots.step(Math.min(order.length, at + 1), order.length)}. {radiusDeg > 0 && c.spots.radius(String(radiusDeg))} {c.spots.cannotSee}</p>
    </>
  );
}
