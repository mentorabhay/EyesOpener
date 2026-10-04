"use client";
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { measure as t } from "@/copy/test";
import { answerDepth, depthLevels, depthOutcome, pixelArcsec, startDepth, type CheckNote, type DepthStair, type Eye, type Screen } from "@/engine";
import { devicePixels } from "./canvas";
import css from "./measure.module.css";
import { DEPTH_RINGS, DepthCanvas, depthJitter, depthRoom, type DepthShow } from "./scenes";

/** What the depth test measured: the offset in device pixels on a screen with `dpr` device pixels to a CSS pixel. */
export interface DepthResult { px: number; dpr: number; note: CheckNote; trials: number; reversals: number }

interface Run { levels: number[]; radius: number; dpr: number; stair: DepthStair; show: DepthShow | null }

const whole = (from: number, to: number) => from + Math.floor(Math.random() * (to - from + 1));
/** A new set of rings: which one floats, and a nudge for each so that one eye alone has no clue. */
function showFor(offset: number): DepthShow {
  const j = depthJitter(offset);
  return { offset, target: whole(0, DEPTH_RINGS - 1), nudge: Array.from({ length: DEPTH_RINGS }, (): [number, number] => [whole(-j, j), whole(-2, 2)]) };
}
/** The black panel stays empty for this long between two sets, so the rings are not seen to jump. */
const GAP_MS = 250;

/** The depth test: pick the ring that floats nearer. The offsets follow the engine's staircase. */
export function DepthTest({ screen, cyanEye, onDone }: { screen: Screen; cyanEye: Eye; onDone: (r: DepthResult) => void }) {
  const [run, setRun] = useState<Run | null>(null);
  const begun = useRef(false);
  const gap = useRef<ReturnType<typeof setTimeout>>(undefined);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  /* the offsets depend on how wide the panel is, so the test begins when the panel has been measured */
  const onWidth = useCallback((width: number) => {
    if (begun.current) return;
    begun.current = true;
    const dpr = devicePixels(), room = depthRoom(screen.ppc, dpr, width), levels = depthLevels(screen, dpr, room.maxPx);
    setRun({ levels, radius: room.radius(levels[0]), dpr, stair: startDepth(levels.length), show: showFor(levels[0]) });
  }, [screen]);
  useEffect(() => () => clearTimeout(gap.current), []);

  /** `picked` is a ring, 0 to 3 from the left, or null for "cannot tell". */
  function answer(picked: number | null) {
    if (!run?.show) return;
    const stair = answerDepth(run.stair, picked === run.show.target);
    if (stair.result !== null) {
      const { px, note } = depthOutcome(stair, run.levels);
      return onDone({ px, dpr: run.dpr, note, trials: stair.trials, reversals: stair.reversals });
    }
    setRun({ ...run, stair, show: null });
    gap.current = setTimeout(() => setRun((was) => was && { ...was, show: showFor(was.levels[was.stair.level]) }), GAP_MS);
  }

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key >= "1" && e.key <= String(DEPTH_RINGS)) { e.preventDefault(); return answer(Number(e.key) - 1); }
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    /* the arrows move the focus along the four ring buttons; OK or Enter then presses the one in focus */
    const at = buttons.current.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === "ArrowRight" ? Math.min(DEPTH_RINGS - 1, at + 1) : Math.max(0, (at < 0 ? DEPTH_RINGS : at) - 1);
    buttons.current[next]?.focus();
  });
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <DepthCanvas show={run?.show ?? null} radius={run?.radius ?? 0} cyanEye={cyanEye} onPick={answer} onWidth={onWidth} />
      <div className={css.rings} role="group" aria-label={t.depth.group}>
        {Array.from({ length: DEPTH_RINGS }, (_, i) => (
          <button type="button" key={i} ref={(el) => { buttons.current[i] = el; }} aria-label={t.depth.ring(i + 1)} onClick={() => answer(i)}>{i + 1}</button>
        ))}
      </div>
      <button type="button" className="btn" onClick={() => answer(null)}>{t.depth.cannot}</button>
      <p><b>{t.depth.ask}</b> {t.depth.how}</p>
      <p className="muted small">{t.depth.count((run?.stair.trials ?? 0) + 1)}. {run && t.depth.finest(pixelArcsec(screen, run.dpr).toFixed(0))}</p>
    </>
  );
}
