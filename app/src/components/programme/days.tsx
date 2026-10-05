/** The seven days of a programme week, one row each. Server-safe; used by the week screen and the counsellor's page. */
import { Chip, type Tone } from "@/components/ui";
import { dayLabel, programme as t } from "@/copy/programme";
import type { DayState, WeekDay } from "@/lib/programme-rules";
import css from "./week.module.css";

/* A day with no practice is shown with the dashed chip and a hatched bar: nothing was recorded, and nothing is owed. */
const TONE: Record<DayState, Tone> = { done: "ok", part: "plain", open: "plain", rest: "plain", none: "none", ahead: "plain", rest_ahead: "plain", waiting: "none" };

export function Days({ days, habit = false }: { days: WeekDay[]; habit?: boolean }) {
  const w = t.week;
  const label = (d: WeekDay) => (habit && d.state === "none" ? w.habitNone : habit && d.state === "part" ? w.habitPart : w.state[d.state]);
  return (
    <ol className={css.days}>
      {days.map((d) => {
        const share = Math.max(0, Math.min(1, d.share));
        const showMinutes = d.goal > 0 && (d.state === "done" || d.state === "part" || d.state === "open");
        return (
          <li key={d.key} className={css.day} aria-current={d.today ? "date" : undefined}>
            <span className={css.when}>{dayLabel(d.key)}{d.today && <small>{w.today}</small>}</span>
            <div className={css.bar} data-state={d.state} aria-hidden="true">{share > 0 && <i style={{ width: `${Math.round(share * 100)}%` }} />}</div>
            <span className={css.end}>
              {showMinutes && <span className="tnum">{w.minutes(d.minutes, d.goal)}</span>}
              <Chip tone={TONE[d.state]}>{label(d)}</Chip>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
