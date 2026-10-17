// Eyes Opener: One page for each programme in the catalogue, made at build time. Any other address is not found. .
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Chip, EvidenceChip } from "@/components/ui";
import { site as t } from "@/copy/site";
import { programmeBySlug, programmes } from "@/data";
import { programmePlanFor } from "@/data/programme-plans";
import { Timeline, type Mark } from "@/components/diagram/kit";
import { MAX_DAILY_MINUTES } from "@/engine";
import { evidenceIn, exercisesIn, gamesIn, pageMeta, testsFor } from "@/lib/site";
import { doseLine, ExerciseRow, GameCard, LevelChip } from "../../_components/catalogue";
import { Cta, Head, Hero, Points, Section } from "../../_components/parts";

const p = t.programmes;
const d = p.detail;

/** One page for each programme in the catalogue, made at build time. Any other address is not found. */
export const dynamicParams = false;
export const generateStaticParams = () => programmes.map((x) => ({ slug: x.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const prog = programmeBySlug((await params).slug);
  if (!prog) return {};
  const about = p.about[prog.slug];
  return pageMeta(`/programmes/${prog.slug}`, { title: `${prog.name} programme`, description: `${about.what} ${p.dose.basis}: ${prog.doseBasis}` });
}

/** The weeks a reader should know about: the start, each new kind of day, each eye-test visit, the end. */
function weekMarks(plan: NonNullable<ReturnType<typeof programmePlanFor>>): Mark[] {
  const w = d.weeks;
  type Tone = Mark["what"]["tone"];
  const at = new Map<number, { labels: string[]; says: string[]; tone?: Tone }>();
  const put = (week: number, label: string, say: string, tone?: Tone) => {
    const m = at.get(week) ?? { labels: [], says: [] };
    m.labels.push(label); m.says.push(say); m.tone ??= tone;
    at.set(week, m);
  };
  put(1, w.start, w.startSay(plan.checks.length), "go");
  for (const st of plan.stages) if (st.from > 1) put(st.from, w.stage, w.stageSay);
  for (const v of plan.visits) put(v, w.visit, w.visitSay, "warn");
  if (plan.weeks) put(plan.weeks, w.end, plan.end === "eye_test" ? w.endEyeTest : plan.end === "counsellor" ? w.endCounsellor : w.endNone, "info");
  return [...at.entries()].sort(([x], [y]) => x - y).map(([week, m]) => ({
    key: `week-${week}`, at: w.week(week),
    what: { key: `week-${week}`, label: m.labels.join(" · "), tone: m.tone, say: <>{m.says.map((t) => <p key={t}>{t}</p>)}</> },
  }));
}

export default async function ProgrammePage({ params }: { params: Promise<{ slug: string }> }) {
  const prog = programmeBySlug((await params).slug);
  if (!prog) notFound();
  const about = p.about[prog.slug];
  const g = gamesIn(prog), e = exercisesIn(prog), checks = testsFor(prog);
  const plan = programmePlanFor(prog.slug);

  return (
    <main className="s-page">
      <Hero
        kicker={t.level.chip[prog.level]} title={prog.name} lead={about.what} crumb={{ href: "/programmes", label: d.crumb }}
        visual={(
          <div className="s-panel">
            <div className="s-panel-head"><span>{p.dose.title}</span><LevelChip level={prog.level} /></div>
            <dl className="kv">
              <div><dt>{p.dose.rows.minutes}</dt><dd className="tnum">{prog.level === 2 ? p.dose.counsellor : prog.dailyMinutes ? p.dose.minutes(Math.min(prog.dailyMinutes, MAX_DAILY_MINUTES)) : p.dose.none}</dd></div>
              {prog.daysPerWeek > 0 && <div><dt>{p.dose.rows.days}</dt><dd className="tnum">{prog.daysPerWeek === 7 ? p.dose.everyDay : p.dose.days(prog.daysPerWeek)}</dd></div>}
              {prog.level < 2 && <div><dt>{p.dose.basis}</dt><dd>{prog.doseBasis}</dd></div>}
            </dl>
            <p className="s-note">{p.dose.cap(MAX_DAILY_MINUTES)} {p.dose.ai}</p>
          </div>
        )}
      >
        <div className="s-ctas">
          <Link className="btn btn-d s-btn-lg" href="/setup">{t.cta.start}</Link>
          <Link className="btn s-btn-lg" href="/safety">{t.cta.safety}</Link>
        </div>
      </Hero>

      <Section id="who" alt>
        <div className="s-split top">
          <div>
            <Head id="who" kicker={t.level.chip[prog.level]} title={d.forWho} lead={about.forWho} />
            <div className="s-card s-reveal">
              <div className="s-chips"><LevelChip level={prog.level} /></div>
              <p>{t.level.what[prog.level]}</p>
              <p className="s-meta tnum">{doseLine(prog)}</p>
            </div>
          </div>
          <div className="s-reveal">
            <p className="s-kicker">{d.not.title}</p>
            <p className="s-body">{d.not.lead}</p>
            <Points tone="no" items={about.not.map((line) => ({ t: line }))} />
          </div>
        </div>
      </Section>

      {plan && plan.weeks && (
        <Section id="weeks">
          <Head id="weeks" kicker={d.weeks.kicker} title={d.weeks.title(plan.weeks)} lead={d.weeks.lead} />
          <Timeline label={d.weeks.diagram} marks={weekMarks(plan)} />
        </Section>
      )}

      <Section id="games">
        <Head id="games" kicker={t.count.games(g.length)} title={d.games.title} lead={d.games.lead} />
        <div className="s-chips s-reveal" style={{ marginBottom: 18 }}>
          <span className="s-meta">{d.evidenceMix}:</span>
          {evidenceIn(prog).map((k) => <EvidenceChip key={k} level={k} />)}
        </div>
        {g.length ? <div className="grid-cards">{g.map((x) => <GameCard key={x.slug} g={x} />)}</div> : <p className="s-body">{d.games.none}</p>}
      </Section>

      <Section id="exercises" alt>
        <Head id="exercises" kicker={t.count.exercises(e.length)} title={d.exercises.title} lead={prog.group ? d.exercises.lead(prog.group) : d.exercises.none} />
        {e.length > 0 && <ul className="s-exlist">{e.map((x) => <ExerciseRow key={x.slug} e={x} />)}</ul>}
      </Section>

      <Section id="tests">
        <Head id="tests" kicker={t.count.checkups(checks.length)} title={d.tests.title} lead={d.tests.lead} />
        <div className="s-grid">
          {checks.map((c) => (
            <article key={c.key} className="s-card s-reveal">
              <h3>{c.name}</h3>
              <p>{c.what}</p>
              <div className="s-chips s-foot-row">
                <Chip><span className="tnum">{d.tests.every(c.everyDays)}</span></Chip>
                {c.perEye && <Chip>{d.tests.perEye}</Chip>}
                {c.glasses && <Chip>{d.tests.glasses}</Chip>}
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section id="others" alt>
        <Head id="others" title={d.others} />
        <nav className="s-chips" aria-labelledby="others-h">
          {programmes.filter((x) => x.slug !== prog.slug).map((x) => <Link key={x.slug} className="btn" href={`/programmes/${x.slug}`}>{x.name}</Link>)}
        </nav>
      </Section>

      <Cta second={{ href: "/evidence", label: t.cta.evidence }} />
    </main>
  );
}
