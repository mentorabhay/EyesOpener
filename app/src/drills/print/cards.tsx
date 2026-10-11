// Eyes Opener: The printable cards that go with exercises. Each page is one drawing sized in millimetres (one unit is one millimetre),.
/**
 * The printable cards that go with exercises. Each page is one drawing sized in millimetres (one unit is one millimetre),
 * so it prints at its real size on A4 with 12 mm margins. Black, red and green only. Server-safe: no hooks, no browser.
 *
 * Every sheet carries the card's name and a 50 mm check line, so a wrong print scale shows at once.
 * Letters are drawn as shapes, not typed in a font, so their height is exact on every printer.
 */
import type { ReactNode } from "react";
import { print as t } from "@/copy/drills-tools";
import type { PrintKey } from "@/data/guides/types";
import { splitLines } from "@/drills/tools/helpers";

export interface PrintCard { title: string; how: string[]; pages: ReactNode[] }

/** Width of every sheet. A4 with 12 mm margins leaves 186 by 273 mm; a little is kept spare so nothing is ever shrunk to fit. */
const W = 184;
const RED = "#d00000", GREEN = "#00843d", BLACK = "#000000", PAPER = "#ffffff";
const FONT = "Arial, Helvetica, sans-serif";
const c = t.cards;
const n = (v: number) => Number(v.toFixed(2));

/* ── shared pieces ── */

/** How many characters of this size fit in this width. The share is generous, so a wider stand-in font still fits. */
const fit = (width: number, size: number) => Math.max(8, Math.floor(width / (size * 0.57)));

/** A paragraph, wrapped by hand: a drawing has no line wrap of its own. `y` is the first baseline. */
function Para({ text, x, y, width, size = 3.4, bold }: { text: string; x: number; y: number; width: number; size?: number; bold?: boolean }) {
  return (
    <text x={x} y={y} fontSize={size} fontWeight={bold ? 700 : 400}>
      {splitLines(text, fit(width, size)).map((line, i) => <tspan key={i} x={x} dy={i === 0 ? 0 : n(size * 1.35)}>{line}</tspan>)}
    </text>
  );
}
/** The height a paragraph takes, to place what follows it. */
const paraHeight = (text: string, width: number, size = 3.4) => n(splitLines(text, fit(width, size)).length * size * 1.35);

/** One sheet: the card's name, the 50 mm check line, then the drawing. */
function Sheet({ id, name, h, x = 0, note, children }: { id: string; name: string; h: number; x?: number; note?: string; children: ReactNode }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={`${W}mm`} height={`${h}mm`} viewBox={`0 0 ${W} ${h}`} role="img" aria-label={name} fontFamily={FONT} fill={BLACK}>
      <defs><clipPath id={id}><rect width="32" height="50" /></clipPath></defs>
      <text x={x} y="5" fontSize="5" fontWeight="700">{name}</text>
      {note && <text x={W - 0.5} y="5" fontSize="3.4" textAnchor="end">{note}</text>}
      <path d={`M${x + 0.2} 9.5V12.5M${x + 50.2} 9.5V12.5M${x + 0.2} 11H${x + 50.2}`} fill="none" stroke={BLACK} strokeWidth="0.3" />
      <text x={x + 54} y="12.1" fontSize="3.2">{t.line}</text>
      {children}
    </svg>
  );
}

/**
 * Block capitals drawn as strokes in a box 32 wide and 50 tall with a stroke of 7, then cut to the box,
 * so a letter is exactly as tall as asked. Only the fifteen letters of the chart are drawn.
 */
