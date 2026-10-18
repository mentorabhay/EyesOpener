import Link from "next/link";
import { landing } from "@/copy/landing";

/**
 * The thread: a red line and a cyan line that swing through the giant type in opposite directions, a little less each
 * time, until they meet and leave as one white line. It is drawn in a box centred on the heading (1440 x 640 units).
 */
/** Where the two lines cross. The first two crossings lie off the left edge, so on a very wide screen the lines still come in from outside. */
const CROSS = [-640, -350, -60, 230, 490, 720, 910, 1060, 1170, 1260];
const MID = 320;
const SWING = 0.62;
const n = (v: number) => Math.round(v * 10) / 10;

function strand(startsUp: boolean): string {
  let d = `M${CROSS[0]} ${MID}`;
  let up = startsUp;
  for (let i = 0; i < CROSS.length - 1; i++) {
    const a = CROSS[i], b = CROSS[i + 1], w = b - a;
    const peak = (up ? -1 : 1) * SWING * w * (4 / 3);
    const last = i === CROSS.length - 2;
    d += ` C${n(a + w / 3)} ${n(MID + peak)} ${n(b - w / 3)} ${n(MID + (last ? 0 : peak))} ${b} ${MID}`;
    up = !up;
  }
  return d;
}

const RED_PATH = strand(true);
const CYAN_PATH = strand(false);
const END = CROSS[CROSS.length - 1];
/** The joined line: on a wide screen it curls down past the buttons; on a phone it leaves to the side. */
const WHITE_WIDE = `M${END} ${MID} C${END + 70} ${MID} ${END + 112} ${MID + 72} ${END + 112} ${MID + 160} S${END + 70} ${MID + 440} ${END + 128} ${MID + 780}`;
const WHITE_NARROW = `M${END} ${MID} H1560`;

/** In front of the type the two lines take turns, one swing each: that is what makes them weave. */
function Turns({ id, odd }: { id: string; odd: boolean }) {
  return (
    <clipPath id={id}>
      {CROSS.slice(0, -1).map((a, i) => (i % 2 === (odd ? 1 : 0) ? <rect key={a} x={a} y={-200} width={CROSS[i + 1] - a} height={1040} /> : null))}
    </clipPath>
  );
}

function Row({ text, split }: { text: string; split?: boolean }) {
  return (
    <span className="lp-h1-row" data-split={split ? "" : undefined}>
      <span className="lp-h1-ink">{text}</span>
      <span className="lp-ghost lp-ghost-r" aria-hidden="true">{text}</span>
      <span className="lp-ghost lp-ghost-c" aria-hidden="true">{text}</span>
    </span>
  );
}

export function Hero() {
  const t = landing.hero;
  return (
    <section className="lp-hero" data-scene="hero">
      <div className="lp-hero-stage">
        <div className="lp-hero-in">
          <div className="lp-h1-wrap">
            <svg className="lp-thread lp-thread-back" viewBox="0 0 1440 640" aria-hidden="true">
              <path className="lp-draw" pathLength={1} d={RED_PATH} stroke="#ff0000" />
              <path className="lp-draw lp-screen" pathLength={1} d={CYAN_PATH} stroke="#00ffff" />
              <path className="lp-draw lp-draw-late lp-wide" pathLength={1} d={WHITE_WIDE} stroke="#ffffff" />
              <path className="lp-draw lp-draw-late lp-narrow" pathLength={1} d={WHITE_NARROW} stroke="#ffffff" />
              <circle className="lp-join" cx={END} cy={MID} r="9" fill="#ffffff" />
            </svg>
            <h1 className="lp-h1">
              <Row text={t.line1} split />{" "}
              <Row text={t.line2} />
            </h1>
            <svg className="lp-thread lp-thread-front" viewBox="0 0 1440 640" aria-hidden="true">
              <defs><Turns id="lp-turn-red" odd={false} /><Turns id="lp-turn-cyan" odd /></defs>
              <g clipPath="url(#lp-turn-red)"><path className="lp-draw" pathLength={1} d={RED_PATH} stroke="#ff0000" /></g>
              <g clipPath="url(#lp-turn-cyan)"><path className="lp-draw" pathLength={1} d={CYAN_PATH} stroke="#00ffff" /></g>
            </svg>
            <div className="lp-chips" aria-hidden="true">
              <span className="lp-chip-pos" style={{ left: "1.5%", top: "4%" }} data-chip><span className="lp-chip"><i style={{ background: "#ff0000" }} />{t.chips.strong}</span></span>
              <span className="lp-chip-pos" style={{ left: "1.5%", top: "86%" }} data-chip><span className="lp-chip"><i style={{ background: "#00ffff" }} />{t.chips.weak}</span></span>
              <span className="lp-chip-pos lp-chip-end" style={{ right: "1.5%", top: "32%" }} data-chip><span className="lp-chip"><i style={{ background: "#ffffff" }} />{t.chips.both}</span></span>
            </div>
          </div>
          <p className="lp-hero-lead">{t.lead}</p>
          <div className="lp-ctas">
            <Link className="btn btn-g lp-btn" href="/setup">{t.start}</Link>
            <a className="btn lp-btn lp-btn-line" href="#how" data-scrollto>{t.how}</a>
          </div>
        </div>
      </div>
    </section>
  );
}
