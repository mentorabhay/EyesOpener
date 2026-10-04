import { EvidenceChip } from "@/components/ui";
import { landing } from "@/copy/landing";
import { Glasses, LanternLayer } from "./art";
import type { LandingFacts } from "./types";

/**
 * What each eye sees alone, sliding together into one picture.
 * The two pictures are real layers: red and cyan, blended as light on a black field, so the shapes drawn in both
 * turn white only when the layers lie on top of each other. With no script the layers already lie together.
 */
export function Reveal({ facts }: { facts: LandingFacts }) {
  const t = landing.reveal;
  const legend = [
    { key: "strong", ...t.legend.strong },
    { key: "weak", ...t.legend.weak },
    { key: "both", ...t.legend.both },
  ] as const;
  return (
    <section id="how" className="lp-scene lp-reveal" data-scene="reveal">
      <div className="lp-wrap">
        <header className="lp-head">
          <h2>{t.title}</h2>
          <p className="lp-lead">{t.lead}</p>
        </header>
        <div className="lp-stage" data-stage>
          <div className="lp-fuse">
            <LanternLayer ink="strong" label={t.art.strong} data-layer="strong" />
            <LanternLayer ink="weak" label={t.art.weak} data-layer="weak" />
          </div>
          <span className="lp-tag lp-tag-strong" data-tag="strong" aria-hidden="true"><i />{t.tags.strong}</span>
          <span className="lp-tag lp-tag-weak" data-tag="weak" aria-hidden="true"><i />{t.tags.weak}</span>
          <span className="lp-tag lp-tag-both" data-tag="both" aria-hidden="true"><i />{t.tags.both}</span>
          <span className="lp-stage-glasses" data-glasses><Glasses label={t.art.glasses} /></span>
        </div>
        <ul className="lp-legend">
          {legend.map((l) => (
            <li key={l.key} className={`lp-legend-item lp-ink-${l.key}`} data-legend={l.key}>
              <i aria-hidden="true" />
              <div><b>{l.title}</b><p>{l.body}</p></div>
            </li>
          ))}
        </ul>
        <p className="lp-caption" data-caption>
          {t.caption(facts.sceneGame.name)} <span className="lp-caption-chip">{facts.sceneGame.mechanism} <EvidenceChip level={facts.sceneGame.level} /></span>
        </p>
      </div>
    </section>
  );
}
