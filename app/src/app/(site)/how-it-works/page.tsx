// Eyes Opener: How long each part of the check takes, in the app's own words. .
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
import { Cta, Head, Hero, Points, Section } from "../_components/parts";
import { SiteMore } from "../_components/fold";
import { Flow, Loop, Tiles } from "@/components/diagram/kit";
import { Fold } from "@/components/guide/more";
import { SitePicture } from "@/components/site-picture/site-picture";
import { livePicture } from "@/lib/site-pictures/read";

const h = t.how;
export const generateMetadata = (): Metadata => (pageMeta("/how-it-works", h.meta));

/** How long each part of the check takes, in the app's own words. */
const o = onboarding.steps;
const durationOf = (i: number): string | null => [o.screen[1], `${o.L[1]} + ${o.R[1]}`, o.both[1], null, null][i] ?? null;
/** How often check-ups come round, from the catalogue. */
const every = [...new Set(tests.map((x) => x.everyDays))].sort((a, b) => a - b);

export default async function HowItWorksPage() {
  const practice = await livePicture("how-practice");
  const spaceStat = [
    h.spaces.items[0].stat(h.day.rings.length, 0),
    h.spaces.items[1].stat(tests.length, 0),
    h.spaces.items[2].stat(games.length, exercises.length),
    h.spaces.items[3].stat(Object.keys(together.ladder.steps).length, 0),
  ];
  const views = [["none", h.glasses.views.none], ["weak", h.glasses.views.weak], ["strong", h.glasses.views.strong]] as const;

  return (
    <main className="s-page">
      <Hero picture="how-setup" kicker={h.hero.kicker} title={h.hero.title} lead={h.hero.lead} visual={<TwoLights />}>
        <div className="s-ctas">
          <Link className="btn btn-d s-btn-lg" href="/setup">{t.cta.start}</Link>
          <Link className="btn s-btn-lg" href="/programmes">{t.cta.programmes}</Link>
        </div>
        <div className="s-tags">{h.hero.points.map((p) => <Chip key={p}>{p}</Chip>)}</div>
      </Hero>

      <Section id="spaces" alt>
        <Head id="spaces" kicker={h.spaces.kicker} title={h.spaces.title(h.spaces.items.length)} lead={h.spaces.lead} />
        <Loop
          label={h.spaces.diagram} back={h.spaces.back}
          nodes={h.spaces.items.map((sp, i) => ({
            key: sp.key, icon: <Icon name={sp.key} />, tag: spaceStat[i],
            label: <><span className="s-dnum deco-num" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>{sp.name}</>,
            say: <><p><b>{sp.line}</b></p><p>{sp.body}</p></>,
          }))}
        />
      </Section>

      <Section id="path">
        <Head id="path" kicker={h.path.kicker} title={h.path.title} lead={h.path.lead} />
        <Flow
          label={h.path.diagram}
          nodes={h.path.steps.map((st, i) => ({
            key: st.title, label: st.title, tag: durationOf(i) ?? undefined,
            say: <p>{typeof st.body === "string" ? st.body : st.body(i === 1 ? onboarding.questions.length : TRIAGE_KEYS.length)}</p>,
          }))}
        />
        <div className={practice ? "s-grid two s-after" : "s-after s-solo"}>
          {practice && <SitePicture slot="how-practice" sizes="(max-width: 860px) 100vw, 50vw" />}
          <div className="s-panel s-reveal">
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
        <Tiles
          label={h.devices.title} cols={3}
          nodes={h.devices.items.map((d) => ({ key: d.key, icon: <Icon name={d.key} />, label: d.name, tag: d.built ? t.worksToday : t.notBuilt, say: <p>{d.body}</p> }))}
        />
      </Section>

      <Section id="more" narrow>
        <SiteMore>
          <Fold title={h.spaces.title(h.spaces.items.length)}>
            <p>{h.spaces.lead}</p>
            <ul className="s-points">{h.spaces.items.map((sp, i) => <li key={sp.key}><span><b>{sp.name}.</b> {sp.line} {sp.body} {spaceStat[i]}.</span></li>)}</ul>
          </Fold>
          <Fold title={h.path.title}>
            <p>{h.path.lead}</p>
            <ol className="s-steps">
              {h.path.steps.map((st, i) => (
                <li key={st.title}><h3>{st.title}{durationOf(i) && <Chip><span className="tnum">{durationOf(i)}</span></Chip>}</h3><p>{typeof st.body === "string" ? st.body : st.body(i === 1 ? onboarding.questions.length : TRIAGE_KEYS.length)}</p></li>
              ))}
            </ol>
          </Fold>
        </SiteMore>
      </Section>

      <Cta second={{ href: "/safety", label: t.cta.safety }} />
    </main>
  );
}
