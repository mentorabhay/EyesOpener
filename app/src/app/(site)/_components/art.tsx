// Eyes Opener: Drawings for the public site. All inline SVG: no photos, no image files.
/**
 * Drawings for the public site. All inline SVG: no photos, no image files.
 * A drawing that says something carries a label; one that only decorates is hidden from screen readers.
 */
import type { ReactNode } from "react";

/** Two lights, one world: a red light and a cyan light overlap and make white. It is what the glasses and the brain do. */
export function TwoLights({ label, className = "s-art" }: { label?: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 400 300" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <rect width="400" height="300" rx="20" fill="#000" />
      <g style={{ isolation: "isolate" }}>
        <circle cx="160" cy="150" r="92" fill="#ff0000" style={{ mixBlendMode: "screen" }} />
        <circle cx="240" cy="150" r="92" fill="#00ffff" style={{ mixBlendMode: "screen" }} />
      </g>
      <circle cx="200" cy="150" r="132" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="1.5" strokeDasharray="2 7" />
    </svg>
  );
}

/** The same two lights with no field behind them, for the dark closing band. */
export function LightsBare({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 380 260" aria-hidden="true">
      <g style={{ isolation: "isolate" }}>
        <circle cx="140" cy="130" r="110" fill="#ff0000" style={{ mixBlendMode: "screen" }} />
        <circle cx="240" cy="130" r="110" fill="#00ffff" style={{ mixBlendMode: "screen" }} />
      </g>
    </svg>
  );
}

/** A pair of red-cyan glasses, seen from the front. */
export function Glasses({ label }: { label: string }) {
  return (
    <svg className="s-art" viewBox="0 0 400 150" role="img" aria-label={label}>
      <path d="M22 44c-8 0-12 6-12 12M378 44c8 0 12 6 12 12" fill="none" stroke="var(--ink)" strokeWidth="6" strokeLinecap="round" />
      <rect x="28" y="30" width="150" height="92" rx="34" fill="#00ffff" fillOpacity=".5" stroke="var(--ink)" strokeWidth="6" />
      <rect x="222" y="30" width="150" height="92" rx="34" fill="#ff0000" fillOpacity=".5" stroke="var(--ink)" strokeWidth="6" />
      <path d="M178 62c12-12 32-12 44 0" fill="none" stroke="var(--ink)" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

/** The three rings of the eye day, as an example: no numbers, only how full each ring is. */
export function RingsArt({ label, shares }: { label: string; shares: [number, number, number] }) {
  const ring = (r: number, share: number, colour: string) => {
    const c = 2 * Math.PI * r;
    return (
      <g key={r}>
        <circle cx="60" cy="60" r={r} fill="none" stroke={colour} strokeOpacity=".18" strokeWidth="9" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={colour} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(c * share).toFixed(1)} ${c.toFixed(1)}`} transform="rotate(-90 60 60)" />
      </g>
    );
  };
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label={label}>
      {ring(50, shares[0], "var(--ring-rest)")}{ring(38, shares[1], "var(--ring-train)")}{ring(26, shares[2], "var(--ring-light)")}
    </svg>
  );
}

const Line = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

/** Small line drawings, one for each idea. They decorate a heading that already says the thing in words. */
export const icons: Record<string, ReactNode> = {
  track: <Line><path d="M12 3a9 9 0 1 0 9 9" /><path d="M12 7.5a4.5 4.5 0 1 0 4.5 4.5" /><circle cx="12" cy="12" r=".6" fill="currentColor" /></Line>,
  test: <Line><path d="M17 5H8v14h9M8 12h7" /></Line>,
  train: <Line><rect x="3" y="7" width="18" height="10" rx="5" /><path d="M8 10.5v3M6.5 12h3" /><circle cx="15.5" cy="11" r=".7" fill="currentColor" /><circle cx="17.5" cy="13" r=".7" fill="currentColor" /></Line>,
  together: <Line><circle cx="9" cy="12" r="5.5" /><circle cx="15" cy="12" r="5.5" /></Line>,
  web: <Line><rect x="4" y="5" width="16" height="11" rx="2" /><path d="M2 19h20" /></Line>,
  phone: <Line><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></Line>,
  tv: <Line><rect x="2.5" y="4" width="19" height="13" rx="2" /><path d="M8 20.5h8M12 17v3.5" /></Line>,
  free: <Line><path d="M12 20s-7-4.3-7-9.5A4 4 0 0 1 12 8a4 4 0 0 1 7 2.5C19 15.7 12 20 12 20z" /></Line>,
  open: <Line><path d="M9 8l-4 4 4 4M15 8l4 4-4 4" /></Line>,
  research: <Line><path d="M5 4h10l4 4v12H5z" /><path d="M9 12h6M9 16h6M9 8h3" /></Line>,
  privacy: <Line><path d="M12 3l7 3v5.5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5V6z" /><path d="M9.5 12l2 2 3.5-4" /></Line>,
  questions: <Line><path d="M5 5h14v10H10l-5 4z" /><path d="M10.5 9a1.7 1.7 0 1 1 2.4 1.5c-.600.3-.900.7-.900 1.3" /><circle cx="12" cy="13.6" r=".5" fill="currentColor" /></Line>,
  doctor: <Line><path d="M12 5v14M5 12h14" /><circle cx="12" cy="12" r="9" /></Line>,
  cap: <Line><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9.5 2.5h5" /></Line>,
  age: <Line><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20c.500-4 3-6 6.5-6s6 2 6.5 6" /></Line>,
  stop: <Line><path d="M8.2 3h7.6L21 8.2v7.6L15.8 21H8.2L3 15.8V8.2z" /><path d="M9 12h6" /></Line>,
  flash: <Line><path d="M13 3L6 13h5l-1 8 7-10h-5z" /><path d="M4 4l16 16" /></Line>,
  counsellor: <Line><circle cx="9" cy="8.5" r="3" /><path d="M3.5 19c.500-3.5 2.5-5 5.5-5s5 1.5 5.5 5" /><path d="M16 11l1.8 1.8L21 9.5" /></Line>,
  ai: <Line><rect x="5" y="7" width="14" height="11" rx="3" /><path d="M12 4v3M9.5 12v1.5M14.5 12v1.5M3 12.5h2M19 12.5h2" /></Line>,
  consent: <Line><circle cx="8" cy="9" r="3" /><circle cx="16.5" cy="11" r="2.2" /><path d="M3 19c.400-3 2-4.5 5-4.5s4.6 1.5 5 4.5M14 19c.300-2 1.2-3 2.5-3s2.2 1 2.5 3" /></Line>,
};

export const Icon = ({ name }: { name: string }) => <span className="s-icon">{icons[name]}</span>;