const ROUND = "M28.5 16A12.5 12.5 0 0 0 3.5 16V34A12.5 12.5 0 0 0 28.5 34";
const P = "M3.5 50V3.5H17A11.5 11.5 0 0 1 17 26.5H3.5";
const STROKES: Record<string, string> = {
  A: "M2 56L16 -4L30 56M8 33H24",
  C: `M28.5 18.5V16${ROUND.slice(ROUND.indexOf("A"))}V31.5`,
  D: "M3.5 3.5H13A15.5 21.5 0 0 1 13 46.5H3.5Z",
  E: "M32 3.5H3.5V46.5H32M3.5 25H26",
  F: "M32 3.5H3.5V50M3.5 25H26",
  H: "M3.5 0V50M28.5 0V50M3.5 25H28.5",
  K: "M3.5 0V50M31 -3L4 30.23M13 20L31 53",
  N: "M3.5 50V0M28.5 50V0M3.5 -2L28.5 52",
  O: `${ROUND}Z`,
  P,
  R: `${P}M15 26.5L29.5 53`,
  S: "M28.5 15V14.25A10.75 10.75 0 0 0 17.75 3.5H14.25A10.75 10.75 0 0 0 14.25 25H17.75A10.75 10.75 0 0 1 17.75 46.5H14.25A10.75 10.75 0 0 1 3.5 35.75V35",
  T: "M0 3.5H32M16 0V50",
  V: "M2 -6L16 54L30 -6",
  Z: "M0 3.5H32M0 46.5H32M29 5L3 45",
};
/** Width of a letter that is `h` tall. */
const letterWidth = (h: number) => n((h * 32) / 50);
/** One letter with its top left corner at (x, y), `h` millimetres tall. `clip` is the id the sheet was given. */
function Letter({ ch, x, y, h, clip }: { ch: string; x: number; y: number; h: number; clip: string }) {
  return (
    <g transform={`translate(${n(x)} ${n(y)}) scale(${h / 50})`}>
      <g clipPath={`url(#${clip})`}>
        <path d={STROKES[ch]} fill="none" stroke={BLACK} strokeWidth="7" strokeMiterlimit="10" />
      </g>
    </g>
  );
}

/** The chart's letters: ten rows of ten, in a fixed scrambled order that spells nothing. */
export const CHART_ROWS = ["DPOZTEFKNA", "FCSDVRTHZO", "NVRFAKPCSE", "TPDEOVHRKA", "OZSCKPTVHN", "CAKRZNSDFE", "NFOVHTZPCS", "PDHSNRVAEF", "HRVEKPFOZD", "TKSDRCNEAO"] as const;

/** The whole chart with its top left corner at (x, y): letters `h` tall, columns and rows `dx` and `dy` apart. */
function Chart({ x, y, h, dx, dy, clip }: { x: number; y: number; h: number; dx: number; dy: number; clip: string }) {
  return <>{CHART_ROWS.map((row, r) => [...row].map((ch, i) => <Letter key={`${r}-${i}`} ch={ch} x={x + i * dx} y={y + r * dy} h={h} clip={clip} />))}</>;
}

/** A square grid of 20 by 20 with a dot in the middle, `side` millimetres wide. */
function PaperGrid({ x, y, side }: { x: number; y: number; side: number }) {
  const step = side / 20;
  const at = Array.from({ length: 21 }, (_, i) => n(i * step));
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={at.map((p) => `M0 ${p}H${side}M${p} 0V${side}`).join("")} fill="none" stroke={BLACK} strokeWidth="0.2" />
      <rect width={side} height={side} fill="none" stroke={BLACK} strokeWidth="0.4" />
      <circle cx={side / 2} cy={side / 2} r="1" />
    </g>
  );
}

const cut = { fill: "none", stroke: BLACK, strokeWidth: 0.3 } as const;
const dashed = { ...cut, strokeDasharray: "3 2" } as const;

/* ── barrel card ── */

/** A barrel standing upright when the card is held: `h` tall across the card, `w` wide along it. Drawn lying down, as the card lies on the page. */
function Barrel({ cx, cy, w, h, ink }: { cx: number; cy: number; w: number; h: number; ink: string }) {
  const a = n(0.36 * w), b = n(0.64 * w), half = n(h / 2), hoop = n(0.27 * h);
  return (
    <g transform={`translate(${cx} ${cy}) rotate(90)`}>
      <path d={`M${-a} ${-half}L${a} ${-half}Q${b} 0 ${a} ${half}L${-a} ${half}Q${-b} 0 ${-a} ${-half}Z`} fill={ink} />
      <path d={`M${-w} ${-hoop}H${w}M${-w} ${hoop}H${w}`} stroke={PAPER} strokeWidth={n(0.07 * h)} fill="none" />
    </g>
  );
}

