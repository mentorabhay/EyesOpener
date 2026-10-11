// Eyes Opener: Core system module providing logic and utilities for profile-form.
"use client";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { settings } from "@/copy/settings";
import { ageFrom, MIN_SCREEN_AGE } from "@/engine";
import css from "../../form.module.css";
import { createProfile } from "./actions";

const t = settings.newProfile;
const KINDS = ["adult", "child"] as const;

export function ProfileForm({ minYear, maxYear }: { minYear: number; maxYear: number }) {
  const [state, action, pending] = useActionState(createProfile, null);
  const [kind, setKind] = useState<(typeof KINDS)[number] | null>(null);
  const [year, setYear] = useState("");
  const age = year.length === 4 ? ageFrom(Number(year)) : null;
  const form = useRef<HTMLFormElement>(null);
  /* A choice made before the page finished loading is already in the form: pick it up. */
  useEffect(() => {
    const chosen = new FormData(form.current!).get("kind");
    if (chosen === "adult" || chosen === "child") setKind(chosen);
  }, []);

  return (
    <form action={action} className="stack" ref={form}>
      <div className="field">
        <label htmlFor="profile-name">{t.name}</label>
        <input id="profile-name" type="text" name="name" required maxLength={40} autoComplete="off" />
      </div>
      <fieldset className={css.set}>
        <legend>{t.kind}</legend>
        <div className="row">
          {KINDS.map((k) => (
            <label className={css.check} key={k}>
              <input type="radio" name="kind" value={k} required checked={kind === k} onChange={() => setKind(k)} />{settings.family.kind[k]}
            </label>
          ))}
        </div>
      </fieldset>
      {kind === "child" && (
        <>
          <div className="field">
            <label htmlFor="profile-year">{t.birthYear}</label>
            <input id="profile-year" type="number" name="birthYear" required min={minYear} max={maxYear} inputMode="numeric" aria-describedby="profile-year-note" value={year} onChange={(ev) => setYear(ev.target.value)} />
            <span className="muted small" id="profile-year-note">{t.birthYearNote}</span>
          </div>
          {age !== null && age >= 0 && age < MIN_SCREEN_AGE && <p className="notice" data-b="warn" role="status">{t.under4}</p>}
          <label className={css.check}><input type="checkbox" name="consent" required /><span>{t.consent}</span></label>
        </>
      )}
      <div className="row">
        <button className="btn btn-g" disabled={pending}>{t.save}</button>
        <Link className="btn btn-gh" href="/settings">{t.cancel}</Link>
      </div>
      {state && <p className="notice" data-b="warn" role="alert">{state.message}</p>}
    </form>
  );
}
