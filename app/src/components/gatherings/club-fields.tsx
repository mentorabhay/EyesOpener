import { cinemaClub, CLUB_WEEKDAYS } from "@/copy/cinema-club";

/** The choices a listing form offers. The server page hands them down, so the form itself holds no rules. */
export interface ClubChoices { kinds: readonly { key: string; label: string }[]; starts: readonly { minute: number; label: string }[]; name: { min: number; max: number } }

/**
 * The fields of a Cinema Club listing: the kind of place (a fixed list with no home in it), its name, a day and a
 * time. Used by a sponsor in its portal and by staff. The server checks every one of them again.
 */
export function ClubFields({ choices, idPrefix }: { choices: ClubChoices; idPrefix: string }) {
  const t = cinemaClub.sponsor.add;
  return (
    <>
      <div className="field">
        <label htmlFor={`${idPrefix}-kind`}>{t.kind}</label>
        <select id={`${idPrefix}-kind`} name="placeKind" required>{choices.kinds.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}</select>
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-name`}>{t.name}</label>
        <input id={`${idPrefix}-name`} className="input" type="text" name="placeName" required minLength={choices.name.min} maxLength={choices.name.max} autoComplete="off" aria-describedby={`${idPrefix}-name-hint`} />
        <span id={`${idPrefix}-name-hint`} className="muted small">{t.nameHint}</span>
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-day`}>{t.weekday}</label>
        <select id={`${idPrefix}-day`} name="weekday" defaultValue={6} required>{CLUB_WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select>
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-time`}>{t.time}</label>
        <select id={`${idPrefix}-time`} name="startMinute" defaultValue={17 * 60} required>{choices.starts.map((s) => <option key={s.minute} value={s.minute}>{s.label}</option>)}</select>
      </div>
    </>
  );
}
