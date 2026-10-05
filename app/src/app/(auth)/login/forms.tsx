"use client";
/**
 * The two ways to sign in: the Google button and the email-link form.
 *
 * Google's own script draws the button and hands this page a credential when the person has chosen an account.
 * The page passes it to the server and keeps nothing: no token is stored in the browser, and the page never talks
 * to Firebase itself. The email form works with scripts switched off.
 */
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { signin as t } from "@/copy/signin";
import { askForLink, googleSignIn, type SignInAnswer } from "./actions";
import css from "./login.module.css";

interface GoogleId {
  initialize(o: { client_id: string; callback: (r: { credential?: string }) => void; auto_select?: boolean; ux_mode?: "popup"; itp_support?: boolean }): void;
  renderButton(el: HTMLElement, o: Record<string, string | number>): void;
  cancel(): void;
}
declare global { interface Window { google?: { accounts?: { id?: GoogleId } } } }

const SCRIPT_MARK = "data-io-google";
/** Google's button is between 200 and 400 pixels wide. */
const buttonWidth = (el: HTMLElement) => Math.min(400, Math.max(200, Math.floor(el.getBoundingClientRect().width)));

function GoogleButton({ clientId, script, next, onRefused }: { clientId: string; script: string; next: string | null; onRefused: (message: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed" | "working">("loading");

  useEffect(() => {
    let live = true;
    const draw = () => {
      const id = window.google?.accounts?.id;
      if (!live || !id || !box.current) return;
      id.initialize({
        client_id: clientId, auto_select: false, ux_mode: "popup", itp_support: true,
        callback: (r) => {
          if (!live || !r.credential) return;
          const credential = r.credential;
          setState("working");
          startTransition(async () => {
            /* On success the server moves the browser on and this never returns. */
            const answer = await googleSignIn(credential, next);
            if (!live || !answer || answer.ok) return;
            onRefused(answer.message);
            setState("ready");
          });
        },
      });
      box.current.replaceChildren();
      id.renderButton(box.current, { type: "standard", theme: "outline", size: "large", text: "signin_with", shape: "pill", logo_alignment: "left", width: buttonWidth(box.current) });
      setState("ready");
    };
    const fail = () => { if (live) setState((s) => (s === "loading" ? "failed" : s)); };

    let tag = document.querySelector<HTMLScriptElement>(`script[${SCRIPT_MARK}]`);
    if (window.google?.accounts?.id) draw();
    else {
      if (!tag) {
        tag = document.createElement("script");
        tag.src = script; tag.async = true; tag.setAttribute(SCRIPT_MARK, "");
        document.head.appendChild(tag);
      }
      tag.addEventListener("load", draw);
      tag.addEventListener("error", fail);
    }
    const slow = window.setTimeout(fail, 10_000);
    return () => {
      live = false;
      window.clearTimeout(slow);
      tag?.removeEventListener("load", draw);
      tag?.removeEventListener("error", fail);
      window.google?.accounts?.id?.cancel();
    };
  }, [clientId, script, next, onRefused]);

  const says = state === "loading" ? t.google.loading : state === "working" ? t.google.working : state === "failed" ? t.google.failed : null;
  return (
    <div className={css.flow}>
      <div ref={box} className={css.google} hidden={state === "failed"} />
      <div role="status">{says && <p className="muted small">{says}</p>}</div>
    </div>
  );
}

export function SignInForms({ google, next }: { google: { clientId: string; script: string } | null; next: string | null }) {
  const [answer, ask, sending] = useActionState<SignInAnswer, FormData>(askForLink, null);
  const [googleSaid, setGoogleSaid] = useState<string | null>(null);
  /* "Use a different address" puts the form back: the answer it was showing is set aside. A later answer is a new one. */
  const [setAside, setSetAside] = useState<SignInAnswer>(null);
  const sentTo = answer?.ok && answer !== setAside ? answer.sentTo : null;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (sentTo) heading.current?.focus(); }, [sentTo]);

  if (sentTo) {
    return (
      <div className={css.flow}>
        <h2 ref={heading} tabIndex={-1} className={css.h}>{t.sent.title}</h2>
        <p>{t.sent.look(sentTo)}</p>
        <p>{t.sent.open}</p>
        <p className="muted small">{t.sent.none} {t.sent.several}</p>
        <div className="row">
          <form action={ask}>
            <input type="hidden" name="email" value={sentTo} />
            <input type="hidden" name="next" value={next ?? ""} />
            <button className="btn btn-d" disabled={sending}>{sending ? t.link.sending : t.sent.again}</button>
          </form>
          <button type="button" className="btn btn-gh" onClick={() => setSetAside(answer)}>{t.sent.other}</button>
        </div>
        <div role="alert">{answer && !answer.ok && <p className="notice" data-b="warn">{answer.message}</p>}</div>
      </div>
    );
  }

  return (
    <div className={css.flow}>
      {google && (
        <>
          <h2 className={css.h}>{t.google.title}</h2>
          <GoogleButton clientId={google.clientId} script={google.script} next={next} onRefused={setGoogleSaid} />
          <div role="alert">{googleSaid && <p className="notice" data-b="warn">{googleSaid}</p>}</div>
          <p className={css.or} aria-hidden="true"><span>{t.or}</span></p>
        </>
      )}
      <h2 className={css.h}>{t.link.title}</h2>
      <form
        action={ask} className={css.flow}
        /* Sent by hand so React does not empty the field after a refusal. Without scripts the plain form post still works. */
        onSubmit={(e) => { e.preventDefault(); setGoogleSaid(null); const data = new FormData(e.currentTarget); startTransition(() => ask(data)); }}
      >
        <input type="hidden" name="next" value={next ?? ""} />
        <div className="field">
          <label htmlFor="signin-email">{t.link.label}</label>
          <input id="signin-email" className="input" type="email" name="email" required maxLength={254} autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} aria-describedby="signin-email-hint" />
          <span id="signin-email-hint" className="muted small">{t.link.hint}</span>
        </div>
        <div className="row"><button className="btn btn-g" disabled={sending}>{sending ? t.link.sending : t.link.send}</button></div>
        <div role="alert">{answer && !answer.ok && <p className="notice" data-b="warn">{answer.message}</p>}</div>
      </form>
    </div>
  );
}
