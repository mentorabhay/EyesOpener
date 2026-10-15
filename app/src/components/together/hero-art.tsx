/**
 * Draw Your Hero: a hero's shape as a picture. Server-safe: no hooks, no browser APIs.
 * A hero is always shown the way a game draws it: weaker-eye ink on the black field of a `.scene`.
 */
import type { Sprite } from "@/games/hero";

/** The shape as one SVG path, a cell being one unit. */
export const heroPath = (s: Sprite) =>
  s.rows.map((row, y) => { let d = ""; for (let i = 0; i < row.length; i += 2) d += `M${row[i]} ${y}h${row[i + 1]}v1h-${row[i + 1]}z`; return d; }).join("");

/** A hero alone on the black field. The wrapper gives the size; the hero keeps its own proportions inside it. */
export function HeroShape({ sprite, label }: { sprite: Sprite; label: string }) {
  return (
    <svg viewBox={`-4 -4 ${sprite.w + 8} ${sprite.h + 8}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <path d={heroPath(sprite)} fill="var(--weak)" />
    </svg>
  );
}

/**
 * The hero where it plays: a still of the runner game's street, drawn in the three inks.
 * The hero and the coin are weaker-eye ink, the crate is stronger-eye ink at the member's own contrast, the street is for both eyes.
 * Pass null for a profile with no hero.
 */
export function HeroInGame({ sprite, label }: { sprite: Sprite | null; label: string }) {
  /* With no hero yet, a dashed outline marks where it will stand. */
  const tall = 96, cell = sprite ? tall / Math.max(sprite.w, sprite.h) : 1, w = sprite ? sprite.w * cell : 56, h = sprite ? sprite.h * cell : tall, x = 96 - w / 2, ground = 150;
  const lx = 96 + w / 2 + 16, ly = ground - h * 0.62;
  return (
    <svg viewBox="0 0 320 180" role="img" aria-label={label}>
      <g fill="none" stroke="var(--shared)" strokeLinecap="round">
        <rect x="5" y="5" width="310" height="170" rx="6" strokeWidth="2" />
        <path d={`M12 ${ground}H308`} strokeWidth="2.5" />
        <path d="M12 26Q90 52 160 30T308 26" strokeWidth="1.2" opacity=".5" />
        {[62, 124, 186, 248].map((cx) => <path key={cx} d={`M${cx} ${ground + 7}l-6 6`} strokeWidth="1.5" />)}
      </g>
      <g fill="var(--strong)">
        <rect x="232" y={ground - 34} width="38" height="34" fill="none" stroke="var(--strong)" strokeWidth="5" />
        <rect x="243" y={ground - 23} width="16" height="12" />
      </g>
      <g fill="var(--weak)" stroke="var(--weak)">
        <ellipse cx="172" cy="56" rx="13" ry="15" stroke="none" />
        <path d={`M${96 + w / 2 - 6} ${ly}H${lx}V${ly + 10}`} fill="none" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={lx} cy={ly + 19} r="8" fill="none" strokeWidth="3" />
        <circle cx={lx} cy={ly + 19} r="4" stroke="none" />
        {sprite
          ? <path d={heroPath(sprite)} transform={`translate(${x} ${ground - h}) scale(${cell})`} stroke="none" shapeRendering="crispEdges" />
          : <rect x={x} y={ground - h} width={w} height={h - 3} rx="10" fill="none" strokeWidth="2.5" strokeDasharray="7 7" />}
      </g>
    </svg>
  );
}
