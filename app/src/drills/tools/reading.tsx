"use client";
import { useEffect, useEffectEvent, useId, useMemo, useRef, useState } from "react";
import type { Labels } from "@/components/play/results";
import { canBegin, Clock, SessionNote, StopButton } from "@/components/play/session-ui";
import { useTrainSession } from "@/components/play/use-session";
import { passages, tools } from "@/copy/drills-tools";
import type { Detail, TrainDose } from "@/lib/sessions";
import { charsThatFit, lineOf, lineRanges, nextLine, previousLine, READ_START, readingDetail, splitLines, wordsOf, type ReadPos } from "./helpers";

const t = tools.reading;
/** Text sizes in CSS pixels, and the longest line in characters, for the member's two choices. */
const SIZES = [24, 32, 42] as const;
const LENGTHS = [28, 44] as const;
/** The two bars and the gaps beside them, in pixels: the room a line does not get. */
const START_BAR = 10, END_BAR = 4, GAP = 14;
const BARS = START_BAR + END_BAR + 2 * GAP;

/**
 * Guided line reading, for a person who loses their place after losing half of their side vision.
 * One line is shown at a time between two bars: a thick bar where the line starts and a thin bar where it ends.
 * The tool keeps the lines finished and, once enough is read, the words read in a minute.
 */
export function ReadingTool({ slug, dose, labels }: { slug: string; dose: TrainDose; labels: Labels; ppc: number }) {
  const detail = useRef<Detail | null>(null);
  const s = useTrainSession("exercise", slug, undefined, detail);
  const [size, setSize] = useState(0);
  const [length, setLength] = useState(0);
  const [pos, setPos] = useState<ReadPos>(READ_START);
  const [boxPx, setBoxPx] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const id = useId();
  const active = s.phase === "active";
  const reading = active && s.ticking;

  /* A line never runs past the box: on a narrow screen with large text the lines get shorter than the member chose. */
  const chars = charsThatFit(boxPx - BARS, SIZES[size], LENGTHS[length]);
  const words = useMemo(() => wordsOf(passages[pos.passage % passages.length]), [pos.passage]);
  const ranges = useMemo(() => lineRanges(words, chars), [words, chars]);
  const index = lineOf(ranges, pos.at);
  const range = ranges[index];
  const shown = active ? words.slice(range.start, range.end).join(" ") : splitLines(t.sample, chars)[0];
  const speed = readingDetail(pos.lines, pos.words, pos.seconds)?.words_per_min;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const watch = new ResizeObserver(([entry]) => setBoxPx(entry.contentRect.width));
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  /* The numbers are kept in a ref as they change, so they are saved even when the allowed time ends the session. */
  const next = () => {
    if (!reading) return;
    const n = nextLine(pos, ranges, passages.length, s.seconds);
    setPos(n);
    detail.current = readingDetail(n.lines, n.words, n.seconds);
  };
  const back = () => { if (reading) setPos(previousLine(pos, ranges)); };
  const start = () => {
    detail.current = null;
    setPos({ ...READ_START, passage: Math.floor(Math.random() * passages.length) });
    void s.begin();
  };

  /* Space, Enter and the right arrow move on; the left arrow goes back. A key pressed on a button or in a box is left to that control. */
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
    const el = e.target instanceof HTMLElement ? e.target : null;
    const tag = el?.tagName ?? "";
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || el?.isContentEditable) return;
    const control = tag === "BUTTON" || tag === "A" || tag === "SUMMARY";
    if (e.key === "ArrowRight" || ((e.key === " " || e.key === "Enter") && !control)) { e.preventDefault(); next(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); back(); }
  });
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handler);
    nextButton.current?.focus();
    return () => window.removeEventListener("keydown", handler);
  }, [active]);

  return (
    <div className="stack">
      {!active && <ol className="small" style={{ margin: 0, paddingLeft: 20 }}>{t.how.map((line) => <li key={line}>{line}</li>)}</ol>}

      <div className="row" style={{ alignItems: "flex-end", gap: "10px 18px" }}>
        <div className="field">
          <span className="lab" id={`${id}size`}>{t.size}</span>
          <div className="pills" role="group" aria-labelledby={`${id}size`}>
            {t.sizes.map((label, i) => <button key={label} type="button" className="pill" aria-pressed={i === size} onClick={() => setSize(i)}>{label}</button>)}
          </div>
        </div>
        <div className="field">
          <span className="lab" id={`${id}length`}>{t.length}</span>
          <div className="pills" role="group" aria-labelledby={`${id}length`}>
            {t.lengths.map((label, i) => <button key={label} type="button" className="pill" aria-pressed={i === length} onClick={() => setLength(i)}>{label}</button>)}
          </div>
        </div>
      </div>

      {active && (
        <div className="row" style={{ gap: "10px 24px" }}>
          <div className="hstat"><div className="v tnum">{pos.lines}</div><div className="l">{t.lines}</div></div>
          <div className="hstat">
            <div className="v tnum">{speed ?? <span className="void" role="img" aria-label={t.speedLater} />}</div>
            <div className="l">{t.speed}</div>
          </div>
          <span className="sp" />
          <Clock s={s} />
        </div>
      )}

      <div
        ref={box}
        role="group"
        aria-label={t.line}
        style={{ display: "flex", alignItems: "stretch", gap: GAP, padding: "20px 14px", minHeight: Math.round(SIZES[size] * 1.3) + 42, background: "var(--sunken)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", opacity: active && !reading ? 0.45 : 1 }}
      >
        <span aria-hidden="true" style={{ flex: "none", width: START_BAR, borderRadius: 3, background: "var(--ring-train)" }} />
        <p aria-live="polite" style={{ fontSize: SIZES[size], lineHeight: 1.3, fontWeight: 500, minWidth: 0, overflowWrap: "anywhere" }}>{shown}</p>
        <span aria-hidden="true" style={{ flex: "none", width: END_BAR, borderRadius: 2, background: "var(--ink)" }} />
      </div>

      {active && (
        <>
          <p className="muted small tnum" role="status">{reading ? t.counter(index + 1, ranges.length) : t.paused}</p>
          <div className="row">
            <button type="button" className="btn" style={{ minHeight: 56 }} disabled={!reading || index === 0} onClick={back}>{t.back}</button>
            <button ref={nextButton} type="button" className="btn btn-g" style={{ flex: 1, minHeight: 56, fontSize: "1.15em" }} disabled={!reading} onClick={next}>{t.next}</button>
          </div>
          <p className="muted small">{t.keys}{speed === undefined ? ` ${t.speedLater}` : ""}</p>
        </>
      )}

      <div className="row">
        {active ? (
          <>
            <button type="button" className="btn" disabled={s.seconds === 0} onClick={() => void s.end("done")}>{t.save}</button>
            <button type="button" className="btn" onClick={() => s.setTicking(!s.ticking)}>{s.ticking ? t.pause : t.resume}</button>
            <StopButton s={s} />
          </>
        ) : canBegin(s, dose) && <button type="button" className="btn btn-g" onClick={start}>{s.phase === "ended" ? t.again : t.start}</button>}
      </div>
      <SessionNote s={s} dose={dose} labels={labels} />
    </div>
  );
}
