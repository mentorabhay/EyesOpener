// Eyes Opener: The form a counsellor, a sponsor or a school writes to the IOpener team with.
"use client";
/**
 * The form a counsellor, a sponsor or a school writes to the IOpener team with.
 * It posts to a Server Action, so it also works with scripts switched off. What was typed is kept when the answer is no.
 */
import { startTransition, useActionState, useEffect, useRef } from "react";
import { site as t } from "@/copy/site";
import type { EnquiryKind } from "@/lib/site";
import { sendEnquiry } from "./actions";

const e = t.enquiry;

/** The form's limits, handed down by the server page. This file runs in the browser, so it imports no server code. */
export interface EnquiryRules { kinds: readonly EnquiryKind[]; max: { name: number; organisation: number; email: number; message: number }; minAge: number; trap: string }

export function EnquiryForm({ kind, rules }: { kind: EnquiryKind; rules: EnquiryRules }) {
  const { kinds: ENQUIRY_KINDS, max: ENQUIRY_MAX, minAge: ENQUIRY_MIN_AGE, trap: HONEYPOT_FIELD } = rules;
  const [state, run, pending] = useActionState(sendEnquiry, null);
  const form = useRef<HTMLFormElement>(null);
  const answer = useRef<HTMLDivElement>(null);
  const bad = (field: string) => (state?.fields?.includes(field as never) ? true : undefined);

  useEffect(() => {
    if (!state) return;
    if (state.ok) form.current?.reset();
    /* Bring the answer to the reader: a screen reader hears it, and a keyboard lands on it. */
    answer.current?.focus();
  }, [state]);

  return (
    <form
      ref={form} className="s-form" action={run} noValidate
      /* Sent by hand so React keeps the fields after a refusal. Without scripts the plain form post still works. */
      onSubmit={(ev) => { ev.preventDefault(); const data = new FormData(ev.currentTarget); startTransition(() => run(data)); }}
    >
      <p className="notice">{e.adults(ENQUIRY_MIN_AGE)}</p>
      <div className="s-form-row">
        <div className="field">
          <label htmlFor="enq-name">{e.fields.name}</label>
          <input id="enq-name" name="name" type="text" required maxLength={ENQUIRY_MAX.name} autoComplete="name" aria-invalid={bad("name")} />
        </div>
        <div className="field">
          <label htmlFor="enq-org">{e.fields.organisation} <span className="s-hint">({e.fields.organisationHint})</span></label>
          <input id="enq-org" name="organisation" type="text" maxLength={ENQUIRY_MAX.organisation} autoComplete="organization" aria-invalid={bad("organisation")} />
        </div>
      </div>
      <div className="s-form-row">
        <div className="field">
          <label htmlFor="enq-email">{e.fields.email}</label>
          <input id="enq-email" name="email" type="email" required maxLength={ENQUIRY_MAX.email} autoComplete="email" inputMode="email" aria-invalid={bad("email")} />
        </div>
        <div className="field">
          <label htmlFor="enq-kind">{e.fields.kind}</label>
          <select id="enq-kind" name="kind" defaultValue={kind} aria-invalid={bad("kind")}>
            {ENQUIRY_KINDS.map((k) => <option key={k} value={k}>{e.kinds[k]}</option>)}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="enq-message">{e.fields.message}</label>
        <textarea id="enq-message" name="message" required maxLength={ENQUIRY_MAX.message} rows={6} aria-invalid={bad("message")} />
      </div>
      {/* The trap: off the screen, out of the tab order and hidden from screen readers. Only a robot fills it. */}
      <div className="s-trap" aria-hidden="true">
        <label htmlFor="enq-site">{e.trap}</label>
        <input id="enq-site" name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="s-check">
        <input type="checkbox" name="adult" required aria-invalid={bad("adult")} />
        <span>{e.fields.adult(ENQUIRY_MIN_AGE)}</span>
      </label>
      <div className="row">
        <button className="btn btn-d s-btn-lg" disabled={pending}>{pending ? e.sending : e.send}</button>
      </div>
      <div ref={answer} role="status" tabIndex={-1} style={{ outline: "none" }}>
        {state && (
          <div className="notice" data-b={state.ok ? "ok" : "warn"}>
            <p>{state.message}</p>
            {state.problems && <ul>{state.problems.map((p) => <li key={p}>{p}</li>)}</ul>}
          </div>
        )}
      </div>
      <p className="s-note">{e.use}</p>
    </form>
  );
}
