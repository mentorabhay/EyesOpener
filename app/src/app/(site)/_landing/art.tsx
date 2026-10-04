/**
 * Drawings for the landing page, in the three inks of a therapy scene.
 * Red reaches the eye behind the red lens (the stronger eye, turned down), cyan reaches the eye behind the cyan lens
 * (the weaker eye, full strength). Where red and cyan lie on top of each other the screen shows white: that is why a
 * shape drawn in both inks is seen by both eyes.
 */

const RED = "#ff0000";
const CYAN = "#00ffff";
const WHITE = "#ffffff";
/** How far the stronger eye's own shapes are turned down in these drawings. An example, not a member's setting. */
const DIM = 0.5;

/** Lantern Run, the part both eyes see: the frame, the ground and a string of lights. */
function Shared({ c, frame = true }: { c: string; frame?: boolean }) {
  const bulbs: [number, number][] = [[92, 76], [164, 88], [236, 88], [298, 78], [376, 59], [447, 49], [519, 48], [577, 54]];
  return (
    <g stroke={c} fill="none" strokeLinecap="round" strokeLinejoin="round">
      {frame && <rect x="10" y="10" width="620" height="340" rx="20" strokeWidth="3" />}
      <path d={frame ? "M34 292H606" : "M-200 292H840"} strokeWidth="5" />
      <path d="M34 58Q180 112 320 72T606 58" strokeWidth="2.5" />
      {bulbs.map(([x, y]) => (<rect key={x} x={x - 6} y={y + 4} width="12" height="15" rx="5" fill={c} stroke="none" />))}
    </g>
  );
}

/** The part only the weaker eye sees: the runner and the coins. */
function Weak() {
  const coins: [number, number][] = [[300, 128], [346, 104], [392, 128], [514, 146]];
  return (
    <g>
      <g stroke={CYAN} strokeWidth="11" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M236 172L226 214" />
        <path d="M232 184L262 172M232 184L204 198" />
        <path d="M226 214L252 228L246 256M226 214L204 232L184 222" />
        <path d="M262 172V184" strokeWidth="4" />
      </g>
      <circle cx="238" cy="150" r="17" fill={CYAN} />
      <rect x="253" y="184" width="18" height="22" rx="6" fill={CYAN} />
      {coins.map(([x, y]) => (
        <g key={x}><circle cx={x} cy={y} r="13" fill={CYAN} /><circle cx={x} cy={y} r="6" fill="#000" /></g>
      ))}
    </g>
  );
}

/** The part only the stronger eye sees, turned down: the crates in the way. */
function Strong() {
  return (
    <g fill={RED} opacity={DIM}>
      <rect x="318" y="236" width="56" height="56" rx="7" />
      <rect x="480" y="236" width="56" height="56" rx="7" />
      <rect x="486" y="184" width="44" height="48" rx="7" />
      <rect x="88" y="254" width="50" height="38" rx="12" />
      <g stroke="#000" strokeWidth="4" strokeLinecap="round">
        <path d="M330 248L362 280M362 248L330 280M492 248L524 280M524 248L492 280" />
      </g>
    </g>
  );
}

/** One eye's picture of the scene. Two of these on top of each other, blended as light, make the whole game. */
export function LanternLayer({ ink, label, ...rest }: { ink: "strong" | "weak"; label: string } & Record<`data-${string}`, string>) {
  return (
    <svg viewBox="0 0 640 360" role="img" aria-label={label} {...rest}>
      <Shared c={ink === "strong" ? RED : CYAN} />
      {ink === "strong" ? <Strong /> : <Weak />}
    </svg>
  );
}

/** The whole scene as it looks on the screen without glasses. With `slice` it fills its box and the ground runs edge to edge. */
export function LanternScene({ label, slice = false }: { label?: string; slice?: boolean }) {
  return (
    <svg viewBox="0 0 640 360" preserveAspectRatio={slice ? "xMidYMid slice" : "xMidYMid meet"} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <Shared c={WHITE} frame={!slice} />
      <Strong />
      <Weak />
    </svg>
  );
}

/** Red-cyan glasses. The frame takes the text colour. */
export function Glasses({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 132 52" role="img" aria-label={label}>
      <rect x="12" y="10" width="46" height="32" rx="13" fill={RED} />
      <rect x="74" y="10" width="46" height="32" rx="13" fill={CYAN} />
      <g fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
        <rect x="12" y="10" width="46" height="32" rx="13" />
        <rect x="74" y="10" width="46" height="32" rx="13" />
        <path d="M58 24Q66 15 74 24M12 22L3 16M120 22L129 16" />
      </g>
    </svg>
  );
}

/** A small tick, for a rule that holds or a seat that is filled. */
export function Tick() {
  return (<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5L6.7 11.5L12.5 5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>);
}

/** A heading's words, with every hyphenated word kept on one line ("two-minute" never breaks after "two-"). */
export function Words({ text }: { text: string }) {
  const parts = text.split(" ");
  return (
    <>
      {parts.map((word, i) => (
        <span key={i}>{word.includes("-") ? <span className="lp-nb">{word}</span> : word}{i < parts.length - 1 ? " " : ""}</span>
      ))}
    </>
  );
}
