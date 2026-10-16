// Eyes Opener: The closing thread: the hero's two lines again, this time coming down. They cross, a little less each time,.
import Link from "next/link";
import { landing } from "@/copy/landing";
import { inEdition } from "@/edition";
import { Tick, Words } from "./art";

/**
 * The closing thread: the hero's two lines again, this time coming down. They cross, a little less each time,
 * and meet in one white line that ends just above the heading. Drawn in a fixed box of 1440 x 280 units.
 */
const CROSS = [-90, 24, 104, 164, 208, 236];
const MID = 720;
const SWING = 0.78;
const n = (v: number) => Math.round(v * 10) / 10;

function strand(startsLeft: boolean): string {
  let d = `M${MID} ${CROSS[0]}`;
  let left = startsLeft;
  for (let i = 0; i < CROSS.length - 1; i++) {
    const a = CROSS[i], b = CROSS[i + 1], h = b - a;
    const peak = (left ? -1 : 1) * SWING * h * (4 / 3);
    const last = i === CROSS.length - 2;
    d += ` C${n(MID + peak)} ${n(a + h / 3)} ${n(MID + (last ? 0 : peak))} ${n(b - h / 3)} ${MID} ${b}`;
    left = !left;
  }
  return d;
}
const END = CROSS[CROSS.length - 1];

/** What Eyes Opener is not. Said once, plainly, at full size. */
export function NotThis() {
  const t = landing.not;
  return (
    <section className="lp-not" data-scene="not">
      <div className="lp-wrap">
        <div className="lp-not-card">
          <h2 data-enter>{t.title}</h2>
          <div className="lp-not-list">
            <ul>
              {t.lines.map((l) => (
                <li key={l} data-enter><span className="lp-no" aria-hidden="true" />{l}</li>
              ))}
            </ul>
            <p className="lp-not-is" data-enter><span className="lp-yes" aria-hidden="true"><Tick /></span>{t.is}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The close: the two lines come down, meet, and point at the one thing to do next. */
export function Closing() {
  const t = landing.closing;
  return (
    <section className="lp-close" data-scene="close">
      <div className="lp-close-stage">
        <svg className="lp-close-thread" viewBox="0 0 1440 280" aria-hidden="true">
          <path data-close-line pathLength={1} d={strand(true)} stroke="#ff0000" />
          <path data-close-line className="lp-screen" pathLength={1} d={strand(false)} stroke="#00ffff" />
          <path data-close-join pathLength={1} d={`M${MID} ${END}V268`} stroke="#ffffff" />
          <circle data-close-dot cx={MID} cy="268" r="7" fill="#ffffff" />
        </svg>
        <div className="lp-close-in">
          <h2 data-enter><Words text={t.title} /></h2>
          <p className="lp-close-lead" data-enter>{t.lead}</p>
          <div className="lp-ctas" data-enter>
            <Link className="btn btn-g lp-btn" href="/setup">{t.start}</Link>
          </div>
          <p className="lp-hero-note" data-enter>{t.note}</p>
          <nav className="lp-more" aria-label={t.more} data-enter>
            <span>{t.more}</span>
            <ul>
              {t.links.filter((l) => inEdition(l.href)).map((l) => (<li key={l.href}><Link href={l.href}>{l.label}</Link></li>))}
            </ul>
          </nav>
        </div>
      </div>
    </section>
  );
}
