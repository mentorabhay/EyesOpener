import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Days } from "@/components/programme/days";
import css from "@/components/programme/week.module.css";
import { Btn, Card, Chip, Empty, EvidenceChip, PageHead, Progress } from "@/components/ui";
import { dateLabel, programme as t } from "@/copy/programme";
import { train } from "@/copy/train";
import { mechanismOf, tests } from "@/data";
import { itemHref, programmeView, type ActiveWeek, type EndedCourse } from "@/lib/programme";
import type { DayPart, PartDone, PlanItem } from "@/lib/programme-rules";
import { requireMember, type Member } from "@/lib/session";
import { doseFor, type TrainDose } from "@/lib/sessions";
import { runPath } from "../../test/results";

export const metadata: Metadata = { title: t.title };

const HEAD = { title: t.title, crumb: [{ href: "/today", label: t.crumb }] };
const itemName = (it: PlanItem) => (it.kind === "film" ? t.cinema : it.name);
/** A check-up's own name, in lower case inside a sentence. */
const testName = (key: string) => (tests.find((x) => x.key === key)?.name ?? key).toLowerCase();

/**
 * The week of the active profile's programme: today's chapter with one tap to start each part, the seven days,
 * the check-ups set for this week, and what comes next. Anyone who may look may open it; only someone who may
 * train sees the start buttons, and nothing here lets a session run past the day's minutes: the session code
 * decides that when a part is opened.
 */
export default async function WeekPage() {
  const m = await requireMember();
  if (!m.can("view")) notFound();
  const view = await programmeView(m);
  if (view.state === "ended") return <Ended e={view} m={m} />;
  if (view.state === "none") {
    const guardian = m.can("manage_family");
    return (
      <>
        <PageHead {...HEAD} />
        <Empty title={t.none.title}>
          <span>{t.none.body}</span>
          {/* wrapped, because the hatched box paints its direct children the card colour */}
          {guardian ? <div><Btn href="/settings" kind="g" small>{t.none.guardian}</Btn></div> : <span>{t.none.other}</span>}
        </Empty>
      </>
    );
  }
  return <Week w={view} m={m} dose={await doseFor(m, "film")} />;
}

