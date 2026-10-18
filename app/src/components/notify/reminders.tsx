/**
 * The reminders of one profile: the list with pause, turn back on and remove, a form to change each, and a form to
 * add one. Used by the household's page (/settings/reminders) and the counsellor's page. Server component: the two
 * actions it is given do the checking (src/lib/notify/manage.ts).
 */
import { Card, Chip } from "@/components/ui";
import { notify as w } from "@/copy/notify";
import { EVERY_DAY, KINDS, dayList, keptQuiet } from "@/lib/notify/rules";
import type { remindersOf } from "@/lib/notify/service";
import css from "./reminders.module.css";

type Row = Awaited<ReturnType<typeof remindersOf>>[number];
type Action = (formData: FormData) => Promise<void>;

export function ProfileReminders({ profile, rows, may, save, change, extra }: {
  profile: { id: string; displayName: string; kind: string; needsHelp: boolean };
  rows: Row[]; may: boolean; save: Action; change: Action; extra?: Record<string, string>;
}) {
  const p = w.page;
  const daysText = (d: number) => (d === EVERY_DAY ? p.every : dayList(d).map((i) => p.dayNames[i]).join(", "));
  const hidden = (
    <>
      <input type="hidden" name="profile" value={profile.id} />
      {Object.entries(extra ?? {}).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
    </>
  );
  const form = (r?: Row) => (
    <form action={save} className={css.form}>
      {hidden}
      {r && <input type="hidden" name="id" value={r.id} />}
      <div className={css.row}>
        <label className="field"><span>{p.kind}</span>
          <select className="input" name="kind" defaultValue={r?.kind ?? "practice"}>
            {KINDS.map((k) => <option key={k} value={k}>{w.kinds[k].name}</option>)}
          </select>
        </label>
        <label className="field"><span>{p.at}</span><input className="input" type="time" name="at" required defaultValue={r?.at ?? "17:00"} /></label>
      </div>
      <label className="field"><span>{p.note}</span><input className="input" name="note" maxLength={80} placeholder={p.notePlaceholder} defaultValue={r?.note ?? ""} /></label>
      <fieldset className={css.days}>
        <legend>{p.days}</legend>
        {p.dayNames.map((d, i) => (
          <label key={d} className={css.day}><input type="checkbox" name="day" value={i} defaultChecked={r ? !!(r.days & (1 << i)) : true} />{d}</label>
        ))}
      </fieldset>
      <div className={css.row}>
        <label className={css.check}><input type="checkbox" name="inApp" defaultChecked={r ? r.inApp : true} />{p.inApp}</label>
        <label className={css.check}><input type="checkbox" name="email" defaultChecked={r ? r.email : false} />{p.email}</label>
      </div>
      <p className="muted small">{p.emailTo}</p>
      <div><button className="btn btn-g">{p.save}</button></div>
    </form>
  );
  return (
    <section className={css.person}>
      <h2>{p.for(profile.displayName)} {keptQuiet(profile) && <Chip tone="warn">{p.needsHelp}</Chip>}</h2>
      <div className="bento">
        {rows.length === 0 && <Card><p className="muted">{p.none}</p></Card>}
        {rows.map((r) => (
          <Card key={r.id} span={6} title={r.kind === "custom" ? (r.note ?? w.kinds.custom.name) : w.kinds[r.kind]?.name ?? r.kind}
            right={!r.active ? <Chip tone="warn">{p.paused}</Chip> : undefined}>
            <p>{p.when(r.at, daysText(r.days))}</p>
            <p className={css.chips}>{r.inApp && <Chip>{p.inApp}</Chip>}{r.email && <Chip>{p.email}</Chip>}<span className="muted small">{p.setBy[r.setByRole] ?? ""}</span></p>
            {may && (
              <>
                <details className={css.edit}><summary>{p.save}</summary>{form(r)}</details>
                <div className={css.row}>
                  <form action={change}>{hidden}<input type="hidden" name="id" value={r.id} /><input type="hidden" name="what" value={r.active ? "pause" : "resume"} /><button className="btn btn-sm">{r.active ? p.pause : p.resume}</button></form>
                  <form action={change}>{hidden}<input type="hidden" name="id" value={r.id} /><input type="hidden" name="what" value="remove" /><button className="btn btn-sm">{p.remove}</button></form>
                </div>
              </>
            )}
          </Card>
        ))}
        {may && <Card span={6} title={p.add}>{form()}</Card>}
      </div>
    </section>
  );
}