/** Each face is 60 by 200 mm. The nose end is at the bottom of the page; the barrels grow toward the far end. */
const BARRELS = [{ from: 45, w: 10, h: 14 }, { from: 105, w: 17, h: 24 }, { from: 165, w: 26, h: 36 }];
function barrelPage() {
  const top = 20, long = 200, face = 60, nose = top + long, side = 2 * face + 6, room = W - side;
  let y = top + 4;
  const para = (text: string) => { const el = <Para key={text} text={text} x={side} y={y} width={room} />; y += paraHeight(text, room) + 3; return el; };
  return (
    <Sheet id="io-barrel" name={c.barrel.title} h={nose + 4}>
      <rect x="0.2" y={top} width={2 * face} height={long} {...cut} />
      <path d={`M${face + 0.2} ${top}V${nose}`} {...dashed} />
      {[RED, GREEN].map((ink, f) => (
        <g key={ink}>
          {BARRELS.map((b) => <Barrel key={b.from} cx={0.2 + face / 2 + f * face} cy={nose - b.from} w={b.w} h={b.h} ink={ink} />)}
          <text x={0.2 + face / 2 + f * face} y={nose - 4} fontSize="3.2" textAnchor="middle">{c.barrel.on.nose}</text>
        </g>
      ))}
      {[c.barrel.on.cut, c.barrel.on.fold, c.barrel.on.use].map(para)}
    </Sheet>
  );
}

/* ── dot card ── */

/** A strip 40 by 264 mm along the long side of the page, nose end at the bottom, a dot every 30 mm. */
function dotsPage() {
  const wide = 40, top = 1, long = 264, nose = top + long, mid = 0.2 + wide / 2, col = wide + 10;
  return (
    <Sheet id="io-dots" name={c.dots.title} h={nose + 1} x={col}>
      <rect x="0.2" y={top} width={wide} height={long} {...cut} />
      <path d={`M${mid} ${top}V${nose}`} fill="none" stroke={BLACK} strokeWidth="0.4" />
      {Array.from({ length: 8 }, (_, i) => (i + 1) * 3).map((cm) => (
        <g key={cm}>
          <circle cx={mid} cy={nose - cm * 10} r="2.2" />
          <text x={mid + 5.5} y={nose - cm * 10 + 1.4} fontSize="4">{cm} {c.dots.on.cm}</text>
        </g>
      ))}
      <text x="3" y={nose - 3} fontSize="3.2">{c.dots.on.nose}</text>
      <Para text={c.dots.on.cut} x={col} y={24} width={W - col} />
      <Para text={c.dots.on.use} x={col} y={24 + paraHeight(c.dots.on.cut, W - col) + 3} width={W - col} />
    </Sheet>
  );
}

/* ── lifesaver card ── */

/** A ring like a sweet with a hole. The hole sits a little off-centre, and each ring of a pair has its own small dot. */
function Lifesaver({ cx, cy, ink, shift, dot }: { cx: number; cy: number; ink: string; shift: number; dot: number }) {
  const hx = cx + shift;
  return (
    <g>
      <circle cx={cx} cy={cy} r="9" fill={ink} />
      <circle cx={hx} cy={cy} r="3.8" fill={PAPER} />
      {[...c.lifesaver.on.word].map((ch, i, all) => {
        const turn = ((i - (all.length - 1) / 2) * 72 * Math.PI) / 180;
        return <text key={i} x={n(cx + 6.4 * Math.sin(turn))} y={n(cy - 6.4 * Math.cos(turn) + 0.95)} fontSize="2.6" fontWeight="700" textAnchor="middle" fill={PAPER}>{ch}</text>;
      })}
      <circle cx={hx} cy={cy + dot} r="0.7" />
    </g>
  );
}

