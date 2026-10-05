/**
 * Locked Gallery: the drawings that are not check-up pictures. Server-safe: no hooks, no browser APIs.
 * Everything is drawn here, by code, in the three colours of a scene on its black field. The red is plain red and
 * not the member's own setting: these are pictures to look at, not therapy scenes.
 */
import type { ReactNode } from "react";
import type { ShapeKey } from "@/lib/gallery";
import { SHAPES, runsPath, shapeRuns } from "@/lib/gallery-art";

const W = "#ffffff", C = "#00ffff", R = "#ff0000";
const line = { fill: "none", strokeLinecap: "round", strokeLinejoin: "round" } as const;

const paths = new Map<ShapeKey, string>();
/** The clear picture of a shape, shown once its gallery picture is reached. */
export function ShapeArt({ shape, label }: { shape: ShapeKey; label: string }) {
  let d = paths.get(shape);
  if (!d) paths.set(shape, (d = runsPath(shapeRuns(SHAPES[shape], 48))));
  return <svg viewBox="-4 -4 56 56" role="img" aria-label={label} shapeRendering="crispEdges"><path d={d} fill={W} /></svg>;
}

const Leaf = ({ x, y, dx, s = 1 }: { x: number; y: number; dx: 1 | -1; s?: number }) => (
  <path d={`M${x} ${y}q${dx * 9 * s} ${-13 * s} ${dx * 22 * s} ${-8 * s}q${dx * -6 * s} ${13 * s} ${dx * -22 * s} ${8 * s}z`} fill={C} />
);
const Soil = () => <path d="M22 86H138" {...line} stroke={W} strokeWidth="3" />;

/** A plant that grows with the practice days: seed, sprout, sapling, tree, tree in fruit. */
const PLANT: Record<number, () => ReactNode> = {
  1: () => (<><Soil /><ellipse cx="80" cy="80" rx="8" ry="5.5" fill={W} /><path d="M80 75q-1 -9 5 -13" {...line} stroke={C} strokeWidth="3" /></>),
  7: () => (<><Soil /><path d="M80 86V58" {...line} stroke={W} strokeWidth="3.5" /><Leaf x={80} y={66} dx={1} /><Leaf x={80} y={72} dx={-1} /></>),
  30: () => (<><Soil /><path d="M80 86V36" {...line} stroke={W} strokeWidth="4" /><Leaf x={80} y={46} dx={1} s={1.1} /><Leaf x={80} y={54} dx={-1} s={1.1} /><Leaf x={80} y={66} dx={1} /><Leaf x={80} y={74} dx={-1} /></>),
  60: () => (<><Soil /><path d="M80 86V50M80 62l-14 -10M80 58l13 -9" {...line} stroke={W} strokeWidth="5" /><circle cx="80" cy="36" r="20" fill={C} /><circle cx="60" cy="46" r="13" fill={C} /><circle cx="100" cy="44" r="14" fill={C} /></>),
  100: () => (
    <>
      <Soil /><path d="M80 86V50M80 62l-16 -11M80 58l15 -10" {...line} stroke={W} strokeWidth="6" />
      <circle cx="80" cy="32" r="22" fill={C} /><circle cx="57" cy="44" r="15" fill={C} /><circle cx="103" cy="42" r="16" fill={C} />
      {[[68, 28], [90, 24], [56, 46], [102, 46], [80, 42]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="3.6" fill={R} />)}
      <path d="M120 18q5 -6 10 0q5 -6 10 0" {...line} stroke={W} strokeWidth="2.2" />
    </>
  ),
};

/** The drawing of an effort trophy for practice days. */
export function PlantArt({ days, label }: { days: number; label: string }) {
  return <svg viewBox="0 0 160 100" role="img" aria-label={label}>{(PLANT[days] ?? PLANT[1])()}</svg>;
}

/** The drawing of an effort trophy for weeks with practice: one lantern on the string for each week. */
export function LanternArt({ weeks, label }: { weeks: number; label: string }) {
  const n = Math.max(1, Math.min(12, weeks)), rows = n > 6 ? 2 : 1, per = Math.ceil(n / rows);
  const at = (i: number) => {
    const row = Math.floor(i / per), k = i % per, inRow = row === rows - 1 ? n - per * (rows - 1) : per;
    const u = inRow === 1 ? 0.5 : k / (inRow - 1), y0 = rows === 1 ? 30 : 16 + row * 40;
    return { x: 22 + u * 116, y: y0 + Math.sin(u * Math.PI) * 9 };
  };
  return (
    <svg viewBox="0 0 160 100" role="img" aria-label={label}>
      {Array.from({ length: rows }, (_, row) => { const y0 = rows === 1 ? 30 : 16 + row * 40; return <path key={row} d={`M8 ${y0 - 8}Q80 ${y0 + 12} 152 ${y0 - 8}`} {...line} stroke={W} strokeWidth="1.6" />; })}
      {Array.from({ length: n }, (_, i) => {
        const { x, y } = at(i);
        return (
          <g key={i}>
            <path d={`M${x} ${y - 4}v6`} {...line} stroke={W} strokeWidth="1.4" />
            <rect x={x - 5.5} y={y + 2} width="11" height="15" rx="3.5" fill={C} />
            <path d={`M${x - 5.5} ${y + 5}h11M${x - 5.5} ${y + 14}h11`} {...line} stroke={R} strokeWidth="1.6" />
          </g>
        );
      })}
    </svg>
  );
}
