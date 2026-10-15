"use client";
import { useActionState } from "react";
import { counsellor as t } from "@/copy/counsellor";
import { saveDose, saveNote } from "./actions";

const d = t.member.dose, n = t.member.notes;

export function DoseForm({ linkId, enrolmentId, dailyMinutes, daysPerWeek, max }: { linkId: string; enrolmentId: string; dailyMinutes: number; daysPerWeek: number; max: number }) {
  const [state, action, pending] = useActionState(saveDose, null);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="linkId" value={linkId} />
      <input type="hidden" name="enrolmentId" value={enrolmentId} />
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div className="field" style={{ flex: "1 1 130px" }}>
          <label htmlFor="dose-minutes">{d.minutes}</label>
          <input id="dose-minutes" type="number" name="dailyMinutes" inputMode="numeric" min={1} max={max} step={1} required defaultValue={dailyMinutes || undefined} aria-describedby="dose-minutes-hint" />
          <span className="muted small" id="dose-minutes-hint">{d.minutesHint}</span>
        </div>
        <div className="field" style={{ flex: "1 1 130px" }}>
          <label htmlFor="dose-days">{d.days}</label>
          <input id="dose-days" type="number" name="daysPerWeek" inputMode="numeric" min={1} max={7} step={1} required defaultValue={daysPerWeek || undefined} aria-describedby="dose-days-hint" />
          <span className="muted small" id="dose-days-hint">{d.daysHint}</span>
        </div>
      </div>
      <div className="row"><button className="btn btn-g" disabled={pending}>{d.save}</button></div>
      {state && <p className="notice" data-b={state.ok ? "ok" : "warn"} role="status">{state.message}</p>}
    </form>
  );
}

export function NoteForm({ linkId, max }: { linkId: string; max: number }) {
  const [state, action, pending] = useActionState(saveNote, null);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="linkId" value={linkId} />
      <div className="field">
        <label htmlFor="note-body">{n.label}</label>
        <textarea id="note-body" name="body" required maxLength={max} />
      </div>
      <div className="row"><button className="btn" disabled={pending}>{n.add}</button></div>
      {state && <p className="notice" data-b={state.ok ? "ok" : "warn"} role="status">{state.message}</p>}
    </form>
  );
}
