// Eyes Opener: Core system module providing logic and utilities for pair-form.
"use client";
import { useActionState } from "react";
import { sponsor as t } from "@/copy/sponsor";
import { register } from "./actions";

const r = t.glasses.register;

export function PairForm() {
  const [state, action, pending] = useActionState(register, null);
  return (
    <form action={action} className="stack">
      <div className="field">
        <label htmlFor="pair-code">{r.code}</label>
        <input id="pair-code" type="text" name="code" required minLength={4} maxLength={8} pattern="[A-Za-z0-9]{4,8}" autoComplete="off" autoCapitalize="characters" aria-describedby="pair-code-hint" />
        <span className="muted small" id="pair-code-hint">{r.hint}</span>
      </div>
      <div className="row"><button className="btn btn-g" disabled={pending}>{r.go}</button></div>
      {state && <p className="notice" data-b={state.ok ? "ok" : "warn"} role="status">{state.message}</p>}
    </form>
  );
}