/** Four pairs, centres 20, 35, 50 and 65 mm apart, on a card 120 by 136 mm. Rows 1 and 2 red, rows 3 and 4 green. */
const LIFESAVER_GAPS = [20, 35, 50, 65];
function lifesaverPage() {
  const top = 20, wide = 120, pitch = 30, tall = 16 + LIFESAVER_GAPS.length * pitch, mid = 64, side = wide + 6, room = W - side;
  return (
    <Sheet id="io-lifesaver" name={c.lifesaver.title} h={top + tall + 4}>
      <rect x="0.2" y={top} width={wide} height={tall} {...cut} />
      {LIFESAVER_GAPS.map((gap, i) => {
        const cy = top + 23 + i * pitch, ink = i < 2 ? RED : GREEN;
        return (
          <g key={gap}>
            <text x="7" y={cy + 1.7} fontSize="5" fontWeight="700">{i + 1}</text>
            {/* the holes sit outward, so the hole of the joined ring floats toward the eyes when they cross */}
            <Lifesaver cx={mid - gap / 2} cy={cy} ink={ink} shift={-0.75} dot={-1.6} />
            <Lifesaver cx={mid + gap / 2} cy={cy} ink={ink} shift={0.75} dot={1.6} />
          </g>
        );
      })}
      <Para text={c.lifesaver.on.cut} x={side} y={top + 4} width={room} />
      <Para text={c.lifesaver.on.use} x={side} y={top + 4 + paraHeight(c.lifesaver.on.cut, room) + 3} width={room} />
    </Sheet>
  );
}

/* ── letter chart and near cards ── */

/** Sheet 1: letters 20 mm tall, to read from 3 m. */
function farPage() {
  const h = 20, top = 17, tall = 266;
  return (
    <Sheet id="io-far" name={c.letters.title} h={tall} note={c.letters.on.far}>
      <Chart x={0} y={top} h={h} dx={n((W - letterWidth(h)) / 9)} dy={n((tall - 0.4 - top - h) / 9)} clip="io-far" />
    </Sheet>
  );
}

/** Sheet 2: four near cards, 72 by 84 mm, letters 3 mm tall, to hold at 40 cm. */
function nearPage() {
  const h = 3, dx = 6, dy = 7, wide = 72, tall = 84, top = 26;
  const inX = n((wide - 9 * dx - letterWidth(h)) / 2), inY = n((tall - 9 * dy - h) / 2);
  const spots = [[10, top], [102, top], [10, top + tall + 14], [102, top + tall + 14]];
  return (
    <Sheet id="io-near" name={c.letters.title} h={top + 2 * tall + 18} note={c.letters.on.near}>
      <Para text={c.letters.on.cut} x={0} y={20} width={W} />
      {spots.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width={wide} height={tall} {...cut} />
          <Chart x={x + inX} y={y + inY} h={h} dx={dx} dy={dy} clip="io-near" />
        </g>
      ))}
    </Sheet>
  );
}

/* ── letter targets ── */

/** A letter 60 mm tall for the wall, three letters 5 mm tall under it, and a strip with a 3 mm letter to tape round a pen. */
function letterPage() {
  const big = 60, small = 5, tiny = 3, mid = W / 2, top = 30, row = top + big + 12, strip = row + small + 34;
  return (
    <Sheet id="io-letter" name={c.letter.title} h={strip + 20}>
      <Para text={c.letter.on.wall} x={0} y={22} width={W} />
      <Letter ch="E" x={mid - letterWidth(big) / 2} y={top} h={big} clip="io-letter" />
      {["K", "S", "N"].map((ch, i) => <Letter key={ch} ch={ch} x={mid + (i - 1) * 20 - letterWidth(small) / 2} y={row} h={small} clip="io-letter" />)}
      <Para text={c.letter.on.strip} x={0} y={strip - 12} width={W} />
      <rect x={mid - 35} y={strip} width="70" height="16" {...dashed} />
      <Letter ch="E" x={mid - letterWidth(tiny) / 2} y={strip + 8 - tiny / 2} h={tiny} clip="io-letter" />
    </Sheet>
  );
}

/* ── grid check ── */

