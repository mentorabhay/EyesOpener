// Eyes Opener: Focus Wall: the twelve monthly pictures, and the wall that brings one into focus tile by tile.
/**
 * Focus Wall: the twelve monthly pictures, and the wall that brings one into focus tile by tile.
 * Server-safe: no hooks, no browser APIs.
 *
 * Every picture is drawn here, by code, in the three colours of a therapy scene on its black field: white, cyan
 * and red. There is no photograph, no uploaded file and no address outside this app. The red here is plain red and
 * not the member's own stronger-eye setting: this is a picture to look at together, not a therapy scene, and it
 * must look the same to everyone.
 */
import type { ReactNode } from "react";
import type { ArtKey } from "@/lib/wall-rules";

const W = "#ffffff", C = "#00ffff", R = "#ff0000", K = "#000000";
export const ART_W = 640, ART_H = 320;

const line = { fill: "none", strokeLinecap: "round", strokeLinejoin: "round" } as const;
/** Small white dots: stars, or specks of light. Each is [x, y, radius]. */
const Dots = ({ at, fill = W }: { at: [number, number, number][]; fill?: string }) => <>{at.map(([x, y, r]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={fill} />)}</>;
const Cloud = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <path d={`M${x} ${y}h${70 * s}a${14 * s} ${14 * s} 0 0 0 ${-6 * s} ${-27 * s}a${20 * s} ${20 * s} 0 0 0 ${-38 * s} ${-8 * s}a${16 * s} ${16 * s} 0 0 0 ${-26 * s} ${35 * s}z`} {...line} stroke={W} strokeWidth="4" />
);

