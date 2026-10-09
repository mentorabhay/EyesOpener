"use client";
/**
 * The three colour checks of a screen, each one a pair of matches a grown-up makes by eye:
 * the brightness curve (gamma), the colour leak of each lens, and the ink balance; and the fourth step, which tunes
 * the inks for the glasses, one setting for each lens (tune.tsx, src/engine/tune.ts).
 * The browser keeps only what was matched; the values are worked out and saved on the server.
 * A home estimate, not a light meter: src/engine/calibrate.ts says what each number is worth.
 */
import { useEffect, useRef, useState, useTransition, type KeyboardEvent, type ReactNode } from "react";
import { devicePixels } from "@/components/measure/canvas";
import type { Draw } from "@/components/measure/canvas";
import { screen as t } from "@/copy/screen";
import { CAL, LEAK_FAINT, LEAK_SUSPECT, SCENE_FIELD, SHARED_INK, balanceContrasts, cyanCode, leakFromMatches, strongInk, weakInk, weakLight, type InkTune, type LensMatch } from "@/engine";
import type { Step } from "@/lib/screen-rules";
import { Confirm } from "../confirm";
import { forgetScreenStep, saveScreenStep, type StepSaved } from "./actions";
import { Lenses } from "./lenses";
import { Match } from "./match";
import { TuneStep } from "./tune";
import css from "./screen.module.css";

type Lens = "red" | "cyan";
type Refusal = Extract<StepSaved, { ok: false }>;
type At =
  | { at: "home" }
  | { at: "gamma"; greys: number[] }
  | { at: "leak"; lens: Lens; levels: number[]; red?: LensMatch }
  | { at: "ink"; xs: number[]; turned: boolean | null }
  | { at: "tune" }
  | { at: "saving" }
  | { at: "result"; saved: Extract<StepSaved, { ok: true }> }
  | { at: "refused"; step: Step; refusal: Refusal; red?: LensMatch };

/* the list keeps the three checks first and the tuning fourth; walking through all of them tunes the inks right after
   the brightness curve, so the leak and the ink balance are then matched with the inks as they will be drawn */
const LIST: Step[] = ["gamma", "leak", "ink", "tune"];
const ORDER: Step[] = ["gamma", "tune", "leak", "ink"];
const begin = (step: Step, red?: LensMatch): At =>
  step === "gamma" ? { at: "gamma", greys: [] } : step === "leak" ? { at: "leak", lens: red ? "cyan" : "red", levels: [], red } : step === "tune" ? { at: "tune" } : { at: "ink", xs: [], turned: null };

export { Lenses };

/* where each match starts: the first clearly on one side, the second clearly on the other side of the first answer */
export const GREY_START = 150, GREY_OVER = 25, LEVEL_OVER = 45, INK_OVER = 0.4, INK_STEP = 0.02;
const clamp = (v: number, [lo, hi]: readonly [number, number]) => Math.max(lo, Math.min(hi, v));

/** Fine lines, one device pixel white and one black in turn, beside a plain grey. */
export const stripes = (grey: number): Draw => (g, w, h) => {
  const half = Math.floor(w / 2);
  g.fillStyle = "#000";
  g.fillRect(0, 0, half, h);
  g.fillStyle = "#fff";
  for (let y = 0; y < h; y += 2) g.fillRect(0, y, half, 1);
  g.fillStyle = `rgb(${grey} ${grey} ${grey})`;
  g.fillRect(half, 0, w - half, h);
};

/** Two squares that touch on the black field: the wrong ink at full on the left, the lens's own ink at `level` on the right. */
export const squares = (lens: Lens) => (level: number): Draw => (g, w, h) => {
  const s = Math.round(Math.min(h * 0.72, w * 0.42)), x = Math.round(w / 2), y = Math.round((h - s) / 2);
  g.fillStyle = SCENE_FIELD;
  g.fillRect(0, 0, w, h);
  g.fillStyle = lens === "red" ? weakInk(1) : strongInk(1);
  g.fillRect(x - s, y, s, s);
  g.fillStyle = lens === "red" ? `rgb(${level} 0 0)` : `rgb(0 ${level} ${level})`;
  g.fillRect(x, y, s, s);
};

