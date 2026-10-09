import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { change, reading, runPath, type Result } from "@/app/(app)/test/results";
import { Confirm } from "@/app/(app)/settings/confirm";
import { StateForm } from "@/components/together/StateForm";
import { Btn, Card, Chip, Empty, PageHead, type Tone } from "@/components/ui";
import { experiments as t } from "@/copy/experiments";
import { test as testWords } from "@/copy/test";
import { together } from "@/copy/together";
import { testByKey, type TestDef } from "@/data";
import { dayText, mayJoin } from "@/lib/community";
import { myExperiments, offerFor, ruleOf, type Mine } from "@/lib/experiment-data";
import { BASELINE_MAX_AGE_DAYS, dayNumber, notCounted, setupDiff, type Stage } from "@/lib/experiments";
import { testBlock } from "@/lib/eye-profile";
import { requireMember } from "@/lib/session";
import { addAfter, addBefore, leave } from "./actions";
import css from "./experiments.module.css";

export const generateMetadata = (): Metadata => ({ title: t.title });

const TONE: Record<Stage, Tone> = { needs_before: "warn", practising: "plain", after_due: "warn", missed: "none", finished: "ok", left: "none" };
const CHANGE_TONE = { better: "ok", worse: "warn", same: "plain" } as const;
type StepState = "done" | "now" | "next";

function Step({ name, state, children }: { name: string; state: StepState; children: ReactNode }) {
  return (
    <li data-state={state}>
      <div className={css.head}><b>{name}</b><span className="small muted">{t.stepState[state]}</span></div>
      {children}
    </li>
  );
}

/** A stored check-up of the member's own: the result, which eye it is, and the day. */
function Stored({ test, row, countsEye }: { test: TestDef; row: Result; countsEye?: boolean }) {
  return (
    <>
      <p className={`${css.value} tnum`}>{reading(test, row)}</p>
      <p className="small muted">{row.eye && countsEye ? `${t.eyeCounts(testWords.eye[row.eye])} ` : row.eye ? `${testWords.eye[row.eye]}. ` : ""}{t.takenOn(dayText(row.takenAt))}</p>
    </>
  );
}

export default async function MyExperimentsPage() {
  const m = await requireMember();
  const now = new Date();
  const [rows, consent] = await Promise.all([myExperiments(m.profile.id, now), mayJoin(m)]);
  const offers = await Promise.all(rows.map((r) => offerFor(m, r, now)));
  const waiting = (s: Stage) => s === "needs_before" || s === "after_due";
  const running = rows.filter((r) => waiting(r.stage) || r.stage === "practising");
  /* the gradient goes to the one thing to do next */
  const first = rows.find((r) => waiting(r.stage) && r.experiment.status === "open")?.enrolment.id;
  const canAct = m.can("share");
  const block = testBlock(m);
  const name = m.profile.displayName;

  return (
    <>
      <PageHead
        title={t.title} sub={t.sub(name)} crumb={[together.crumb]}
        stats={[{ value: running.length, label: t.stats.running }, { value: rows.filter((r) => waiting(r.stage)).length, label: t.stats.todo }]}
      />
      {!consent && rows.length > 0 && <p className="notice" data-b="warn">{t.consentGone(name)} {canAct && <Link href="/family">{t.family}</Link>}</p>}
      {!canAct && rows.length > 0 && <p className="notice">{m.childMode ? t.child : together.cannot.share}</p>}
      {rows.length === 0 && <Empty title={t.none.title}><span>{t.none.body}</span><Btn href="/together" small>{t.none.cta}</Btn></Empty>}

      <div className="bento">
        {rows.map((row, i) => (
          <Experiment key={row.enrolment.id} row={row} offer={offers[i]} primary={row.enrolment.id === first} canAct={canAct && consent} canLeave={canAct}
            block={block} hasScreen={!!m.device} name={name} consent={consent} now={now} />
        ))}
      </div>
      {rows.length > 0 && <p className="muted small">{t.honest}</p>}
    </>
  );
}

