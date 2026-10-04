"use client";
import { useState } from "react";
import { reportStopSymptom } from "@/app/(app)/train/actions";
import { train as t } from "@/copy/train";
import { needsDoctor, STOP_SYMPTOMS, type StopSymptom } from "@/engine";
import type { TrainDose } from "@/lib/sessions";
import type { Ended, Refusal, TrainSession } from "./use-session";

export const mmss = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/** A new session may begin: training is open and the last one did not end on a stop symptom. */
export const canBegin = (s: TrainSession, dose: TrainDose) =>
  dose.ok && (s.phase === "idle" || (s.phase === "ended" && s.ended?.endReason !== "stop_rule"));

/** Minutes left today, or the plain reason training is closed. */
export function DoseLine({ dose, refused = null, enrolled = true }: { dose: TrainDose; refused?: Refusal | null; enrolled?: boolean }) {
  const closed = refused ?? dose.reason;
  if (closed) return <p className="notice" data-b={closed === "doctor_first" || closed === "failed" ? "danger" : closed === "guardian_only" ? undefined : "ok"}>{t.blocked[closed]}</p>;
  return <p className="muted small">{t.minutesLeft(dose.minutes)}{!enrolled && ` ${t.noProgramme}`}</p>;
}

/** Countdown of the time the server allowed for this session. */
export const Clock = ({ s }: { s: TrainSession }) => (
  <span className="chip tnum" data-b="plain" role="timer" aria-label={t.clock.label}>{mmss(Math.max(0, s.allowed - s.seconds))} {t.clock.left}</span>
);

/** Ends the session at once. The symptom is asked afterwards, so the stop never waits on an answer. */
export const StopButton = ({ s }: { s: TrainSession }) => (
  <button type="button" className="btn btn-d" data-stop onClick={() => void s.end("stop_rule")}>{t.stop.button}</button>
);

function EndNote({ e }: { e: Ended }) {
  const [symptom, setSymptom] = useState<StopSymptom | null>(null);
  const stopped = e.endReason === "stop_rule";
  const pick = (k: StopSymptom) => {
    setSymptom(k);
    if (e.saved) void reportStopSymptom({ sessionId: e.sessionId, symptom: k }).catch(() => undefined);
  };
  return (
    <div className="notice stack" data-b={stopped ? "warn" : "ok"}>
      <b>{t.ended[e.endReason]}</b>
      {typeof e.saved?.score === "number" && <span>{t.score}: {e.saved.score}</span>}
      <span>{e.saved ? t.saved(e.saved.seconds) : t.notSaved}</span>
      {stopped && (symptom
        ? <span><b>{t.stop.symptoms[symptom]}.</b> {needsDoctor(symptom) ? t.stop.doctor : t.stop.rest}</span>
        : (
          <div className="row" role="group" aria-label={t.stop.ask}>
            <span>{t.stop.ask}</span>
            {STOP_SYMPTOMS.map((k) => <button key={k} type="button" className="btn btn-sm" onClick={() => pick(k)}>{t.stop.symptoms[k]}</button>)}
          </div>
        ))}
    </div>
  );
}

/** What the member reads around a session: how the last one ended, minutes left, or why training is closed. */
export function SessionNote({ s, dose }: { s: TrainSession; dose: TrainDose }) {
  if (s.phase === "starting" || s.phase === "saving") return <p className="muted small" role="status">{t[s.phase]}</p>;
  if (s.phase === "active") return null;
  const ended = s.phase === "ended" ? s.ended : null;
  return (
    <div className="stack" role="status">
      {ended && <EndNote e={ended} />}
      {ended?.endReason !== "stop_rule" && <DoseLine dose={dose} refused={s.refused} />}
    </div>
  );
}
