"use client";
import { useState } from "react";
import { measure as t } from "@/copy/test";
import { NEAR_POINT_TRIES } from "@/engine";
import { LIMITS } from "./limits";
import css from "./measure.module.css";

const [LO, HI] = LIMITS.near;
/** A typed try as a number of centimetres, or null when it is empty or outside the range. */
function centimetres(text: string): number | null {
  const v = Number(text.replace(",", "."));
  return text.trim() && Number.isFinite(v) && v >= LO && v <= HI ? Math.round(v * 2) / 2 : null;
}

/** A pen moving toward the bridge of the nose, and the ruler that measures the gap. Seen from the side. */
const Picture = () => (
  <svg className={css.near} viewBox="0 0 320 130" role="img" aria-label={t.near.picture}>
    <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {/* head in profile, looking right */}
      <path d="M70 22c-30 0-46 20-46 46 0 20 10 34 24 40v14h34v-12c8 0 14-3 14-10v-12l10-4-10-16c0-28-8-46-26-46z" />
      <path d="M76 58h9" />
      {/* the pen, held upright at eye level */}
      <path d="M236 30v62" strokeWidth="5" />
      {/* the way it moves */}
      <path d="M218 44H150m0 0 9-6m-9 6 9 6" strokeDasharray="1 7" />
      {/* the ruler from the bridge of the nose to the pen */}
      <path d="M100 96h136v16H100z" />
      <path d="M117 96v7m17-7v10m17-10v7m17-7v10m17-10v7m17-7v10m17-10v7" strokeWidth="1.5" />
    </g>
    <circle cx="84" cy="58" r="3.5" fill="currentColor" />
    <circle cx="236" cy="58" r="6" fill="var(--g1)" />
  </svg>
);

/** The near point, measured away from the screen with a ruler. `onDone` gets the three tries in centimetres. */
export function NearPointTest({ young, onDone }: { young: boolean; onDone: (tries: number[]) => void }) {
  const [typed, setTyped] = useState<string[]>(() => Array<string>(NEAR_POINT_TRIES).fill(""));
  const tries = typed.map(centimetres);
  const ready = tries.every((v) => v !== null);

  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); if (ready) onDone(tries as number[]); }}>
      <p className="notice" data-b={young ? "warn" : undefined}>{t.near.helper}{young && ` ${t.near.grownUp}`}</p>
      <Picture />
      <ol className={css.steps}>{t.near.steps.map((s) => <li key={s}>{s}</li>)}</ol>
      <div className={css.tries}>
        {typed.map((text, i) => (
          <div className="field" key={i}>
            <label htmlFor={`near-${i}`}>{t.near.tryLabel(i + 1)}</label>
            <input
              id={`near-${i}`} type="number" inputMode="decimal" min={LO} max={HI} step={0.5} value={text} required
              aria-invalid={text !== "" && tries[i] === null}
              onChange={(e) => setTyped(typed.map((was, n) => (n === i ? e.target.value : was)))}
            />
          </div>
        ))}
      </div>
      <p className="muted small">{t.near.range(LO, HI)} {t.near.toNose}</p>
      <button type="submit" className="btn btn-g" disabled={!ready}>{t.near.save}</button>
    </form>
  );
}
