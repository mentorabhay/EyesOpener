// Eyes Opener: Core system module providing logic and utilities for form.
"use client";
import { useActionState } from "react";
import { gate as t } from "@/copy/gate";
import { openGate } from "./actions";

export function GateForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(openGate, null);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label htmlFor="phrase">{t.label}</label>
        <input id="phrase" name="phrase" type="password" className="input" autoComplete="off" required autoFocus />
      </div>
      {state?.error && <p className="notice" data-b="danger" role="alert">{state.error}</p>}
      <div className="row"><button type="submit" className="btn btn-g" disabled={pending}>{t.open}</button></div>
    </form>
  );
}
