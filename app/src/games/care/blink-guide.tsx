"use client";
/**
 * Ten full blinks, guided by words and a slow bar. Nothing is measured: the member follows along.
 * The set begins with a ticket from the server and is logged when the last blink ends.
 * With reduced motion the bar moves in four steps, one for each part of a blink.
 */
import { useEffect, useState } from "react";
import { care as t } from "@/copy/games-care";
import type { BlinkPart } from "@/lib/care";
import { breakBegin, breakFinish } from "./actions";
import styles from "./care.module.css";

type Phase =
  | { at: "idle" } | { at: "starting" } | { at: "saving" }
  | { at: "running"; ticket: string; t0: number }
  | { at: "done"; ok: boolean; message: string };

export function BlinkGuide({ blinks, parts }: { blinks: number; parts: { key: BlinkPart; seconds: number }[] }) {
  const [phase, setPhase] = useState<Phase>({ at: "idle" });
  const [elapsed, setElapsed] = useState(0);
  const blinkMs = parts.reduce((sum, p) => sum + p.seconds, 0) * 1000, totalMs = blinkMs * blinks;

  useEffect(() => {
    if (phase.at !== "running") return;
    const { ticket, t0 } = phase;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lastStart = parts.slice(0, -1).reduce((sum, p) => sum + p.seconds, 0) * 1000;
    let buzzed = -1;
    const timer = window.setInterval(() => {
      const ms = performance.now() - t0;
      if (ms < totalMs) {
        /* Eyes are closed for most of a blink, so a phone buzzes once when it is time to open. */
        const blink = Math.floor(ms / blinkMs);
        if (blink > buzzed && ms - blink * blinkMs >= lastStart) { buzzed = blink; navigator.vibrate?.(60); }
        setElapsed(ms);
        return;
      }
      window.clearInterval(timer);
      setPhase({ at: "saving" });
      breakFinish(ticket, []).then((answer) => setPhase({ at: "done", ...answer }), () => setPhase({ at: "done", ok: false, message: t.breaks.result.failed }));
    }, calm ? 250 : 100);
    return () => window.clearInterval(timer);
  }, [phase, parts, blinkMs, totalMs]);

  async function begin() {
    setPhase({ at: "starting" });
    const answer = await breakBegin("blink").catch(() => null);
    if (!answer?.ok) { setPhase({ at: "done", ok: false, message: answer?.message ?? t.breaks.result.failed }); return; }
    setElapsed(0);
    setPhase({ at: "running", ticket: answer.ticket, t0: performance.now() });
  }

  if (phase.at === "running") {
    const blink = Math.min(blinks - 1, Math.floor(elapsed / blinkMs)), within = elapsed - blink * blinkMs;
    let before = 0, part = 0;
    while (part < parts.length - 1 && within >= before + parts[part].seconds * 1000) { before += parts[part].seconds * 1000; part++; }
    return (
      <div className={styles.guide}>
        <p className="muted tnum">{t.blink.count(blink + 1, blinks)}</p>
        <p className={styles.word} aria-live="polite">{t.blink.parts[parts[part].key]}</p>
        {/* The smooth bar for most people; four plain steps when motion is reduced. */}
        <div className={`prog ${styles.bar} ${styles.smooth}`} role="img" aria-label={t.blink.barLabel}><i style={{ width: `${Math.min(100, (within / blinkMs) * 100).toFixed(1)}%` }} /></div>
        <div className={`seg ${styles.fill} ${styles.steps}`} aria-hidden="true">{parts.map((p, i) => <i key={p.key} className={i <= part ? "on" : undefined} />)}</div>
        <button type="button" className="btn" onClick={() => setPhase({ at: "idle" })}>{t.blink.stop}</button>
      </div>
    );
  }
  return (
    <div className={styles.guide}>
      <div role="status">
        {phase.at === "saving" && <p className="muted">{t.blink.saving}</p>}
        {phase.at === "done" && <p className="notice" data-b={phase.ok ? "ok" : "warn"}>{phase.message}</p>}
      </div>
      <button type="button" className={`btn ${phase.at === "done" && phase.ok ? "" : "btn-g"}`} disabled={phase.at === "starting" || phase.at === "saving"} onClick={begin}>
        {phase.at === "done" && phase.ok ? t.blink.again : t.blink.begin}
      </button>
    </div>
  );
}
