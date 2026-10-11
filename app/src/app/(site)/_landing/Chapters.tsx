// Eyes Opener: Chapter: every game and exercise carries a label. The counts and the wording come from the catalogue. .
import Link from "next/link";
import type { CSSProperties } from "react";
import { EvidenceChip, SceneThumb } from "@/components/ui";
import { landing } from "@/copy/landing";
import { LanternScene, Tick } from "./art";
import type { LandingFacts } from "./types";

/** Chapter: every game and exercise carries a label. The counts and the wording come from the catalogue. */
export function Evidence({ facts }: { facts: LandingFacts }) {
  const t = landing.evidence;
  return (
    <section id="evidence" className="lp-scene lp-chapter lp-evidence" data-scene="evidence">
      <div className="lp-wrap">
        <header className="lp-head">
          <h2>{t.title}</h2>
          <p className="lp-lead">{t.lead(facts.games, facts.exercises)}</p>
        </header>
        <div className="lp-ev">
          <div className="lp-ev-side">
            <div className="lp-ev-cards">
              {facts.samples.map((g, i) => (
                <article key={g.slug} className="lp-ev-card" data-card style={{ "--i": i } as CSSProperties}>
                  <SceneThumb thumb={g.thumb} label={g.name} />
                  <div className="lp-ev-card-b">
                    <b>{g.name}</b>
                    <span>{g.mechanism}</span>
                    <EvidenceChip level={g.level} />
                  </div>
                </article>
              ))}
            </div>
            <p className="lp-caption" data-ev-note>{t.samples} <Link className="lp-link" href="/evidence">{t.link}</Link></p>
          </div>
          <ol className="lp-ev-rows">
            {facts.evidence.map((e) => (
              <li key={e.key} data-row>
                <div className="lp-ev-top">
                  <EvidenceChip level={e.key} />
                  <span className="lp-ev-count tnum"><b>{e.total}</b><span>{t.count(e.games, e.exercises)}</span></span>
                </div>
                <div className="lp-ev-bar" role="img" aria-label={t.art(e.label, e.total)}>
                  <i data-bar className={`lp-ev-fill lp-ev-${e.key}`} style={{ width: `${Math.max(2, Math.round(e.share * 100))}%` }} />
                </div>
                <p>{e.meaning}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/** Chapter: the safety rules are gates. Training opens only when all of them hold. */
export function Safety({ facts }: { facts: LandingFacts }) {
  const t = landing.safety;
  const gates = [
    { head: t.questions.head, body: t.questions.body },
    { head: t.cap.head(facts.maxMinutes), body: t.cap.body },
    { head: t.age.head(facts.minAge), body: t.age.body },
    { head: t.stop.head, body: t.stop.body },
  ];
  return (
    <section id="safety" className="lp-scene lp-chapter lp-safety" data-scene="safety">
      <div className="lp-wrap">
        <header className="lp-head">
          <h2>{t.title}</h2>
          <p className="lp-lead">{t.lead}</p>
        </header>
        <div className="lp-safe">
          <ol className="lp-gates" data-gates>
            {gates.map((g) => (
              <li key={g.head} className="lp-gate" data-gate>
                <span className="lp-gate-dot" aria-hidden="true"><Tick /></span>
                <div><b>{g.head}</b><p>{g.body}</p></div>
              </li>
            ))}
          </ol>
          <div className="lp-safe-side">
            <div className="lp-session" data-session role="img" aria-label={t.session.alt}>
              <div className="lp-session-in" aria-hidden="true">
                <div className="lp-session-top">
                  <b>{t.session.title}</b>
                  <span className="lp-session-state"><em className="lp-closed">{t.session.closed}</em><em className="lp-open">{t.session.open}</em></span>
                </div>
                <div className="scene lp-session-scene"><LanternScene slice /></div>
                <div className="lp-session-row">
                  <div className="lp-session-meter"><div className="prog"><i style={{ width: "0%" }} /></div><span>{t.session.meter(facts.maxMinutes)}</span></div>
                  <span className="lp-session-stop">{t.session.stop}</span>
                </div>
              </div>
            </div>
            <div className="lp-doctor" data-doctor>
              <b>{t.doctor.head}</b>
              <p>{t.doctor.body}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Chapter: one family account, and a seat for each person around it. */
export function Family() {
  const t = landing.family;
  const seats = [
    { key: "child", x: 15, y: 12, ...t.seats.child },
    { key: "guardian", x: 85, y: 12, ...t.seats.guardian },
    { key: "cheer", x: 15, y: 88, ...t.seats.cheer },
    { key: "counsellor", x: 85, y: 88, ...t.seats.counsellor },
  ];
  return (
    <section id="family" className="lp-scene lp-chapter lp-family" data-scene="family">
      <div className="lp-wrap">
        <header className="lp-head">
          <h2>{t.title}</h2>
          <p className="lp-lead">{t.lead}</p>
        </header>
        <div className="lp-fam">
          <svg className="lp-fam-links" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={t.art}>
            {seats.map((s) => (<line key={s.key} data-link data-x={s.x} data-y={s.y} x1="50" y1="50" x2={s.x} y2={s.y} className={s.key === "counsellor" ? "lp-dashed" : undefined} />))}
          </svg>
          <div className="lp-fam-core" data-core>
            <div className="lp-fam-avs" aria-hidden="true"><i /><i /><i /><i /></div>
            <b>{t.core.title}</b>
            <p>{t.core.body}</p>
          </div>
          {seats.map((s) => (
            <article key={s.key} className={`lp-seat lp-seat-${s.key}`} data-seat>
              <div className="lp-seat-top"><h3>{s.name}</h3><span className="lp-seat-verb">{s.verb}</span></div>
              <p>{s.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Chapter: the three screens, and which of them exist today. A hatched screen is not built yet. */
export function Screens() {
  const t = landing.screens;
  return (
    <section id="screens" className="lp-scene lp-chapter lp-screens" data-scene="screens">
      <div className="lp-wrap">
        <header className="lp-head">
          <h2>{t.title}</h2>
          <p className="lp-lead">{t.lead}</p>
        </header>
        <div className="lp-devices">
          <figure className="lp-device lp-device-web" data-device>
            <div className="lp-browser">
              <div className="lp-browser-bar" aria-hidden="true"><i /><i /><i /><span /></div>
              <div className="scene"><LanternScene label={t.art.web} slice /></div>
            </div>
            <figcaption>
              <b>{t.web.name}</b><span className="chip" data-b="ok" data-state>{t.web.state}</span>
              <p>{t.web.body}</p>
            </figcaption>
          </figure>
          <figure className="lp-device lp-device-phone" data-device>
            <div className="lp-phone" role="img" aria-label={t.art.phone}><span className="lp-hatch" /></div>
            <figcaption>
              <b>{t.phone.name}</b><span className="chip" data-b="none" data-state>{t.phone.state}</span>
              <p>{t.phone.body}</p>
            </figcaption>
          </figure>
          <figure className="lp-device lp-device-tv" data-device>
            <div className="lp-tv" role="img" aria-label={t.art.tv}><span className="lp-hatch" /></div>
            <figcaption>
              <b>{t.tv.name}</b><span className="chip" data-b="none" data-state>{t.tv.state}</span>
              <p>{t.tv.body}</p>
            </figcaption>
          </figure>
        </div>
        <p className="lp-caption lp-center" data-hatch-note>{t.hatch}</p>
      </div>
    </section>
  );
}