const ART: Record<ArtKey, () => ReactNode> = {
  /* January: a lighthouse throws its beam over a night sea. */
  lighthouse: () => (
    <>
      <Dots at={[[40, 40, 3], [118, 84, 2], [200, 30, 2.5], [300, 62, 2], [520, 36, 3], [596, 96, 2], [452, 150, 2], [70, 150, 2]]} />
      <path d="M392 96L20 34V150Z" fill={C} opacity=".3" />
      <path d="M432 96L640 60V140Z" fill={C} opacity=".3" />
      <path d="M380 250L396 118H428L444 250Z" fill={W} />
      <path d="M392 150H432L435 178H389ZM385 206H439L442 234H382Z" fill={R} />
      <rect x="388" y="82" width="48" height="36" rx="5" fill={C} />
      <path d="M382 82H442L412 54Z" fill={R} />
      <path d="M330 262Q370 232 412 250T500 262Z" fill={W} opacity=".55" />
      <g {...line} stroke={W} strokeWidth="5">
        <path d="M0 272q20 -14 40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0" />
        <path d="M20 298q20 -12 40 0t40 0t40 0M260 298q20 -12 40 0t40 0t40 0M500 298q20 -12 40 0t40 0" strokeWidth="3.5" />
      </g>
      <path d="M96 252H170L158 270H108Z" fill={R} />
      <path d="M134 250V206L160 244Z" fill={W} />
    </>
  ),
  /* February: a boat with a tall sail on a bright day. */
  sailboat: () => (
    <>
      <circle cx="540" cy="70" r="34" fill={W} />
      <g {...line} stroke={W} strokeWidth="4">
        <path d="M70 70q12 -14 24 0q12 -14 24 0M150 112q10 -12 20 0q10 -12 20 0M430 44q9 -10 18 0q9 -10 18 0" />
      </g>
      <Cloud x={220} y={84} />
      <path d="M322 60V228" {...line} stroke={W} strokeWidth="7" />
      <path d="M334 66L452 214H334Z" fill={C} />
      <path d="M310 96L226 214H310Z" fill={W} />
      <path d="M322 60l34 10l-34 10z" fill={R} />
      <path d="M196 232H470L436 276H232Z" fill={R} />
      <path d="M214 246H452" {...line} stroke={K} strokeWidth="4" />
      <g {...line} stroke={C} strokeWidth="5">
        <path d="M0 282q20 -14 40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0" />
      </g>
      <path d="M40 304q20 -12 40 0t40 0M300 306q20 -12 40 0t40 0t40 0M540 304q20 -12 40 0" {...line} stroke={W} strokeWidth="3.5" />
    </>
  ),
  /* March: three balloons drift over the hills. */
  balloons: () => (
    <>
      <Cloud x={36} y={86} s={0.9} />
      <Cloud x={500} y={62} s={0.8} />
      <path d="M250 150a70 78 0 1 1 140 0q0 34 -52 78h-36q-52 -44 -52 -78z" fill={C} />
      <path d="M320 72q-34 40 -18 156M320 72q34 40 18 156" {...line} stroke={K} strokeWidth="5" />
      <path d="M302 228l4 22M338 228l-4 22" {...line} stroke={W} strokeWidth="3" />
      <rect x="302" y="250" width="36" height="26" rx="5" fill={W} />
      <path d="M92 150a44 50 0 1 1 88 0q0 22 -32 48h-24q-32 -26 -32 -48z" fill={R} />
      <rect x="124" y="212" width="24" height="18" rx="4" fill={W} />
      <path d="M126 198l2 14M146 198l-2 14" {...line} stroke={W} strokeWidth="2.5" />
      <path d="M470 176a36 40 0 1 1 72 0q0 18 -26 40h-20q-26 -22 -26 -40z" {...line} stroke={W} strokeWidth="5" />
      <path d="M506 136v80M488 146q-8 30 8 70M524 146q8 30 -8 70" {...line} stroke={W} strokeWidth="3" />
      <rect x="496" y="228" width="20" height="15" rx="3" fill={C} />
      <path d="M0 300Q110 250 220 296T430 290T640 286" {...line} stroke={W} strokeWidth="5" />
      <Dots at={[[60, 302, 4], [404, 300, 4], [584, 296, 4]]} fill={R} />
    </>
  ),
  /* April: a swing hangs from a big tree in flower. */
  swing: () => (
    <>
      <circle cx="78" cy="64" r="28" fill={W} />
      <path d="M300 286C306 230 300 190 284 150M300 286C298 220 318 180 352 150M300 220C340 196 388 190 448 188" {...line} stroke={W} strokeWidth="13" />
      <g fill={C}>
        <circle cx="250" cy="112" r="56" /><circle cx="336" cy="84" r="62" /><circle cx="412" cy="124" r="52" /><circle cx="300" cy="150" r="40" />
      </g>
      <Dots at={[[236, 96, 6], [310, 60, 6], [356, 110, 6], [420, 104, 6], [276, 146, 6], [388, 148, 6]]} fill={R} />
      <path d="M404 190V256M446 188V256" {...line} stroke={W} strokeWidth="4" />
      <rect x="394" y="254" width="62" height="10" rx="5" fill={R} />
      <path d="M0 290H640" {...line} stroke={W} strokeWidth="5" />
      <g {...line} stroke={C} strokeWidth="4">
        <path d="M70 290v-22M130 290v-30M520 290v-26M578 290v-18" />
      </g>
      <Dots at={[[70, 262, 7], [130, 254, 7], [520, 258, 7], [578, 266, 7]]} fill={R} />
      <path d="M508 96q12 -14 24 0q12 -14 24 0M566 138q9 -10 18 0q9 -10 18 0" {...line} stroke={W} strokeWidth="4" />
    </>
  ),
  /* May: the sun comes up between two mountains, over a river. */
  sunrise: () => (
    <>
      <circle cx="320" cy="170" r="62" fill={R} />
      <g {...line} stroke={R} strokeWidth="5">
        <path d="M320 84V56M250 110L232 88M390 110L408 88M214 164H186M426 164H454" />
      </g>
      <path d="M0 262L150 70L262 214L330 262Z" fill={K} />
      <path d="M300 262L470 96L640 262Z" fill={K} />
      <g {...line} stroke={W} strokeWidth="6">
        <path d="M0 262L150 70L262 214" />
        <path d="M300 262L470 96L640 262" />
        <path d="M118 112L150 134L176 104M438 128L470 152L500 126" strokeWidth="4" />
      </g>
      <path d="M318 262C300 280 380 286 350 320H250C290 290 240 280 278 262Z" fill={C} />
      <g fill={C}>
        <path d="M60 290l16 -40l16 40zM104 300l14 -34l14 34zM520 296l16 -40l16 40zM566 288l14 -34l14 34z" />
      </g>
      <path d="M0 262H278M318 262H640" {...line} stroke={W} strokeWidth="5" />
      <Dots at={[[40, 40, 2.5], [600, 44, 2.5], [560, 150, 2], [80, 190, 2]]} />
    </>
  ),
  /* June: fish swim over a reef. */
  reef: () => (
    <>
      <path d="M210 150q70 -62 170 0q-100 62 -170 0z" fill={C} />
      <path d="M214 150l-54 -40v80z" fill={C} />
      <circle cx="338" cy="140" r="11" fill={W} /><circle cx="341" cy="140" r="5" fill={K} />
      <path d="M270 122q14 28 0 56M300 114q16 36 0 72" {...line} stroke={K} strokeWidth="4" />
      <g fill={R}>
        <path d="M470 84q30 -24 64 0q-34 24 -64 0zM472 84l-22 -16v32z" />
        <path d="M520 220q26 -20 56 0q-30 20 -56 0zM522 220l-20 -14v28z" />
        <path d="M60 96q26 -20 56 0q-30 20 -56 0zM62 96l-20 -14v28z" />
      </g>
      <Dots at={[[514, 80, 4], [560, 217, 3.5], [100, 93, 3.5]]} />
      <g {...line} stroke={W} strokeWidth="4">
        <circle cx="416" cy="118" r="8" /><circle cx="432" cy="84" r="5" /><circle cx="150" cy="56" r="6" /><circle cx="596" cy="140" r="7" /><circle cx="30" cy="186" r="5" />
      </g>
      <g {...line} stroke={W} strokeWidth="6">
        <path d="M90 296q-18 -30 0 -56t0 -52M130 296q14 -24 0 -46t0 -40M420 296q-16 -28 0 -50t0 -44M600 296q14 -24 0 -44" />
      </g>
      <g fill={C}>
        <circle cx="240" cy="290" r="26" /><circle cx="286" cy="296" r="18" /><circle cx="500" cy="292" r="24" />
      </g>
      <path d="M0 298H640" {...line} stroke={W} strokeWidth="5" />
    </>
  ),
  /* July: two umbrellas in the rain. */
  rain: () => (
    <>
      <Cloud x={70} y={74} />
      <Cloud x={300} y={56} s={1.1} />
      <Cloud x={500} y={86} s={0.9} />
      <g {...line} stroke={W} strokeWidth="4">
        <path d="M60 110l-10 24M120 124l-10 24M190 104l-10 24M250 138l-10 24M330 96l-10 24M400 120l-10 24M470 116l-10 24M560 126l-10 24M610 104l-10 24M30 190l-10 24M300 196l-10 24M340 250l-10 24M600 214l-10 24M40 262l-10 24" />
      </g>
      <path d="M100 214a88 80 0 0 1 176 0q-22 -16 -44 0q-22 -16 -44 0q-22 -16 -44 0q-22 -16 -44 0z" fill={C} />
      <path d="M188 134V280q0 16 -16 16t-16 -14" {...line} stroke={W} strokeWidth="6" />
      <path d="M370 236a84 76 0 0 1 168 0q-21 -15 -42 0q-21 -15 -42 0q-21 -15 -42 0q-21 -15 -42 0z" fill={R} />
      <path d="M454 160V286q0 14 -14 14t-14 -12" {...line} stroke={W} strokeWidth="6" />
      <g {...line} stroke={C} strokeWidth="4">
        <ellipse cx="300" cy="304" rx="54" ry="7" /><ellipse cx="560" cy="298" rx="40" ry="6" /><ellipse cx="70" cy="302" rx="36" ry="5" />
      </g>
    </>
  ),
  /* August: a train crosses a bridge of arches. */
  train: () => (
    <>
      <Cloud x={470} y={70} s={0.8} />
      <g {...line} stroke={W} strokeWidth="4">
        <circle cx="150" cy="96" r="12" /><circle cx="176" cy="66" r="17" /><circle cx="214" cy="36" r="22" />
      </g>
      <path d="M112 132h34v38h44v62h-78z" fill={R} />
      <rect x="150" y="182" width="26" height="24" rx="4" fill={K} />
      <rect x="122" y="118" width="16" height="16" fill={R} />
      <path d="M100 232l-26 0l26 -22z" fill={W} />
      <g fill={C}>
        <rect x="206" y="160" width="128" height="72" rx="8" /><rect x="350" y="160" width="128" height="72" rx="8" /><rect x="494" y="160" width="146" height="72" rx="8" />
      </g>
      <g fill={K}>
        <rect x="222" y="176" width="28" height="24" rx="3" /><rect x="264" y="176" width="28" height="24" rx="3" /><rect x="366" y="176" width="28" height="24" rx="3" /><rect x="408" y="176" width="28" height="24" rx="3" /><rect x="510" y="176" width="28" height="24" rx="3" /><rect x="552" y="176" width="28" height="24" rx="3" /><rect x="594" y="176" width="28" height="24" rx="3" />
      </g>
      <g fill={W}>
        <circle cx="132" cy="236" r="12" /><circle cx="172" cy="236" r="12" /><circle cx="238" cy="236" r="12" /><circle cx="304" cy="236" r="12" /><circle cx="382" cy="236" r="12" /><circle cx="448" cy="236" r="12" /><circle cx="526" cy="236" r="12" /><circle cx="604" cy="236" r="12" />
      </g>
      <g {...line} stroke={W} strokeWidth="6">
        <path d="M0 252H640" />
        <path d="M30 320V300a54 44 0 0 1 108 0V320M190 320V300a54 44 0 0 1 108 0V320M350 320V300a54 44 0 0 1 108 0V320M510 320V300a54 44 0 0 1 108 0V320" />
      </g>
      <Dots at={[[40, 60, 2.5], [330, 40, 2.5], [600, 130, 2.5], [60, 170, 2]]} />
    </>
  ),
  /* September: an owl on a branch under the moon. */
  owl: () => (
    <>
      <circle cx="520" cy="84" r="50" fill={W} /><circle cx="544" cy="70" r="46" fill={K} />
      <Dots at={[[60, 50, 3], [150, 100, 2], [230, 40, 2.5], [420, 40, 2], [600, 170, 2.5], [40, 190, 2], [580, 262, 2]]} />
      <path d="M40 250C200 236 420 262 610 226" {...line} stroke={W} strokeWidth="11" />
      <path d="M470 244C500 220 530 216 560 196M150 246C130 224 110 220 86 206" {...line} stroke={W} strokeWidth="6" />
      <g fill={R}>
        <path d="M560 196q22 -22 44 -4q-22 20 -44 4zM86 206q-24 -18 -44 -2q22 18 44 2zM520 222q10 -24 34 -18q-8 22 -34 18z" />
      </g>
      <ellipse cx="300" cy="172" rx="70" ry="82" fill={C} />
      <path d="M240 112l-6 -40l42 22zM360 112l6 -40l-42 22z" fill={C} />
      <circle cx="272" cy="140" r="26" fill={W} /><circle cx="328" cy="140" r="26" fill={W} />
      <circle cx="274" cy="142" r="11" fill={K} /><circle cx="326" cy="142" r="11" fill={K} />
      <path d="M290 162h20l-10 20z" fill={R} />
      <path d="M262 196q12 14 24 0M288 204q12 14 24 0M314 196q12 14 24 0M276 222q12 14 24 0M302 222q12 14 24 0" {...line} stroke={K} strokeWidth="4" />
      <path d="M278 250v14M296 250v14M306 250v14M324 250v14" {...line} stroke={R} strokeWidth="5" />
    </>
  ),
  /* October: a kite flies over the hills. */
  kite: () => (
    <>
      <circle cx="86" cy="70" r="30" fill={W} />
      <Cloud x={196} y={72} s={0.8} />
      <Cloud x={540} y={150} s={0.7} />
      <path d="M0 262Q120 172 260 250T640 214V320H0Z" fill={K} />
      <path d="M0 262Q120 172 260 250T640 214" {...line} stroke={W} strokeWidth="6" />
      <path d="M200 320Q330 228 470 300T640 282" {...line} stroke={C} strokeWidth="5" />
      <path d="M452 38L512 100L452 186L392 100Z" fill={R} />
      <path d="M452 38V186M392 100H512" {...line} stroke={W} strokeWidth="4" />
      <path d="M452 186C440 212 470 226 452 250C440 266 462 276 450 292" {...line} stroke={C} strokeWidth="4" />
      <g fill={C}>
        <path d="M440 214l24 12l-24 10zM466 244l-26 10l24 12z" />
      </g>
      <path d="M452 186C380 200 250 196 152 206" {...line} stroke={W} strokeWidth="2.5" />
      <circle cx="140" cy="178" r="11" fill={W} />
      <path d="M140 190V226M140 200L156 206M140 200L124 212M140 226L128 250M140 226L152 250" {...line} stroke={W} strokeWidth="5" />
      <g fill={C}>
        <path d="M50 258l12 -30l12 30zM560 236l12 -30l12 30zM600 232l10 -26l10 26z" />
      </g>
      <path d="M300 60q10 -12 20 0q10 -12 20 0M556 60q9 -10 18 0q9 -10 18 0" {...line} stroke={W} strokeWidth="4" />
    </>
  ),
  /* November: a rocket on its way to the moon. */
  rocket: () => (
    <>
      <circle cx="520" cy="90" r="64" fill={W} />
      <g fill={K}>
        <circle cx="496" cy="70" r="14" /><circle cx="548" cy="104" r="18" /><circle cx="506" cy="126" r="8" /><circle cx="546" cy="56" r="7" />
      </g>
      <Dots at={[[40, 40, 3], [120, 110, 2], [220, 50, 2.5], [330, 30, 2], [390, 150, 2], [600, 220, 3], [50, 220, 2], [300, 280, 2.5], [560, 290, 2], [20, 300, 2]]} />
      <g transform="rotate(38 250 180)">
        <path d="M250 70C290 110 296 190 290 250H210C204 190 210 110 250 70Z" fill={C} />
        <path d="M250 70C266 86 278 108 284 132H216C222 108 234 86 250 70Z" fill={R} />
        <circle cx="250" cy="170" r="20" fill={W} /><circle cx="250" cy="170" r="10" fill={K} />
        <path d="M210 204L174 268L212 250ZM290 204L326 268L288 250Z" fill={R} />
        <path d="M226 252H274L250 316Z" fill={W} />
      </g>
      <g {...line} stroke={W} strokeWidth="4" strokeDasharray="2 16">
        <path d="M40 310C70 290 100 280 124 262" />
        <path d="M330 110C380 90 420 96 446 104" />
      </g>
    </>
  ),
  /* December: a tent and a fire under the stars. */
  tent: () => (
    <>
      <circle cx="96" cy="72" r="32" fill={W} /><circle cx="112" cy="62" r="29" fill={K} />
      <Dots at={[[200, 40, 3], [260, 110, 2], [330, 50, 2.5], [420, 90, 2], [470, 34, 3], [600, 64, 2.5], [560, 130, 2], [40, 160, 2], [180, 150, 2]]} />
      <path d="M520 40L600 20" {...line} stroke={W} strokeWidth="3" />
      <path d="M150 276L300 96L450 276Z" fill={C} />
      <path d="M300 96V60" {...line} stroke={W} strokeWidth="5" />
      <path d="M300 60l26 9l-26 9z" fill={R} />
      <path d="M300 150L258 276H342Z" fill={K} />
      <path d="M150 276L118 290M450 276L482 290" {...line} stroke={W} strokeWidth="4" />
      <path d="M520 276C496 246 520 236 524 208C548 232 566 244 552 276Z" fill={R} />
      <path d="M530 276C520 260 532 252 536 240C546 252 552 262 546 276Z" fill={W} />
      <path d="M494 284L582 270M494 270L582 284" {...line} stroke={W} strokeWidth="7" />
      <g {...line} stroke={W} strokeWidth="5">
        <path d="M30 290l26 -64l26 64zM56 290v16M594 226l24 -58l24 58zM618 226v80" />
        <path d="M0 292H640" />
      </g>
    </>
  ),
};

