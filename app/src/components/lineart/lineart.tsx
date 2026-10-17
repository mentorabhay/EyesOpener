// Eyes Opener: Line drawings that draw themselves in once: glasses, an eye, a family, a screen, the sun, a clock.
/**
 * Small single-line drawings for the public pages and the app. Strokes take the text colour, so they suit light and
 * dark; only the glasses' lenses carry the two inks. Each path has pathLength 1, so the draw-in is one rule in CSS:
 * components/diagram/motion.tsx marks a drawing below the screen as "pre" and then "in" as it arrives. With no script,
 * for reduced motion, or with motion calm or off, the drawing is simply there.
 * Decorative: hidden from screen readers unless a `label` is given.
 */
import css from "./lineart.module.css";

export const LINE_ART = ["glasses", "eye", "family", "screen", "sun", "clock", "card", "doctor"] as const;
export type LineArtName = (typeof LINE_ART)[number];

const P = ({ d }: { d: string }) => <path d={d} pathLength={1} />;

function Drawing({ name }: { name: LineArtName }) {
  switch (name) {
    case "glasses":
      return (
        <>
          <rect className={css.red} x="14" y="26" width="38" height="26" rx="10" pathLength={1} />
          <rect className={css.cyan} x="68" y="26" width="38" height="26" rx="10" pathLength={1} />
          <P d="M52 34c3-4 13-4 16 0" />
          <P d="M14 32 4 26M106 32l10-6" />
        </>
      );
    case "eye":
      return (
        <>
          <P d="M8 40c14-20 34-28 52-28s38 8 52 28c-14 20-34 28-52 28S22 60 8 40z" />
          <circle cx="60" cy="40" r="16" pathLength={1} />
          <circle className={css.fill} cx="60" cy="40" r="6" pathLength={1} />
          <P d="M66 31a10 10 0 0 1 6 6" />
        </>
      );
    case "family":
      return (
        <>
          <circle cx="32" cy="22" r="9" pathLength={1} />
          <P d="M14 70c0-16 8-28 18-28s18 12 18 28" />
          <circle cx="88" cy="22" r="9" pathLength={1} />
          <P d="M70 70c0-16 8-28 18-28s18 12 18 28" />
          <circle cx="60" cy="38" r="7" pathLength={1} />
          <P d="M47 72c0-12 6-20 13-20s13 8 13 20" />
        </>
      );
    case "screen":
      return (
        <>
          <rect x="22" y="10" width="76" height="48" rx="5" pathLength={1} />
          <P d="M12 70h96l-8-10H20z" />
          <circle className={css.red} cx="50" cy="34" r="8" pathLength={1} />
          <circle className={css.cyan} cx="70" cy="34" r="8" pathLength={1} />
        </>
      );
    case "sun":
      return (
        <>
          <circle cx="60" cy="40" r="15" pathLength={1} />
          <P d="M60 8v10M60 62v10M28 40H18M102 40H92M37 17l7 7M76 56l7 7M83 17l-7 7M44 56l-7 7" />
        </>
      );
    case "clock":
      return (
        <>
          <circle cx="60" cy="40" r="30" pathLength={1} />
          <P d="M60 22v18l12 8" />
          <P d="M60 12v4M60 64v4M32 40h4M84 40h4" />
        </>
      );
    case "card":
      return (
        <>
          <rect x="18" y="12" width="84" height="54" rx="6" pathLength={1} />
          <P d="M18 26h84" />
          <P d="M30 52h26" />
          <P d="M8 74h104M8 70v8M112 70v8" />
        </>
      );
    case "doctor":
      return (
        <>
          <circle cx="44" cy="22" r="10" pathLength={1} />
          <P d="M22 72c0-18 10-30 22-30s22 12 22 30" />
          <P d="M44 46v10" />
          <circle cx="88" cy="40" r="11" pathLength={1} />
          <P d="M77 40h-8M99 40h9" />
          <circle className={css.fill} cx="88" cy="40" r="3.5" pathLength={1} />
        </>
      );
  }
}

/** One drawing. `size` is its height in px; the width follows (3 to 2). */
export function LineArt({ name, size = 64, label, className }: { name: LineArtName; size?: number; label?: string; className?: string }) {
  return (
    <svg
      className={`${css.art}${className ? ` ${className}` : ""}`} viewBox="0 0 120 80" width={size * 1.5} height={size}
      data-lineart={name} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false"
    >
      <Drawing name={name} />
    </svg>
  );
}
