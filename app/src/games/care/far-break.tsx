"use client";
/**
 * A 20-second look far away, then three far-off things to tick. Self-reported: nothing is measured.
 * The break begins with a ticket from the server and is logged when the three things are ticked.
 */
import { useEffect, useState } from "react";
import { care as t } from "@/copy/games-care";
import { breakBegin, breakFinish } from "./actions";
import styles from "./care.module.css";

type Phase =
  | { at: "idle" } | { at: "starting" } | { at: "saving" }
  | { at: "looking"; ticket: string; t0: number }
  | { at: "picking"; ticket: string }
  | { at: "done"; ok: boolean; message: string };

export function FarBreak({ seconds, finds }: { seconds: number; finds: number }) {
  const [phase, setPhase] = useState<Phase>({ at: "idle" });
  const [left, setLeft] = useState(seconds);
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    if (phase.at !== "looking") return;
    const { ticket, t0 } = phase;
    const timer = window.setInterval(() => {
      const ms = performance.now() - t0;
      if (ms < seconds * 1000) { setLeft(Math.ceil(seconds - ms / 1000)); return; }
      window.clearInterval(timer);
      /* The member is looking away from the screen, so a phone buzzes when the time is up. */
      navigator.vibrate?.(200);
      setPhase({ at: "picking", ticket });
    }, 200);
    return () => window.clearInterval(timer);
  }, [phase, seconds]);

  async function begin() {
    setPhase({ at: "starting" });
    const answer = await breakBegin("far").catch(() => null);
    if (!answer?.ok) { setPhase({ at: "done", ok: false, message: answer?.message ?? t.breaks.result.failed }); return; }
    setLeft(seconds); setPicked([]);
    setPhase({ at: "looking", ticket: answer.ticket, t0: performance.now() });
  }

  async function finish(ticket: string) {
    setPhase({ at: "saving" });
    const answer = await breakFinish(ticket, picked).catch(() => ({ ok: false, message: t.breaks.result.failed }));
    setPhase({ at: "done", ...answer });
  }

  if (phase.at === "looking") {
    return (
      <div className={styles.guide}>
        <p className={styles.word}>{t.far.looking}</p>
        <p className={`${styles.count} tnum`} role="timer" aria-label={t.far.seconds(left)}>{left}</p>
        <div className={`seg ${styles.fill}`} aria-hidden="true">{Array.from({ length: seconds }, (_, i) => <i key={i} className={i < seconds - left ? "on" : undefined} />)}</div>
        <button type="button" className="btn" onClick={() => setPhase({ at: "idle" })}>{t.far.stop}</button>
      </div>
    );
  }
  if (phase.at === "picking") {
    const toggle = (id: string) => setPicked((now) => (now.includes(id) ? now.filter((x) => x !== id) : now.length < finds ? [...now, id] : now));
    return (
      <div className={styles.guide}>
        <fieldset className={`${styles.group} ${styles.fill}`}>
          <legend role="status">{t.far.pickTitle}</legend>
          <div className={styles.ticks}>
            {t.far.things.map((x) => (
              <label key={x.id} className={styles.tick}>
                <input type="checkbox" checked={picked.includes(x.id)} disabled={!picked.includes(x.id) && picked.length >= finds} onChange={() => toggle(x.id)} />{x.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="row">
          <button type="button" className="btn btn-g" disabled={picked.length !== finds} onClick={() => finish(phase.ticket)}>{t.far.finish}</button>
          <span className="muted small tnum">{t.far.picked(picked.length)}</span>
        </div>
      </div>
    );
  }
  return (
    <div className={styles.guide}>
      <div role="status">
        {phase.at === "saving" && <p className="muted">{t.far.saving}</p>}
        {phase.at === "done" && <p className="notice" data-b={phase.ok ? "ok" : "warn"}>{phase.message}</p>}
      </div>
      <button type="button" className={`btn ${phase.at === "done" && phase.ok ? "" : "btn-g"}`} disabled={phase.at === "starting" || phase.at === "saving"} onClick={begin}>
        {phase.at === "done" && phase.ok ? t.far.again : t.far.begin}
      </button>
    </div>
  );
}
