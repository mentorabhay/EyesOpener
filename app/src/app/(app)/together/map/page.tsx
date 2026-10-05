import type { Metadata } from "next";
import form from "@/app/(app)/settings/form.module.css";
import { Card, Empty, PageHead, Void } from "@/components/ui";
import { StateForm } from "@/components/together/StateForm";
import { map as t } from "@/copy/map";
import { together } from "@/copy/together";
import { ideaBySlug } from "@/data";
import { dayText } from "@/lib/community";
import { MAP_MIN_HOUSEHOLDS, tiles, WELCOME_KEYS } from "@/lib/map";
import { mapFor } from "@/lib/map-data";
import { requireMember } from "@/lib/session";
import { joinMapAction, leaveMapAction, setWelcomeAction } from "./actions";
import { MapDrawing } from "./drawing";
import css from "./map.module.css";

const idea = ideaBySlug("light-the-map")!;
export const metadata: Metadata = { title: idea.name };

export default async function MapPage() {
  const m = await requireMember();
  const { lit, total, own } = await mapFor(m);
  const mayChange = m.can("share");

  return (
    <>
      <PageHead
        title={idea.name} sub={idea.what} crumb={[together.crumb]}
        stats={[{ value: lit.length, label: t.stats.lit }, { value: total ?? <Void label={t.tooFew} />, label: t.stats.families }]}
      />
      <div className="bento">
        <Card title={t.drawing.title} span={7}>
          <MapDrawing tiles={tiles(lit)} own={own?.region?.key ?? null} />
          <ul className={css.key}>
            <li><i data-k="lit" aria-hidden="true" />{t.drawing.key.lit}</li>
            <li><i data-k="dark" aria-hidden="true" />{t.drawing.key.dark}</li>
            {own && <li><i data-k="yours" aria-hidden="true" />{t.drawing.key.yours}</li>}
          </ul>
          <p className="muted small">{t.drawing.about}</p>
        </Card>

        <div className="span5 stack" style={{ gap: 16, minWidth: 0 }}>
          {own?.welcome && (
            <Card title={t.lamp.from} tone="grad">
              <p className={css.welcome}>{t.welcome[own.welcome]}</p>
              <p className="small muted">{t.lamp.fromNote}</p>
            </Card>
          )}

          <Card title={own ? t.yours.title : t.join.title}>
            {own ? (
              <>
                <p><b>{t.yours.area(own.area, own.region?.name ?? "")}</b></p>
                <p className="notice" data-b={own.households !== null ? "ok" : undefined}>{own.households !== null ? t.yours.lit(own.households) : t.yours.dark(MAP_MIN_HOUSEHOLDS)}</p>
                <p className="muted small">{t.yours.since(dayText(own.joinedAt))}</p>

                {own.first && (
                  <div className="stack">
                    <h3>{t.lamp.title}</h3>
                    <p>{t.lamp.what}</p>
                    {mayChange ? (
                      <StateForm action={setWelcomeAction} submit={t.lamp.submit}>
                        <fieldset className={form.set}>
                          <legend>{t.lamp.pick}</legend>
                          <label className={form.check}><input type="radio" name="welcome" value="" defaultChecked={!own.ownWelcome} /><span>{t.lamp.none}</span></label>
                          {WELCOME_KEYS.map((key) => (
                            <label key={key} className={form.check}><input type="radio" name="welcome" value={key} defaultChecked={own.ownWelcome === key} /><span>{t.welcome[key]}</span></label>
                          ))}
                        </fieldset>
                        <p className="small muted">{t.lamp.hint}</p>
                      </StateForm>
                    ) : own.ownWelcome && <blockquote style={{ margin: 0 }}>{t.welcome[own.ownWelcome]}</blockquote>}
                    <p className="small muted">{t.lamp.onlyThis}</p>
                  </div>
                )}

                {mayChange ? (
                  <details className={css.leave}>
                    <summary className="btn btn-sm">{t.leave.open}</summary>
                    <p className="small">{t.leave.warn}</p>
                    <StateForm action={leaveMapAction} submit={t.leave.submit} />
                  </details>
                ) : <p className="muted small">{t.yours.viewOnly}</p>}
              </>
            ) : m.tester ? <p className="muted">{t.join.tester}</p>
              : !mayChange ? <p className="muted">{t.yours.notOn} {t.yours.viewOnly}</p> : (
                <>
                  <p>{t.join.what}</p>
                  <StateForm action={joinMapAction} submit={t.join.submit} primary>
                    <div className="field">
                      <label htmlFor="map-area">{t.join.field}</label>
                      <input id="map-area" className={`input ${css.digits}`} type="text" name="area" required inputMode="numeric" pattern="[0-9]{3}" minLength={3} maxLength={3} autoComplete="off" aria-describedby="map-area-hint" />
                      <span id="map-area-hint" className="muted small">{t.join.hint}</span>
                    </div>
                  </StateForm>
                  <ul className="stack small muted" style={{ margin: 0, paddingLeft: 18 }}>{t.join.kept.map((line) => <li key={line}>{line}</li>)}</ul>
                </>
              )}
          </Card>
        </div>

        <Card title={t.list.title} span={12}>
          {lit.length === 0 ? <Empty title={t.list.none} /> : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {lit.map((a) => (
                <li className="ins" key={a.area}>
                  <div className="tx"><b>{t.list.area(a.area)}</b><div className="sub">{a.region.name}</div></div>
                  <span className="tnum">{t.families(a.households)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="muted small">{t.list.rule(MAP_MIN_HOUSEHOLDS)}</p>
        </Card>
      </div>
    </>
  );
}