/** One of the twelve pictures, whole. Goes inside an svg with the viewBox `0 0 640 320`. */
export const Art = ({ art }: { art: ArtKey }) => ART[art]();

/**
 * The wall: the month's picture, blurred, with the tiles that are in focus drawn sharp on top of it.
 * `sharp` and `ours` hold tile numbers; a place in the grid past the last tile is always sharp, so a picture can be finished.
 * `id` must be unique on the page: it names this picture's blur and its cut-out.
 */
export function WallPicture({ art, id, cols, rows, tiles, sharp, ours, label }: {
  art: ArtKey; id: string; cols: number; rows: number; tiles: number; sharp: ReadonlySet<number>; ours?: ReadonlySet<number>; label: string;
}) {
  const tw = ART_W / cols, th = ART_H / rows, cells = Array.from({ length: cols * rows }, (_, i) => i);
  const inFocus = (i: number) => i >= tiles || sharp.has(i), whole = cells.every(inFocus);
  const place = (i: number) => ({ x: (i % cols) * tw, y: Math.floor(i / cols) * th });
  return (
    <svg viewBox={`0 0 ${ART_W} ${ART_H}`} role="img" aria-label={label}>
      <rect width={ART_W} height={ART_H} fill={K} />
      {whole ? <Art art={art} /> : (
        <>
          <defs>
            <filter id={`${id}-blur`} x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="11" /></filter>
            <clipPath id={`${id}-sharp`}>
              {cells.filter(inFocus).map((i) => { const p = place(i); return <rect key={i} x={p.x - 0.25} y={p.y - 0.25} width={tw + 0.5} height={th + 0.5} />; })}
            </clipPath>
          </defs>
          <g filter={`url(#${id}-blur)`}><Art art={art} /></g>
          <g clipPath={`url(#${id}-sharp)`}><rect width={ART_W} height={ART_H} fill={K} /><Art art={art} /></g>
          <g stroke={W} strokeOpacity=".16" strokeWidth="1">
            {Array.from({ length: cols - 1 }, (_, i) => <path key={`v${i}`} d={`M${(i + 1) * tw} 0V${ART_H}`} />)}
            {Array.from({ length: rows - 1 }, (_, i) => <path key={`h${i}`} d={`M0 ${(i + 1) * th}H${ART_W}`} />)}
          </g>
        </>
      )}
      {ours && [...ours].filter((i) => i < tiles && sharp.has(i)).map((i) => {
        /* A white corner marks a tile this family brought into focus. */
        const p = place(i), c = Math.max(5, Math.min(14, tw * 0.2));
        return <path key={`o${i}`} d={`M${p.x} ${p.y}h${c}l${-c} ${c}z`} fill={W} stroke={K} strokeWidth="1" />;
      })}
    </svg>
  );
}