/** A red square for one eye and a cyan square for the other, apart, inside the white frame both eyes see. */
export const pair = (gamma: number) => (x: number): Draw => (g, w, h) => {
  const k = devicePixels(), s = Math.round(Math.min(h * 0.5, w * 0.26)), y = Math.round((h - s) / 2), con = balanceContrasts(x);
  g.fillStyle = SCENE_FIELD;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = SHARED_INK;
  g.lineWidth = 3 * k;
  g.strokeRect(8 * k, 8 * k, w - 16 * k, h - 16 * k);
  g.fillStyle = strongInk(con.red, gamma);
  g.fillRect(Math.round(w * 0.3 - s / 2), y, s, s);
  g.fillStyle = weakInk(con.cyan, gamma);
  g.fillRect(Math.round(w * 0.7 - s / 2), y, s, s);
};

const Todo = ({ lines }: { lines: string[] }) => <ol className={css.list}>{lines.map((l) => <li key={l}>{l}</li>)}</ol>;

interface Props {
  /** A guardian or co-guardian, not in child mode. Anyone else sees the list and nothing to press. */
  canMeasure: boolean;
  /** The gamma in use on this screen now, and the viewing distance in centimetres. */
  gamma: number;
  dist: number;
  /** For each check: when it was measured, in words, or null while the usual value is in use. */
  measured: Record<Step, string | null>;
  /** The inks' tuning now: the cyan ink's green and blue shares and the red ink's ceiling (all 1 when not tuned). */
  tune: InkTune;
}

