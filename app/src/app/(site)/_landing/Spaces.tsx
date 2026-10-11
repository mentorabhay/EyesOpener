// Eyes Opener: The app in a scroll: four example screens in direction B. With motion each one opens large, then shrinks and.
import type { ReactNode } from "react";
import { EvidenceChip, Rings } from "@/components/ui";
import { common } from "@/copy/common";
import { landing } from "@/copy/landing";
import { LanternScene } from "./art";
import type { LandingFacts } from "./types";

/**
 * The app in a scroll: four example screens in direction B. With motion each one opens large, then shrinks and
 * flies into its own space. Without motion they simply sit in their four spaces.
 * Everything inside a screen is sized in em from the screen's own width, so it stays sharp at any scale.
 */

const s = landing.spaces.shots;

function Shot({ label, children, kind }: { label: string; children: ReactNode; kind: string }) {
  return (
    <div className="lp-slot">
      <div className={`lp-shot lp-shot-${kind}`} data-shot role="img" aria-label={label}>
        <div className="lp-shot-in" aria-hidden="true">{children}</div>
      </div>
    </div>
  );
}

function TrackShot() {
  const week = [0.7, 1, 0.55, 0, 0.85, 0.65, 0.4];
  return (
    <Shot kind="track" label={s.track.alt}>
      <div className="lp-sh-head"><b>{s.track.title}</b><span className="lp-sh-pill">{s.track.who}</span></div>
      <div className="lp-sh-rings">
        <Rings rest={0.8} train={0.66} light={0.5} />
        <ul>
          <li><i style={{ background: "var(--ring-rest)" }} /><b>{s.track.rest}</b><span>{s.track.restValue}</span></li>
          <li><i style={{ background: "var(--ring-train)" }} /><b>{s.track.train}</b><span>{s.track.trainValue}</span></li>
          <li><i style={{ background: "var(--ring-light)" }} /><b>{s.track.light}</b><span>{s.track.lightValue}</span></li>
        </ul>
      </div>
      <div className="lp-sh-week">
        <span>{s.track.week}</span>
        <div className="lp-sh-bars">
          {week.map((v, i) => (
            <div key={i} className="lp-sh-bar">
              <i className={v === 0 ? "none" : undefined} style={{ height: `${(v === 0 ? 3.4 : v * 3.4).toFixed(2)}em` }} />
              <em>{s.track.days[i]}</em>
            </div>
          ))}
        </div>
      </div>
    </Shot>
  );
}

function TestShot() {
  const rows = ["E", "F P", "T O Z", "L P E D", "P E C F D"];
  return (
    <Shot kind="test" label={s.test.alt}>
      <div className="lp-sh-head"><b>{s.test.title}</b><span className="lp-sh-pill">{s.test.when}</span></div>
      <div className="lp-sh-test">
        <div className="lp-sh-chart">
          {rows.map((r, i) => (<span key={r} className={i === 3 ? "now" : undefined} style={{ fontSize: `${2.5 - i * 0.44}em` }}>{r}</span>))}
        </div>
        <div className="lp-sh-trend">
          <svg viewBox="0 0 200 120" preserveAspectRatio="none">
            <defs>
              <pattern id="lp-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="4" height="8" fill="var(--line-2)" />
              </pattern>
            </defs>
            <rect x="132" y="4" width="64" height="112" rx="8" fill="url(#lp-hatch)" stroke="var(--line-2)" strokeDasharray="4 4" />
            <path d="M0 116H200M0 60H128M0 4H128" stroke="var(--line)" strokeWidth="1" fill="none" />
            <polyline points="6,34 30,36 54,30 78,32 102,28 126,29" fill="none" stroke="var(--g2)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="6,92 30,88 54,80 78,76 102,66 126,62" fill="none" stroke="var(--g1)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <ul>
            <li><i style={{ background: "var(--g1)" }} />{s.test.left}</li>
            <li><i style={{ background: "var(--g2)" }} />{s.test.right}</li>
            <li><i className="none" />{s.test.none}</li>
          </ul>
        </div>
      </div>
    </Shot>
  );
}

function TrainShot({ facts }: { facts: LandingFacts }) {
  return (
    <Shot kind="train" label={s.train.alt}>
      <div className="lp-sh-scene"><LanternScene slice /></div>
      <div className="lp-sh-play">
        <div className="lp-sh-play-name"><b>{facts.sceneGame.name}</b><EvidenceChip level={facts.sceneGame.level} /></div>
        <div className="lp-sh-play-row">
          <div className="prog"><i style={{ width: "60%" }} /></div>
          <span>{s.train.time}</span>
          <span className="lp-sh-stop">{s.train.stop}</span>
        </div>
      </div>
    </Shot>
  );
}

function TogetherShot() {
  return (
    <Shot kind="together" label={s.together.alt}>
      <div className="lp-sh-head"><b>{s.together.title}</b><span className="lp-sh-sub">{s.together.sub}</span></div>
      <ul className="lp-sh-board">
        {s.together.rows.map((r) => (
          <li key={r.name}>
            <span className="lp-sh-av">{r.name[0]}</span>
            <b>{r.name}</b>
            <span className="lp-sh-days">{Array.from({ length: 7 }, (_, i) => (<i key={i} className={i < r.days ? "on" : undefined} />))}</span>
            <em>{s.together.of(r.days)}</em>
          </li>
        ))}
      </ul>
      <div className="lp-sh-cheer"><span className="lp-sh-av lp-sh-av-g">N</span>{s.together.cheer}</div>
    </Shot>
  );
}

export function Spaces({ facts }: { facts: LandingFacts }) {
  const t = landing.spaces;
  const items: { key: string; name: string; head: string; body: string; shot: ReactNode }[] = [
    { key: "track", name: common.nav.track, head: t.track.head, body: t.track.body, shot: <TrackShot /> },
    { key: "test", name: common.nav.test, head: t.test.head, body: t.test.body(facts.checkups), shot: <TestShot /> },
    { key: "train", name: common.nav.train, head: t.train.head, body: t.train.body(facts.games, facts.exercises), shot: <TrainShot facts={facts} /> },
    { key: "together", name: common.nav.together, head: t.together.head, body: t.together.body, shot: <TogetherShot /> },
  ];
  return (
    <section id="spaces" className="lp-scene lp-spaces-scene" data-scene="spaces">
      <div className="lp-wrap">
        <header className="lp-head">
          <h2>{t.title}</h2>
          <p className="lp-lead">{t.lead}</p>
        </header>
      </div>
      <div className="lp-deck" data-deck>
        <div className="lp-spaces">
          {items.map((it) => (
            <article key={it.key} className="lp-space" data-space>
              {it.shot}
              <div className="lp-space-text" data-space-text>
                <h3>{it.name}</h3>
                <p className="lp-space-head">{it.head}</p>
                <p className="lp-space-body">{it.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="lp-wrap lp-spaces-foot" data-spaces-foot>
        <p className="lp-loop">{t.loop}</p>
        <p className="lp-caption">{t.example}</p>
      </div>
    </section>
  );
}
