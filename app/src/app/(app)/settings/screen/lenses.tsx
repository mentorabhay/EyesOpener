// Eyes Opener: The glasses as a small picture, with the lens or lenses to look through open and the others shut. .
/** The glasses as a small picture, with the lens or lenses to look through open and the others shut. */
import { lensFilter } from "@/engine";

type Lens = "red" | "cyan";

/** The glasses, and which lens to look through. `turned` draws them the other way round. */
export function Lenses({ look, turned = false, label }: { look: Lens | "both"; turned?: boolean; label: string }) {
  const red = turned ? 66 : 30, cyan = turned ? 30 : 66;
  const lens = (cx: number, which: Lens) => (look === "both" || look === which
    ? <circle cx={cx} cy="28" r="15" fill={lensFilter(which === "red" ? "strong" : "weak")} />
    : <><circle cx={cx} cy="28" r="15" fill="#3a3d44" /><path d={`M${cx - 9} 28q9 7 18 0`} fill="none" stroke="#9aa1ac" strokeWidth="2.5" strokeLinecap="round" /></>);
  return (
    <svg viewBox="0 0 96 56" role="img" aria-label={label}>
      <rect width="96" height="56" rx="8" fill="#000" />
      {lens(red, "red")}{lens(cyan, "cyan")}
      <path d="M45 28h6" fill="none" stroke="#fff" strokeWidth="2.5" />
    </svg>
  );
}

