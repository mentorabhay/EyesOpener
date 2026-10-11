// Eyes Opener: Cue pictures are drawn on a black field like the game. Red is shown at full strength here so it is easy to see. .
import type { Cue, CueInk, Shape } from "@/data/game-guides";
import { CUE_H, CUE_W } from "@/data/game-guides/cue";

/** Cue pictures are drawn on a black field like the game. Red is shown at full strength here so it is easy to see. */
const INK: Record<CueInk, string> = { weak: "#00ffff", strong: "#ff2a2a", both: "#ffffff", dim: "#7b808c" };
const AMBER = "#F4AA2D";

function Draw({ s }: { s: Shape }) {
  /* Red and cyan add up to white where they overlap, as they do in the game. */
  const blend = { mixBlendMode: "screen" as const };
  switch (s.t) {
    case "ring": return <circle cx={s.x} cy={s.y} r={s.r} fill="none" stroke={INK[s.ink]} strokeWidth={s.w ?? 1.6} style={blend} />;
    case "disc": return <circle cx={s.x} cy={s.y} r={s.r} fill={INK[s.ink]} style={blend} />;
    case "box": return <rect x={s.x} y={s.y} width={s.w} height={s.h} fill={s.fill ? INK[s.ink] : "none"} stroke={s.fill ? "none" : INK[s.ink]} strokeWidth={1.2} style={blend} />;
    case "line": return <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={INK[s.ink]} strokeWidth={s.w ?? 1.4} strokeLinecap="round" style={blend} />;
    case "poly": return <polygon points={s.pts.map((p) => p.join(",")).join(" ")} fill={s.fill === false ? "none" : INK[s.ink]} stroke={INK[s.ink]} strokeWidth={1.2} strokeLinejoin="round" style={blend} />;
    case "text": return <text x={s.x} y={s.y} fill={INK[s.ink]} fontSize={s.size ?? 8} fontWeight={700} textAnchor={s.anchor ?? "start"} fontFamily="Verdana, sans-serif">{s.s}</text>;
    case "tap": return (
      <g>
        <circle className="cue-tap" cx={s.x} cy={s.y} r={9} fill="none" stroke={AMBER} strokeWidth={1} opacity={0.55} />
        <circle cx={s.x} cy={s.y} r={5.5} fill="none" stroke={AMBER} strokeWidth={1.6} />
        <circle cx={s.x} cy={s.y} r={2.2} fill={AMBER} />
      </g>
    );
    case "key": {
      const w = Math.max(14, s.s.length * 5.2 + 8);
      return (
        <g>
          <rect x={s.x - w / 2} y={s.y - 7} width={w} height={14} rx={3} fill="#1b1d22" stroke={AMBER} strokeWidth={1.2} />
          <text x={s.x} y={s.y + 2.8} fill="#ffffff" fontSize={7.5} fontWeight={700} textAnchor="middle" fontFamily="Verdana, sans-serif">{s.s}</text>
        </g>
      );
    }
  }
}

/** One cue picture: the scene as a small drawing. The words beside it are the caption, so the drawing itself is decoration for a screen reader. */
export function CuePicture({ shapes }: { shapes: Shape[] }) {
  return (
    <svg viewBox={`0 0 ${CUE_W} ${CUE_H}`} width="100%" role="img" aria-hidden="true" style={{ display: "block", background: "#000", borderRadius: 10, isolation: "isolate" }}>
      {shapes.map((s, i) => <Draw key={i} s={s} />)}
    </svg>
  );
}

/** "When you see this, do this": the pictures in a row, each with what it shows and what to do. */
export function Cues({ cues, tones }: { cues: Cue[]; tones: Record<Cue["tone"], string> }) {
  if (!cues.length) return null;
  return (
    <ol className="cue-row">
      {cues.map((c) => (
        <li key={c.title} className="cue" data-tone={c.tone}>
          <CuePicture shapes={c.shapes} />
          <div className="cue-b">
            <span className="chip" data-b={c.tone === "go" ? "ok" : c.tone === "stop" ? "warn" : "plain"}>{tones[c.tone]}</span>
            <b>{c.title}</b>
            <span>{c.then}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
