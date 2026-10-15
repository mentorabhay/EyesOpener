"use client";
/**
 * Read and time: a short passage read silently, and the clock gives the words a minute. The passages are the
 * exercise library's own (src/copy/drills-tools.ts). The server works out the speed and refuses one that is too
 * fast to be reading.
 */
import { useRef, useState, type MouseEvent } from "react";
import { clips as c } from "@/copy/clips";
import { passages } from "@/copy/drills-tools";
import { wordsOf } from "@/drills/tools/helpers";
import css from "./clips.module.css";
import type { TaskProps } from "./types";

export function ReadTask({ ctx, onDone }: TaskProps) {
  /* a different passage each time the clip is run */
  const text = passages[ctx.readings % passages.length], words = wordsOf(text).length;
  const [reading, setReading] = useState(false);
  const from = useRef(0);
  /* the two presses carry their own times, on the page's steady clock */
  const begin = (e: MouseEvent) => { from.current = e.timeStamp; setReading(true); };
  const finish = (e: MouseEvent) => onDone({ words, seconds: Math.max(0, e.timeStamp - from.current) / 1000 });
  return reading ? (
    <>
      <p className={css.passage} aria-label={c.read.label}>{text}</p>
      <button type="button" className={`btn btn-g ${css.big}`} style={{ alignSelf: "flex-start" }} autoFocus onClick={finish}>{c.read.finished}</button>
    </>
  ) : (
    <>
      <p className="muted small">{c.read.words(words)}</p>
      <button type="button" className={`btn btn-g ${css.big}`} style={{ alignSelf: "flex-start" }} onClick={begin}>{c.read.start}</button>
    </>
  );
}
