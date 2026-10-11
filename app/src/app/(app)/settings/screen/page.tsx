// Eyes Opener: The hatched motif: the usual value is in use, nothing was measured. .
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { StepFlow } from "@/components/guide/flow";
import { Fold, More } from "@/components/guide/more";
import { listSteps } from "@/components/guide/steps";
import { guide as gw } from "@/copy/guide";
import { Btn, Card, Chip, Empty, PageHead, Void, type Tone } from "@/components/ui";
import { screen as t } from "@/copy/screen";
import { day } from "@/copy/settings";
import { cyanCode, weakLight, type LeakLevel } from "@/engine";
import { profileLines } from "@/lib/screen";
import { mayCalibrate, screenFacts, stepSchema, type Step } from "@/lib/screen-rules";
import { requireMember } from "@/lib/session";
import { readSetupSettings } from "@/lib/setup-settings";
import { Flow } from "./flow";
import css from "./screen.module.css";

export const generateMetadata = (): Metadata => ({ title: t.title });

const TONE: Record<LeakLevel, Tone> = { clean: "ok", ghost: "warn", high: "danger" };
const crumb = () => [{ href: "/settings", label: t.crumb }];
/** The hatched motif: the usual value is in use, nothing was measured. */
const Usual = ({ children }: { children: ReactNode }) => <span className={css.hatch}><span>{children}</span></span>;

/**
 * The colours of the household's screen with its red-cyan glasses: what is on record, the three checks that measure
 * it, and what it means for each person. Everyone with a seat may look; a guardian or co-guardian measures.
 * These are home estimates made by eye, not light-meter readings: src/engine/calibrate.ts.
 */
