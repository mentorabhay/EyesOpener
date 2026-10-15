"use client";
import { useState } from "react";
import { reportStopSymptom } from "@/app/(app)/train/actions";
import { SunsetNote } from "@/components/together/sunset-note";
import { train as t } from "@/copy/train";
import { needsDoctor, STOP_SYMPTOMS, type StopSymptom } from "@/engine";
import type { TrainDose } from "@/lib/sessions";
import { isDayDone } from "@/lib/sunset";
import { Measured, type Labels } from "./results";
import type { Ended, Refusal, TrainSession } from "./use-session";

export const mmss = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/** A new session may begin: training is open and the last one did not end on a stop symptom. */
export const canBegin = (s: TrainSession, dose: TrainDose) =>
  dose.ok && (s.phase === "idle" || (s.phase === "ended" && s.ended?.endReason !== "stop_rule"));

/** Minutes left today, or the plain reason training is closed. */
export function DoseLine({ dose, refused = null, enrolled = true, tester = false }: { dose: TrainDose; refused?: Refusal | null; enrolled?: boolean; tester?: boolean }) {
  const closed = refused ?? dose.reason;
  if (tester && !closed) return <p className="muted small">{t.testerOpen}</p>;
  if (closed) return <p className="notice" data-b={closed === "doctor_first" || closed === "failed" ? "danger" : closed === "guardian_only" || closed === "not_offered" ? undefined : "ok"}>{t.blocked[closed]}</p>;
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

function EndNote({ e, labels }: { e: Ended; labels?: Labels }) {
  const [symptom, setSymptom] = useState<StopSymptom | null>(null);
  const stopped = e.endReason === "stop_rule";
  const pick = (k: StopSymptom) => {
    setSymptom(k);
    if (e.saved) void reportStopSymptom({ sessionId: e.sessionId, symptom: k }).catch(() => undefined);
  };
  return (
    <div className="notice stack" data-b={stopped ? "warn" : "ok"}>
      <b>{t.ended[e.endReason]}</b>
      {typeof e.saved?.score === "number" && e.saved.score > 0 && <span>{labels?.score?.label ?? t.score}: <b className="tnum">{e.saved.score}</b></span>}
      {labels && <Measured detail={e.saved?.detail} labels={labels} />}
      <span>{e.saved ? (e.saved.counted ? t.saved(e.saved.seconds) : t.kept) : t.notSaved}</span>
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

/**
 * What the member reads around a session: how the last one ended and what it measured, minutes left,
 * or why training is closed. `labels` names the measured numbers to show.
 */
export function SessionNote({ s, dose, labels, quiet = false }: { s: TrainSession; dose: TrainDose; labels?: Labels; quiet?: boolean }) {
  if (s.phase === "starting" || s.phase === "saving") return <p className="muted small" role="status">{t[s.phase]}</p>;
  if (s.phase === "active") return null;
  const ended = s.phase === "ended" ? s.ended : null;
  return (
    <div className="stack" role="status">
      {ended && <EndNote e={ended} labels={labels} />}
      {/* A care routine uses no training minutes, so `quiet` leaves the minutes line out and keeps only a reason it is closed. */}
      {ended?.endReason !== "stop_rule" && (!quiet || s.refused || dose.reason) && <DoseLine dose={dose} refused={s.refused} />}
      {/* Sunset Rule: when this session used up the day's minutes, the family sees the sunset. The server decides. */}
      {ended && ended.endReason !== "stop_rule" && isDayDone(dose.reason) && <SunsetNote />}
    </div>
  );
}
