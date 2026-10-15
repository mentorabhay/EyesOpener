"use client";
/**
 * The step strip at the top of a page: what to do, in three to six short steps, each with a small moving picture.
 * The steps light up one after another, slowly, like a short film; a press on a step holds it there. It stops on
 * its own after two rounds, while the page is hidden, while a pointer rests on it, and never moves at all for
 * anyone who asked their device to reduce motion. A pause button is always there (WCAG 2.2.2).
 * The long text of a page goes under "Read more" at the bottom (more.tsx), not here.
 */
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { guide as w } from "@/copy/guide";
import css from "./guide.module.css";

export interface FlowStep {
  /** A few words: "Glasses on". */
  title: string;
  /** One short line under it. */
  text?: string;
  /** The picture: an Icon, a NumPic or a cue picture. */
  pic: ReactNode;
  /** "dark" for a picture drawn on the black scene field. */
  dark?: boolean;
  /** "stop" marks the step that says what to do if something goes wrong. */
  tone?: "go" | "wait" | "stop";
  /** A live step (Setup): done ones get a tick. */
  state?: "done" | "todo" | "again" | "skip";
  /** A way to do this step now. */
  action?: { href: string; label: string };
}

/** How long each step stays lit, in milliseconds. */
const DWELL = 3600;
/** Rounds before it rests on its own. */
const ROUNDS = 2;

/* the device's "reduce motion" setting, read in the browser; the server draws the strip still */
const MOTION = "(prefers-reduced-motion: reduce)";
const onMotion = (fire: () => void) => {
  const q = window.matchMedia?.(MOTION);
  q?.addEventListener("change", fire);
  return () => q?.removeEventListener("change", fire);
};
const stillNow = () => window.matchMedia?.(MOTION).matches ?? false;

export function StepFlow({ steps, label = w.how, start = 0, auto = true, compact = false }: {
  steps: FlowStep[];
  label?: string;
  /** The step lit first: the next one to do, on a live strip. */
  start?: number;
  /** False keeps it still on `start` (a live strip, where the next step is what matters). */
  auto?: boolean;
  /** A lower strip for a page where the main thing is right below (a game's play page). */
  compact?: boolean;
}) {
  const n = steps.length;
  const [on, setOn] = useState(Math.min(Math.max(0, start), Math.max(0, n - 1)));
  const still = useSyncExternalStore(onMotion, stillNow, () => true);
  const [stopped, setStopped] = useState(false);
  const [hover, setHover] = useState(false);
  const playing = auto && n > 1 && !still && !stopped;
  const shown = useRef(0);
  const track = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!playing || hover) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      shown.current += 1;
      if (shown.current >= n * ROUNDS) { setStopped(true); setOn(start); return; }
      setOn((i) => (i + 1) % n);
    }, DWELL);
    return () => window.clearInterval(id);
  }, [playing, hover, n, start]);

  /* on a narrow screen the strip scrolls sideways: keep the lit step in view without moving the page */
  useEffect(() => {
    const ol = track.current, li = ol?.children[on] as HTMLElement | undefined;
    if (!ol || !li || ol.scrollWidth <= ol.clientWidth + 2) return;
    ol.scrollTo({ left: li.offsetLeft - ol.offsetLeft - 4, behavior: "smooth" });
  }, [on]);

  if (!n) return null;
  const pick = (i: number) => { setOn(i); setStopped(true); };

  return (
    <section
      className={`${css.flow}${compact ? ` ${css.compact}` : ""}`} aria-label={label}
      onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}
      style={{ "--dwell": `${DWELL}ms` } as CSSProperties}
    >
      <div className={css.top}>
        <span className={css.kicker}>{label}</span>
        <span className={css.bars} data-playing={playing && !hover ? "" : undefined} aria-hidden="true">
          {steps.map((s, i) => <i key={i} data-done={i < on || undefined} data-on={i === on || undefined} />)}
        </span>
        {n > 1 && auto && !still && (
          <button type="button" className={css.toggle} onClick={() => { if (!playing) shown.current = 0; setStopped(playing); }} aria-label={playing ? w.pause : w.play} aria-pressed={!playing}>
            <svg viewBox="0 0 16 16" aria-hidden="true">{playing ? <path d="M5 3.5v9M11 3.5v9" /> : <path d="M5 3l8 5-8 5z" />}</svg>
          </button>
        )}
      </div>
      <ol className={css.track} ref={track}>
        {steps.map((s, i) => (
          <li key={i} data-on={i === on || undefined} data-tone={s.tone} data-state={s.state} style={{ "--i": i } as CSSProperties}>
            <button type="button" className={css.tile} onClick={() => pick(i)} aria-current={i === on ? "step" : undefined} aria-label={`${w.step(i + 1, n)}: ${s.title}${s.text ? `. ${s.text}` : ""}`}>
              <span className={css.pic} data-dark={s.dark || undefined}>{s.pic}</span>
              <span className={css.cap}>
                <span className={css.num} aria-hidden="true">
                  {s.state === "done" ? <svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" /></svg> : i + 1}
                </span>
                <span className={css.words}>
                  <b>{s.title}</b>
                  {s.text && <span>{s.text}</span>}
                </span>
              </span>
            </button>
            {s.action && <Link href={s.action.href} className={`btn btn-sm${i === on ? " btn-g" : ""} ${css.act}`}>{s.action.label}</Link>}
          </li>
        ))}
      </ol>
    </section>
  );
}
