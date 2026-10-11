// Eyes Opener: A form around one care action. It shows the action's answer in plain words.
"use client";
import { startTransition, useActionState, useEffect, useRef, type ReactNode } from "react";
import type { CareState } from "./state";

/**
 * A form around one care action. It shows the action's answer in plain words.
 * What was typed is kept when the answer is no and cleared when it is yes.
 */
export function CareForm({ action, submit, fields, look = "g", small, children }: {
  action: (prev: CareState, form: FormData) => Promise<CareState>;
  submit: string; fields?: Record<string, string>; look?: "g" | "d" | "gh" | "plain"; small?: boolean; children?: ReactNode;
}) {
  const [state, run, pending] = useActionState(action, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) form.current?.reset(); }, [state]);
  return (
    <form
      ref={form} className="stack" action={run}
      /* Sent by hand so the fields are not cleared after a refusal. Without scripts the plain form post still works. */
      onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); startTransition(() => run(data)); }}
    >
      {fields && Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      {children}
      <div className="row">
        <button className={`btn${look === "plain" ? "" : ` btn-${look}`}${small ? " btn-sm" : ""}`} disabled={pending}>{submit}</button>
      </div>
      <div role="status">{state && <p className="notice" data-b={state.ok ? "ok" : "warn"}>{state.message}</p>}</div>
    </form>
  );
}
