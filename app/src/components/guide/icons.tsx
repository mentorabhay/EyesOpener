// Eyes Opener: Small drawn pictures for the step strips (flow.tsx). Each is 160 by 100 and moves gently, and only while its step.
/**
 * Small drawn pictures for the step strips (flow.tsx). Each is 160 by 100 and moves gently, and only while its step
 * is the one in view: the classes named `a-*` are animated by guide.module.css under the active step. Nothing
 * flashes; with "reduce motion" on, nothing moves at all. The words beside a picture say what it shows, so every
 * picture is hidden from a screen reader.
 * Server-safe: no hooks, no browser APIs.
 */
import type { ReactNode } from "react";
import type { Eye } from "@/engine";
import type { IconKey } from "@/lib/guide-steps";
import css from "./guide.module.css";



/* the two lens colours, a little softer than the scene inks so they sit well on a light card */
const RED = "#ff4545", CYAN = "#14cfe4";

const Svg = ({ children }: { children: ReactNode }) => (
  <svg className={css.icon} viewBox="0 0 160 100" aria-hidden="true" focusable="false">{children}</svg>
);

/** Red-cyan glasses seen from behind, as the wearer holds them: the left lens is on the left. */
function Glasses({ cyan = "L" }: { cyan?: Eye }) {
  const [l, r] = cyan === "L" ? [CYAN, RED] : [RED, CYAN];
  return (
    <Svg>
      <g className="a-drop">
        <rect x="28" y="38" width="44" height="28" rx="11" fill={l} fillOpacity=".75" />
        <rect x="88" y="38" width="44" height="28" rx="11" fill={r} fillOpacity=".75" />
        <path d="M72 48 q8 -7 16 0" />
        <path d="M28 46 l-12 -6 M132 46 l12 -6" />
      </g>
    </Svg>
  );
}

const EyeShape = ({ x, y, s = 1, children }: { x: number; y: number; s?: number; children?: ReactNode }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-24 0 Q0 -18 24 0 Q0 18 -24 0 Z" fill="var(--card)" />
    {children ?? <g className="a-look"><circle r="8" fill="var(--g1)" fillOpacity=".85" stroke="none" /><circle r="3.4" fill="var(--ink)" stroke="none" /></g>}
  </g>
);

export type { IconKey };

