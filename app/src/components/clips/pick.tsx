"use client";
/**
 * Pick the odd one of four, on the depth check-up's staircase (two right answers make it harder, one wrong makes it
 * easier): the ring that floats, the shape hidden in dots, the circle with a rippled edge.
 * The plain rings test, floating in front, is played by the depth check-up's own part.
 */
import { useCallback, useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { TrueSize, devicePixels, useDraw, type Draw } from "@/components/measure/canvas";
import { DepthTest } from "@/components/measure/depth-test";
import { DEPTH_RINGS, DepthCanvas, depthJitter, depthRoom, eyeInks, type DepthShow } from "@/components/measure/scenes";
import { HIDDEN_START_ARCSEC, WOBBLE_BUMPS, bandLevels, wobbleLevels } from "@/clips/maths";
import { clips as c } from "@/copy/clips";
import { SCENE_FIELD, answerDepth, depthLevels, depthOutcome, other, pixelArcsec, startDepth, type DepthStair, type Eye, type Screen } from "@/engine";
import css from "./clips.module.css";
import type { TaskProps } from "./types";

const p = c.pick;
const whole = (from: number, to: number) => from + Math.floor(Math.random() * (to - from + 1));
/** The panel rests for this long between two sets, so nothing is seen to jump. */
const GAP_MS = 250;

/** Four numbered buttons and "Cannot tell". The left and right arrows walk along the four; 1 to 4 press them. */
function Four({ onAnswer, icons, labels }: { onAnswer: (i: number | null) => void; icons?: ReactNode[]; labels?: string[] }) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key >= "1" && e.key <= "4") { e.preventDefault(); return onAnswer(Number(e.key) - 1); }
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const at = buttons.current.indexOf(document.activeElement as HTMLButtonElement);
    buttons.current[e.key === "ArrowRight" ? Math.min(3, at + 1) : Math.max(0, (at < 0 ? 4 : at) - 1)]?.focus();
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  return (
    <>
      <div className={css.four} role="group" aria-label={p.group}>
        {[0, 1, 2, 3].map((i) => (
          <button type="button" key={i} ref={(el) => { buttons.current[i] = el; }} aria-label={labels?.[i] ?? p.item(i + 1)} onClick={() => onAnswer(i)}>{icons?.[i] ?? i + 1}</button>
        ))}
      </div>
      <button type="button" className="btn" style={{ alignSelf: "center" }} onClick={() => onAnswer(null)}>{p.cannot}</button>
    </>
  );
}

export interface StairValue { px: number; dpr: number; note: "" | "floor" | "worse"; trials: number; reversals: number }
const finished = (stair: DepthStair, levels: number[], dpr: number): StairValue => ({ ...depthOutcome(stair, levels), dpr, trials: stair.trials, reversals: stair.reversals });

/* ───────────── rings: a band of steps, behind the screen, or gliding ───────────── */

function showFor(offset: number): DepthShow {
  const j = depthJitter(offset);
  return { offset, target: whole(0, DEPTH_RINGS - 1), nudge: Array.from({ length: DEPTH_RINGS }, (): [number, number] => [whole(-j, j), whole(-2, 2)]) };
}
/** The four rings glide together: one sweep to a side and back in this many seconds, this share of a ring's room each way. */
const GLIDE_SECONDS = 6, GLIDE_SHARE = 0.16;

