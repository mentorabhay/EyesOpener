import type { Metadata } from "next";
import { Btn, Card, Chip, PageHead, Void } from "@/components/ui";
import { lightsOn as t, longDay } from "@/copy/lights-on";
import { together } from "@/copy/together";
import { ideaBySlug } from "@/data";
import { LANTERN_MAX, LIGHTS_MIN, previewFor, REFRESH_SECONDS, untilParts } from "@/lib/lights-on";
import { lightsOnFor } from "@/lib/lights-on-data";
import { requireMember } from "@/lib/session";
import css from "./lights-on.module.css";
import { Pulse } from "./pulse";
import { Sky } from "./sky";

const idea = ideaBySlug("lights-on-hour")!;
export const metadata: Metadata = { title: idea.name };

/**
 * Lights On Hour. Everyone with a seat may look, a child included: the page shows a time, a number and lanterns.
 * Nobody writes anything here, and taking part gives nothing but company.
 */
export default async function LightsOnPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const m = await requireMember();
  const now = new Date();
  /* The scene runs once a week. Only a staff test household may ask to look at it on another day; a family's address is not read. */
  const v = await lightsOnFor(m, now, previewFor(m.tester, (await searchParams).preview));
  const left = untilParts(now, v.hour.start);
  const others = v.households === null ? 0 : Math.max(0, v.households - (v.own ? 1 : 0));
  const label = !v.on ? t.sky.label.waiting
    : v.households !== null ? t.sky.label.on(Math.min(others, LANTERN_MAX) + (v.own ? 1 : 0), v.own)
    : v.own ? t.sky.label.own : t.sky.label.empty;

  return (
    <>
      <PageHead
        title={idea.name} sub={idea.what} crumb={[together.crumb]}
        stats={[
          { value: t.weekly(v.setting.weekday, v.setting.hour), label: t.stats.weekly },
          v.on ? { value: v.households ?? <Void label={t.stats.tooFew} />, label: t.stats.now } : { value: t.untilShort(left), label: t.stats.until },
        ]}
      />
      {v.preview && <p className="notice" data-b="warn" role="note">{t.sky.preview}</p>}
      <div className="bento">
        <Card title={t.sky.title} span={8} right={v.hour.festival && <Chip tone="grad">{t.when.festival}</Chip>}>
          <div className={css.wrap}>
            <Sky others={others} own={v.own} festival={v.hour.festival} waiting={!v.on} label={`${label}${v.hour.festival ? ` ${t.sky.label.festival}` : ""}`} />
            <div className={css.over}><b>{!v.on ? t.sky.waiting : v.hour.festival ? t.sky.festivalOn : t.sky.on}</b></div>
          </div>
          <div className={css.caption} role="status">
            {v.on ? (
              <>
                {v.households !== null
                  ? <p><b className="tnum">{t.sky.count(v.households)}</b> {t.sky.countOne}</p>
                  : <p>{t.sky.tooFew(LIGHTS_MIN)}</p>}
                {v.households !== null && v.households > LANTERN_MAX && <p className="muted small">{t.sky.more(LANTERN_MAX)}</p>}
                <p className="notice" data-b={v.own ? "ok" : undefined}>{v.own ? `${t.own.up} ${t.sky.yours}` : `${t.own.notUp} ${t.sky.notYet}`}</p>
              </>
            ) : (
              <>
                <p><b>{t.sky.startsIn(t.until(left))}</b> {v.hour.festival && t.sky.festivalNext}</p>
                <p className="muted small">{t.own.wait}</p>
              </>
            )}
            {m.can("train")
              ? <><div className="row"><Btn href="/today" kind={v.on && !v.own ? "g" : ""}>{t.own.go}</Btn></div><p className="muted small">{t.own.doseNote}</p></>
              : <p className="muted small">{t.own.lookOnly}</p>}
          </div>
        </Card>

        <div className="span4 stack" style={{ gap: 16, minWidth: 0 }}>
          <Card title={t.when.title}>
            <dl className="kv">
              <div><dt>{t.when.every}</dt><dd>{t.when.everyValue(v.setting.weekday, v.setting.hour)}</dd></div>
              <div><dt>{t.when.next}</dt><dd>{v.on ? t.when.nowValue(v.setting.hour) : t.when.nextValue(longDay(v.hour.start), v.setting.hour)}</dd></div>
              <div><dt>{t.when.festival}</dt><dd>{t.when.festivalValue(longDay(v.festivalDay), v.setting.hour)}</dd></div>
            </dl>
            <p className="muted small">{t.when.festivalNote}</p>
            <p className="muted small">{t.when.setBy}</p>
          </Card>
          <Card title={t.what.title}>
            <ul className={css.list}>{t.what.points.map((line) => <li key={line}>{line}</li>)}</ul>
            <p className="muted small">{idea.why}</p>
          </Card>
        </div>

        <Card title={t.shows.title} span={12}>
          <ul className={css.list}>{t.shows.points(LIGHTS_MIN, REFRESH_SECONDS).map((line) => <li key={line}>{line}</li>)}</ul>
          <dl className="kv">
            <div>
              <dt>{t.shows.last}</dt>
              <dd style={{ fontWeight: 400 }}>
                {v.last.households !== null ? t.shows.lastValue(longDay(v.last.hour.start), v.last.households) : t.shows.lastFew(longDay(v.last.hour.start), LIGHTS_MIN)}
                {v.last.hour.festival && <small>{t.shows.lastFestival}</small>}
              </dd>
            </div>
          </dl>
        </Card>
      </div>
      {/* While the hour is on, and in the last day before it, the page asks again once a minute; otherwise every ten minutes. */}
      {!v.preview && <Pulse seconds={v.on || left.days === 0 ? REFRESH_SECONDS : REFRESH_SECONDS * 10} at={(v.on ? v.hour.end : v.hour.start).getTime()} />}
    </>
  );
}
