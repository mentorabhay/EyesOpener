"use client";
import { canBegin, Clock, mmss, SessionNote, StopButton } from "@/components/play/session-ui";
import { useTrainSession } from "@/components/play/use-session";
import { train as t } from "@/copy/train";
import type { TrainDose } from "@/lib/sessions";

const x = t.exercise;

/** Timer for an off-screen routine. Starting it opens the session; logging saves the timed minutes. */
export function Routine({ slug, dose }: { slug: string; dose: TrainDose }) {
  const s = useTrainSession("exercise", slug);
  const active = s.phase === "active";
  return (
    <div className="stack">
      <div className="row">
        <div className="hstat"><div className="v tnum" role="timer" aria-label={x.elapsed}>{mmss(s.seconds)}</div><div className="l">{x.elapsed}</div></div>
        <span className="sp" />
        {active && <Clock s={s} />}
      </div>
      <div className="row">
        {active ? (
          <>
            <button type="button" className="btn btn-g" disabled={s.seconds === 0} onClick={() => void s.end("done")}>{x.log}</button>
            <button type="button" className="btn" onClick={() => s.setTicking(!s.ticking)}>{s.ticking ? x.pause : x.resume}</button>
            <StopButton s={s} />
          </>
        ) : canBegin(s, dose) && <button type="button" className="btn btn-g" onClick={() => void s.begin()}>{s.phase === "ended" ? x.again : x.start}</button>}
      </div>
      <SessionNote s={s} dose={dose} />
    </div>
  );
}
