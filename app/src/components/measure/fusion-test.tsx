"use client";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { measure as t } from "@/copy/test";
import {
  FUSION_RATE, FUSION_REPEATS, demandBack, demandOut, fusionLimit, limitTry, recordDemand, separationPx,
  type Eye, type FusionTry, type Screen,
} from "@/engine";
import { TrueSize, devicePixels } from "./canvas";
import css from "./measure.module.css";
import { eyeInks, paintFusion } from "./scenes";

/** Three repeats and the largest demand this panel could show. The server takes the medians. */
export interface FusionResult { limit: number; tries: FusionTry[] }

type Phase = "check" | "missing" | "ready" | "out" | "back" | "rest";
/** A press this soon after a phase begins is the same press that began it. */
const SETTLE_MS = 400;
/** How long the copies wait at the screen's limit before the repeat is recorded there. */
const HOLD_SECONDS = 1.5;
/** A frame never moves the demand by more than this many seconds, so a hidden tab cannot make the target jump. */
const MAX_FRAME_SECONDS = 0.1;

/**
 * The fusion range test, turning in. The two copies of the target move apart at one prism dioptre a second until
 * the member reports two, then back until the member reports one. The red ink is at the member's own contrast,
 * as in training, so both eyes' pictures have the best chance of being seen.
 */
export function FusionTest({ screen, cyanEye, contrast, swapped = false, onDone }: { screen: Screen; cyanEye: Eye; contrast: number; /** The weaker eye sees red: the cyan ink is the dimmed one. */ swapped?: boolean; onDone: (r: FusionResult) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("check");
  const [limit, setLimit] = useState(0);
  const [tries, setTries] = useState<FusionTry[]>([]);
  const [why, setWhy] = useState<"ranOut" | "noJoin" | null>(null);
  /** The demand drawn now, the demand at the split, and when this phase began. */
  const now = useRef(0), split = useRef(0), since = useRef(0);
  const inks = useMemo(() => eyeInks(cyanEye, contrast, screen.gamma, swapped), [cyanEye, contrast, screen.gamma, swapped]);
  const moving = phase === "out" || phase === "back";

  function finish(one: FusionTry, reason: typeof why) {
    const all = [...tries, one];
    if (all.length >= FUSION_REPEATS) return onDone({ limit, tries: all });
    setTries(all);
    setWhy(reason);
    setPhase("rest");
  }
  function begin() {
    /* the limit is set once, from the panel as it is when the first repeat starts */
    if (!tries.length) setLimit(fusionLimit(screen, canvas.current!.clientWidth));
    split.current = 0;
    setWhy(null);
    setPhase("out");
  }
  function press() {
    if (!moving || performance.now() - since.current < SETTLE_MS) return;
    if (phase === "out") { split.current = now.current; setPhase("back"); }
    else finish({ break: recordDemand(split.current), recovery: recordDemand(now.current), atLimit: false }, null);
  }
  const end = useEffectEvent(finish), pressKey = useEffectEvent(press);

  useEffect(() => {
    const cv = canvas.current!;
    const paint = (prism: number) => { now.current = prism; paintFusion(cv, screen.ppc, separationPx(screen, prism, devicePixels()), inks); };
    if (phase !== "out" && phase !== "back") {
      const box = new ResizeObserver(() => paint(0));
      box.observe(cv);
      return () => box.disconnect();
    }
    let frame = 0, last = performance.now(), seconds = 0;
    since.current = last;
    const from = split.current;
    const tick = (at: number) => {
      seconds += Math.min(MAX_FRAME_SECONDS, Math.max(0, (at - last) / 1000));
      last = at;
      const prism = phase === "out" ? demandOut(seconds, limit) : demandBack(from, seconds);
      paint(prism);
      if (phase === "out" && seconds >= limit / FUSION_RATE + HOLD_SECONDS) return end(limitTry(limit), "ranOut");
      if (phase === "back" && prism <= 0) return end({ break: recordDemand(from), recovery: 0, atLimit: false }, "noJoin");
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, limit, screen, inks]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const space = e.key === " " || e.code === "Space";
      if ((e.key !== "ArrowDown" && !space) || e.altKey || e.ctrlKey || e.metaKey) return;
      /* the space bar on a button in focus already presses that button */
      if (space && e.target instanceof Element && e.target.closest("button, a, input, select, textarea")) return;
      e.preventDefault();
      if (!e.repeat) pressKey();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const repeat = tries.length + 1;
  return (
    <>
      <TrueSize><canvas ref={canvas} className="chart dark" role="img" aria-label={t.fusion.label} /></TrueSize>
      {phase === "check" && (
        <>
          <p><b>{t.fusion.checkAsk}</b></p>
          <div className="row">
            <button type="button" className={`btn btn-g ${css.wrap}`} onClick={() => setPhase("ready")}>{t.fusion.checkYes}</button>
            <button type="button" className={`btn ${css.wrap}`} onClick={() => setPhase("missing")}>{t.fusion.checkNo}</button>
          </div>
        </>
      )}
      {phase === "missing" && <p className="notice" data-b="warn" role="status">{t.fusion.missing}</p>}
      {(phase === "ready" || phase === "rest") && (
        <>
          {why && <p className="notice" role="status">{t.fusion[why]}</p>}
          <p>{phase === "ready" ? t.fusion.how : t.fusion.rest} {phase === "ready" && t.fusion.keys}</p>
          <button type="button" className={`btn btn-g ${css.act}`} onClick={begin}>{t.fusion.start(repeat, FUSION_REPEATS)}</button>
        </>
      )}
      {moving && (
        <>
          <p role="status"><b>{phase === "out" ? t.fusion.out : t.fusion.back}</b></p>
          <button type="button" className={`btn btn-g ${css.act}`} onClick={press}>{phase === "out" ? t.fusion.split : t.fusion.joined}</button>
        </>
      )}
      <p className="muted small">
        {phase !== "check" && phase !== "missing" && `${t.fusion.repeat(Math.min(repeat, FUSION_REPEATS), FUSION_REPEATS)}. `}
        {limit > 0 && `${t.fusion.limit(String(limit))} `}{t.fusion.turningOut}
      </p>
    </>
  );
}
