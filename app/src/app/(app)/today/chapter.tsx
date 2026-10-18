/**
 * Today's chapter on the Today page: one button that opens the next part, how far the chapter has got, and the
 * finished state. With no programme it is the plain "start practice" row the page always had.
 */
import Link from "next/link";
import css from "@/components/programme/week.module.css";
import { Btn } from "@/components/ui";
import { programme as p } from "@/copy/programme";
import { today as t } from "@/copy/today";
import type { DoseDecision } from "@/engine";
import { nextStep, type ProgrammeView } from "@/lib/programme";

const PLAN = "/today/week";

export function TodayChapter({ view, dose }: { view: ProgrammeView; dose: DoseDecision }) {
  const blocked = !dose.ok && <p className="notice" data-b={dose.reason === "doctor_first" ? "danger" : "ok"}>{t.blocked[dose.reason!]}</p>;

  if (view.state === "ended" && view.recent) {
    return <p className="notice">{p.end.todayNote(view.programme.name)} <Link href={PLAN}>{p.end.todayLink}</Link></p>;
  }
  if (view.state !== "active") {
    return dose.ok
      ? <div className="row"><Btn href="/train" kind="g">{t.start}</Btn><span className="muted small">{Math.round(dose.minutes)} minutes left today</span></div>
      : blocked;
  }

  const plan = <Btn href={PLAN} small>{p.card.plan}</Btn>;
  const { chapter, done, day } = view;
  if (day.state === "rest") return <p className="notice" data-b="ok">{p.card.rest} {plan}</p>;
  if (done.finished) return <p className="notice" data-b="ok">{view.habit ? p.card.habits : p.card.finished} {plan}</p>;

  const step = nextStep(view);
  /* Habits away from the screen are never closed by the training dose. */
  const open = view.habit || dose.ok;
  if (!step || !open || view.waiting) {
    return <div className="stack">{blocked}<div className="row"><Btn href={PLAN} small>{p.card.openPlan}</Btn></div></div>;
  }
  const part = chapter.parts[done.next!];
  return (
    <div className="stack">
      <div className="row">
        <Btn href={step.href} kind="g">{done.minutes > 0 ? p.card.goOn : p.card.start}</Btn>
        <span className="muted small">
          {p.card.next(step.index, step.total, p.parts[part.key]?.name ?? part.key)}
          {chapter.minutes > 0 && ` ${p.today.minutes(done.minutes, done.goal)}.`}
        </span>
      </div>
      {/* One step for each part. Plain ink: the Train ring beside it is this page's coloured measure of the same minutes. */}
      {chapter.minutes > 0 && (
        <div className={css.steps3} role="img" aria-label={`${p.today.progress}: ${p.today.minutes(done.minutes, done.goal)}`}>
          {chapter.parts.map((x, i) => x.kind === "train" && (
            <div key={x.key} className={css.thin}><i style={{ width: `${Math.round(Math.min(1, done.parts[i].done / Math.max(1, done.parts[i].goal)) * 100)}%` }} /></div>
          ))}
        </div>
      )}
      <div>{plan}</div>
    </div>
  );
}
