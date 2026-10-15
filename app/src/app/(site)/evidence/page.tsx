import type { Metadata } from "next";
import Link from "next/link";
import { EvidenceChip } from "@/components/ui";
import { site as t } from "@/copy/site";
import { catalogue, evidenceOf, exercises, games } from "@/data";
import { evidenceCounts, libraryHref, mechanismUse, pageMeta } from "@/lib/site";
import { Cta, Head, Hero, Section } from "../_components/parts";

const e = t.evidence;
export const generateMetadata = (): Metadata => (pageMeta("/evidence", e.meta));

export default function EvidencePage() {
  const counts = evidenceCounts();
  const top = Math.max(1, ...counts.map((c) => c.total));
  const low = counts.filter((c) => c.key === "limited" || c.key === "unproven").reduce((n, c) => n + c.total, 0);
  const methods = mechanismUse();
  const trialCount = e.trials.groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <main className="s-page">
      <Hero kicker={e.hero.kicker} title={e.hero.title} lead={e.hero.lead}>
        <div className="s-stats" style={{ marginTop: 34 }}>
          <div className="s-stat"><b>{games.length}</b><span>{e.stats.games}</span></div>
          <div className="s-stat"><b>{exercises.length}</b><span>{e.stats.exercises}</span></div>
          <div className="s-stat"><b>{methods.length}</b><span>{e.stats.methods}</span></div>
          <div className="s-stat"><b>{trialCount}</b><span>{e.stats.trials}</span></div>
        </div>
      </Hero>

      <Section id="labels" alt>
        <Head id="labels" kicker={e.labels.kicker} title={e.labels.title(catalogue.evidence.length)} lead={e.labels.lead(games.length, exercises.length)} />
        <p className="s-key" aria-hidden="true">
          <span><i style={{ background: "var(--ink)" }} />{e.labels.games}</span>
          <span><i style={{ background: "var(--ink-4)" }} />{e.labels.exercises}</span>
        </p>
        <div className="s-bars">
          {counts.map((c) => {
            const ev = evidenceOf(c.key);
            return (
              <div className="s-bar s-reveal" key={c.key}>
                <div className="s-bar-top">
                  <EvidenceChip level={c.key} />
                  <p>{ev.meaning}</p>
                  <Link className="s-link tnum" href={libraryHref({ tag: "any", evidence: c.key, kind: "all" })}>{t.count.games(c.games)} · {t.count.exercises(c.exercises)}</Link>
                </div>
                <div className="s-track" role="img" aria-label={e.labels.bar(ev.label, c.games, c.exercises)}>
                  {c.games > 0 && <i className="g" style={{ width: `${(c.games / top) * 100}%` }} />}
                  {c.exercises > 0 && <i className="e" style={{ width: `${(c.exercises / top) * 100}%` }} />}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section id="honest">
        <Head id="honest" kicker={e.honest.kicker} title={e.honest.title} />
        <div className="s-grid two">
          {e.honest.items.map((it) => (
            <article className="s-card s-reveal" key={it.b}>
              <h3>{it.b}</h3>
              <p>{typeof it.t === "string" ? it.t : it.t(low)}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section id="methods" alt>
        <Head id="methods" kicker={e.mechanisms.kicker} title={e.mechanisms.title(methods.length)} lead={e.mechanisms.lead} />
        <ul className="s-rows">
          {methods.map((m) => (
            <li key={m.key}>
              <div className="s-name"><h3>{m.label}</h3><EvidenceChip level={m.evidence} /></div>
              <p>{m.basis}</p>
              <p className="s-counts tnum">{[m.games > 0 && t.count.games(m.games), m.exercises > 0 && t.count.exercises(m.exercises)].filter(Boolean).join(" · ")}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="trials">
        <Head id="trials" kicker={e.trials.kicker} title={e.trials.title} lead={e.trials.lead} />
        {e.trials.groups.map((g) => (
          <div key={g.title}>
            <h3 className="s-group-title">{g.title}</h3>
            <div className="s-grid two">
              {g.items.map((trial) => (
                <article className="s-card s-trial s-reveal" key={trial.name}>
                  <h3>{trial.name}</h3>
                  <p>{trial.who}</p>
                  <p className="s-found"><b>{e.trials.found}:</b> {trial.found}</p>
                  {trial.limit && <p className="s-limit"><b>{e.trials.limit}:</b> {trial.limit}</p>}
                  <p className="s-foot-row">
                    <a className="s-link" href={trial.href} rel="noopener noreferrer" target="_blank" aria-label={e.trials.readOf(trial.name)}>{trial.source}</a>
                    {trial.more && <a className="s-link" href={trial.more.href} rel="noopener noreferrer" target="_blank">{trial.more.label}</a>}
                  </p>
                </article>
              ))}
            </div>
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