export function Flow({ canMeasure, gamma, dist, measured, tune }: Props) {
  const [at, setAt] = useState<At>({ at: "home" });
  /* "Measure all three" walks through the checks in order; one check on its own comes back to the list */
  const [tour, setTour] = useState(false);
  const [, startSaving] = useTransition();
  const stage = useRef<HTMLElement>(null), first = useRef(true);

  /* each new step starts at the top of the stage, for the keyboard and for small screens */
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const el = stage.current!;
    if (!el.contains(document.activeElement)) el.focus({ preventScroll: true });
    if (el.getBoundingClientRect().top < 0) el.scrollIntoView();
  }, [at]);

  const start = (step: Step, all: boolean) => { setTour(all); setAt(begin(step)); };
  const after = (step: Step) => { const next = tour ? ORDER[ORDER.indexOf(step) + 1] : undefined; setAt(next ? begin(next) : { at: "home" }); };

  function send(step: Step, input: Parameters<typeof saveScreenStep>[0], red?: LensMatch) {
    setAt({ at: "saving" });
    startSaving(async () => {
      const saved = await saveScreenStep(input).catch((): Refusal => ({ ok: false, why: "failed" }));
      setAt(saved.ok ? { at: "result", saved } : { at: "refused", step, refusal: saved, red });
    });
  }

  /* Up and down walk through the buttons of the step, for a remote that has no Tab key. Left and right belong to the match. */
  const walk = (e: KeyboardEvent<HTMLElement>) => {
    if ((e.key !== "ArrowUp" && e.key !== "ArrowDown") || e.altKey || e.ctrlKey || e.metaKey) return;
    const stops = [...e.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], summary")];
    if (!stops.length) return;
    const here = stops.indexOf(document.activeElement as HTMLElement), down = e.key === "ArrowDown";
    e.preventDefault();
    stops[here < 0 ? (down ? 0 : stops.length - 1) : (here + (down ? 1 : stops.length - 1)) % stops.length].focus();
  };

  const skip = (step: Step) => <button type="button" className="btn btn-sm" onClick={() => after(step)}>{measured[step] ? t.match.skipKept : t.match.skip}</button>;
  const head = (title: string, n?: number) => <div className={css.head}><h2>{title}</h2>{n !== undefined && <span className={css.nth}>{t.match.nth(n + 1)}</span>}</div>;

  let body: ReactNode = null;

  if (at.at === "home") {
    body = (
      <>
        <h2>{t.home.title}</h2>
        <p>{t.home.body}</p>
        <div>
          {LIST.map((step, n) => (
            <div className={css.check} key={step}>
              <div className={css.top}>
                <b>{n + 1}. {t.steps[step].name}</b>
                {measured[step] ? <span className="chip" data-b="ok">{measured[step]}</span> : <span className={css.hatch}><span>{step === "tune" ? t.home.usualTune : t.home.usual}</span></span>}
              </div>
              <p className="muted small">{t.steps[step].what} {t.steps[step].glasses}.</p>
              {canMeasure && (
                <div className={css.acts}>
                  <button type="button" className="btn btn-sm" onClick={() => start(step, false)}>{measured[step] ? (step === "tune" ? t.home.again2 : t.home.again) : t.home.one}</button>
                  {measured[step] && (
                    <Confirm ask={t.home.forget.ask} warn={t.home.forget.warn}>
                      <form action={forgetScreenStep}><input type="hidden" name="step" value={step} /><button className="btn btn-sm btn-d">{t.home.forget.yes}</button></form>
                    </Confirm>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        {canMeasure ? (
          <>
            <h3>{t.home.readyTitle}</h3>
            <ul className={css.list}>{t.home.ready(dist).map((l) => <li key={l}>{l}</li>)}</ul>
            <div className="row"><button type="button" className="btn btn-g" onClick={() => start("gamma", true)}>{t.home.all}</button><span className="muted small">{t.home.allTime}</span></div>
          </>
        ) : <p className="notice">{t.lookOnly}</p>}
      </>
    );
  }

  if (at.at === "gamma") {
    const n = at.greys.length;
    body = (
      <>
        {head(t.gamma.title, n)}
        {n === 0 ? <><p>{t.gamma.why}</p><Todo lines={t.gamma.todo} /></> : <p>{t.gamma.second}</p>}
        <Match
          key={n} draw={stripes} label={t.gamma.scene} sharp min={CAL.grey[0]} max={CAL.grey[1]} step={1} left={1}
          start={n === 0 ? GREY_START : at.greys[0] + GREY_OVER}
          onDone={(grey) => (n === 0 ? setAt({ at: "gamma", greys: [grey] }) : send("gamma", { step: "gamma", greys: [at.greys[0], grey] }))}
        >{skip("gamma")}</Match>
      </>
    );
  }

  if (at.at === "leak") {
    const { lens, levels, red } = at, n = levels.length, words = t.leak.lens[lens];
    /* one lens is finished: the red lens is checked at once, so a poor match is made again before the cyan lens starts */
    const done = (match: LensMatch) => {
      if (lens === "cyan") return send("leak", { step: "leak", red: red!, cyan: match }, red);
      const check = leakFromMatches(match, gamma);
      setAt(check.ok ? { at: "leak", lens: "cyan", levels: [], red: match } : { at: "refused", step: "leak", refusal: { ok: false, why: check.why, lens: "red" } });
    };
    body = (
      <>
        {head(t.leak.title, n)}
        {lens === "red" && n === 0 && <p>{t.leak.why}</p>}
        <div className={css.lens}>
          <Lenses look={lens} label={words.picture} />
          <div><b>{words.head}</b>{n === 0 ? <span className="muted small">{t.leak.who}</span> : <span>{t.leak.second}</span>}</div>
        </div>
        {n === 0 && <Todo lines={words.todo} />}
        <Match
          key={`${lens}${n}`} draw={squares(lens)} label={words.scene} dark min={CAL.level[0]} max={CAL.level[1]} step={1} left={1}
          start={n === 0 ? 0 : levels[0] + LEVEL_OVER}
          onDone={(level) => (n === 0 ? setAt({ at: "leak", lens, levels: [level], red }) : done([levels[0], level]))}
        >
          <button type="button" className="btn btn-sm" onClick={() => done("unseen")}>{t.leak.unseen}</button>
          {skip("leak")}
        </Match>
      </>
    );
  }

  if (at.at === "ink") {
    const { xs, turned } = at, n = xs.length;
    body = n === 1 && turned === null ? (
      <>
        {head(t.ink.title)}
        <div className={css.lens}>
          <Lenses look="both" turned label={t.ink.picture.turned} />
          <div><b>{t.ink.turn.title}</b><span>{t.ink.turn.body}</span></div>
        </div>
        <div className={css.more}>
          <button type="button" className="btn btn-g" autoFocus onClick={() => setAt({ at: "ink", xs, turned: true })}>{t.ink.turn.turned}</button>
          <button type="button" className="btn" onClick={() => setAt({ at: "ink", xs, turned: false })}>{t.ink.turn.cannot}</button>
        </div>
      </>
    ) : (
      <>
        {head(t.ink.title, n)}
        {n === 0 ? <><p>{t.ink.why}</p><p className="notice">{t.ink.who}</p></> : <p>{turned ? t.ink.second.turned : t.ink.second.same}</p>}
        <div className={css.lens}>
          <Lenses look="both" turned={n === 1 && !!turned} label={n === 1 && turned ? t.ink.picture.turned : t.ink.picture.first} />
          {n === 0 && <div><Todo lines={t.ink.todo} /></div>}
        </div>
        <Match
          key={n} draw={pair(gamma)} label={t.ink.scene} dark min={CAL.inkSet[0]} max={CAL.inkSet[1]} step={INK_STEP} left={-1}
          start={n === 0 ? 0 : clamp(xs[0] + INK_OVER, CAL.inkSet)}
          onDone={(x) => (n === 0 ? setAt({ at: "ink", xs: [x], turned: null }) : send("ink", { step: "ink", xs: [xs[0], x], turned: !!turned }))}
        >{skip("ink")}</Match>
      </>
    );
  }

  if (at.at === "tune") {
    body = <TuneStep gamma={gamma} tune={tune} skip={skip("tune")} onSave={(next) => send("tune", { step: "tune", ...next })} />;
  }

  if (at.at === "saving") body = <p role="status">{t.match.saving}</p>;

  if (at.at === "refused") {
    const { step, refusal, red } = at;
    const again = refusal.why === "apart" || refusal.why === "range" || refusal.why === "failed";
    body = (
      <>
        {head(t[step].title)}
        <p className="notice" data-b="warn" role="alert">
          {t.refused[refusal.why]}{refusal.lens && ` ${t.leak.refusedLens[refusal.lens]}`}{step === "gamma" && refusal.why === "range" && ` ${t.gamma.range}`}
        </p>
        <div className={css.more}>
          {/* a refused cyan lens is matched again on its own: the red lens's matches are kept */}
          {again && canMeasure && <button type="button" className="btn btn-g" autoFocus onClick={() => setAt(begin(step, refusal.lens === "cyan" ? red : undefined))}>{t.match.retry}</button>}
          {skip(step)}
        </div>
      </>
    );
  }

  if (at.at === "result") {
    const s = at.saved, next = tour ? ORDER[ORDER.indexOf(s.step) + 1] : undefined;
    body = (
      <>
        {head(t[s.step].title)}
        {s.step === "gamma" && (
          <>
            <p><b>{t.gamma.result(s.gamma)}</b> {t.gamma.spread(s.spread)}</p>
            <p>{Math.abs(s.gamma - 2.2) < 0.05 ? t.gamma.means.usual : s.gamma > 2.2 ? t.gamma.means.steeper : t.gamma.means.flatter}</p>
          </>
        )}
        {s.step === "leak" && (
          <>
            <p><b>{t.leak.result.red(s.red)}</b></p>
            <p><b>{t.leak.result.cyan(s.cyan)}</b></p>
            {Math.max(s.red, s.cyan) >= LEAK_SUSPECT && <p className="notice" data-b="warn">{t.leak.suspect}</p>}
            <p className={s.worst === "high" ? "notice" : undefined} data-b={s.worst === "high" ? "danger" : undefined}>{t.leak.means[s.worst ?? (Math.max(s.red, s.cyan) >= LEAK_FAINT ? "ghost" : "clean")]}</p>
            <p className="muted small">{t.leak.compare}</p>
          </>
        )}
        {s.step === "tune" && (
          <>
            <p><b>{t.tune.result.cyan(cyanCode(s, gamma), weakLight(s.green, s.blue))}</b></p>
            <p><b>{t.tune.result.red(s.redTop)}</b></p>
            {(s.green < 1 || s.blue < 1 || s.redTop < 1) && <p className="notice">{t.tune.after}</p>}
          </>
        )}
        {s.step === "ink" && (
          <>
            <p><b>{t.ink.result(s.ink)}</b></p>
            <p>{t.ink.means}</p>
            {!s.turned && <p className="notice">{t.ink.notTurned}</p>}
            <p className="muted small">{t.ink.compare}</p>
          </>
        )}
        <div className={css.more}>
          <button type="button" className="btn btn-g" autoFocus onClick={() => after(s.step)}>{next ? t.match.next(t.steps[next].name) : t.match.done}</button>
        </div>
      </>
    );
  }

  return (
    <section className={`c span7 ${css.stage}`} ref={stage} tabIndex={-1} onKeyDown={walk}>
      {body}
      {at.at !== "home" && at.at !== "saving" && at.at !== "result" && <button type="button" className="btn btn-gh btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setAt({ at: "home" })}>{t.match.back}</button>}
    </section>
  );
}
