// Eyes Opener: Lamps drawn on a tile at most. A tile with more lit areas shows this many; the list below has them all. .
import { map as t } from "@/copy/map";
import { GRID, type Tile } from "@/lib/map";
import css from "./map.module.css";

const CELL = 58, SIZE = 52, PAD = (CELL - SIZE) / 2;
/** Lamps drawn on a tile at most. A tile with more lit areas shows this many; the list below has them all. */
const LAMPS = 5;

/**
 * The map, drawn here from the tile list: no map service, no picture file and no script from elsewhere.
 * One tile for each group of PIN codes. A lit tile carries one small lamp for each lit area inside it.
 */
export function MapDrawing({ tiles, own }: { tiles: Tile[]; own: string | null }) {
  const lit = tiles.filter((x) => x.lit > 0).length;
  return (
    <svg className={css.map} viewBox={`0 0 ${GRID.cols * CELL} ${GRID.rows * CELL}`} role="img" aria-label={t.drawing.label(lit, tiles.length)}>
      <defs>
        <pattern id="map-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line className={css.hatch} x1="0" y1="0" x2="0" y2="6" />
        </pattern>
      </defs>
      {tiles.map((x) => {
        const left = x.col * CELL + PAD, top = x.row * CELL + PAD, range = t.drawing.range(x.from, x.to), lamps = Math.min(x.lit, LAMPS);
        return (
          <g key={x.key} data-lit={x.lit > 0 ? "" : undefined}>
            <title>{t.drawing.tile(x.name, range, x.lit)}</title>
            {x.lit > 0 ? <rect className={css.lit} x={left} y={top} width={SIZE} height={SIZE} rx="10" /> : (
              <>
                <rect className={css.dark} x={left} y={top} width={SIZE} height={SIZE} rx="10" />
                <rect x={left} y={top} width={SIZE} height={SIZE} rx="10" fill="url(#map-hatch)" opacity="0.55" />
              </>
            )}
            {x.key === own && <rect className={css.ring} x={left - 2.5} y={top - 2.5} width={SIZE + 5} height={SIZE + 5} rx="12" />}
            <text x={left + SIZE / 2} y={top + (x.lit > 0 ? 22 : 30)}>{x.from === x.to ? x.from : `${x.from}-${x.to}`}</text>
            {Array.from({ length: lamps }, (_, i) => <circle key={i} className={css.lamp} cx={left + SIZE / 2 + (i - (lamps - 1) / 2) * 9} cy={top + 36} r="3" />)}
          </g>
        );
      })}
    </svg>
  );
}
