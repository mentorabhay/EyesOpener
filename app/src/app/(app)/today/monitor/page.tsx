import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, Chip, Empty, EvidenceChip, PageHead, Pills, Void } from "@/components/ui";
import { monitor as t } from "@/copy/monitor";
import { day } from "@/copy/settings";
import { exerciseBySlug, mechanismOf } from "@/data";
import { switchProfile } from "@/lib/actions";
import { cameraConsent, maySeeMonitor, monitorUse, monitorView } from "@/lib/monitor";
import { isAdultProfile } from "@/lib/monitor-rules";
import { ageFrom } from "@/engine";
import { requireMember } from "@/lib/session";
import { consentCamera, withdrawCamera } from "./actions";
import { DayChart } from "./day-chart";
import { Forget } from "./forget";
import { Monitor } from "./monitor";
import css from "./monitor.module.css";
import { Week } from "./week";

export const generateMetadata = (): Metadata => ({ title: t.title });

const crumb = () => [{ href: "/today", label: t.crumb }];
/** "Friday 2 October" from a day key. */
const dayName = (key: string) => new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${key}T00:00:00Z`));
const List = ({ items }: { items: readonly string[] }) => <ul className={css.plain}>{items.map((x) => <li key={x}>{x}</li>)}</ul>;

/**
 * The workday monitor: habit coaching for a grown-up at a desk screen, measured by this computer's camera.
 * The page belongs to the guardian seats of the household; anyone else gets "not found". It runs only for a
 * grown-up's profile and only after a guardian has allowed the camera, and the server checks both again on every
 * write (src/lib/monitor.ts). The numbers shown are the active profile's own.
 */
export default async function MonitorPage({ searchParams }: { searchParams: Promise<{ day?: string | string[] }> }) {
  const m = await requireMember();
  if (!maySeeMonitor(m)) notFound();
  const name = m.profile.displayName, use = monitorUse(m);

  if (use === "child") {
    const adults = m.profiles.filter((p) => isAdultProfile(p, ageFrom(p.birthYear)));
    return (
      <>
        <PageHead title={t.title} sub={t.sub} crumb={crumb()} />
        <div className="bento">
          <Card title={t.child.title} span={7}>
            <p>{t.child.body(name)}</p>
            {!m.childMode && (adults.length ? (
              <div className="row">
                <span className="muted">{t.child.switchTo}</span>
                {adults.map((p) => (
                  <form action={switchProfile} key={p.id}>
                    <input type="hidden" name="profileId" value={p.id} />
                    <button className="btn btn-sm">{p.displayName}</button>
                  </form>
                ))}
              </div>
            ) : <p className="muted">{t.child.none}</p>)}
          </Card>
          <Card title={t.does.title} span={5}><List items={t.does.list} /></Card>
        </div>
      </>
    );
  }

  const { day: asked } = await searchParams;
  const [consent, view] = await Promise.all([cameraConsent(m), monitorView(m, typeof asked === "string" ? asked : undefined)]);
  const now = view.today.totals, habit = mechanismOf("habit"), a = t.after;
  const blink = exerciseBySlug("full-blink-drill");
  const none = <Void label={a.week.none} />;

  return (
    <>
      <PageHead
        title={t.title} sub={t.sub} crumb={crumb()}
        stats={[
          { value: now.measured ? a.measured(now.measured) : none, label: a.stat.measured },
          { value: now.measured ? a.ofDue(now.taken, now.due) : none, label: a.stat.breaks },
        ]}
      />
      <div className="bento">
        <Card title={t.panel.title} span={7} right={<Chip>{name}</Chip>}>
          {use === "look_only" ? <p className="notice">{t.lookOnly}</p> : consent ? (
            <Monitor onboardingCm={m.device?.distanceCm ?? null} blinkHref={blink ? `/train/exercises/${blink.slug}` : "/train/exercises"} />
          ) : (
            <div className={css.consent}>
              <p>{t.consent.ask(name)}</p>
              <p className="muted">{t.stored.body} {t.stored.notMeasured}</p>
              {m.can("consent") ? (
                <form action={consentCamera} className={css.consent}>
                  <label className={css.check}><input type="checkbox" name="agree" required /><span>{t.consent.tick(name)}</span></label>
                  <button className="btn btn-g">{t.consent.give}</button>
                </form>
              ) : <p className="notice">{t.consent.needGuardian}</p>}
            </div>
          )}
        </Card>

        <Card title={a.today} span={5}>
          {now.measured ? (
            <dl className="kv">
              <div><dt>{a.rows.measured}</dt><dd className="tnum">{a.measured(now.measured)}</dd></div>
              <div><dt>{a.rows.distance}</dt><dd className="tnum">{now.distanceCm !== null ? t.live.cm(now.distanceCm) : none}{now.distanceMinutes > 0 && <small>{a.rows.close}: {a.closeOf(now.closeMinutes, now.distanceMinutes)}</small>}</dd></div>
              <div><dt>{a.rows.blinks}</dt><dd className="tnum">{now.blinksPerMin ?? none}</dd></div>
              <div><dt>{a.rows.posture}</dt><dd className="tnum">{now.posture !== null ? a.share(now.posture) : none}</dd></div>
              <div><dt>{a.rows.due}</dt><dd className="tnum">{now.due}<small>{a.rows.taken}: {now.taken}. {a.rows.early}: {now.early}.</small></dd></div>
              <div><dt>{a.rows.ring}</dt><dd className="tnum">{a.ring(view.today.ring.rest, view.today.ring.goal)}</dd></div>
            </dl>
          ) : <Empty title={a.empty.title}><span>{a.empty.body}</span></Empty>}
          <p className="small muted">{a.ringNote}</p>
        </Card>

        {/* with nothing measured in the days shown, the card above says so once */}
        {view.any && (
          <>
            <Card title={view.shown.isToday ? a.charts.title : a.charts.titleFor(dayName(view.shown.key))} span={12}>
              <Pills items={view.days.map((d) => ({ key: d.key, label: d.key === view.today.key ? a.today : d.label }))} current={view.shown.key} param="day" base="/today/monitor" />
              {view.shown.measured
                ? <DayChart key={view.shown.key} from={view.shown.from} to={view.shown.to} bins={view.shown.bins} />
                : <Empty title={view.shown.isToday ? a.empty.today : a.empty.thatDay}>{view.shown.isToday && <span>{a.empty.body}</span>}</Empty>}
            </Card>
            <Card title={a.week.title} span={12}><Week days={view.days} /></Card>
          </>
        )}

        <Card title={t.does.title} span={6}><List items={t.does.list} /></Card>
        <Card title={t.doesNot.title} span={6}><List items={t.doesNot.list} /></Card>

        <Card title={t.evidence.title} span={7} right={<><EvidenceChip level={habit.evidence} /><Chip>{habit.label}</Chip></>}>
          <p>{habit.basis}</p>
          <List items={t.evidence.lines} />
          <h3>{t.sure.title}</h3>
          <List items={t.sure.list} />
          <ul className={css.sources}>{t.evidence.sources.map((s) => <li key={s.url}><a href={s.url} rel="noreferrer">{s.label}</a></li>)}</ul>
        </Card>
        <Card title={t.data.title} span={5}>
          <p>{t.data.who(name)}</p>
          {consent && <p className="muted">{t.stored.body} {t.stored.notMeasured}</p>}
          {m.can("data") && <Forget name={name} />}
          {consent && (
            <>
              <p className="small muted">{t.consent.given(consent.by, day(consent.at))}</p>
              {m.can("consent") && (
                <form action={withdrawCamera} className="stack">
                  <div className="row"><button className="btn btn-sm">{t.consent.withdraw}</button></div>
                  <p className="small muted">{t.consent.withdrawNote}</p>
                </form>
              )}
            </>
          )}
        </Card>
      </div>
    </>
  );
}
