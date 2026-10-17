// Eyes Opener: Page controller component for the app/src/app/(site)/about web route.
import type { Metadata } from "next";
import Link from "next/link";
import { common } from "@/copy/common";
import { site as t } from "@/copy/site";
import { programmes } from "@/data";
import { MIN_SCREEN_AGE } from "@/engine";
import { pageMeta } from "@/lib/site";
import { Icon, TwoLights } from "../_components/art";
import { Cta, Head, Hero, NotBuilt, Section } from "../_components/parts";

const a = t.about;
export const generateMetadata = (): Metadata => (pageMeta("/about", a.meta));

const PILLAR_ICONS = ["free", "open", "research", "privacy"];

export default function AboutPage() {
  return (
    <main className="s-page">
      <Hero picture="about-hero" kicker={a.hero.kicker} title={a.hero.title} lead={a.hero.lead} visual={<TwoLights />}>
        <div className="s-ctas">
          <Link className="btn btn-d s-btn-lg" href="/how-it-works">{t.nav.links[0].label}</Link>
          <Link className="btn s-btn-lg" href="/evidence">{t.cta.evidence}</Link>
        </div>
      </Hero>

      <Section id="why" alt narrow>
        <Head id="why" kicker={a.why.kicker} title={a.why.title} />
        {a.why.body.map((line) => <p key={line} className="s-lead s-reveal" style={{ marginTop: 16 }}>{line}</p>)}
      </Section>

      <Section id="pillars">
        <Head id="pillars" kicker={a.pillars.kicker} title={a.pillars.title(a.pillars.items.length)} />
        <div className="s-grid two">
          {a.pillars.items.map((p, i) => (
            <article key={p.title} className="s-card s-reveal">
              <Icon name={PILLAR_ICONS[i]} />
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section id="who" alt>
        <div className="s-split top">
          <div>
            <Head id="who" kicker={a.who.kicker} title={a.who.title} lead={a.who.body(programmes.length, MIN_SCREEN_AGE)} />
            <div className="s-ctas s-reveal" style={{ marginTop: 0 }}>
              <Link className="btn" href="/programmes">{t.cta.programmes}</Link>
              <Link className="btn" href="/safety">{t.cta.safety}</Link>
            </div>
          </div>
          <div className="s-reveal">
            <p className="s-kicker">{a.not.kicker}</p>
            <h3 className="s-h3">{a.not.title}</h3>
            <ul className="s-points no">{a.not.items.map((line) => <li key={line}><span>{line}</span></li>)}</ul>
          </div>
        </div>
      </Section>

      <Section id="open" narrow>
        <Head id="open" kicker={a.open.kicker} title={a.open.title} lead={a.open.body} />
        <div className="s-card hatched s-reveal">
          <NotBuilt>{t.beingBuilt}</NotBuilt>
          <p>{t.how.devices.items.filter((d) => !d.built).map((d) => d.name).join(" · ")}</p>
        </div>
        <p className="s-note" style={{ marginTop: 22 }}>{common.notMedical}</p>
      </Section>

      <Cta second={{ href: "/programmes", label: t.cta.programmes }} />
    </main>
  );
}