function GlidingRings({ show, radius, inks, onPick }: { show: DepthShow | null; radius: number; inks: [string, string]; onPick: (ring: number) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null), drift = useRef(0), live = useRef(show);
  useEffect(() => { live.current = show; }, [show]);
  useEffect(() => {
    const cv = canvas.current!, slow = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0.35 : 1, began = performance.now();
    let frame = 0;
    const loop = (now: number) => {
      const k = devicePixels(), w = Math.max(1, Math.round(cv.clientWidth * k)), h = Math.max(1, Math.round(cv.clientHeight * k));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      const g = cv.getContext("2d")!, cell = w / DEPTH_RINGS, s = live.current;
      drift.current = Math.round(cell * GLIDE_SHARE * Math.sin((2 * Math.PI * slow * (now - began)) / 1000 / GLIDE_SECONDS));
      g.globalCompositeOperation = "source-over";
      g.fillStyle = SCENE_FIELD; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = "lighter";
      if (s) {
        g.lineWidth = Math.max(2, Math.round(radius / 5));
        for (let i = 0; i < DEPTH_RINGS; i++) {
          const x = Math.round(cell * (i + 0.5)) + s.nudge[i][0] + drift.current, y = Math.round(h / 2) + s.nudge[i][1];
          const offset = i === s.target ? s.offset : 0, toRight = Math.ceil(offset / 2);
          g.strokeStyle = inks[0]; g.beginPath(); g.arc(x + toRight, y, radius, 0, 2 * Math.PI); g.stroke();
          g.strokeStyle = inks[1]; g.beginPath(); g.arc(x - (offset - toRight), y, radius, 0, 2 * Math.PI); g.stroke();
        }
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [radius, inks]);
  return (
    <TrueSize>
      <canvas
        ref={canvas} className="chart dark" role="img" aria-label={p.ringsLabel} style={{ cursor: "pointer", touchAction: "manipulation" }}
        onClick={(e) => {
          const box = e.currentTarget.getBoundingClientRect(), k = devicePixels();
          onPick(Math.max(0, Math.min(DEPTH_RINGS - 1, Math.floor(((e.clientX - box.left - drift.current / k) / box.width) * DEPTH_RINGS))));
        }}
      />
    </TrueSize>
  );
}

function RingsTest({ screen, cyanEye, band, behind, moving, onDone }: {
  screen: Screen; cyanEye: Eye; band?: readonly [number, number]; behind?: boolean; moving?: boolean; onDone: (r: StairValue) => void;
}) {
  const [run, setRun] = useState<{ levels: number[]; radius: number; dpr: number; stair: DepthStair; show: DepthShow | null } | null>(null);
  const [none, setNone] = useState(false);
  const begun = useRef(false), gap = useRef<ReturnType<typeof setTimeout>>(undefined), box = useRef<HTMLDivElement>(null);
  /* shown the other way round, the shifted ring sinks behind the screen: the left eye's picture is the one on the left */
  const shownEye = behind ? other(cyanEye) : cyanEye;
  const [inks] = useState(() => eyeInks(shownEye));

  const onWidth = useCallback((width: number) => {
    if (begun.current) return;
    begun.current = true;
    const dpr = devicePixels(), room = depthRoom(screen.ppc, dpr, width);
    const levels = band ? bandLevels(screen, dpr, room.maxPx, band) : depthLevels(screen, dpr, room.maxPx);
    if (!levels.length) { setNone(true); return; }
    setRun({ levels, radius: room.radius(levels[0]), dpr, stair: startDepth(levels.length), show: showFor(levels[0]) });
  }, [screen, band]);
  /* the gliding rings have no drawing step that reports the panel's width, so it is read once here */
  useEffect(() => { if (moving && box.current) onWidth(Math.round(box.current.clientWidth * devicePixels())); }, [moving, onWidth]);
  useEffect(() => () => clearTimeout(gap.current), []);

  function answer(picked: number | null) {
    if (!run?.show) return;
    const stair = answerDepth(run.stair, picked === run.show.target);
    if (stair.result !== null) return onDone(finished(stair, run.levels, run.dpr));
    setRun({ ...run, stair, show: null });
    gap.current = setTimeout(() => setRun((was) => was && { ...was, show: showFor(was.levels[was.stair.level]) }), GAP_MS);
  }

  if (none) return <p className="notice" data-b="warn">{p.noBand}</p>;
  return (
    <>
      <div ref={box}>
        {moving
          ? <GlidingRings show={run?.show ?? null} radius={run?.radius ?? 0} inks={inks} onPick={answer} />
          : <DepthCanvas show={run?.show ?? null} radius={run?.radius ?? 0} cyanEye={shownEye} onPick={answer} onWidth={onWidth} />}
      </div>
      <p><b>{behind ? p.askBehind : p.askFront}</b> {p.how}</p>
      <Four onAnswer={answer} />
      <p className="muted small">{p.count((run?.stair.trials ?? 0) + 1)}. {run && p.finest(pixelArcsec(screen, run.dpr).toFixed(0))}</p>
    </>
  );
}

/* ───────────── a shape hidden in random dots ───────────── */

const SHAPES = ["circle", "square", "triangle", "star"] as const;
type Shape = (typeof SHAPES)[number];
const STAR: [number, number][] = Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? 0.4 : 0.92, a = (i * Math.PI) / 5 - Math.PI / 2; return [r * Math.cos(a), r * Math.sin(a)]; });
/** Is the point (x, y), each from -1 to 1, inside the shape? */
export function insideShape(shape: Shape, x: number, y: number): boolean {
  if (shape === "circle") return x * x + y * y <= 0.72;
  if (shape === "square") return Math.abs(x) <= 0.74 && Math.abs(y) <= 0.74;
  if (shape === "triangle") return y <= 0.76 && y >= -0.84 && Math.abs(x) <= (y + 0.84) * 0.56;
  let hit = false;
  for (let i = 0, j = STAR.length - 1; i < STAR.length; j = i++) {
    const [xi, yi] = STAR[i], [xj, yj] = STAR[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
const ICONS: Record<Shape, ReactNode> = {
  circle: <svg viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="17" r="12" fill="currentColor" /></svg>,
  square: <svg viewBox="0 0 34 34" aria-hidden="true"><rect x="6" y="6" width="22" height="22" fill="currentColor" /></svg>,
  triangle: <svg viewBox="0 0 34 34" aria-hidden="true"><path d="M17 5L30 29H4Z" fill="currentColor" /></svg>,
  star: <svg viewBox="0 0 34 34" aria-hidden="true"><path d="M17 3l4.1 9.3 10.1 1-7.6 6.8 2.2 9.9L17 24.9 8.2 30l2.2-9.9-7.6-6.8 10.1-1z" fill="currentColor" /></svg>,
};

function HiddenTest({ screen, cyanEye, onDone }: { screen: Screen; cyanEye: Eye; onDone: (r: StairValue) => void }) {
  const [dpr] = useState(devicePixels);
  const [run, setRun] = useState<{ levels: number[]; stair: DepthStair; shape: Shape; seed: number } | null>(null);
  const begun = useRef(false);

  const draw = useCallback<Draw>((g, w, h) => {
    /* the widest shift is a sixth of the shape, so the shape never slides out of its own outline */
    const size = Math.floor(Math.min(w, h) * 0.3), cx = Math.round(w / 2), cy = Math.round(h / 2);
    if (!begun.current) {
      begun.current = true;
      const levels = bandLevels(screen, dpr, Math.max(1, Math.floor(size / 6)), [HIDDEN_START_ARCSEC, 0]);
      const first = levels.length ? levels : [1];
      setRun({ levels: first, stair: startDepth(first.length), shape: SHAPES[whole(0, 3)], seed: Math.random() });
    }
    g.globalCompositeOperation = "source-over";
    g.fillStyle = SCENE_FIELD; g.fillRect(0, 0, w, h);
    if (!run) return;
    const offset = run.levels[run.stair.level], toRight = Math.ceil(offset / 2);
    /* a square of the screen about 0.07 cm wide is either lit or dark, at random */
    const cell = Math.max(2, Math.round(0.07 * screen.ppc * dpr)), cols = Math.ceil(w / cell) + 2, rows = Math.ceil(h / cell) + 2;
    let a = Math.floor(run.seed * 2 ** 31) || 1;
    const rand = () => { a = (Math.imul(a, 48271) + 11) & 0x7fffffff; return a / 0x7fffffff; };
    const ground = Uint8Array.from({ length: cols * rows }, () => (rand() < 0.5 ? 1 : 0)), figure = Uint8Array.from({ length: cols * rows }, () => (rand() < 0.5 ? 1 : 0));
    const img = g.createImageData(w, h), cyanIsLeft = cyanEye === "L";
    /* the left eye's copy of the shape sits to the right and the right eye's to the left: crossed, so it floats in front */
    for (const [eye, shift] of [["L", toRight], ["R", -(offset - toRight)]] as const) {
      const cyan = (eye === "L") === cyanIsLeft;
      for (let y = 0; y < h; y++) {
        const ny = (y - cy) / size, row = Math.floor(y / cell) * cols;
        for (let x = 0; x < w; x++) {
          const fx = x - shift, on = insideShape(run.shape, (fx - cx) / size, ny) ? figure[row + Math.floor((fx + cell) / cell)] : ground[row + Math.floor((x + cell) / cell)];
          if (!on) continue;
          const i = 4 * (y * w + x);
          if (cyan) { img.data[i + 1] = 255; img.data[i + 2] = 255; } else img.data[i] = 255;
        }
      }
    }
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255;
    g.putImageData(img, 0, 0);
  }, [screen, dpr, cyanEye, run]);

  function answer(picked: number | null) {
    if (!run) return;
    const stair = answerDepth(run.stair, picked !== null && SHAPES[picked] === run.shape);
    if (stair.result !== null) return onDone(finished(stair, run.levels, dpr));
    setRun({ ...run, stair, shape: SHAPES[whole(0, 3)], seed: Math.random() });
  }

  return (
    <>
      <TrueSize><canvas ref={useDraw(draw)} className={`chart dark ${css.tall} ${css.sharp}`} role="img" aria-label={p.hiddenLabel} /></TrueSize>
      <p><b>{p.askHidden}</b></p>
      <Four onAnswer={answer} icons={SHAPES.map((s) => ICONS[s])} labels={SHAPES.map((s) => p.shape[s])} />
      <p className="muted small">{p.count((run?.stair.trials ?? 0) + 1)}</p>
    </>
  );
}

/* ───────────── the circle with a rippled edge ───────────── */

export interface WobbleValue { percent: number; note: "" | "floor" | "worse" }
const turns = () => Array.from({ length: 4 }, () => Math.random() * 2 * Math.PI);

function WobbleTest({ screen, onDone }: { screen: Screen; onDone: (r: WobbleValue) => void }) {
  const [run, setRun] = useState<{ levels: number[]; stair: DepthStair; target: number; turn: number[] } | null>(null);
  const begun = useRef(false);

  const draw = useCallback<Draw>((g, w, h) => {
    const k = devicePixels(), cell = w / 4, radius = Math.min(cell * 0.36, h * 0.38, 1.1 * screen.ppc * k);
    if (!begun.current) {
      begun.current = true;
      const levels = wobbleLevels(radius);
      setRun({ levels, stair: startDepth(levels.length), target: whole(0, 3), turn: turns() });
    }
    g.fillStyle = "#fff"; g.fillRect(0, 0, w, h);
    if (!run) return;
    const ripple = run.levels[run.stair.level] / 100;
    g.strokeStyle = "#000"; g.lineWidth = Math.max(2, radius * 0.05); g.lineJoin = "round";
    for (let i = 0; i < 4; i++) {
      const cx = cell * (i + 0.5), cy = h / 2, amount = i === run.target ? ripple : 0;
      g.beginPath();
      for (let n = 0; n <= 240; n++) {
        const a = (n / 240) * 2 * Math.PI, r = radius * (1 + amount * Math.sin(WOBBLE_BUMPS * a + run.turn[i]));
        g.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      }
      g.closePath(); g.stroke();
    }
  }, [screen, run]);

  function answer(picked: number | null) {
    if (!run) return;
    const stair = answerDepth(run.stair, picked === run.target);
    if (stair.result === null) { setRun({ ...run, stair, target: whole(0, 3), turn: turns() }); return; }
    const i = stair.result;
    onDone(i < 0 ? { percent: run.levels[0], note: "worse" } : { percent: run.levels[i], note: i === run.levels.length - 1 ? "floor" : "" });
  }

  return (
    <>
      <TrueSize>
        <canvas
          ref={useDraw(draw)} className="chart" role="img" aria-label={p.wobbleLabel} style={{ cursor: "pointer", touchAction: "manipulation" }}
          onClick={(e) => { const box = e.currentTarget.getBoundingClientRect(); answer(Math.max(0, Math.min(3, Math.floor(((e.clientX - box.left) / box.width) * 4)))); }}
        />
      </TrueSize>
      <p><b>{p.askWobble}</b> {p.how}</p>
      <Four onAnswer={answer} />
      <p className="muted small">{p.count((run?.stair.trials ?? 0) + 1)}</p>
    </>
  );
}

export function PickTask({ def, ctx, onDone }: TaskProps) {
  if (def.play.template !== "pick") return null;
  const { kind, band, behind, moving } = def.play, screen = ctx.screen!;
  if (kind === "wobble") return <WobbleTest screen={screen} onDone={onDone} />;
  if (kind === "hidden") return <HiddenTest screen={screen} cyanEye={ctx.cyanEye} onDone={onDone} />;
  if (!band && !behind && !moving) return <DepthTest screen={screen} cyanEye={ctx.cyanEye} onDone={onDone} />;
  return <RingsTest screen={screen} cyanEye={ctx.cyanEye} band={band} behind={behind} moving={moving} onDone={onDone} />;
}
