// Eyes Opener: The story pictures of the care companions, drawn as SVG in the app's own colours (direction B).
/**
 * The story pictures of the care companions, drawn as SVG in the app's own colours (direction B).
 * Server-safe: no hooks, no images. Each picture gets its words from the copy file through `label`.
 */
import type { ReactNode } from "react";
import styles from "./care.module.css";

/** The app's gradient, for a fill or a stroke inside one picture. */
export const Grad = ({ id }: { id: string }) => (
  <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stopColor="var(--g1)" /><stop offset="1" stopColor="var(--g2)" />
  </linearGradient>
);

/** The frame every picture shares: sized by its view box, named for screen readers. */
export const Pic = ({ w, h, label, children }: { w: number; h: number; label: string; children: ReactNode }) => (
  <svg className={styles.art} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>{children}</svg>
);

/* ───────────── Sky Spotter ───────────── */

const Cloud = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill="var(--card)" stroke="var(--line-2)" strokeWidth="1.2">
    <path d="M-22 6a9 9 0 0 1 4 -17a13 13 0 0 1 24 -3a10 10 0 0 1 14 10a6 6 0 0 1 -2 10z" />
  </g>
);

/** A wide sky. Ten lights along the ground; `found` of them are on. */
export function Sky({ found, label }: { found: number; label: string }) {
  return (
    <Pic w={348} h={150} label={label}>
      <rect width="348" height="150" fill="var(--sunken)" />
      <circle cx="292" cy="34" r="16" fill="var(--g2)" />
      <Cloud x={70} y={36} /><Cloud x={196} y={26} s={0.75} />
      <path d="M118 62l5 -4l5 4M140 52l4 -3l4 3M236 66l5 -4l5 4" fill="none" stroke="var(--ink-3)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 78l8 -11l8 11l-8 11z" fill="var(--g1)" /><path d="M48 89q-6 10 4 18" fill="none" stroke="var(--ink-4)" strokeWidth="1.2" />
      <path d="M0 112Q60 82 124 104T250 96T348 106V150H0Z" fill="var(--line)" />
      <g fill="var(--line-2)">
        <rect x="150" y="92" width="26" height="22" /><path d="M146 92l17 -10l17 10z" />
        <rect x="186" y="98" width="20" height="16" /><rect x="190" y="90" width="9" height="8" rx="1.5" />
        <rect x="262" y="74" width="5" height="34" /><path d="M258 76l6.5 -12l6.5 12z" />
        <rect x="88" y="100" width="22" height="14" />
      </g>
      {Array.from({ length: 10 }, (_, i) => (
        <circle key={i} cx={30 + i * 32} cy="132" r="7" fill={i < found ? "var(--ring-light)" : "var(--card)"} stroke={i < found ? "none" : "var(--line-2)"} strokeWidth="1.5" />
      ))}
    </Pic>
  );
}

/* ───────────── Blink Garden ───────────── */

/** A plant in a pot: one leaf for each set, up to twelve on the stem, then a flower on top. */
export function Plant({ leaves, label }: { leaves: number; label: string }) {
  const shown = Math.min(12, Math.max(0, leaves)), top = 142 - (shown ? 22 + shown * 9 : 12);
  return (
    <Pic w={220} h={180} label={label}>
      <defs><Grad id="care-plant" /></defs>
      <ellipse cx="110" cy="172" rx="52" ry="5" fill="var(--line)" />
      <path d={`M110 142V${top}`} stroke="var(--ok)" strokeWidth="4" strokeLinecap="round" />
      {shown === 0 && <g fill="var(--ok)"><ellipse cx="103" cy="130" rx="8" ry="3.6" transform="rotate(28 103 130)" /><ellipse cx="117" cy="130" rx="8" ry="3.6" transform="rotate(-28 117 130)" /></g>}
      {Array.from({ length: shown }, (_, i) => {
        const side = i % 2 ? 1 : -1, y = 128 - i * 9, x = 110 + side * 15;
        return <ellipse key={i} cx={x} cy={y} rx="14" ry="6" fill="var(--ok)" transform={`rotate(${side * -24} ${x} ${y})`} />;
      })}
      {leaves >= 12 && <g transform={`translate(110 ${top - 4})`}>{[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx="0" cy="-8" rx="5" ry="8" fill="url(#care-plant)" transform={`rotate(${r})`} />)}<circle r="4.4" fill="var(--g2)" /></g>}
      <path d="M80 142h60l-7 30h-46z" fill="var(--ring-train)" opacity="0.85" />
      <rect x="76" y="138" width="68" height="9" rx="4" fill="var(--ring-train)" />
    </Pic>
  );
}

/* ───────────── Far Window ───────────── */

export function FarView({ label }: { label: string }) {
  return (
    <Pic w={348} h={170} label={label}>
      <rect width="348" height="170" fill="var(--card)" />
      <rect x="26" y="14" width="296" height="132" rx="8" fill="var(--sunken)" stroke="var(--ink-3)" strokeWidth="4" />
      <Cloud x={232} y={50} s={0.9} />
      <path d="M92 58l5 -4l5 4M110 48l4 -3l4 3" fill="none" stroke="var(--ink-3)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 118Q84 84 150 108T262 100T320 110V144H28Z" fill="var(--line)" />
      <g fill="var(--line-2)"><rect x="196" y="100" width="24" height="20" /><path d="M192 100l16 -9l16 9z" /><rect x="228" y="106" width="18" height="14" /><rect x="231" y="99" width="8" height="7" rx="1.5" /></g>
      <rect x="70.4" y="92" width="3.2" height="22" fill="var(--ink-4)" /><circle cx="72" cy="82" r="14" fill="var(--ok)" opacity="0.55" />
      <path d="M174 16v128M28 80h292" stroke="var(--ink-3)" strokeWidth="3" />
      <rect x="16" y="144" width="316" height="10" rx="4" fill="var(--ink-3)" />
    </Pic>
  );
}
