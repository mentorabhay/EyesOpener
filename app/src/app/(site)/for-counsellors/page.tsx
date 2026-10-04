import type { Metadata } from "next";
import Link from "next/link";
import { listed, site as t } from "@/copy/site";
import { programmes } from "@/data";
import { MAX_DAILY_MINUTES } from "@/engine";
import { pageMeta } from "@/lib/site";
import { LevelChip } from "../_components/catalogue";
import { Head, Hero, Points, Section } from "../_components/parts";
import { SeesAndNot, TakePart, WriteToUs } from "../_components/roles";

const c = t.counsellors;
export const metadata: Metadata = pageMeta("/for-counsellors", c.meta);

export default function ForCounsellorsPage() {
  const level2 = programmes.filter((p) => p.level === 2);
  const names = listed(level2.map((p) => p.name));
  return (
    <main className="s-page">
      <Hero kicker={c.hero.kicker} title={c.hero.title} lead={c.hero.lead}>
        <p className="s-body" style={{ marginTop: 14 }}>{c.hero.who}</p>
        <div className="s-ctas">
          <a className="btn btn-d s-btn-lg" href="#write">{c.hero.cta}</a>
          <Link className="btn s-btn-lg" href="/evidence">{t.cta.evidence}</Link>
        </div>
      </Hero>

      <Section id="sees" alt>
        <Head id="sees" kicker={c.sees.kicker} title={c.sees.title} />
        <SeesAndNot can={c.sees.can} cannot={c.sees.cannot} />
      </Section>

      <Section id="does">
        <div className="s-split top">
          <div>
            <Head id="does" kicker={c.does.kicker} title={c.does.title} />
            <div className="s-reveal"><Points items={c.does.items.map((it) => ({ b: it.b, t: typeof it.t === "string" ? it.t : it.t(MAX_DAILY_MINUTES, names) }))} /></div>
          </div>
          <div className="s-vis s-reveal">
            <div className="s-panel">
              <div className="s-panel-head"><span>{t.programmes.dose.title}</span><LevelChip level={2} /></div>
              <dl className="kv">
                {level2.map((p) => <div key={p.slug}><dt><Link className="s-link" href={`/programmes/${p.slug}`}>{p.name}</Link></dt><dd>{p.doseBasis}</dd></div>)}
              </dl>
              <ul className="s-points no">{c.limits.items.map((line) => <li key={line}><span>{line}</span></li>)}</ul>
            </div>
          </div>
        </div>
      </Section>

      <TakePart id="steps" kicker={c.steps.kicker} title={c.steps.title} items={c.steps.items} />
      <WriteToUs kind="counsellor" />
    </main>
  );
}
