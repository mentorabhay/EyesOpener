import type { Metadata } from "next";
import { Btn, Card, PageHead } from "@/components/ui";
import { day, settings } from "@/copy/settings";
import { gates, TRIAGE_KEYS } from "@/lib/family";
import { requireMember } from "@/lib/session";
import css from "../form.module.css";
import { answerTriage } from "./actions";

const t = settings.triage;

export const metadata: Metadata = { title: t.title };

export default async function TriagePage() {
  const m = await requireMember();
  const last = (await gates(m, m.profile.id))?.triage;

  return (
    <>
      <PageHead title={t.title} sub={t.sub(m.profile.displayName)} crumb={[{ href: "/settings", label: settings.title }]} />
      <div className="bento">
        {last && (
          <Card span={12} title={last.redFlag ? t.doctor.title : t.proceed.title} right={<span className="muted small">{t.answered(day(last.createdAt))}</span>}>
            {last.redFlag ? (
              <>
                <p className="notice" data-b="danger">{t.doctor.body} <b>{t.doctor.urgent}</b></p>
                <p>{t.doctor.still}</p>
                <div className="row"><Btn href="/test">{t.doctor.checkups}</Btn></div>
              </>
            ) : (
              <>
                <p>{t.proceed.body}</p>
                {m.can("manage_family") && <div className="row"><Btn href="/settings" kind="g">{t.proceed.cta}</Btn></div>}
              </>
            )}
          </Card>
        )}

        {m.can("manage_family") ? (
          <Card span={12} title={last ? t.again : t.lead}>
            {last && <p className="muted">{t.againNote} {t.lead}</p>}
            <form action={answerTriage} className="stack">
              <input type="hidden" name="profileId" value={m.profile.id} />
              {TRIAGE_KEYS.map((k) => (
                <fieldset className={css.set} key={k}>
                  <legend>{t.questions[k]}</legend>
                  <div className="row">
                    <label className={css.check}><input type="radio" name={k} value="yes" required />{t.yes}</label>
                    <label className={css.check}><input type="radio" name={k} value="no" required />{t.no}</label>
                  </div>
                </fieldset>
              ))}
              <div className="row"><button className={`btn${last ? "" : " btn-g"}`}>{t.save}</button></div>
            </form>
          </Card>
        ) : <Card span={12}><p className="notice">{t.guardianOnly}</p></Card>}
      </div>
    </>
  );
}
