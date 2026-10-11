import { More } from "@/components/guide/more";
import type { Metadata } from "next";
import form from "@/app/(app)/settings/form.module.css";
import css from "@/components/together/rewards.module.css";
import { StateForm } from "@/components/together/StateForm";
import { Btn, Card, Empty, PageHead } from "@/components/ui";
import { graduation as t } from "@/copy/graduation";
import { together } from "@/copy/together";
import { ideaBySlug } from "@/data";
import { dayText } from "@/lib/community";
import { NEW_FAMILY_WEEKS, THANKS_KEYS, WELCOME_KEYS } from "@/lib/graduation";
import { journeyFor, keeperFor } from "@/lib/graduation-data";
import { currentHero } from "@/lib/hero";
import { requireMember } from "@/lib/session";
import { askAction, leaveWelcomeAction, stopAskingAction, takeBackAction, thanksAction } from "./actions";
import { Ceremony } from "./ceremony";

const idea = ideaBySlug("keeper-graduation")!;
export const metadata: Metadata = { title: idea.name };

/**
 * Keeper Graduation for the active profile: the ceremony and the journey book of a finished course, the welcome
 * its household may leave, and the welcome a family new to a course may ask for. Anyone of the household who may
 * look may open it; only a guardian, out of child mode, leaves, asks or thanks.
 */
