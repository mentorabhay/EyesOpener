// Eyes Opener: What a Together action answers: yes or no, one sentence, and the reasons when the answer is no. .
"use client";
import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, type ReactNode } from "react";

/** What a Together action answers: yes or no, one sentence, and the reasons when the answer is no. */
export type FormState = { ok: boolean; message: string; reasons?: string[]; href?: string; hrefLabel?: string } | null;

/**
 * A form around a Server Action that shows the action's answer.
 * What the member typed is kept when the answer is no and cleared when it is yes.
 */
export function StateForm({ action, submit, primary, children }: {
  action: (prev: FormState, form: FormData) => Promise<FormState>; submit: string; primary?: boolean; children?: ReactNode;
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
      <div className="row"><button className={`btn ${primary ? "btn-g" : "btn-d"}`} disabled={pending}>{submit}</button></div>
      <div role="status">
        {state && (
          <div className="notice stack" data-b={state.ok ? "ok" : "warn"}>
            <p>{state.message}</p>
            {state.reasons && <ul style={{ margin: 0, paddingLeft: 18 }}>{state.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
            {state.href && <Link href={state.href}>{state.hrefLabel}</Link>}
          </div>
        )}
      </div>
    </form>
  );
}
