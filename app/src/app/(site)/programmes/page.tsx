import type { Metadata } from "next";
import { site as t } from "@/copy/site";
import { programmes } from "@/data";
import { MAX_DAILY_MINUTES } from "@/engine";
import { pageMeta } from "@/lib/site";
import { LevelChip, ProgrammeCard } from "../_components/catalogue";
import { Cta, Head, Hero, Section } from "../_components/parts";

const p = t.programmes;
export const generateMetadata = (): Metadata => (pageMeta("/programmes", p.meta));

const LEVELS = [0, 1, 2] as const;

export default function ProgrammesPage() {
  return (
    <main className="s-page">
      <Hero picture="programmes-hero" kicker={p.hero.kicker} title={p.hero.title(programmes.length)} lead={p.hero.lead} />

      {LEVELS.map((level, i) => {
        const list = programmes.filter((x) => x.level === level);
        const id = `level-${level}`;
        return (
          <Section key={level} id={id} alt={i % 2 === 0} tight={false}>
            <Head id={id} kicker={`${t.count.programmes(list.length)}`} title={t.level.chip[level]} lead={t.level.what[level]} />
            <div className="s-grid three">{list.map((x) => <ProgrammeCard key={x.slug} p={x} />)}</div>
          </Section>
        );
      })}

      <Section id="rule" narrow>
        <Head id="rule" kicker={p.dose.title} title={p.dose.cap(MAX_DAILY_MINUTES)} lead={p.dose.ai} />
        <div className="s-chips">{LEVELS.map((l) => <LevelChip key={l} level={l} />)}</div>
      </Section>

      <Cta second={{ href: "/evidence", label: t.cta.evidence }} />
    </main>
  );
}
