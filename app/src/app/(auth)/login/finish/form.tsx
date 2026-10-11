// Eyes Opener: Finishes an email link. On the device that asked for the link the address is already known, and the form sends.
"use client";
/**
 * Finishes an email link. On the device that asked for the link the address is already known, and the form sends
 * itself once. Anywhere else the person types the address the link was sent to.
 * Nothing is finished by merely opening the page: a mail scanner that fetches the link uses nothing up.
 */
import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef } from "react";
import { signin as t } from "@/copy/signin";
import { finishLink, type SignInAnswer } from "../actions";
import css from "../login.module.css";

export function FinishForm({ code, known, next }: { code: string; known: string | null; next: string | null }) {
  const [answer, finish, working] = useActionState<SignInAnswer, FormData>(finishLink, null);
  const form = useRef<HTMLFormElement>(null);
  const sentOnce = useRef(false);
  useEffect(() => {
    if (!known || sentOnce.current) return;
    sentOnce.current = true;
    form.current?.requestSubmit();
  }, [known]);

  const refused = answer && !answer.ok ? answer : null;
  /* A link that is used up or broken cannot be tried again: the only way on is a new link. */
  const over = refused?.why === "link_expired" || refused?.why === "bad_link";
  /* The device remembered an address the link was not for: ask for the right one. */
  const typeIt = !known || refused?.why === "need_address";

  if (over) {
    return (
      <div className="stack">
        <p className="notice" data-b="warn" role="alert">{refused.message}</p>
        <div className="row"><Link className="btn btn-g" href="/login">{t.finish.askAgain}</Link></div>
      </div>
    );
  }
  return (
    <form
      ref={form} action={finish} className={css.flow}
      /* Sent by hand so React does not empty the field after a refusal. Without scripts the plain form post still works. */
      onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); startTransition(() => finish(data)); }}
    >
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="next" value={next ?? ""} />
      {typeIt ? (
        <>
          <p>{t.finish.elsewhere}</p>
          <div className="field">
            <label htmlFor="finish-email">{t.finish.label}</label>
            <input id="finish-email" className="input" type="email" name="email" required maxLength={254} autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} />
          </div>
        </>
      ) : <p>{t.finish.known(known)}</p>}
      <div className="row"><button className="btn btn-g" disabled={working}>{working ? t.finish.working : t.finish.submit}</button></div>
      <div role="alert">{refused && refused.why !== "need_address" && <p className="notice" data-b="warn">{refused.message}</p>}</div>
    </form>
  );
}