export default async function ScreenPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const m = await requireMember();
  /* opened from a step of setup: that check opens at once, and a link leads back */
  const open = stepSchema.safeParse((await searchParams).step).data ?? null;
  if (!m.device) {
    return (
      <>
        <PageHead title={t.title} crumb={crumb()} />
        <Empty title={t.noScreen.title}><span>{t.noScreen.body}</span></Empty>
        {m.can("test") && <div className="row"><Btn href="/setup" kind="g">{t.noScreen.cta}</Btn></div>}
      </>
    );
  }
  const device = m.device, facts = screenFacts(device);
  const [people, { presets }] = await Promise.all([profileLines(m, facts), readSetupSettings()]);
  const { gamma, leak, ink, tune } = facts, r = t.record;
  const tunedAt = [tune.greenAt, tune.redTopAt].filter((d): d is Date => !!d).sort((a, b) => b.getTime() - a.getTime())[0];
  const measured: Record<Step, string | null> = {
    gamma: gamma.at && t.home.measured(day(gamma.at)), leak: leak && t.home.measured(day(leak.at)), ink: ink && t.home.measured(day(ink.at)),
    tune: tunedAt ? t.home.tuned(day(tunedAt)) : null,
  };
  const share = (v: number) => (v > 0 ? t.pct(v) : r.none);
  const tooMuch = people.some((p) => p.leak?.level === "high");
  const again = people.filter((p) => p.balanceAgain).map((p) => p.name);
  const empty = <Usual>{r.notMeasured}</Usual>;

  return (
    <>
      <PageHead
        title={t.title} crumb={crumb()}
        stats={[
          { value: gamma.value.toFixed(2), label: gamma.at ? r.stat.gamma : `${r.stat.gamma} · ${r.usual.toLowerCase()}` },
          { value: leak ? (Math.max(leak.red, leak.cyan) > 0 ? t.pct(Math.max(leak.red, leak.cyan)) : r.statNone) : <Void label={r.notMeasured} />, label: r.stat.leak },
          { value: ink ? t.ink.stat(ink.value) : <Void label={r.notMeasured} />, label: t.ink.statLabel(ink?.value ?? null) },
        ]}
      />
      <StepFlow steps={listSteps(gw.screen, ["card", "glasses", "sun"])} compact />
      {open && <p className="notice" role="note">{t.fromSetup} <Btn href="/setup" small>{t.backToSetup}</Btn></p>}
      <div className="bento">
        <Flow key={device.id} open={open} presets={presets} canMeasure={mayCalibrate(m)} gamma={gamma.value} dist={device.distanceCm} measured={measured} tune={{ green: tune.green, blue: tune.blue, redTop: tune.redTop }} />

        <Card title={r.title} span={5}>
          {facts.moved && <p className="notice" data-b="warn">{r.moved}</p>}
          <dl className="kv">
            <div>
              <dt>{r.rows.gamma}</dt>
              <dd className="tnum"><span className={css.value}>{gamma.value.toFixed(2)}{!gamma.at && <Usual>{r.usual}</Usual>}</span><small>{gamma.at ? `${measured.gamma}. ${r.from.gamma}` : r.from.gamma}</small></dd>
            </div>
            <div><dt>{r.rows.leakRed}</dt><dd className="tnum">{leak ? share(leak.red) : empty}<small>{leak ? `${measured.leak}. ${leak.stale ? r.stale : r.from.leakRed}` : r.from.leakRed}</small></dd></div>
            <div><dt>{r.rows.leakCyan}</dt><dd className="tnum">{leak ? share(leak.cyan) : empty}<small>{leak ? `${measured.leak}. ${leak.stale ? r.stale : r.from.leakCyan}` : r.from.leakCyan}</small></dd></div>
            <div>
              <dt>{r.rows.ink}</dt>
              <dd className="tnum">{ink ? t.ink.short(ink.value) : empty}<small>{ink ? `${measured.ink}. ${ink.stale ? r.stale : ink.turned ? r.from.ink : r.from.inkNotTurned}` : r.from.ink}</small></dd>
            </div>
            <div><dt>{r.rows.green}</dt><dd className="tnum">{tune.green < 1 || tune.blue < 1 ? r.greenValue(cyanCode(tune, gamma.value), weakLight(tune.green, tune.blue)) : <Usual>{r.untuned}</Usual>}<small>{r.from.green}</small></dd></div>
            <div><dt>{r.rows.redTop}</dt><dd className="tnum">{tune.redTop < 1 ? r.redTopValue(tune.redTop) : <Usual>{r.untuned}</Usual>}<small>{r.from.redTop}</small></dd></div>
            <div><dt>{r.rows.size}</dt><dd className="tnum">{r.size(device.pxPerCm, device.distanceCm, day(device.calibratedAt))}<small>{r.sizeFrom}</small></dd></div>
          </dl>
          <p className="muted small">{r.oneScreen}</p>
        </Card>

        <Card title={t.people.title} span={7}>
          {again.length > 0 && (
            <p className="notice" data-b="warn">{t.people.balanceAgain(again)} <Link href="/test/balance">{t.people.balanceLink}</Link>. {t.people.balanceSwitch}</p>
          )}
          {leak ? (
            <>
              <div>
                {people.map((p) => (
                  <div className={css.person} key={p.id}>
                    <div className={css.top}>
                      <b>{p.name}</b>
                      <span className="muted small">{p.contrast === null ? t.people.noEye : t.people.contrast(p.contrast)}</span>
                      <span className="sp" />
                      {p.leak ? <Chip tone={TONE[p.leak.level]}>{t.people.chip[p.leak.level]}</Chip> : <Void label={t.people.noEye} />}
                    </div>
                    {p.leak && <p>{p.leak.level === "ghost" ? t.people.line.ghost(p.leak.inStrong) : t.people.line[p.leak.level]}</p>}
                    {p.capped !== null && <p className="muted small">{t.people.capped(p.capped)}</p>}
                  </div>
                ))}
              </div>
              {tooMuch && (
                <div className="notice stack" data-b="danger">
                  <b>{t.people.helpTitle}</b>
                  <ul className={css.list}>{t.people.help.map((l) => <li key={l}>{l}</li>)}</ul>
                  <p className="small">{t.people.noFix}</p>
                </div>
              )}
            </>
          ) : (
            <>
              <Empty title={t.people.none.title}><span>{t.people.none.body}</span></Empty>
              {/* the red ink's ceiling lowers someone's red ink whether or not the leak is measured */}
              {people.filter((p) => p.capped !== null).map((p) => <p className="small" key={p.id}><b>{p.name}</b>: {t.people.capped(p.capped!)}</p>)}
            </>
          )}
        </Card>

      </div>
      <More hint={t.sub}>
        <p>{t.sub}</p>
        <Fold title={t.limits.title}><ul>{t.limits.body.map((l) => <li key={l}>{l}</li>)}</ul></Fold>
      </More>
    </>
  );
}