function Experiment({ row, offer, primary, canAct, canLeave, block, hasScreen, name, consent, now }: {
  row: Mine; offer: Awaited<ReturnType<typeof offerFor>>; primary: boolean; canAct: boolean; canLeave: boolean;
  block: ReturnType<typeof testBlock>; hasScreen: boolean; name: string; consent: boolean; now: Date;
}) {
  const { enrolment: en, protocol: p, stage, schedule, before, after } = row;
  const test = testByKey(p.moves);
  const testName = test?.name ?? p.moves;
  const ideaHref = `/together/ideas/${p.id}`;
  const group = t.group[en.arm];
  const closed = row.experiment.status !== "open";
  const chip = stage === "practising" && schedule ? t.stage.practising(Math.ceil(dayNumber(schedule, now) / 7), p.weeks) : stage === "practising" ? "" : t.stage[stage];
  const head = { title: <Link href={ideaHref}>{p.title}</Link>, right: <Chip tone={TONE[stage]}>{chip}</Chip> };

  if (stage === "left") {
    return (
      <Card as="article" span={6} {...head}>
        <p className="muted">{t.leave.left(dayText(en.leftAt!))}</p>
        <div className="row"><Btn href={ideaHref} small>{t.end.seeIdea}</Btn></div>
      </Card>
    );
  }

  const take = (label: string) => (block ? <p className="notice">{t.blocked[block]}</p> : (
    <div className="row"><Btn href={runPath(p.moves)} kind={primary ? "g" : ""} small>{label}</Btn>{test?.glasses && <Chip>{testWords.glasses}</Chip>}</div>
  ));
  const add = (action: typeof addBefore, label: string, anyway = false) => (canAct ? (
    <StateForm action={action} submit={label} primary={primary && !anyway}>
      <input type="hidden" name="enrolmentId" value={en.id} />
      {anyway && <input type="hidden" name="anyway" value="yes" />}
    </StateForm>
  ) : null);
  const onScreen = !!test && ruleOf(test).onScreen;

  /* step 1: the check-up before */
  let beforeBody: ReactNode;
  if (before && test) beforeBody = <Stored test={test} row={before} countsEye />;
  else if (closed) beforeBody = <p>{t.closed}</p>;
  else if (offer?.step === "before" && test) {
    const pick = offer.picked;
    if (pick.ok) {
      const found = pick.reading;
      beforeBody = (
        <>
          <p>{t.before.found(testName, dayText(found.takenAt), reading(test, found))}</p>
          {add(addBefore, t.before.use)}
          <div className="row"><Btn href={runPath(p.moves)} kind="gh" small>{t.before.again}</Btn></div>
        </>
      );
    } else if (pick.why === "screen_unknown" && !hasScreen) {
      beforeBody = <><p>{t.before.noScreen}</p><div className="row"><Btn href="/setup" kind={primary ? "g" : ""} small>{t.before.onboarding}</Btn></div></>;
    } else {
      const why = pick.why === "too_old" ? t.before.problem.too_old(testName, BASELINE_MAX_AGE_DAYS)
        : pick.why === "at_limit" ? t.before.problem.at_limit(name)
          : pick.why === "none" ? t.before.take(testName) : t.before.problem[pick.why];
      beforeBody = <><p>{why}</p>{take(pick.why === "none" || pick.why === "too_old" ? t.before.takeNow : t.before.again)}</>;
    }
  }

  /* step 3: the check-up after */
  let afterBody: ReactNode;
  if (after && test) afterBody = <Stored test={test} row={after} />;
  else if (stage === "needs_before") afterBody = <p>{t.after.waits}</p>;
  else if (schedule && stage === "practising") afterBody = <p>{t.after.notYet(dayText(schedule.dueDay), dayText(schedule.lastDay))}</p>;
  else if (schedule && stage === "missed") afterBody = <p>{t.after.missed(dayText(schedule.lastDay), name)}</p>;
  else if (closed) afterBody = <p>{t.closed}</p>;
  else if (schedule && offer?.step === "after" && test) {
    const pick = offer.picked, last = dayText(schedule.lastDay);
    if (pick.ok && pick.comparable) {
      afterBody = <><p>{t.after.found(testName, dayText(pick.reading.takenAt), reading(test, pick.reading))}</p>{add(addAfter, t.after.use)}</>;
    } else if (pick.ok) {
      const then = en.basePxPerCm !== null && en.baseDistanceCm !== null ? { pxPerCm: en.basePxPerCm, distanceCm: en.baseDistanceCm } : null;
      const diff = then && pick.setup ? setupDiff(then, pick.setup) : null;
      afterBody = (
        <>
          <p>{t.after.found(testName, dayText(pick.reading.takenAt), reading(test, pick.reading))}</p>
          <p className="notice" data-b="warn">
            {t.after.changed} {diff?.distance && then && pick.setup ? `${t.after.distance(then.distanceCm, pick.setup.distanceCm)} ` : ""}{diff?.size ? `${t.after.size} ` : ""}{t.after.notComparable}
          </p>
          <p className="small">{t.after.retake(last)}</p>
          {take(t.before.again)}
          {add(addAfter, t.after.anyway, true)}
        </>
      );
    } else {
      afterBody = (
        <>
          <p>{pick.why === "screen_unknown" ? t.after.screenUnknown : t.after.take(testName, last)}</p>
          <p className="small muted">{onScreen ? `${t.after.sameScreen} ` : ""}{t.after.first}</p>
          {take(t.before.takeNow)}
        </>
      );
    }
  }

  /* step 4: both results side by side, and what happens to them */
  const why = stage === "finished" ? notCounted({
    leftAt: en.leftAt, finishedAt: en.finishedAt, before: before?.value ?? null, after: after?.value ?? null,
    base: en.basePxPerCm !== null && en.baseDistanceCm !== null ? { pxPerCm: en.basePxPerCm, distanceCm: en.baseDistanceCm } : null,
    follow: en.followPxPerCm !== null && en.followDistanceCm !== null ? { pxPerCm: en.followPxPerCm, distanceCm: en.followDistanceCm } : null,
    consent,
  }) : null;

  return (
    <Card as="article" span={6} {...head}>
      <p className={`${css.group} small`}><b>{t.group.label}: {group.name}.</b> {group.meaning}</p>
      <ol className={css.steps}>
        <Step name={t.step.before} state={before ? "done" : "now"}>
          {beforeBody}
          {!before && <p className="small muted">{t.before.why}</p>}
        </Step>

        <Step name={t.step.weeks} state={stage === "needs_before" ? "next" : stage === "practising" ? "now" : "done"}>
          {en.arm === "tried" ? (
            <dl className="kv">
              <div><dt>{t.weeks.tried.doWhat}</dt><dd>{p.doWhat}</dd></div>
              <div><dt>{t.weeks.tried.howMuch}</dt><dd>{p.howMuch}</dd></div>
            </dl>
          ) : <p>{t.weeks.control}</p>}
          {stage === "needs_before" && <p className="small">{t.weeks.notStarted}</p>}
          {stage === "practising" && schedule && (
            <>
              <div className={css.days} role="img" aria-label={`${t.weeks.progress}: ${t.weeks.day(dayNumber(schedule, now), schedule.totalDays)}`}>
                <i style={{ width: `${Math.round((dayNumber(schedule, now) / schedule.totalDays) * 100)}%` }} />
              </div>
              <p className="small muted tnum">{t.weeks.day(dayNumber(schedule, now), schedule.totalDays)}. {t.weeks.started(dayText(schedule.startDay))}</p>
            </>
          )}
          {stage !== "needs_before" && stage !== "practising" && schedule && <p className="small muted">{t.weeks.done(p.weeks)} {t.weeks.started(dayText(schedule.startDay))}</p>}
        </Step>

        <Step name={t.step.after} state={after || stage === "missed" ? "done" : stage === "after_due" ? "now" : "next"}>{afterBody}</Step>

        <Step name={t.step.end} state={stage === "finished" ? "done" : "next"}>
          {stage !== "finished" || !test ? stage !== "missed" && <p>{t.end.waits}</p> : (
            <>
              {before && after && (
                <dl className="kv">
                  <div><dt>{t.end.before}</dt><dd className="tnum">{reading(test, before)}</dd></div>
                  <div><dt>{t.end.after}</dt><dd className="tnum">{reading(test, after)} <Chip tone={CHANGE_TONE[change(test, before, after)]}>{testWords.change[change(test, before, after)]}</Chip></dd></div>
                </dl>
              )}
              <p className="small muted">{t.end.chance}</p>
              <p className="small">{why === null ? t.end.counted : why === "no_consent" ? t.end.notCounted.no_consent(name) : t.end.notCounted[why]}</p>
              {en.arm === "control" && (
                <div className={css.turn}>
                  <b>{t.end.yourTurn}</b>
                  <dl className="kv">
                    <div><dt>{t.weeks.tried.doWhat}</dt><dd>{p.doWhat}</dd></div>
                    <div><dt>{t.weeks.tried.howMuch}</dt><dd>{p.howMuch}</dd></div>
                  </dl>
                  <p className="small muted">{t.end.yourTurnNote}</p>
                </div>
              )}
            </>
          )}
          {(stage === "finished" || stage === "missed") && <div className="row"><Btn href={ideaHref} small>{t.end.seeResult}</Btn></div>}
        </Step>
      </ol>

      {canLeave && (
        <div className={css.leave}>
          <Confirm ask={t.leave.open} warn={t.leave.what}>
            <StateForm action={leave} submit={t.leave.submit}><input type="hidden" name="enrolmentId" value={en.id} /></StateForm>
          </Confirm>
        </div>
      )}
    </Card>
  );
}
