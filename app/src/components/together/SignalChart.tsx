// Eyes Opener: A stored number as written, with a true minus sign and a plus on gains. .
import { together } from "@/copy/together";
import s from "./together.module.css";

const t = together.signal;
const W = 320, PAD = 6, ROW = 44, BAR = 14;

/** A stored number as written, with a true minus sign and a plus on gains. */
export const signed = (n: number) => `${n < 0 ? "−" : n > 0 ? "+" : ""}${Math.abs(Number(n.toFixed(2)))}`;

/**
 * Change in the group that tried an idea against the group that did not, and the gap between them with its low to high range.
 * Draws the stored numbers and nothing else: no smoothing, no rounding beyond two decimals.
 */
export function SignalChart({ signal }: { signal: { nTried: number; nControl: number; changeTried: number; changeControl: number; low: number; high: number } }) {
  const gap = signal.changeTried - signal.changeControl;
  const lo = Math.min(0, signal.changeTried, signal.changeControl, signal.low);
  const hi = Math.max(0, signal.changeTried, signal.changeControl, signal.high);
  const x = (v: number) => PAD + ((v - lo) / (hi - lo || 1)) * (W - 2 * PAD);
  /* A bar from the zero line: square at the baseline, rounded at the data end. */
  const bar = (v: number, y: number) => {
    const [x0, x1] = [x(0), x(v)];
    const r = Math.min(4, Math.abs(x1 - x0)) * Math.sign(x1 - x0);
    return `M${x0},${y} H${x1 - r} Q${x1},${y} ${x1},${y + 4} V${y + BAR - 4} Q${x1},${y + BAR} ${x1 - r},${y + BAR} H${x0} Z`;
  };
  const groups = [
    { label: `${t.tried}, ${t.members(signal.nTried)}`, value: signal.changeTried, mark: s.tried },
    { label: `${t.control}, ${t.members(signal.nControl)}`, value: signal.changeControl, mark: s.control },
  ];
  const range = `${signed(signal.low)} ${t.to} ${signed(signal.high)}`;
  const gy = 2 * ROW + 27;
  return (
    <svg className={s.signal} viewBox={`0 0 ${W} ${3 * ROW + 14}`} role="img"
      aria-label={`${groups.map((g) => `${g.label}: ${signed(g.value)}`).join(". ")}. ${t.gap}: ${signed(gap)}. ${t.range}: ${range}.`}>
      {/* The zero line is drawn beside each mark only, so it never runs through a label. */}
      <path className={s.axis} d={[0, 1, 2].map((i) => `M${x(0)},${i * ROW + 17} v${BAR + 6}`).join(" ")} />
      <text x={x(0)} y={3 * ROW + 10} textAnchor="middle">0</text>
      {groups.map((g, i) => (
        <g key={g.label}>
          <text x={PAD} y={i * ROW + 12}>{g.label}</text>
          <text className={s.val} x={W - PAD} y={i * ROW + 12} textAnchor="end">{signed(g.value)}</text>
          <path className={g.mark} d={bar(g.value, i * ROW + 20)}><title>{`${g.label}: ${signed(g.value)}`}</title></path>
        </g>
      ))}
      <text x={PAD} y={2 * ROW + 12}>{t.gap}</text>
      <text className={s.val} x={W - PAD} y={2 * ROW + 12} textAnchor="end">{`${signed(gap)} (${range})`}</text>
      <g>
        <title>{`${t.range}: ${range}`}</title>
        <path className={s.whisker} fill="none" d={`M${x(signal.low)},${gy - 5} v10 M${x(signal.low)},${gy} H${x(signal.high)} M${x(signal.high)},${gy - 5} v10`} />
        <circle className={s.dot} cx={x(gap)} cy={gy} r={5} />
      </g>
    </svg>
  );
}
