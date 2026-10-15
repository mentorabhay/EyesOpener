import type { Metadata } from "next";
import Link from "next/link";
import { Chip, SceneThumb, Void } from "@/components/ui";
import { onboarding } from "@/copy/onboarding";
import { site as t } from "@/copy/site";
import { together } from "@/copy/together";
import { exercises, games, tests } from "@/data";
import { percent, STARTING_CONTRAST } from "@/engine";
import { TRIAGE_KEYS } from "@/lib/family";
import { pageMeta } from "@/lib/site";
import { Glasses, Icon, RingsArt, TwoLights } from "../_components/art";
import { Cta, Head, Hero, NotBuilt, Points, Section } from "../_components/parts";

const h = t.how;
export const generateMetadata = (): Metadata => (pageMeta("/how-it-works", h.meta));

/** How long each part of the check takes, in the app's own words. */
const o = onboarding.steps;
const durationOf = (i: number): string | null => [o.screen[1], `${o.L[1]} + ${o.R[1]}`, o.both[1], null, null][i] ?? null;
/** How often check-ups come round, from the catalogue. */
const every = [...new Set(tests.map((x) => x.everyDays))].sort((a, b) => a - b);

export default function HowItWorksPage() {
  const spaceStat = [
    h.spaces.items[0].stat(h.day.rings.length, 0),
    h.spaces.items[1].stat(tests.length, 0),
    h.spaces.items[2].stat(games.length, exercises.length),
    h.spaces.items[3].stat(Object.keys(together.ladder.steps).length, 0),
  ];
  const views = [["none", h.glasses.views.none], ["weak", h.glasses.views.weak], ["strong", h.glasses.views.strong]] as const;

  return (
    <main className="s-page">
      <Hero kicker={h.hero.kicker} title={h.hero.title} lead={h.hero.lead} visual={<TwoLights />}>
        <div className="s-ctas">
          <Link className="btn btn-d s-btn-lg" href="/setup">{t.cta.start}</Link>
          <Link className="btn s-btn-lg" href="/programmes">{t.cta.programmes}</Link>
        </div>
        <div className="s-tags">{h.hero.points.map((p) => <Chip key={p}>{p}</Chip>)}</div>
      </Hero>

      <Section id="spaces" alt>
        <Head id="spaces" kicker={h.spaces.kicker} title={h.spaces.title(h.spaces.items.length)} lead={h.spaces.lead} />
        <div className="s-grid">
          {h.spaces.items.map((s, i) => (
            <article className="s-card s-reveal" key={s.key}>
              <Icon name={s.key} />
              <p className="s-num">{String(i + 1).padStart(2, "0")}</p>
              <h3>{s.name}</h3>
              <p><b>{s.line}</b> {s.body}</p>
              <p className="s-stat-line tnum">{spaceStat[i]}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section id="path">
        <div className="s-split top">
          <div>
            <Head id="path" kicker={h.path.kicker} title={h.path.title} lead={h.path.lead} />
            <ol className="s-steps">
              {h.path.steps.map((s, i) => (
                <li key={s.title} className="s-reveal">
                  <h3>{s.title}{durationOf(i) && <Chip><span className="tnum" aria-label={`${h.path.durations}: ${durationOf(i)}`}>{durationOf(i)}</span></Chip>}</h3>
                  <p>{typeof s.body === "string" ? s.body : s.body(i === 1 ? onboarding.questions.length : TRIAGE_KEYS.length)}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="s-vis s-reveal">
            <div className="s-panel">
              <div className="s-panel-head"><span>{h.path.profile.title}</span><Chip>{t.example}</Chip></div>
              <dl className="kv">
                <div><dt>{h.path.profile.rows.weak}</dt><dd>{h.path.profile.weak}</dd></div>
                <div><dt>{h.path.profile.rows.contrast}</dt><dd className="tnum">{percent(STARTING_CONTRAST)}<small>{h.path.profile.contrastFrom}</small></dd></div>
                <div><dt>{h.path.profile.rows.letter}</dt><dd><Void /></dd></div>
                <div><dt>{h.path.profile.rows.target}</dt><dd><Void /></dd></div>
              </dl>
              <p className="s-note">{h.path.profile.note}</p>
            </div>
          </div>
        </div>
      </Section>

      <Section id="glasses" alt>
        <div className="s-split rev">
          <div>
            <Head id="glasses" kicker={h.glasses.kicker} title={h.glasses.title} lead={h.glasses.lead} />
            <div className="s-reveal"><Points items={h.glasses.points} /></div>
          </div>
          <div className="s-vis s-reveal">
            <div className="s-panel">
              <Glasses label={h.glasses.kicker} />
              <div className="s-lenses">
                {views.map(([lens, label]) => (
                  <figure key={lens} data-lens={lens}>
                    <SceneThumb thumb="catch" label={h.glasses.sceneLabel(label)} />
                    <figcaption>{label}</figcaption>
                  </figure>
                ))}
              </div>
              <p className="s-note">{h.glasses.caption}</p>
            </div>
          </div>
        </div>
      </Section>

      <Section id="day">
        <div className="s-split">
          <div>
            <Head id="day" kicker={h.day.kicker} title={h.day.title(h.day.rings.length)} lead={h.day.lead} />
            <p className="s-body s-reveal">{h.day.noProgramme}</p>
            <p className="s-body s-reveal">{h.day.rhythm(every)}</p>
          </div>
          <div className="s-vis s-reveal">
            <div className="s-panel">
              <div className="s-panel-head"><span>{h.day.kicker}</span><Chip>{t.example}</Chip></div>
              <div className="s-rings">
                <RingsArt label={h.day.drawing} shares={[2 / 3, 1, 1 / 3]} />
                <ul className="s-ringkey">
                  {h.day.rings.map((r) => (
                    <li key={r.key}><i style={{ background: `var(--ring-${r.key})` }} /><span><b>{r.name}</b>{r.body}</span></li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section id="devices" alt>
        <Head id="devices" kicker={h.devices.kicker} title={h.devices.title} lead={h.devices.lead} />
        <div className="s-grid three">
          {h.devices.items.map((d) => (
            <article key={d.key} className={`s-card s-reveal${d.built ? "" : " hatched"}`}>
              <Icon name={d.key} />
              <h3>{d.name}</h3>
              <p>{d.body}</p>
              <p className="s-foot-row">{d.built ? <Chip tone="ok">{t.worksToday}</Chip> : <NotBuilt />}</p>
            </article>
          ))}
        </div>
      </Section>

      <Cta second={{ href: "/safety", label: t.cta.safety }} />
    </main>
  );
}
