// Eyes Opener: Core system module providing logic and utilities for group-form.
"use client";
import { useActionState } from "react";
import { sponsor as t } from "@/copy/sponsor";
import { create } from "./actions";

const c = t.groups.create;

export function GroupForm() {
  const [state, action, pending] = useActionState(create, null);
  return (
    <form action={action} className="stack">
      <div className="field">
        <label htmlFor="group-name">{c.name}</label>
        <input id="group-name" type="text" name="name" required minLength={2} maxLength={60} autoComplete="off" aria-describedby="group-name-hint" />
        <span className="muted small" id="group-name-hint">{c.hint}</span>
      </div>
      <div className="row"><button className="btn btn-g" disabled={pending}>{c.go}</button></div>
      {state && <p className="notice" data-b={state.ok ? "ok" : "warn"} role="status">{state.message}</p>}
    </form>
  );
}
