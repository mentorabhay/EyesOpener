"use client";
/**
 * The step strip at the top of a page: what to do, in three to six short steps, each with a small moving picture.
 * The steps light up one after another, slowly, like a short film, once (Ved, 17 October 2026: "auto-play once on
 * first visit, then still"). How often follows the Look and feel setting (data-steps on <html>): off never plays,
 * once plays on the first visit to a page in this browser, always plays on every visit. It stops for good on any
 * tap, scroll or key, waits while the page is hidden or a pointer rests on it, and never moves for reduced motion
 * or when the site's motion setting is calm or off. Every step stays readable, lit or not. When it has stopped,
 * "Watch the steps" plays it once more (WCAG 2.2.2).
 * The long text of a page goes under "Read more" at the bottom (more.tsx), not here.
 */
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { guide as w } from "@/copy/guide";
import css from "./guide.module.css";
import { VIEWED } from "./flow-boot";

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
const ROUNDS = 1;

/** Whether this browser has seen this page's steps play, kept per page. Storage that fails counts as "not seen". */
const SEEN = "eo.steps.seen";
function seenBefore(key: string): boolean {
  try { return (JSON.parse(localStorage.getItem(SEEN) ?? "[]") as string[]).includes(key); } catch { return false; }
}
function markSeen(key: string) {
  try {
    const list = (JSON.parse(localStorage.getItem(SEEN) ?? "[]") as string[]).filter((k) => k !== key);
    localStorage.setItem(SEEN, JSON.stringify([...list, key].slice(-200)));
  } catch { /* private window: it plays again next time */ }
}
/**
 * Whether this browser has shown this page's strip before, kept per page. A strip shown before comes folded to one
 * line, "How it works", that opens it again (Ved, 18 October 2026: the strip took a third of the screen on every
 * visit). Not when the Look and feel setting says "always", and never for a live strip (Setup).
 */
function viewedBefore(key: string): boolean {
  try { return (JSON.parse(localStorage.getItem(VIEWED) ?? "[]") as string[]).includes(key); } catch { return false; }
}
function markViewed(key: string) {
  try {
    const list = (JSON.parse(localStorage.getItem(VIEWED) ?? "[]") as string[]).filter((k) => k !== key);
    localStorage.setItem(VIEWED, JSON.stringify([...list, key].slice(-300)));
  } catch { /* private window: it shows in full next time */ }
}
const foldsHere = () => document.documentElement.dataset.steps !== "always";
/** Off, once or always, and whether the site's motion setting keeps everything still, as "mode calm" (a stable value). */
function siteSteps(): string {
  const d = document.documentElement.dataset;
  const mode = d.steps === "off" || d.steps === "always" ? d.steps : "once";
  return `${mode} ${d.motion === "calm" || d.motion === "off" ? "calm" : "free"}`;
}
/* the settings are written into <html> by the server and do not change while a page is open */
const noChange = () => () => {};

/* the device's "reduce motion" setting, read in the browser; the server draws the strip still */
const MOTION = "(prefers-reduced-motion: reduce)";
const onMotion = (fire: () => void) => {
  const q = window.matchMedia?.(MOTION);
  q?.addEventListener("change", fire);
  return () => q?.removeEventListener("change", fire);
};
const stillNow = () => window.matchMedia?.(MOTION).matches ?? false;

export function StepFlowClient({ steps, label = w.how, start = 0, auto = true, compact = false }: {
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
  const reduce = useSyncExternalStore(onMotion, stillNow, () => true);
  /* until the browser has read the setting, the strip stands still: the server draws it still too */
  const site = useSyncExternalStore(noChange, siteSteps, () => null);
  const [mode, calm] = site ? site.split(" ") : ["off", "calm"];
  const still = reduce || calm === "calm";
  /* it starts stopped; the first effect decides whether this visit plays */
  const [stopped, setStopped] = useState(true);
  const [hover, setHover] = useState(false);
  const playing = auto && n > 1 && !still && !stopped;
  const shown = useRef(0);
  const track = useRef<HTMLOListElement>(null);
  const key = useRef("");
  const box = useRef<HTMLElement>(null);
  /* Folded to one line when this browser has shown the strip before; a press opens it for this visit. The fold is an
     attribute of the strip, set before the first paint (FOLD_BOOT, then here after a move between pages), not state:
     React never draws it, so nothing redraws the strip open. */
  useLayoutEffect(() => {
    const k = `${location.pathname}#${label}`;
    box.current?.toggleAttribute("data-folded", auto && foldsHere() && viewedBefore(k));
    if (auto) markViewed(k);
  }, [auto, label]);

  useEffect(() => {
    if (!site || box.current?.hasAttribute("data-folded")) return;
    key.current = `${location.pathname}#${label}`;
    if (!auto || calm === "calm" || mode === "off" || stillNow()) return;
    if (mode === "once" && seenBefore(key.current)) return;
    /* started a beat after the first paint, so the page settles before anything moves; it counts as seen once it starts */
    const id = window.setTimeout(() => { markSeen(key.current); setStopped(false); }, 300);
    return () => window.clearTimeout(id);
  }, [auto, label, site, mode, calm]);

  /* any tap, scroll or key stops it for good on this visit; the reader is busy with the page */
  useEffect(() => {
    if (!playing) return;
    const stop = () => { setStopped(true); setOn(start); };
    const opts = { passive: true, once: true } as const;
    window.addEventListener("scroll", stop, opts);
    window.addEventListener("keydown", stop, opts);
    window.addEventListener("pointerdown", stop, opts);
    return () => { window.removeEventListener("scroll", stop); window.removeEventListener("keydown", stop); window.removeEventListener("pointerdown", stop); };
  }, [playing, start]);

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
      ref={box} suppressHydrationWarning
      className={`${css.flow}${compact ? ` ${css.compact}` : ""}`} aria-label={label} data-playing={playing || undefined}
      onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}
      style={{ "--dwell": `${DWELL}ms` } as CSSProperties}
    >
      <button type="button" className={css.unfold} aria-expanded="false" onClick={() => box.current?.removeAttribute("data-folded")}>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3l8 5-8 5z" /></svg>{label}<span>{w.stepsCount(n)}</span>
      </button>
      <div className={css.top}>
        <span className={css.kicker}>{label}</span>
        <span className={css.bars} data-playing={playing && !hover ? "" : undefined} aria-hidden="true">
          {steps.map((s, i) => <i key={i} data-done={i < on || undefined} data-on={i === on || undefined} />)}
        </span>
        {n > 1 && auto && !still && (
          playing ? (
            <button type="button" className={css.toggle} onPointerDown={(e) => e.stopPropagation()} onClick={() => { setStopped(true); setOn(start); }} aria-label={w.pause}>
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9M11 3.5v9" /></svg>
            </button>
          ) : (
            <button
              type="button" className={css.again}
              /* the press that starts it must not count as the tap that stops it */
              onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}
              onClick={() => { shown.current = 0; setOn(0); window.setTimeout(() => setStopped(false), 0); }}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3l8 5-8 5z" /></svg>{w.watch}
            </button>
          )
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
