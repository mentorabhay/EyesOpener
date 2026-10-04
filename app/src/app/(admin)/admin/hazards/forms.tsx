"use client";
import { startTransition, useActionState } from "react";
import { admin } from "@/copy/admin";
import css from "../admin.module.css";
import { AnswerForm } from "../answer-form";
import { addRule, trySentence } from "./actions";

const t = admin.hazards;

export function AddRuleForm({ patternMax }: { patternMax: number }) {
  return (
    <AnswerForm action={addRule} submit={t.add.submit} dark>
      <div className="field">
        <label htmlFor="rule-pattern">{t.add.pattern}</label>
        <input id="rule-pattern" className={`input ${css.mono}`} type="text" name="pattern" required maxLength={patternMax} autoComplete="off" spellCheck={false} aria-describedby="rule-pattern-hint" />
        <span id="rule-pattern-hint" className="muted small">{t.add.patternHint}</span>
      </div>
      <div className="field">
        <label htmlFor="rule-reason">{t.add.reason}</label>
        <input id="rule-reason" className="input" type="text" name="reason" required minLength={5} maxLength={200} autoComplete="off" aria-describedby="rule-reason-hint" />
        <span id="rule-reason-hint" className="muted small">{t.add.reasonHint}</span>
      </div>
    </AnswerForm>
  );
}

export function TrySentenceForm({ textMax }: { textMax: number }) {
  const [state, run, pending] = useActionState(trySentence, null);
  return (
    <form className="stack" action={run} onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); startTransition(() => run(data)); }}>
      <div className="field">
        <label htmlFor="try-text">{t.tryIt.label}</label>
        <textarea id="try-text" name="text" required maxLength={textMax} defaultValue={state?.text} />
      </div>
      <div className="row"><button className="btn" disabled={pending}>{t.tryIt.submit}</button></div>
      <div role="status">
        {state && (
          <div className="notice stack" data-b={!state.ok ? "warn" : state.hits?.length ? "danger" : "ok"}>
            <p>{state.message}</p>
            {!!state.hits?.length && (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {state.hits.map((h) => (
                  <li key={h.id}>
                    {h.reason} <span className="small">{admin.moderation.screen.found(h.found)}</span>
                    {!h.active && <span className="small"> ({t.tryIt.offNote})</span>}
                    <div><code className={css.code}>{h.pattern}</code></div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </form>
  );
}
