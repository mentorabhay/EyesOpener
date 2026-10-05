import type { CSSProperties } from "react";
import { lanterns } from "@/lib/lights-on";
import css from "./lights-on.module.css";

/**
 * The sky of Lights On Hour: one lantern for each household practising in the hour. Server-safe, no script.
 * It is a picture and one sentence (`label`); the number itself is written in words beside it.
 * Nothing flashes: a lantern rises once, slowly, then sways a little. With reduced motion it simply stands.
 */
export function Sky({ others, own, festival, waiting, label }: {
  /** Lanterns of other households to draw. 0 when there are too few to show. */
  others: number;
  /** Draw the member's own household's lantern, ringed. */
  own: boolean;
  festival: boolean;
  /** The hour has not started: a dark sky with one unlit lantern on the ground. */
  waiting: boolean;
  label: string;
}) {
  const drawn = waiting ? [] : lanterns(others);
  return (
    <div className={css.sky} role="img" aria-label={label} data-festival={festival ? "" : undefined} data-waiting={waiting ? "" : undefined}>
      <div className={css.stars} aria-hidden="true" />
      {festival && (
        <svg className={css.garland} viewBox="0 0 400 34" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 4 Q50 30 100 6 T200 6 T300 6 T400 4" fill="none" stroke="#5b6170" strokeWidth="1" />
          {Array.from({ length: 16 }, (_, i) => {
            const x = 12.5 + i * 25, t = (x % 100) / 100, y = 6 + Math.sin(t * Math.PI) * 11.5;
            return <circle key={i} cx={x} cy={y + 3} r="3.2" data-c={i % 3} />;
          })}
        </svg>
      )}
      {drawn.map((l, i) => (
        <span key={i} className={css.lantern} style={{ "--x": `${l.x}%`, "--y": `${l.y}%`, "--s": l.size, "--d": `${l.delay}s` } as CSSProperties} data-c={festival ? i % 3 : 0}>
          <Lantern />
        </span>
      ))}
      {own && !waiting && (
        <span className={`${css.lantern} ${css.own}`} style={{ "--x": "46%", "--y": "62%", "--s": 1.35, "--d": "0s" } as CSSProperties} data-c="0">
          <Lantern />
        </span>
      )}
      {waiting && <span className={`${css.lantern} ${css.unlit}`} style={{ "--x": "46%", "--y": "70%", "--s": 1.35, "--d": "0s" } as CSSProperties}><Lantern /></span>}
      <div className={css.ground} aria-hidden="true" />
    </div>
  );
}

/** One paper lantern: a rounded body, a rim, and the small flame that carries it. Colours come from the style sheet. */
function Lantern() {
  return (
    <svg viewBox="0 0 40 56" aria-hidden="true">
      <ellipse className="glow" cx="20" cy="26" rx="19" ry="24" />
      <path className="body" d="M8 8 Q20 0 32 8 L35 36 Q20 46 5 36 Z" />
      <path className="rim" d="M5 36 Q20 46 35 36 L33 41 Q20 49 7 41 Z" />
      <ellipse className="flame" cx="20" cy="33" rx="4.5" ry="6.5" />
    </svg>
  );
}
