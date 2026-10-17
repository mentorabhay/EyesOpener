import { LineArt } from "@/components/lineart/lineart";
import type { Metadata } from "next";
import { EvidenceChip } from "@/components/ui";
import { site as t } from "@/copy/site";
import { catalogue, evidenceOf, exercises, games } from "@/data";
import { evidenceCounts, libraryHref, mechanismUse, pageMeta } from "@/lib/site";
import { Ladder, Tiles } from "@/components/diagram/kit";
import { Cta, Head, Hero, Section } from "../_components/parts";

const e = t.evidence;
export const generateMetadata = (): Metadata => (pageMeta("/evidence", e.meta));

export default function EvidencePage() {
  const counts = evidenceCounts();
  const low = counts.filter((c) => c.key === "limited" || c.key === "unproven").reduce((n, c) => n + c.total, 0);
  const methods = mechanismUse();
  const trialCount = e.trials.groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <main className="s-page">
      <Hero visual={<div className="s-art"><LineArt name="eye" size={200} /></div>} kicker={e.hero.kicker} title={e.hero.title} lead={e.hero.lead}>
        <div className="s-stats" style={{ marginTop: 34 }}>
          <div className="s-stat"><b>{games.length}</b><span>{e.stats.games}</span></div>
          <div className="s-stat"><b>{exercises.length}</b><span>{e.stats.exercises}</span></div>
          <div className="s-stat"><b>{methods.length}</b><span>{e.stats.methods}</span></div>
          <div className="s-stat"><b>{trialCount}</b><span>{e.stats.trials}</span></div>
        </div>
      </Hero>

      <Section id="labels" alt>
        <Head id="labels" kicker={e.labels.kicker} title={e.labels.title(catalogue.evidence.length)} lead={e.labels.lead(games.length, exercises.length)} />
        <Ladder
          label={e.labels.diagram}
          rungs={counts.map((c) => {
            const ev = evidenceOf(c.key);
            return {
              key: c.key, count: c.total, href: libraryHref({ tag: "any", evidence: c.key, kind: "all" }),
              countLabel: <span className="tnum">{t.count.games(c.games)} · {t.count.exercises(c.exercises)}</span>,
              grade: { key: c.key, label: <EvidenceChip level={c.key} />, say: <p>{ev.meaning}</p> },
            };
          })}
        />
      </Section>

      <Section id="honest">
        <Head id="honest" kicker={e.honest.kicker} title={e.honest.title} />
        <Tiles label={e.honest.title} cols={2} nodes={e.honest.items.map((it) => ({ key: it.b, label: it.b, say: <p>{typeof it.t === "string" ? it.t : it.t(low)}</p> }))} />
      </Section>

      <Section id="methods" alt>
        <Head id="methods" kicker={e.mechanisms.kicker} title={e.mechanisms.title(methods.length)} lead={e.mechanisms.lead} />
        <Tiles
          label={e.mechanisms.title(methods.length)} cols={2}
          nodes={methods.map((m) => ({
            key: m.key, label: m.label, tag: <EvidenceChip level={m.evidence} />,
            say: <><p>{m.basis}</p><p className="s-counts tnum">{[m.games > 0 && t.count.games(m.games), m.exercises > 0 && t.count.exercises(m.exercises)].filter(Boolean).join(" · ")}</p></>,
          }))}
        />
      </Section>

      <Section id="trials">
        <Head id="trials" kicker={e.trials.kicker} title={e.trials.title} lead={e.trials.lead} />
        {e.trials.groups.map((g) => (
          <div key={g.title}>
            <h3 className="s-group-title">{g.title}</h3>
            <Tiles
              label={g.title} cols={2}
              nodes={g.items.map((trial) => ({
                key: trial.name, label: trial.name,
                say: (
                  <>
                    <p>{trial.who}</p>
                    <p className="s-found"><b>{e.trials.found}:</b> {trial.found}</p>
                    {trial.limit && <p className="s-limit"><b>{e.trials.limit}:</b> {trial.limit}</p>}
                    <p className="s-foot-row">
                      <a className="s-link" href={trial.href} rel="noopener noreferrer" target="_blank" aria-label={e.trials.readOf(trial.name)}>{trial.source}</a>
                      {trial.more && <a className="s-link" href={trial.more.href} rel="noopener noreferrer" target="_blank">{trial.more.label}</a>}
                    </p>
                  </>
                ),
              }))}
            />
          </div>
        ))}
      </Section>

      <Section id="refuse" alt>
        <Head id="refuse" kicker={e.refuse.kicker} title={e.refuse.title} lead={e.refuse.lead} />
        <ul className="s-claims">
          {e.refuse.items.map((c) => (
            <li key={c.claim} className="s-reveal">
              <s>{c.claim}</s>
              <p>{c.why} {c.href && <a className="s-link" href={c.href} rel="noopener noreferrer" target="_blank">{e.refuse.source}</a>}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Cta second={{ href: "/library", label: t.nav.links[3].label }} />
    </main>
  );
}