const shapes: Record<IconKey, (p: { cyan?: Eye }) => ReactNode> = {
  glasses: Glasses,
  patch: () => (
    <Svg>
      <EyeShape x={52} y={50} />
      <EyeShape x={108} y={50} />
      <path d="M20 34 L140 46" strokeWidth="1.6" />
      <ellipse className="a-drop" cx="108" cy="50" rx="27" ry="20" fill="var(--ink)" stroke="none" />
    </Svg>
  ),
  screen: () => (
    <Svg>
      <rect x="30" y="16" width="100" height="62" rx="7" fill="var(--card)" />
      <path d="M70 90 h20 M80 78 v12" />
      <path className="a-draw" d="M42 56 q12 -22 24 0 t24 0 t24 0" stroke="var(--g1)" pathLength="1" />
    </Svg>
  ),
  card: () => (
    <Svg>
      <rect x="22" y="16" width="100" height="62" rx="7" fill="var(--card)" />
      <path d="M62 90 h20 M72 78 v12" />
      <g className="a-slide">
        <rect x="70" y="40" width="62" height="38" rx="5" fill="var(--g2)" fillOpacity=".85" stroke="none" />
        <rect x="78" y="48" width="12" height="9" rx="2" fill="var(--card)" stroke="none" />
      </g>
      <path d="M70 32 h62 M70 28 v8 M132 28 v8" stroke="var(--g1)" />
    </Svg>
  ),
  eye: () => <Svg><EyeShape x={80} y={50} s={1.7} /></Svg>,
  cover: () => (
    <Svg>
      <EyeShape x={52} y={50} />
      <EyeShape x={108} y={50} />
      <g className="a-slide">
        <rect x="84" y="24" width="48" height="56" rx="22" fill="var(--g2)" fillOpacity=".9" stroke="none" />
      </g>
    </Svg>
  ),
  tap: () => (
    <Svg>
      <rect x="40" y="14" width="80" height="72" rx="10" fill="var(--card)" />
      <circle className="a-ripple" cx="80" cy="50" r="16" stroke="var(--g2)" />
      <circle cx="80" cy="50" r="7" fill="var(--g2)" stroke="none" />
    </Svg>
  ),
  keys: () => {
    const cap = (x: number, y: number, label: string, cls = "") => (
      <g className={cls} style={{ transformOrigin: `${x + 13}px ${y + 11}px` }}>
        <rect x={x} y={y} width="26" height="22" rx="5" fill="var(--card)" />
        <text x={x + 13} y={y + 15.5} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--ink-2)" stroke="none">{label}</text>
      </g>
    );
    return (
      <Svg>
        {cap(67, 10, "↑")}{cap(37, 38, "←", "a-press")}{cap(67, 38, "OK")}{cap(97, 38, "→")}{cap(67, 66, "↓")}
      </Svg>
    );
  },
  timer: () => (
    <Svg>
      <circle cx="80" cy="54" r="32" fill="var(--card)" />
      <path d="M72 14 h16 M80 14 v8" />
      <path className="a-spin" d="M80 54 L80 30" stroke="var(--g1)" strokeWidth="3" style={{ transformOrigin: "80px 54px" }} />
      <circle cx="80" cy="54" r="3" fill="var(--ink-2)" stroke="none" />
    </Svg>
  ),
  far: () => (
    <Svg>
      <EyeShape x={30} y={54} s={0.8} />
      <path className="a-dash" d="M52 54 H104" strokeDasharray="4 6" stroke="var(--g1)" />
      <path d="M104 74 L122 40 L134 58 L142 46 L156 74 Z" fill="var(--grad-soft)" />
    </Svg>
  ),
  chart: () => (
    <Svg>
      <path d="M30 18 V80 H134" />
      <path className="a-draw" d="M36 70 L58 60 L78 64 L100 44 L126 30" stroke="var(--g1)" strokeWidth="3" pathLength="1" />
      <circle cx="126" cy="30" r="4" fill="var(--g2)" stroke="none" />
    </Svg>
  ),
  check: () => (
    <Svg>
      <circle cx="80" cy="50" r="32" fill="var(--card)" />
      <path className="a-draw" d="M64 51 L76 63 L98 39" stroke="var(--ok)" strokeWidth="4" pathLength="1" />
    </Svg>
  ),
  stop: () => (
    <Svg>
      <g className="a-breathe" style={{ transformOrigin: "80px 50px" }}>
        <rect x="50" y="20" width="60" height="60" rx="18" fill="var(--card)" stroke="var(--g2)" />
        <path d="M72 38 v24 M88 38 v24" strokeWidth="5" stroke="var(--g2)" />
      </g>
    </Svg>
  ),
  sliders: () => (
    <Svg>
      {[30, 50, 70].map((y, i) => (
        <g key={y}>
          <path d={`M34 ${y} H126`} />
          <circle className="a-knob" cx="64" cy={y} r="7" fill={i === 0 ? CYAN : i === 1 ? RED : "var(--g1)"} stroke="none" style={{ animationDelay: `${i * 0.35}s` }} />
        </g>
      ))}
    </Svg>
  ),
  list: () => (
    <Svg>
      {[26, 50, 74].map((y, i) => (
        <g key={y}>
          <rect x="40" y={y - 8} width="16" height="16" rx="4" fill="var(--card)" />
          <path className="a-tick" d={`M43 ${y} l4 4 l7 -8`} stroke="var(--ok)" strokeWidth="2.6" pathLength="1" style={{ animationDelay: `${i * 0.5}s` }} />
          <path d={`M66 ${y} H${118 - i * 10}`} />
        </g>
      ))}
    </Svg>
  ),
  people: () => (
    <Svg>
      {[[56, 1], [80, 1.25], [104, 0.85]].map(([x, s], i) => (
        <g key={x} className="a-bob" style={{ animationDelay: `${i * 0.25}s` }}>
          <circle cx={x} cy={46 - 10 * s} r={8 * s} fill="var(--card)" />
          <path d={`M${x - 14 * s} 84 q0 -${26 * s} ${14 * s} -${26 * s} q${14 * s} 0 ${14 * s} ${26 * s}`} fill="var(--card)" />
        </g>
      ))}
    </Svg>
  ),
  play: () => (
    <Svg>
      <g className="a-breathe" style={{ transformOrigin: "80px 50px" }}>
        <circle cx="80" cy="50" r="30" fill="var(--g1)" stroke="none" />
        <path d="M72 36 L96 50 L72 64 Z" fill="#fff" stroke="none" />
      </g>
    </Svg>
  ),
  print: () => (
    <Svg>
      <rect x="40" y="36" width="80" height="34" rx="6" fill="var(--card)" />
      <path d="M54 36 V18 H106 V36" />
      <g className="a-slide-y"><rect x="56" y="58" width="48" height="30" rx="2" fill="var(--card)" /><path d="M64 68 h32 M64 76 h22" strokeWidth="1.6" /></g>
    </Svg>
  ),
  book: () => (
    <Svg>
      <path d="M80 28 Q60 18 32 22 V78 Q60 74 80 84 Q100 74 128 78 V22 Q100 18 80 28 Z" fill="var(--card)" />
      <path d="M80 28 V84" />
      <path className="a-draw" d="M42 38 h26 M42 48 h26 M42 58 h20 M92 38 h26 M92 48 h26 M92 58 h20" strokeWidth="1.8" stroke="var(--g1)" pathLength="1" />
    </Svg>
  ),
  film: () => (
    <Svg>
      <rect x="26" y="20" width="108" height="60" rx="6" fill="var(--ink)" stroke="none" />
      <g className="a-slide">
        {[34, 58, 82, 106].map((x) => <rect key={x} x={x} y="34" width="18" height="32" rx="3" fill={x === 58 ? CYAN : x === 82 ? RED : "#e9e9ef"} fillOpacity=".85" stroke="none" />)}
      </g>
      {[30, 46, 62, 78, 94, 110, 126].map((x) => <rect key={x} x={x} y="24" width="6" height="5" rx="1" fill="#fff" fillOpacity=".5" stroke="none" />)}
    </Svg>
  ),
  question: () => (
    <Svg>
      <path className="a-bob" d="M42 22 H118 Q128 22 128 32 V62 Q128 72 118 72 H74 L58 86 V72 H42 Q32 72 32 62 V32 Q32 22 42 22 Z" fill="var(--card)" />
      <text x="80" y="58" textAnchor="middle" fontSize="30" fontWeight="700" fill="var(--g1)" stroke="none">?</text>
    </Svg>
  ),
  letters: () => (
    <Svg>
      <rect x="44" y="10" width="72" height="80" rx="6" fill="var(--card)" />
      {[[80, 36, 24], [68, 58, 14], [92, 58, 14], [64, 76, 9], [80, 76, 9], [96, 76, 9]].map(([x, y, s], i) => (
        <text key={i} className={i === 1 ? "a-glow" : undefined} x={x} y={y} textAnchor="middle" fontSize={s} fontWeight="700" fill="var(--ink)" stroke="none">E</text>
      ))}
    </Svg>
  ),
  swap: () => (
    <Svg>
      <circle className="a-swap-l" cx="54" cy="50" r="16" fill={CYAN} fillOpacity=".8" stroke="none" />
      <circle className="a-swap-r" cx="106" cy="50" r="16" fill={RED} fillOpacity=".8" stroke="none" />
      <path d="M64 26 Q80 14 96 26 M92 22 l4 4 l-5 2" />
      <path d="M96 74 Q80 86 64 74 M68 78 l-4 -4 l5 -2" />
    </Svg>
  ),
  pen: () => (
    <Svg>
      <path d="M20 30 Q30 50 20 70" />
      <g className="a-slide-x"><path d="M60 50 H138" strokeWidth="5" stroke="var(--g1)" /><circle cx="58" cy="50" r="5" fill="var(--g2)" stroke="none" /></g>
      <path d="M26 86 H140" strokeDasharray="3 5" strokeWidth="1.6" />
    </Svg>
  ),
  download: () => (
    <Svg>
      <path d="M40 66 V80 H120 V66" />
      <g className="a-drop"><path d="M80 18 V60 M64 46 L80 62 L96 46" stroke="var(--g1)" strokeWidth="3" /></g>
    </Svg>
  ),
  trash: () => (
    <Svg>
      <path className="a-bob" d="M56 26 H104 M72 26 V20 H88 V26" />
      <path d="M60 32 L64 84 H96 L100 32 Z" fill="var(--card)" />
      <path d="M74 42 V74 M86 42 V74" strokeWidth="1.8" />
    </Svg>
  ),
  rings: () => (
    <Svg>
      <circle className="a-join-l" cx="70" cy="50" r="24" stroke={CYAN} strokeWidth="3.4" />
      <circle className="a-join-r" cx="90" cy="50" r="24" stroke={RED} strokeWidth="3.4" />
    </Svg>
  ),
  dots: () => (
    <Svg>
      <rect x="40" y="10" width="80" height="80" rx="10" fill="var(--ink)" stroke="none" />
      {[[80, 30, RED], [62, 50, CYAN], [98, 50, CYAN], [80, 70, "#fff"]].map(([x, y, f], i) => (
        <circle key={i} className="a-glow" cx={x} cy={y} r="7" fill={f as string} stroke="none" style={{ animationDelay: `${i * 0.4}s` }} />
      ))}
    </Svg>
  ),
  drop: () => (
    <Svg>
      <rect x="28" y="38" width="44" height="28" rx="11" fill={CYAN} fillOpacity=".75" />
      <rect x="88" y="38" width="44" height="28" rx="11" fill={RED} fillOpacity=".75" />
      <path d="M72 48 q8 -7 16 0" />
      <path className="a-drop" d="M110 14 Q118 26 110 30 Q102 26 110 14 Z" fill={CYAN} fillOpacity=".8" stroke="none" />
    </Svg>
  ),
  sun: () => (
    <Svg>
      <g className="a-spin" style={{ transformOrigin: "80px 50px", animationDuration: "14s" }}>
        {Array.from({ length: 8 }, (_, i) => <path key={i} d="M80 14 V24" transform={`rotate(${i * 45} 80 50)`} stroke="var(--g2)" />)}
      </g>
      <circle cx="80" cy="50" r="17" fill="var(--g2)" fillOpacity=".85" stroke="none" />
    </Svg>
  ),
};

/** One picture by name. `cyan` is the eye behind the cyan lens, for the glasses. */
export function Icon({ k, cyan }: { k: IconKey; cyan?: Eye }) {
  const Shape = shapes[k];
  return <Shape cyan={cyan} />;
}

/** A large step number in a ring that draws itself: for a step that has words but no picture of its own. */
export function NumPic({ n }: { n: number }) {
  return (
    <Svg>
      <circle cx="80" cy="50" r="32" stroke="var(--line-2)" strokeWidth="4" />
      <circle className="a-ring" cx="80" cy="50" r="32" stroke="var(--g1)" strokeWidth="4" pathLength="1" transform="rotate(-90 80 50)" />
      <text x="80" y="62" textAnchor="middle" fontSize="34" fontWeight="700" fill="var(--ink)" stroke="none">{n}</text>
    </Svg>
  );
}