export default async function GraduationPage() {
  const m = await requireMember();
  const [k, hero] = await Promise.all([keeperFor(m), currentHero(m)]);
  const g = k.graduate, journey = g ? await journeyFor(g) : null;
  const guardian = m.can("share") && !m.tester;
  const consentOk = m.profile.kind !== "child" || k.parental;
  const name = m.profile.displayName;
  const ppc = m.device?.pxPerCm ?? 0;
  const eye = {
    contrast: m.eye?.strongContrast ?? 1, gamma: m.device?.gamma ?? 2.2,
    targetPx: (m.eye?.targetCm ?? 0) * ppc, letterPx: (m.eye?.letterCm ?? 0) * ppc, ppc, distCm: m.device?.distanceCm ?? 0,
    cyanEye: m.eye?.cyanEye === "right" ? "R" as const : "L" as const,
    weakInk: m.eye?.weakInk === "red" ? "red" as const : "cyan" as const,
  };
  /* The welcome side shows for a family on a course, and for one that already asked. */
  const newSide = !!k.course || !!k.ask;
  const mayAsk = !!k.course && !k.ask && k.course.week <= NEW_FAMILY_WEEKS;
  /* Why a guardian here cannot act, when that is not simply "you are not a guardian". */
  const cannot = m.tester ? t.refused.tester : m.can("share") && !consentOk ? t.refused.consent : null;

  return (
    <>
      <PageHead
        title={idea.name} crumb={[together.crumb]}
        stats={g && journey ? [{ value: g.weeks, label: t.stats.weeks }, { value: journey.practised, label: t.stats.days }] : undefined}
      />

      {!g && !newSide && (
        <Empty title={t.none.title}><span>{t.none.body}</span></Empty>
      )}
      {!g && k.course && (
        <p className="notice">{t.none.body} {t.none.course(k.course.week, k.course.weeks)}</p>
      )}

      <div className="bento">
        {g && (
          <>
            <Card title={t.done.title(name, g.programme.name)} tone="grad">
              <p>{t.done.when(g.weeks, dayText(g.endedAt))} {t.done.careful}</p>
              <div className="row"><Btn href="/today/week">{t.done.next}</Btn></div>
            </Card>

            <Card title={t.ceremony.title} span={7}>
              <p>{t.ceremony.how}</p>
              <Ceremony weeks={g.weeks} programme={g.programme.name} eye={eye} hero={hero} />
            </Card>

            <Card title={t.book.title} span={5}>
              <p>{t.book.what}</p>
              {journey && (
                <dl className="kv">
                  <div><dt>{t.book.weeks}</dt><dd className="tnum">{journey.weeks}</dd></div>
                  <div><dt>{t.book.practised}</dt><dd className="tnum">{journey.practised}</dd></div>
                  <div><dt>{t.book.weeksWith}</dt><dd className="tnum">{journey.weeksWithPractice}</dd></div>
                </dl>
              )}
              <div className="row"><Btn href="/together/graduation/book" kind="g">{t.book.open}</Btn></div>
            </Card>

            <Card title={t.keeper.title}>
              <div className={css.two}>
                <div className="stack">
                  <p>{t.keeper.what}</p>
                  {g.welcome ? (
                    <>
                      <h3>{t.keeper.yours}</h3>
                      <blockquote className={css.quote}>{t.keeper.lines[g.welcome.line]}</blockquote>
                      {g.welcome.givenAt ? (
                        <>
                          <p className="notice" data-b="ok">{t.keeper.given(dayText(g.welcome.givenAt))}</p>
                          {g.welcome.thanks
                            ? <><p className="small muted">{t.keeper.thanksBack}</p><blockquote className={css.quote}>{t.keeper.thanks[g.welcome.thanks]}</blockquote></>
                            : <p className="small muted">{t.keeper.noThanks}</p>}
                        </>
                      ) : (
                        <>
                          <p className="notice">{t.keeper.waiting}</p>
                          {guardian && (
                            <details className={css.take}>
                              <summary className="btn btn-sm">{t.keeper.takeBack.open}</summary>
                              <p className="small">{t.keeper.takeBack.warn}</p>
                              <StateForm action={takeBackAction} submit={t.keeper.takeBack.submit} />
                            </details>
                          )}
                        </>
                      )}
                    </>
                  ) : guardian && consentOk ? (
                    <StateForm action={leaveWelcomeAction} submit={t.keeper.submit}>
                      <fieldset className={form.set}>
                        <legend>{t.keeper.pick}</legend>
                        {WELCOME_KEYS.map((key, i) => (
                          <label key={key} className={form.check}><input type="radio" name="line" value={key} required defaultChecked={i === 0} /><span>{t.keeper.lines[key]}</span></label>
                        ))}
                      </fieldset>
                    </StateForm>
                  ) : <p className="muted">{cannot ?? t.keeper.viewOnly}</p>}
                </div>
                <ul className={`${css.points} muted`}>{t.keeper.rules.map((r) => <li key={r}>{r}</li>)}</ul>
              </div>
            </Card>
          </>
        )}

        {newSide && (
          <Card title={t.welcome.title} span={g ? 12 : 7}>
            {k.ask?.line && k.ask.receivedAt ? (
              <>
                <p className="small muted">{t.welcome.from(k.ask.programme?.name ?? "")}</p>
                <blockquote className={css.quote}>{t.keeper.lines[k.ask.line]}</blockquote>
                <p className="small muted">{t.welcome.received(dayText(k.ask.receivedAt))}</p>
                {k.ask.thanks ? (
                  <><p className="small muted">{t.welcome.youSent}</p><blockquote className={css.quote}>{t.keeper.thanks[k.ask.thanks]}</blockquote></>
                ) : guardian ? (
                  <StateForm action={thanksAction} submit={t.welcome.thankSubmit}>
                    <fieldset className={form.set}>
                      <legend>{t.welcome.thank}</legend>
                      {THANKS_KEYS.map((key, i) => (
                        <label key={key} className={form.check}><input type="radio" name="line" value={key} required defaultChecked={i === 0} /><span>{t.keeper.thanks[key]}</span></label>
                      ))}
                    </fieldset>
                  </StateForm>
                ) : null}
              </>
            ) : k.ask ? (
              <>
                <p className="notice">{t.welcome.waiting(dayText(k.ask.askedAt))}</p>
                {guardian && (
                  <details className={css.take}>
                    <summary className="btn btn-sm">{t.welcome.stop.open}</summary>
                    <p className="small">{t.welcome.stop.warn}</p>
                    <StateForm action={stopAskingAction} submit={t.welcome.stop.submit} />
                  </details>
                )}
              </>
            ) : (
              <>
                <p>{t.welcome.what}</p>
                {mayAsk && guardian && consentOk
                  ? <StateForm action={askAction} submit={t.welcome.ask} primary />
                  : <p className="muted">{k.course && k.course.week > NEW_FAMILY_WEEKS ? t.welcome.notNew(NEW_FAMILY_WEEKS, k.course.week) : cannot ?? t.welcome.viewOnly}</p>}
              </>
            )}
            <ul className={`${css.points} muted`}>{t.welcome.rules.map((r) => <li key={r}>{r}</li>)}</ul>
          </Card>
        )}

        {!g && newSide && (
          <Card title={t.keeper.title} span={5}>
            <p>{t.keeper.what}</p>
            <ul className={`${css.points} muted`}>{t.keeper.rules.map((r) => <li key={r}>{r}</li>)}</ul>
          </Card>
        )}
      </div>
      <More><p>{idea.what}</p></More>
    </>
  );
}