/** Two grids 100 mm square, one for each eye, with the steps, a line for the date and what to do about a mark. */
function gridPage() {
  const side = 100, first = 23, second = first + side + 11, col = side + 8, room = W - col, foot = second + side + 9;
  let y = 44;
  const steps = c.grid.on.steps.map((line, i) => {
    const el = (
      <g key={line}>
        <text x={col} y={y} fontSize="3.4" fontWeight="700">{i + 1}</text>
        <Para text={line} x={col + 5} y={y} width={room - 5} />
      </g>
    );
    y += paraHeight(line, room - 5) + 2.5;
    return el;
  });
  return (
    <Sheet id="io-grid" name={c.grid.title} h={n(foot + paraHeight(c.grid.on.ifMarked, W) + 6)}>
      <text x="0.3" y={first - 2.5} fontSize="3.6" fontWeight="700">{c.grid.on.right}</text>
      <PaperGrid x={0.3} y={first} side={side} />
      <text x="0.3" y={second - 2.5} fontSize="3.6" fontWeight="700">{c.grid.on.left}</text>
      <PaperGrid x={0.3} y={second} side={side} />
      <text x={col} y="31" fontSize="3.6" fontWeight="700">{c.grid.on.date}</text>
      <path d={`M${col + 12} 31.5H${W - 0.5}`} fill="none" stroke={BLACK} strokeWidth="0.3" />
      {steps}
      <Para text={c.grid.on.ifMarked} x={0.3} y={foot} width={W} />
      <Para text={c.grid.on.ifNone} x={0.3} y={n(foot + paraHeight(c.grid.on.ifMarked, W) + 2)} width={W} />
    </Sheet>
  );
}

/* ── stereogram pairs ── */

/**
 * Three pairs of rings 45 mm across, centres 60 mm apart. The small shape inside each ring sits 2 mm off-centre,
 * in opposite directions in the two rings: outward makes it float in front of the joined ring when the eyes cross, inward behind it.
 */
const PAIRS = [{ shape: "disc", out: 1 }, { shape: "square", out: -1 }, { shape: "triangle", out: 1 }] as const;
function Shape({ shape, cx, cy }: { shape: (typeof PAIRS)[number]["shape"]; cx: number; cy: number }) {
  if (shape === "disc") return <circle cx={cx} cy={cy} r="4" />;
  if (shape === "square") return <rect x={cx - 3.5} y={cy - 3.5} width="7" height="7" />;
  return <path d={`M${cx} ${cy - 4.6}L${cx + 4.5} ${cy + 3.2}H${cx - 4.5}Z`} />;
}
function pairsPage() {
  const mid = W / 2, gap = 60, r = 22.5, line = 1.2, top = 21, first = n(top + paraHeight(c.pairs.on.use, W) + 6 + r), pitch = 58;
  return (
    <Sheet id="io-pairs" name={c.pairs.title} h={n(first + 2 * pitch + r + 4)}>
      <Para text={c.pairs.on.use} x={0} y={top} width={W} />
      {PAIRS.map((p, i) => {
        const cy = first + i * pitch;
        return (
          <g key={p.shape}>
            <text x="0" y={cy + 1.5} fontSize="4" fontWeight="700">{c.pairs.on.pair} {i + 1}</text>
            {[-1, 1].map((sideOf) => (
              <g key={sideOf}>
                <circle cx={mid + (sideOf * gap) / 2} cy={cy} r={r - line / 2} fill="none" stroke={BLACK} strokeWidth={line} />
                <Shape shape={p.shape} cx={mid + (sideOf * gap) / 2 + sideOf * p.out * 2} cy={cy} />
              </g>
            ))}
          </g>
        );
      })}
    </Sheet>
  );
}

/* ── the cards ── */

const card = (key: PrintKey, pages: ReactNode[]): PrintCard => ({ title: c[key].title, how: c[key].how, pages });

/** Built when asked for, never while the file loads: the words on a card are read for the person who prints it. */
export const allCards = (): Record<PrintKey, PrintCard> => ({
  barrel: card("barrel", [barrelPage()]),
  dots: card("dots", [dotsPage()]),
  lifesaver: card("lifesaver", [lifesaverPage()]),
  letters: card("letters", [farPage(), nearPage()]),
  letter: card("letter", [letterPage()]),
  grid: card("grid", [gridPage()]),
  pairs: card("pairs", [pairsPage()]),
});

export const cardFor = (key: PrintKey): PrintCard => allCards()[key];
