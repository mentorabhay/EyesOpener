// Eyes Opener: Page controller component for the app/src/app/(site)/for-sponsors web route.
import type { Metadata } from "next";
import Link from "next/link";
import { Empty } from "@/components/ui";
import { site as t } from "@/copy/site";
import { pageMeta } from "@/lib/site";
import { SPONSOR_MIN_GROUP } from "@/lib/roles";
import { Head, Hero, Points, Section } from "../_components/parts";
import { SeesAndNot, TakePart, WriteToUs } from "../_components/roles";

const s = t.sponsors;
export const generateMetadata = (): Metadata => (pageMeta("/for-sponsors", s.meta));

export default function ForSponsorsPage() {
  const cannot = { title: s.sees.cannot.title, items: s.sees.cannot.items.map((line) => (typeof line === "string" ? line : line(SPONSOR_MIN_GROUP))) };
  return (
    <main className="s-page">
      <Hero picture="sponsors-hero"
        kicker={s.hero.kicker} title={s.hero.title} lead={s.hero.lead}
        visual={(
          <div className="s-panel">
            <div className="s-panel-head"><span>{s.sees.example.title}</span></div>
            <Empty title={s.sees.example.few}><span>{s.sees.example.fewBody(SPONSOR_MIN_GROUP)}</span></Empty>
          </div>
        )}
      >
        <div className="s-ctas">
          <a className="btn btn-d s-btn-lg" href="#write">{s.hero.cta}</a>
          <Link className="btn s-btn-lg" href="/privacy">{t.footer.groups[3].links[0].label}</Link>
        </div>
      </Hero>

      <Section id="sees" alt>
        <Head id="sees" kicker={s.sees.kicker} title={s.sees.title(SPONSOR_MIN_GROUP)} />
        <SeesAndNot can={s.sees.can} cannot={cannot} />
      </Section>

      <Section id="schools" narrow>
        <Head id="schools" kicker={s.schools.kicker} title={s.schools.title} />
        <div className="s-reveal"><Points items={s.schools.items.map((it) => ({ b: it.b, t: typeof it.t === "string" ? it.t : it.t(SPONSOR_MIN_GROUP) }))} /></div>
      </Section>

      <TakePart id="steps" kicker={s.steps.kicker} title={s.steps.title} items={s.steps.items} />

      <WriteToUs kind="sponsor" />
    </main>
  );
}
