"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { BalanceTest } from "@/components/measure/balance-test";
import { CardBar, devicePixels } from "@/components/measure/canvas";
import { Cover, GlassesOn } from "@/components/measure/cover";
import { LetterTest } from "@/components/measure/letter-test";
import { LIMITS } from "@/components/measure/limits";
import { Empty } from "@/components/ui";
import { onboarding as o } from "@/copy/onboarding";
import {
  STARTING_CONTRAST, acuityOf, acuityText, balanceCyanEye, contrastLevels, contrastText, percent, snellen, standardMeasured,
  type BalanceResult, type Derived, type Eye, type EyeResult, type Measured, type Screen,
} from "@/engine";
import { finishOnboarding } from "./actions";
import css from "./onboarding.module.css";
import { Settings } from "./settings";

type Step =
  | { at: "intro" | "screen" | "both" | "done" }
  | { at: "survey" | "acuity" | "contrast" | "eyeDone"; eye: Eye };
type StepKey = keyof typeof o.steps;

const STEP_KEYS = Object.keys(o.steps) as StepKey[];
const stepKey = (s: Step): StepKey | null => ("eye" in s ? s.eye : s.at === "intro" ? null : s.at);
const FAINTEST = Math.max(...contrastLevels());
const elapsed = (from: number) => Math.max(0, Math.floor((Date.now() - from) / 1000));

function Clock({ from }: { from: number }) {
  const [seconds, setSeconds] = useState(() => elapsed(from));
  useEffect(() => {
    const id = setInterval(() => setSeconds(elapsed(from)), 1000);
    return () => clearInterval(id);
  }, [from]);
  return <span className={css.time}>{o.timer(seconds)}</span>;
}

