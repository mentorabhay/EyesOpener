// Eyes Opener: Which eye to cover while `eye` is tested. Drawn as a mirror: the member's left is on the left. .
import { measure as t } from "@/copy/test";
import { lensFilter, type Eye } from "@/engine";
import css from "./measure.module.css";

/** Which eye to cover while `eye` is tested. Drawn as a mirror: the member's left is on the left. */
export function Cover({ eye }: { eye: Eye }) {
  const open = eye === "L" ? 34 : 62, covered = eye === "L" ? 62 : 34;
  const words = t.cover(eye);
  return (
    <div className={css.cover}>
      <svg viewBox="0 0 96 80" aria-hidden="true">
        <circle cx="48" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <circle cx={open} cy="36" r="6" fill="currentColor" />
        <rect x={covered - 15} y="22" width="30" height="28" rx="9" fill="var(--g2)" />
        <path d="M37 60q11 7 22 0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <p><b>{words.lead}</b>{words.rest}</p>
    </div>
  );
}

/** Which way round the red-cyan glasses go. Drawn as a mirror, like the cover picture. */
export function GlassesOn({ cyanEye }: { cyanEye: Eye }) {
  const words = t.glasses(cyanEye);
  return (
    <div className={css.cover}>
      <svg viewBox="0 0 96 56" aria-hidden="true">
        <rect width="96" height="56" rx="8" fill="var(--scene)" />
        <circle cx="30" cy="28" r="15" fill={lensFilter(cyanEye === "L" ? "weak" : "strong")} />
        <circle cx="66" cy="28" r="15" fill={lensFilter(cyanEye === "L" ? "strong" : "weak")} />
        <path d="M45 28h6" fill="none" stroke="var(--shared)" strokeWidth="2.5" />
      </svg>
      <p>{words.before}<b>{words.lead}</b>{words.after}</p>
    </div>
  );
}
