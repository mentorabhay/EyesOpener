"use client";
/**
 * The fourth step: the inks tuned for one pair of glasses (src/engine/tune.ts), as a mixer. One lens at a time, the
 * grown-up looks at shapes in the other eye's ink and moves sliders until those shapes are gone, or as faint as they get.
 *  - Red lens: the cyan ink's green and blue, 0 to 255 each, with its colour code (#00GGBB). Red is locked at 0.
 *  - Cyan lens: the red ink's ceiling in games and films, with its code (#RR0000). Green and blue are locked at 0.
 * A cyan mix that leaves the weaker eye under half its light cannot be saved (TUNE.minLight): a leak is never hidden by
 * starving the eye that is training. Nothing moves by itself and nothing flashes. The server checks every value again.
 */
import { useCallback, useId, useState, type ReactNode } from "react";
import { TrueSize, useDraw, type Draw } from "@/components/measure/canvas";
import { screen as c } from "@/copy/screen";
import { SCENE_FIELD, TUNE, channelOf, lightOfChannel, mixKeepsEnough, parseCyanCode, parseRedCode, weakLight, type InkTune } from "@/engine";
import { Lenses } from "./lenses";
import css from "./screen.module.css";

const t = c.tune;
/** Below this share of its light, the readout says the loss is clear and the balance check-up is needed again. */
const CLEAR_LOSS = 0.75;

/** Three plain shapes on the black field, in one ink: a disc, a square and a ring, spread across the scene. */
export const shapes = (fill: string): Draw => (g, w, h) => {
  const s = Math.round(Math.min(h * 0.4, w * 0.18)), y = Math.round(h / 2);
  g.fillStyle = SCENE_FIELD;
  g.fillRect(0, 0, w, h);
  g.fillStyle = fill;
  g.strokeStyle = fill;
  g.beginPath(); g.arc(w * 0.22, y, s / 2, 0, 6.2832); g.fill();
  g.fillRect(Math.round(w * 0.5 - s / 2), Math.round(y - s / 2), s, s);
  g.lineWidth = Math.max(4, s * 0.16);
  g.beginPath(); g.arc(w * 0.78, y, s / 2 - g.lineWidth / 2, 0, 6.2832); g.stroke();
};

function Scene({ fill, label }: { fill: string; label: string }) {
  const draw = useCallback<Draw>((g, w, h) => shapes(fill)(g, w, h), [fill]);
  return <TrueSize><canvas ref={useDraw(draw)} className="chart dark" role="img" aria-label={label} /></TrueSize>;
}

