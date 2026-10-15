"use client";
import { startTransition, useActionState, useEffect, useRef, type ReactNode } from "react";

/** What an admin action answers: yes or no, and one sentence. */
export type Answer = { ok: boolean; message: string } | null;

/**
 * A form around a Server Action that shows the action's answer under the button.
 * What was typed is kept when the answer is no and cleared when it is yes.
 */
export function AnswerForm({ action, submit, dark, children }: {
  action: (prev: Answer, form: FormData) => Promise<Answer>; submit: string; dark?: boolean; children: ReactNode;
}) {
  const [state, run, pending] = useActionState(action, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) form.current?.reset(); }, [state]);
  return (
    <form
      ref={form} className="stack" action={run}
      /* Sent by hand so React does not clear the fields after a refusal. Without scripts the plain form post still works. */
      onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); startTransition(() => run(data)); }}
    >
      {children}
      <div className="row"><button className={`btn${dark ? " btn-d" : ""}`} disabled={pending}>{submit}</button></div>
      <div role="status">{state && <p className="notice" data-b={state.ok ? "ok" : "warn"}>{state.message}</p>}</div>
    </form>
  );
}
