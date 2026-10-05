"use client";
/**
 * The language menu: a list of the languages offered to this person, each in its own name, and one button.
 * After a change the page is loaded afresh, so the whole page, its typeface and its direction change together.
 * Without scripts the form still works: the browser posts it and gets the page back in the new language.
 */
import { useActionState, useEffect } from "react";
import { languages as t } from "@/copy/languages";
import { chooseLanguage, type LanguageAnswer } from "./actions";

export interface Offered { lang: string; name: string; review: boolean }

export function ChooseLanguage({ offered, now, compact = false }: { offered: Offered[]; now: string; compact?: boolean }) {
  const [state, action, pending] = useActionState<LanguageAnswer, FormData>(chooseLanguage, null);
  useEffect(() => { if (state?.ok && state.reload) window.location.reload(); }, [state]);
  const c = t.choose;
  return (
    <form action={action} className="lang-form">
      <label className={compact ? "s-hide" : undefined} htmlFor={compact ? "lang-site" : "lang-home"}>{c.label}</label>
      {/* each name is in its own language and script, whatever the page's language */}
      <select id={compact ? "lang-site" : "lang-home"} name="lang" defaultValue={now} className="input" aria-label={c.label}>
        {offered.map((o) => <option key={o.lang} value={o.lang} lang={o.lang}>{o.name}{o.review ? ` (${c.inReview})` : ""}</option>)}
      </select>
      <button className={compact ? "btn btn-sm" : "btn btn-d btn-sm"} disabled={pending}>{c.go}</button>
      {state && <p className="lang-note" role="status" data-ok={state.ok}>{state.message}</p>}
    </form>
  );
}
