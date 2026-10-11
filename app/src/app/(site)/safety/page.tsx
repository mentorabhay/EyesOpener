// Eyes Opener: The order the engine checks before a session, read from the engine itself: each case below trips one more.
import type { Metadata } from "next";
import Link from "next/link";
import { Chip } from "@/components/ui";
import { common } from "@/copy/common";
import { settings } from "@/copy/settings";
import { listed, site as t } from "@/copy/site";
import { train } from "@/copy/train";
import { programmes } from "@/data";
import { canStart, DOCTOR_SYMPTOMS, MAX_DAILY_MINUTES, MIN_SCREEN_AGE, STOP_SYMPTOMS, type DoseBlock, type DoseInput } from "@/engine";
import { TRIAGE_KEYS } from "@/lib/family";
import { pageMeta } from "@/lib/site";
import { Icon } from "../_components/art";
import { LevelChip } from "../_components/catalogue";
import { Cta, Head, Hero, Section } from "../_components/parts";

const s = t.safety;
export const generateMetadata = (): Metadata => (pageMeta("/safety", s.meta));

/**
 * The order the engine checks before a session, read from the engine itself: each case below trips one more
 * block than the last, and `canStart` says which block it reports first. If the engine's order changes, this list follows.
 */
const ALL: DoseInput = { kind: "game", age: MIN_SCREEN_AGE - 1, minutesToday: MAX_DAILY_MINUTES, dailyMinutes: 1, stopFlag: true, consentMissing: true, awaitingCounsellor: true };
const PEEL: Partial<DoseInput>[] = [{}, { age: null }, { stopFlag: false }, { consentMissing: false }, { awaitingCounsellor: false }, { minutesToday: 1 }];
function engineOrder(): DoseBlock[] {
  const order: DoseBlock[] = [];
  let input = ALL;
  for (const peel of PEEL) {
    input = { ...input, ...peel };
    const reason = canStart(input).reason;
    if (reason && !order.includes(reason)) order.push(reason);
  }
  return order;
}

/** The symptoms after which the stop screen says to see an eye doctor. The rest say to rest. Mirrors the session screen. */

export default function SafetyPage() {
  const level2 = programmes.filter((p) => p.level === 2);
  const order = engineOrder();
  const symptom = train.stop.symptoms;

  return (
    <main className="s-page">
      <Hero kicker={s.hero.kicker} title={s.hero.title} lead={s.hero.lead}>
        <div className="s-stats" style={{ marginTop: 34 }}>
          <div className="s-stat"><b>{MAX_DAILY_MINUTES}</b><span>{s.facts.cap.unit}</span></div>
          <div className="s-stat"><b>{MIN_SCREEN_AGE}</b><span>{s.facts.age.unit}</span></div>
          <div className="s-stat"><b>{TRIAGE_KEYS.length}</b><span>{s.facts.questions.unit}</span></div>
          <div className="s-stat"><b>{STOP_SYMPTOMS.length}</b><span>{s.facts.stop.unit}</span></div>
        </div>
      </Hero>

      <Section id="rules" alt>
        <Head id="rules" kicker={s.rules.kicker} title={s.rules.title} />
        <div className="s-grid two">
          <article className="s-card s-reveal">
            <Icon name="questions" />
            <h3>{s.questions.title}</h3>
            <p>{s.questions.body(TRIAGE_KEYS.length)}</p>
            <ul className="s-points" aria-label={s.questions.list}>
              {TRIAGE_KEYS.map((k) => <li key={k}><span>{settings.triage.questions[k]}</span></li>)}
            </ul>
            <p>{s.questions.yes}</p>
            <p className="s-note">{s.questions.never}</p>
          </article>

          <article className="s-card s-reveal">
            <Icon name="stop" />
            <h3>{s.stop.title}</h3>
            <p>{s.stop.body}</p>
            <p><span className="btn btn-d">{train.stop.button}</span></p>
            <p>{s.stop.asks}</p>
            <div className="s-chips">{STOP_SYMPTOMS.map((k) => <Chip key={k}>{symptom[k]}</Chip>)}</div>
            <p><b>{s.stop.doctor(DOCTOR_SYMPTOMS.map((k) => symptom[k].toLowerCase()).join(s.stop.or))}</b> {train.stop.doctor}</p>
            <p><b>{s.stop.rest}</b> {train.stop.rest}</p>
            <p className="s-note">{s.stop.log}</p>
          </article>

          <article className="s-card s-reveal">
            <Icon name="doctor" />
            <h3>{s.doctor.title}</h3>
            <p>{s.doctor.body}</p>
            <p className="notice" data-b="warn">{s.doctor.urgent}</p>
          </article>

          <article className="s-card s-reveal">
            <Icon name="cap" />
            <h3>{s.cap.title(MAX_DAILY_MINUTES)}</h3>
            <p>{s.cap.body}</p>
            <p>{s.cap.why}</p>
          </article>

          <article className="s-card s-reveal">
            <Icon name="age" />
            <h3>{s.age.title(MIN_SCREEN_AGE)}</h3>
            <p>{s.age.body}</p>
          </article>

          <article className="s-card s-reveal">
            <Icon name="consent" />
            <h3>{s.consent.title}</h3>
            <p>{s.consent.body}</p>
          </article>

          <article className="s-card s-reveal">
            <Icon name="counsellor" />
            <h3>{s.counsellor.title}</h3>
            <p>{s.counsellor.body(listed(level2.map((p) => p.name)))}</p>
            <p>{s.counsellor.why}</p>
            <div className="s-chips s-foot-row">
              <LevelChip level={2} />
              {level2.map((p) => <Link key={p.slug} className="s-link" href={`/programmes/${p.slug}`}>{p.name}</Link>)}
            </div>
          </article>

          <article className="s-card s-reveal">
            <Icon name="ai" />
            <h3>{s.ai.title}</h3>
            <p>{s.ai.body}</p>
            <ul className="s-points no">{s.ai.never.map((line) => <li key={line}><span>{line}</span></li>)}</ul>
          </article>

          <article className="s-card s-reveal">
            <Icon name="flash" />
            <h3>{s.flash.title}</h3>
            <p>{s.flash.body}</p>
          </article>

          <article className="s-card s-reveal">
            <Icon name="research" />
            <h3>{s.not.title}</h3>
            <p>{s.not.body}</p>
          </article>
        </div>
      </Section>

      <Section id="order" narrow>
        <Head id="order" kicker={s.order.kicker} title={s.order.title} lead={s.order.lead} />
        <ol className="s-steps">
          {order.map((k) => (
            <li key={k} className="s-reveal">
              <h3>{s.order.steps[k]}</h3>
              <p>{train.blocked[k]}</p>
            </li>
          ))}
          <li className="s-reveal"><h3>{s.order.then}</h3></li>
        </ol>
        <p className="s-note" style={{ marginTop: 28 }}>{common.notMedical}</p>
      </Section>

      <Cta second={{ href: "/evidence", label: t.cta.evidence }} />
    </main>
  );
}
