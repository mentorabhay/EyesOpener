// Eyes Opener: A calm bar that fills over the time the catalogue gives a clip. It never counts down and never ends anything:.
"use client";
import { useEffect, useState } from "react";
import { clips as c } from "@/copy/clips";
import css from "./clips.module.css";

/**
 * A calm bar that fills over the time the catalogue gives a clip. It never counts down and never ends anything:
 * when the time is up it stays full and says to take the time that is needed. A child is not rushed.
 */
export function TimeBar({ seconds }: { seconds: number }) {
  const [spent, setSpent] = useState(0);
  useEffect(() => {
    const from = Date.now();
    const id = setInterval(() => setSpent(Math.floor((Date.now() - from) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  const share = Math.min(1, spent / Math.max(1, seconds));
  return (
    <div className={css.time}>
      <div className="prog" role="img" aria-label={c.runner.timeLabel}><i style={{ width: `${Math.round(share * 100)}%` }} /></div>
      <span>{share >= 1 ? c.runner.over : c.runner.time(c.seconds(seconds))}</span>
    </div>
  );
}
