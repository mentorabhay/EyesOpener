// The eye break's count: a ring that empties and a number that goes down, then a well done.
"use client";
import { useEffect, useRef, useState } from "react";
import css from "../kids.module.css";

const R = 52, LEN = 2 * Math.PI * R;

export function Count({ seconds, words }: { seconds: number; words: { start: string; again: string; look: string; done: string; count: string } }) {
  const [left, setLeft] = useState(seconds);
  const [state, setState] = useState<"ready" | "on" | "done">("ready");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  const start = () => {
    if (timer.current) clearInterval(timer.current);
    setLeft(seconds); setState("on");
    const end = Date.now() + seconds * 1000;
    timer.current = setInterval(() => {
      const s = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) { if (timer.current) clearInterval(timer.current); setState("done"); }
    }, 250);
  };
  return (
    <div className={css.count}>
      <div className={css.ring}>
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle className={css.track} cx="60" cy="60" r={R} />
          <circle className={css.left} cx="60" cy="60" r={R} strokeDasharray={LEN} strokeDashoffset={LEN * (1 - left / seconds)} />
        </svg>
        <output aria-label={words.count}>{left}</output>
      </div>
      {/* said once when the count starts and once when it ends, not every second */}
      <p className={css.say} aria-live="polite">{state === "on" ? words.look : state === "done" ? words.done : ""}</p>
      {state !== "on" && <button type="button" className={css.go} onClick={start}>{state === "done" ? words.again : words.start}</button>}
    </div>
  );
}
