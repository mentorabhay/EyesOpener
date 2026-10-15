"use client";
import { startTransition, useActionState } from "react";
import { ClubFields, type ClubChoices } from "@/components/gatherings/club-fields";
import { cinemaClub } from "@/copy/cinema-club";
import { clockHour, lightsOn, WEEKDAYS } from "@/copy/lights-on";
import { wishJam } from "@/copy/wish-jam";
import { AnswerForm } from "../../answer-form";
import { listClubAction, setHourAction, tieGameAction, wishStepAction } from "./actions";

/**
 * The staff forms for the gatherings page. Every list of choices is handed down by the server page, so this file,
 * which runs in the browser, imports words only and no rules.
 */
export function HourForm({ weekday, hour, from, to }: { weekday: number; hour: number; from: number; to: number }) {
  const t = lightsOn.staff;
  /* Not the shared form: that one puts the fields back after a save, and here they would then show the old hour. */
  const [state, run, pending] = useActionState(setHourAction, null);
  return (
    <form className="stack" action={run} onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); startTransition(() => run(data)); }}>
      <div className="field">
        <label htmlFor="hour-weekday">{t.weekday}</label>
        <select id="hour-weekday" name="weekday" defaultValue={weekday} required>{WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select>
      </div>
      <div className="field">
        <label htmlFor="hour-hour">{t.hour}</label>
        <select id="hour-hour" name="hour" defaultValue={hour} required aria-describedby="hour-hint">
          {Array.from({ length: to - from + 1 }, (_, i) => from + i).map((h) => <option key={h} value={h}>{clockHour(h)}</option>)}
        </select>
        <span id="hour-hint" className="muted small">{t.hint(from, to)}</span>
      </div>
      <div className="row"><button className="btn btn-d" disabled={pending}>{t.submit}</button></div>
      <div role="status">{state && <p className="notice" data-b={state.ok ? "ok" : "warn"}>{state.message}</p>}</div>
    </form>
  );
}

/** Staff list a club themselves. It is shown at once: staff are the people who approve. */
export function StaffClubForm({ choices }: { choices: ClubChoices }) {
  return <AnswerForm action={listClubAction} submit={cinemaClub.sponsor.add.title} dark><ClubFields choices={choices} idPrefix="staff-club" /></AnswerForm>;
}

/** One staff step on a wish. "built" may name a game that is already in the library. */
export function WishStepForm({ wishId, step, label, games }: { wishId: string; step: string; label: string; games?: readonly { slug: string; name: string }[] }) {
  const t = wishJam.staff;
  return (
    <AnswerForm action={wishStepAction} submit={label} dark={step !== "unmatch"}>
      <input type="hidden" name="id" value={wishId} />
      <input type="hidden" name="step" value={step} />
      {games && (
        <div className="field">
          <label htmlFor={`wish-game-${wishId}`}>{t.slug}</label>
          <select id={`wish-game-${wishId}`} name="gameSlug" defaultValue="" aria-describedby={`wish-game-hint-${wishId}`}>
            <option value="">{t.slugNone}</option>
            {games.map((g) => <option key={g.slug} value={g.slug}>{g.name}</option>)}
          </select>
          <span id={`wish-game-hint-${wishId}`} className="muted small">{t.slugHint}</span>
        </div>
      )}
    </AnswerForm>
  );
}

export function TieGameForm({ wishId, current, games }: { wishId: string; current: string | null; games: readonly { slug: string; name: string }[] }) {
  const t = wishJam.staff;
  return (
    <AnswerForm action={tieGameAction} submit={t.tie}>
      <input type="hidden" name="id" value={wishId} />
      <div className="field">
        <label htmlFor={`tie-${wishId}`}>{t.slug}</label>
        <select id={`tie-${wishId}`} name="gameSlug" defaultValue={current ?? ""}>
          <option value="">{t.slugNone}</option>
          {games.map((g) => <option key={g.slug} value={g.slug}>{g.name}</option>)}
        </select>
      </div>
    </AnswerForm>
  );
}