function Week({ w, m, dose }: { w: ActiveWeek; m: Member; dose: TrainDose }) {
  const c = w.chapter, d = w.done, words = t.chapters[c.key];
  const rest = w.day.state === "rest";
  const train_ = c.parts.map((p, i) => ({ p, i })).filter((x) => x.p.kind === "train");
  const care = c.parts.map((p, i) => ({ p, i })).filter((x) => x.p.kind === "care");
  const mayTrain = m.can("train");
  /* A day already done needs no "closed" notice: the chapter says it is done. */
  const closed = !dose.ok && dose.reason !== "programme_done" && dose.reason !== "guardian_only" ? dose.reason : null;
  const canStart = mayTrain && dose.ok && !w.waiting && !rest;
  const state = w.waiting ? "waiting" : rest ? "rest" : d.finished ? (w.habit ? "habitsDone" : "finished") : null;

  return (
    <>
      <PageHead
        {...HEAD}
        sub={`${t.sub(w.programme.name)} ${w.programme.doseBasis}`}
        stats={[
          { value: t.stats.weekOf(w.week, w.weeks), label: t.stats.week },
          ...(w.waiting ? [] : [w.habit
            ? { value: w.practised, label: t.stats.habitDays }
            : { value: t.stats.daysOf(w.practised, w.daysPerWeek), label: t.stats.days }]),
        ]}
      />
      {w.counsellorLed && <p className="notice">{t.today.suggestion}</p>}
      {!mayTrain && <p className="notice">{t.today.cannotTrain}</p>}
      {closed && mayTrain && train_.length > 0 && <p className="notice" data-b={closed === "doctor_first" ? "danger" : "warn"}>{train.blocked[closed]}</p>}

      <div className="bento">
        <Card title={t.today.title} span={7} right={c.minutes > 0 && !rest ? <Chip tone={d.finished ? "ok" : "plain"}>{t.today.minutes(d.minutes, d.goal)}</Chip> : undefined}>
          {c.parts.length === 0 ? (
            <Empty title={t.today.empty.title}><span>{t.today.empty.body}</span></Empty>
          ) : (
            <>
              {/* on a rest day the chapter is not asked for, so it is not named */}
              {!rest && (
                <div>
                  <h3>{words?.name ?? c.key}</h3>
                  <p className="muted">{words?.about}</p>
                </div>
              )}
              {state && (
                <p className="notice" data-b={state === "waiting" ? undefined : "ok"}><b>{t.today[state].title}.</b> {t.today[state].body}</p>
              )}
              {c.minutes > 0 && !rest && <Progress value={d.goal > 0 ? d.minutes / d.goal : 0} label={t.today.progress} />}

              {train_.length > 0 && !rest && (
                <ol className={css.parts}>
                  {train_.map(({ p, i }) => (
                    <Part key={p.key} p={p} done={d.parts[i]} next={d.next === i && canStart} canStart={canStart} />
                  ))}
                </ol>
              )}
              {w.instead && train_.length > 0 && !rest && canStart && (
                <p className="small muted">{t.today.instead} <Link href={itemHref(w.instead)}>{t.today.insteadLink}</Link></p>
              )}

              {care.length > 0 && (
                <div className={train_.length ? css.care : undefined}>
                  {train_.length > 0 && <p className={css.sub}>{t.today.care}. <span className="muted">{t.today.careNote}</span></p>}
                  <ol className={css.parts}>
                    {care.map(({ p, i }) => (
                      <Part key={p.key} p={p} done={d.parts[i]} next={!train_.length && d.next === i && mayTrain} canStart={mayTrain} />
                    ))}
                  </ol>
                </div>
              )}
            </>
          )}
        </Card>

        <Card title={t.week.title(w.week)} span={5}>
          <Days days={w.days} habit={w.habit} />
          {w.dailyMinutes > 0 && <p className="small muted">{t.week.restRule(w.daysPerWeek)}</p>}
          {!w.waiting && <p className="small"><b>{w.habit ? t.week.habitCalm : t.week.calm}</b> {w.dailyMinutes > 0 && t.week.rule}</p>}
        </Card>

        <Card title={t.checks.title} span={6} right={<Btn href="/test" small kind="gh">{t.checks.all}</Btn>}>
          {w.visit && w.weeks !== null && (
            <div className="notice stack">
              <b>{t.visit.title}</b>
              <span>{t.visit.mid(w.week, w.weeks)}</span>
              <div><Btn href="/test/summary" small>{t.visit.summary}</Btn></div>
            </div>
          )}
          {w.checks.length ? (
            <div>
              {w.checks.map((k) => (
                <div className="ins" key={k.test}>
                  <div className="tx">
                    <b>{k.def.name}</b>
                    <div className="sub">{k.def.what}{k.def.glasses ? ` ${t.checks.glasses}.` : ""}</div>
                  </div>
                  {k.done
                    ? <Chip tone="ok">{t.checks.done}</Chip>
                    : (
                      <span className="row">
                        <Chip tone="warn">{k.since < w.week ? t.checks.late(k.since) : t.checks.due}</Chip>
                        {m.can("test") && <Link className="btn btn-sm" href={runPath(k.test)} aria-label={`${t.checks.take}: ${k.def.name}`}>{t.checks.take}</Link>}
                      </span>
                    )}
                </div>
              ))}
            </div>
          ) : <p className="muted">{t.checks.none}</p>}
          <p className="small muted">{t.checks.note}</p>
        </Card>

        <Card title={t.next.title} span={6}>
          {w.next ? (
            <>
              <p>
                <b>{t.next.week(w.next.week, w.weeks)}</b>{" "}
                {(w.next.newStage ? t.next.newStage : t.next.same)(w.next.chapters.map((k) => t.chapters[k]?.name ?? k).join(", "))}
              </p>
              <p className="muted">
                {w.next.checks.length ? t.next.checks(w.next.checks.map(testName).join("; ")) : t.next.noChecks}
                {w.next.visit && ` ${t.next.visit}`}
                {w.next.last && ` ${t.next.last}`}
              </p>
            </>
          ) : w.weeks !== null && w.plan.end ? <p>{t.next.ends[w.plan.end](w.weeks)}</p> : null}
        </Card>

        <Card title={t.basis.title}>
          {(t.basis.text[w.programme.slug] ?? []).map((line) => <p key={line}>{line}</p>)}
          <p className="muted small"><b>{t.basis.dose}.</b> {w.programme.doseBasis}</p>
          <p className="small muted">{t.basis.sources}</p>
          <ol className={css.sources}>
            {w.plan.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer noopener">{s.label}</a></li>)}
          </ol>
        </Card>
      </div>
    </>
  );
}

/** One part of the chapter: what it is, what to do it with, how far along it is, and the button that starts it. */
function Part({ p, done, next, canStart }: { p: DayPart; done: PartDone; next: boolean; canStart: boolean }) {
  const words = t.parts[p.key], first = p.items[0], others = p.items.slice(1);
  const training = p.kind === "train";
  const amount = training
    ? (p.minutes > 0 ? t.today.partMinutes(done.done, done.goal) : null)
    : p.ring === "rest" ? t.today.breaks(done.done, done.goal) : p.ring === "light" ? t.today.outside(done.done, done.goal) : done.state === "done" ? t.today.logged : t.today.notLogged;
  return (
    <li className={css.part} data-state={done.state} data-next={next || undefined}>
      <div className={css.head}>
        <b>{words?.name ?? p.key}</b>
        <span className={css.sp} />
        {amount && <span className="small tnum muted">{amount}</span>}
        {done.state === "done" && <Chip tone="ok">{t.today.done}</Chip>}
      </div>
      <div>
        <p className={css.how}>{words?.how}</p>
        <p className={css.item}>
          <b>{itemName(first)}</b>
          <EvidenceChip level={mechanismOf(first.mechanism).evidence} />
          {/* a care routine's own page says what to have ready; its catalogue line names a camera the routine does not need */}
          {training && first.gear && !/^none$/i.test(first.gear) && <span>{t.today.needs(first.gear)}</span>}
        </p>
        {training && done.goal > 0 && done.state === "part" && (
          <div className={css.thin} aria-hidden="true"><i style={{ width: `${Math.round(Math.min(1, done.done / done.goal) * 100)}%` }} /></div>
        )}
      </div>
      {canStart && (training ? done.state !== "done" && p.minutes > 0 : true) && (
        <div className={css.acts}>
          <Link className={`btn btn-sm${next ? " btn-g" : ""}`} href={itemHref(first)} aria-label={t.today.startOf(`${words?.name ?? p.key}, ${itemName(first)}`)}>
            {training ? (done.state === "part" ? t.today.goOn : t.today.start) : t.today.openLog}
          </Link>
          {others.length > 0 && (
            <span>
              {t.today.or}{" "}
              {others.map((it, n) => <span key={it.kind + it.slug}>{n > 0 && ", "}<Link href={itemHref(it)}>{itemName(it)}</Link></span>)}
            </span>
          )}
        </div>
      )}
    </li>
  );
}

/** A course that has run its weeks. It says what to do next, and never what changed. */
function Ended({ e, m }: { e: EndedCourse; m: Member }) {
  const x = t.end;
  return (
    <>
      <PageHead {...HEAD} title={e.end === "eye_test" ? x.title.eye_test(e.weeks) : x.title.counsellor} sub={x.ended(e.programme.name, dateLabel(e.endedAt))} />
      <div className="bento">
        <Card span={7} tone="grad">
          <p>{x.body[e.end](e.weeks)}</p>
          <h2>{x.nextTitle}</h2>
          <ol className={css.steps}>{x.steps[e.end].map((line) => <li key={line}>{line}</li>)}</ol>
          <div className="row">
            <Btn href="/test/summary" kind="g">{x.summary}</Btn>
            {m.can("manage_family") && <Btn href="/settings">{x.settings}</Btn>}
          </div>
        </Card>
        <Card span={5}>
          <p><b>{x.checkups}.</b> {x.rings}</p>
          <div className="row"><Btn href="/test" small>{t.checks.all}</Btn><Btn href="/today" small kind="gh">{t.crumb}</Btn></div>
        </Card>
      </div>
    </>
  );
}