function Slider({ label, value, min, onChange }: { label: string; value: number; min: number; onChange: (v: number) => void }) {
  const id = useId();
  return (
    <div className={css.slider}>
      <div className={css.sliderHead}><label htmlFor={id}>{label}</label><span className="tnum">{value}</span></div>
      <input id={id} type="range" min={min} max={255} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function Code({ value, onValid, parse, help }: { value: string; onValid: (code: string) => void; parse: (code: string) => { ok: true } | { ok: false; why: "red" | "other" | "form" }; help: string }) {
  const id = useId(), helpId = useId();
  /* the box keeps what is typed; a code that parses is applied at once, one that does not says why once it is six digits long */
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? value;
  const checked = draft !== null && draft.replace("#", "").length >= 6 ? parse(draft) : null;
  return (
    <div className={css.code}>
      <label htmlFor={id}>{t.code}</label>
      <input
        id={id} type="text" spellCheck={false} autoComplete="off" value={shown} aria-describedby={helpId} aria-invalid={checked?.ok === false}
        onChange={(e) => { const v = e.target.value; const r = parse(v); if (r.ok) { onValid(v); setDraft(null); } else setDraft(v); }}
        onBlur={() => setDraft(null)}
      />
      {checked && !checked.ok ? <p id={helpId} className="small" role="alert" data-b="warn">{t.codeBad[checked.why]}</p> : <p id={helpId} className="muted small">{help}</p>}
    </div>
  );
}

const hex2 = (n: number) => n.toString(16).toUpperCase().padStart(2, "0");
const hexChannels = (code: string) => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(code.trim());
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
};

/** Both lenses on one page. `onSave` gets the mix and the ceiling as shares of light; `skip` is the flow's own skip button. */
export function TuneStep({ gamma, tune, onSave, skip }: { gamma: number; tune: InkTune; onSave: (tune: InkTune) => void; skip: ReactNode }) {
  /* the sliders work in screen values, 0 to 255, as a colour picker does; what is saved is light, worked out with gamma */
  const [g, setG] = useState(() => channelOf(tune.green, gamma));
  const [b, setB] = useState(() => channelOf(tune.blue, gamma));
  const redMin = channelOf(TUNE.redTop[0], gamma);
  const [r, setR] = useState(() => Math.max(redMin, channelOf(tune.redTop, gamma)));
  const green = lightOfChannel(g, gamma), blue = lightOfChannel(b, gamma), redTop = Math.max(TUNE.redTop[0], lightOfChannel(r, gamma));
  const kept = weakLight(green, blue), enough = mixKeepsEnough(green, blue);
  const means = !enough ? t.keptMeans.floor(TUNE.minLight) : kept >= 0.995 ? t.keptMeans.full : kept >= CLEAR_LOSS ? t.keptMeans.small : t.keptMeans.clear;
  const preset = (mix: { green: number; blue: number }) => { setG(channelOf(mix.green, gamma)); setB(channelOf(mix.blue, gamma)); };

  return (
    <>
      <div className={css.head}><h2>{t.title}</h2></div>
      <p>{t.why}</p>

      <div className={css.mixer}>
        <div className={css.lens}>
          <Lenses look="red" label={t.lens.red.picture} />
          <div><b>{t.lens.red.head}</b><span className="muted small">{t.lens.red.todo}</span></div>
        </div>
        <Scene fill={`rgb(0 ${g} ${b})`} label={t.lens.red.scene} />
        <Slider label={t.green} value={g} min={0} onChange={setG} />
        <Slider label={t.blue} value={b} min={0} onChange={setB} />
        <Code
          value={`#00${hex2(g)}${hex2(b)}`} help={t.codeHelpCyan} parse={(v) => parseCyanCode(v, gamma)}
          onValid={(v) => { const ch = hexChannels(v); if (ch) { setG(ch[1]); setB(ch[2]); } }}
        />
        <div className="row" role="group" aria-label={t.presetsLabel}>
          <button type="button" className="btn btn-sm" onClick={() => preset({ green: 1, blue: 1 })}>{t.presets.usual}</button>
          <button type="button" className="btn btn-sm" onClick={() => preset({ green: 1, blue: 0 })}>{t.presets.lessBlue}</button>
          <button type="button" className="btn btn-sm" onClick={() => preset({ green: 0.5, blue: 1 })}>{t.presets.lessGreen}</button>
        </div>
        <div className={css.readout} data-b={!enough ? "danger" : kept >= CLEAR_LOSS ? "ok" : "warn"} role="status">
          <span className="muted small">{t.kept}</span>
          <b className="tnum">{c.pct(kept)}</b>
          <span className="small">{means}</span>
        </div>
      </div>

      <div className={css.mixer}>
        <div className={css.lens}>
          <Lenses look="cyan" label={t.lens.cyan.picture} />
          <div><b>{t.lens.cyan.head}</b><span className="muted small">{t.lens.cyan.todo}</span></div>
        </div>
        <Scene fill={`rgb(${r} 0 0)`} label={t.lens.cyan.scene} />
        <Slider label={t.red} value={r} min={redMin} onChange={setR} />
        <Code
          value={`#${hex2(r)}0000`} help={t.codeHelpRed} parse={(v) => parseRedCode(v, gamma)}
          onValid={(v) => { const ch = hexChannels(v); if (ch) setR(Math.max(redMin, ch[0])); }}
        />
        <p className="small">{t.redMeans(redTop)}</p>
      </div>

      <div className={css.more}>
        <button type="button" className="btn btn-g" disabled={!enough} onClick={() => onSave({ green, blue, redTop })}>{t.save}</button>
        <button type="button" className="btn btn-sm" onClick={() => { preset({ green: 1, blue: 1 }); setR(255); }}>{t.reset}</button>
        {skip}
      </div>
      <p className="muted small">{t.keys}</p>
    </>
  );
}
