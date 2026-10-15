import { landing } from "@/copy/landing";
import { Words } from "./art";
import type { LandingFacts } from "./types";

/**
 * The flow tree: the check leads to the eye profile, and the profile leads to the programmes.
 * Solid lines are paths anyone can take after the safety questions. Dashed lines need a linked counsellor.
 */
export function Flow({ facts }: { facts: LandingFacts }) {
  const t = landing.flow;
  return (
    <section id="start" className="lp-scene lp-flow" data-scene="flow">
      <div className="lp-wrap lp-flow-split">
        <div className="lp-flow-text">
          <h2><Words text={t.title} /></h2>
          <ol className="lp-steps">
            {t.steps.map((st, i) => (
              <li key={st.head} data-step>
                <span className="lp-step-n" aria-hidden="true">{i + 1}</span>
                <div><b>{st.head}</b><p>{st.body}</p></div>
              </li>
            ))}
          </ol>
        </div>

        <div className="lp-tree">
          <div className="lp-node" data-t="check">
            <b>{t.check.title}</b>
            <p>{t.check.body}</p>
            <p className="lp-node-sub">{t.perEye(facts.perEye)}</p>
          </div>
          <span className="lp-trunk" aria-hidden="true"><i data-t="trunk" /><em className="lp-spark" data-t="spark" /></span>
          <div className="lp-node lp-node-key" data-t="profile">
            <b>{t.profile.title}</b>
            <p>{t.profile.body}</p>
          </div>
          <div className="lp-fork" aria-hidden="true">
            <i className="lp-fork-stem" data-t="stem" />
            <span><i className="lp-fork-rail lp-fork-rail-a" data-t="rail-a" /><i className="lp-fork-drop" data-t="drop-a" /></span>
            <span><i className="lp-fork-rail lp-fork-rail-b" data-t="rail-b" /><i className="lp-fork-drop lp-fork-drop-b" data-t="drop-b" /></span>
          </div>
          <div className="lp-branches">
            <div className="lp-branch">
              <p className="lp-branch-h" data-t="open-h">{t.open}</p>
              <ul className="lp-progs">
                {facts.open.map((p) => (
                  <li key={p.slug} data-t="open">
                    <b>{p.name}</b>
                    <span>{p.dailyMinutes > 0 ? t.dose(p.dailyMinutes, p.daysPerWeek) : t.habits}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="lp-branch lp-branch-gated">
              <p className="lp-branch-h" data-t="gated-h">{t.gated}</p>
              <div className="lp-node lp-node-gate" data-t="gate">
                <b>{t.gate.title}</b>
                <p>{t.gate.body}</p>
              </div>
              <ul className="lp-progs lp-progs-one">
                {facts.gated.map((p) => (
                  <li key={p.slug} data-t="gated">
                    <b>{p.name}</b>
                    <span>{t.counsellorDose}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="lp-tree-note" data-t="note">{t.everyone(facts.everyone)}</p>
        </div>
      </div>
    </section>
  );
}