/** The five steps of onboarding. `screen` and `saved` are what the member already has; the settings are derived and saved on the server. */
export function Flow({ screen, saved }: { screen: Screen | null; saved: Derived | null }) {
  const [step, setStep] = useState<Step>({ at: "intro" });
  const [p, setP] = useState<Measured>(() => ({ ...standardMeasured(), ...screen, tested: true }));
  const [startedAt, setStartedAt] = useState(0);
  const [seconds, setSeconds] = useState({ L: 0, R: 0 });
  const [fresh, setFresh] = useState<Derived | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const stage = useRef<HTMLElement>(null);
  const first = useRef(true);

  /* each new step starts at the top of the stage, for the keyboard and for small screens */
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const el = stage.current!;
    el.focus({ preventScroll: true });
    if (el.getBoundingClientRect().top < 0) el.scrollIntoView();
  }, [step]);

  const setEye = (e: Eye, patch: Partial<EyeResult>) => setP((was) => ({ ...was, eyes: { ...was.eyes, [e]: { ...was.eyes[e], ...patch } } }));
  const begin = () => { setP((was) => ({ ...standardMeasured(), ppc: was.ppc, dist: was.dist, gamma: was.gamma, tested: true })); setFresh(null); setStep({ at: "screen" }); };
  const survey = (eye: Eye) => { setStartedAt(Date.now()); setStep({ at: "survey", eye }); };

  function finish(bal: BalanceResult | null) {
    const measured = { ...p, bal };
    setP(measured);
    setError(null);
    setStep({ at: "done" });
    startSaving(async () => {
      const r = await finishOnboarding({ ...measured, seconds });
      if ("error" in r) setError(r.error);
      else setFresh(r.settings);
    });
  }

  const settings = fresh ?? saved;
  const at = stepKey(step);
  const cyanEye = balanceCyanEye(p.eyes.L.va, p.eyes.R.va);

  return (
    <>
      <ol className={css.steps} aria-label={o.stepsLabel}>
        {STEP_KEYS.map((k, i) => (
          <li key={k} aria-current={k === at ? "step" : undefined} data-done={(at && i < STEP_KEYS.indexOf(at)) || (k === "done" && fresh) ? "" : undefined}>
            {o.steps[k][0]}{o.steps[k][1] && <span className={css.time}>{o.steps[k][1]}</span>}
          </li>
        ))}
      </ol>
      <div className="bento">
        <section className={`c span7 ${css.stage}`} ref={stage} tabIndex={-1}>
          {step.at === "intro" && (
            <>
              <h2>{o.intro.title}</h2>
              <p>{o.intro.body}</p>
              <ul className={css.list}>{o.intro.list.map(([lead, rest]) => <li key={lead}><b>{lead}</b> {rest}</li>)}</ul>
              <p className="muted small">{o.intro.ready}</p>
              <button type="button" className="btn btn-g" onClick={begin}>{saved ? o.intro.again : o.intro.start}</button>
            </>
          )}

          {step.at === "screen" && (
            <>
              <h2>{o.screen.title}</h2>
              <div className={css.cal}>
                <CardBar ppc={p.ppc} />
                <div>
                  <p>{o.screen.card[0]}<b>{o.screen.card[1]}</b>{o.screen.card[2]}</p>
                  <label className="field">
                    <span className="lab">{o.screen.bar}</span>
                    <input type="range" min={LIMITS.ppc[0]} max={LIMITS.ppc[1]} step={0.1} value={p.ppc} onChange={(e) => setP({ ...p, ppc: Number(e.target.value) })} />
                  </label>
                  <p>{o.screen.distance}</p>
                  <div className="pills" role="group" aria-label={o.screen.distanceGroup}>
                    {o.screen.distances.map(([cm, label]) => (
                      <button type="button" className="pill" key={cm} aria-pressed={cm === p.dist} onClick={() => setP({ ...p, dist: cm })}>{label}</button>
                    ))}
                  </div>
                  <ScreenFloor screen={p} />
                  <button type="button" className="btn btn-g" onClick={() => survey("L")}>{o.screen.next}</button>
                </div>
              </div>
            </>
          )}

          {"eye" in step && (
            <>
              <div className={css.head}>
                <h2>{step.at === "eyeDone" ? o.eyeDone.title(step.eye, seconds[step.eye]) : o.eyeTitle(step.eye)}</h2>
                {step.at !== "eyeDone" && <Clock from={startedAt} />}
              </div>
              {step.at === "survey" && (
                <>
                  <Cover eye={step.eye} />
                  {o.questions.map((text, i) => (
                    <div className={css.q} key={text}>
                      <span>{text}</span>
                      <span className="pills" role="group" aria-label={o.answer(i + 1)}>
                        {[false, true].map((yes) => (
                          <button
                            type="button" className="pill" key={String(yes)} aria-pressed={p.eyes[step.eye].q[i] === yes}
                            onClick={() => setEye(step.eye, { q: p.eyes[step.eye].q.map((was, n) => (n === i ? yes : was)) as EyeResult["q"] })}
                          >{yes ? o.yes : o.no}</button>
                        ))}
                      </span>
                    </div>
                  ))}
                  <button type="button" className="btn btn-g" onClick={() => setStep({ at: "acuity", eye: step.eye })}>{o.startLetters}</button>
                </>
              )}
              {step.at === "acuity" && (
                <LetterTest kind="acuity" screen={p} onDone={(r) => { setEye(step.eye, { va: r.value, note: r.note }); setStep({ at: "contrast", eye: step.eye }); }} />
              )}
              {step.at === "contrast" && (
                <LetterTest
                  kind="contrast" screen={p}
                  onDone={(r) => { setEye(step.eye, { cs: r.value }); setSeconds({ ...seconds, [step.eye]: elapsed(startedAt) }); setStep({ at: "eyeDone", eye: step.eye }); }}
                />
              )}
              {step.at === "eyeDone" && (
                <>
                  <dl className="kv">
                    <div><dt>{o.eyeDone.smallest}</dt><dd>{acuityText(p.eyes[step.eye])}<small>{p.eyes[step.eye].note === "floor" ? o.eyeDone.smallestFloor : o.eyeDone.smallestAt(p.dist)}</small></dd></div>
                    <div><dt>{o.eyeDone.faintest}</dt><dd>{contrastText(p.eyes[step.eye])}<small>{p.eyes[step.eye].cs >= FAINTEST ? o.eyeDone.faintestFloor : o.eyeDone.faintestHow}</small></dd></div>
                  </dl>
                  {p.eyes[step.eye].q[3] && <p className="notice" data-b="danger">{o.eyeDone.sudden}</p>}
                  <button type="button" className="btn btn-g" onClick={() => (step.eye === "L" ? survey("R") : setStep({ at: "both" }))}>{o.eyeDone.next(step.eye)}</button>
                </>
              )}
            </>
          )}

          {step.at === "both" && (
            <>
              <div className={css.head}><h2>{o.both.title}</h2><span className={css.time}>{o.both.time}</span></div>
              <GlassesOn cyanEye={cyanEye} />
              <BalanceTest gamma={p.gamma} onDone={(x) => finish({ x, cyanEye })} />
              <button type="button" className="btn btn-sm" onClick={() => finish(null)}>{o.both.skip}</button>
            </>
          )}

          {step.at === "done" && !fresh && (error && !saving ? (
            <>
              <p className="notice" data-b="danger" role="alert">{error}</p>
              <button type="button" className="btn btn-d" onClick={() => finish(p.bal)}>{o.done.retry}</button>
            </>
          ) : <p role="status">{o.done.saving}</p>)}

          {step.at === "done" && fresh && (
            <>
              <h2>{o.done.title}</h2>
              {fresh.flags.stop && <p className="notice" data-b="danger">{o.settings.doctorFirst}</p>}
              <p>{fresh.weak ? o.done.weak(fresh.weak, percent(fresh.con)) : o.done.equal}{o.done.everywhere}</p>
              {p.bal && fresh.weak && fresh.weak !== p.bal.cyanEye && <p className="notice" data-b="warn">{o.done.swap(fresh.weak)}</p>}
              {!p.bal && fresh.weak && <p className="muted small">{o.done.skipped(percent(STARTING_CONTRAST))}<Link href="/test/balance/run">{o.done.skippedCta}</Link></p>}
              <ul className={css.list}>{o.done.links.map(([href, name, why]) => <li key={href}><Link href={href}>{name}</Link>: {why}</li>)}</ul>
              <button type="button" className="btn btn-sm" onClick={begin}>{o.intro.again}</button>
            </>
          )}
        </section>

        <section className="c span5">
          <div className="c-head"><h2>{o.settings.title}</h2></div>
          {settings
            ? <Settings d={settings} ppc={fresh ? p.ppc : screen?.ppc} gamma={p.gamma} warn={step.at !== "done"} />
            : <Empty title={o.settings.none.title}><span>{o.settings.none.body}</span></Empty>}
        </section>
      </div>
    </>
  );
}

/** What the smallest letter on this screen measures. Read in the browser only: it depends on the screen's pixel density. */
function ScreenFloor({ screen }: { screen: Screen }) {
  const floor = Math.round(acuityOf(screen, 1, devicePixels()) * 100) / 100;
  return <p className="muted small">{o.screen.measures(screen.ppc, screen.dist, snellen(floor))}{floor > 0.05 && o.screen.further}</p>;
}
