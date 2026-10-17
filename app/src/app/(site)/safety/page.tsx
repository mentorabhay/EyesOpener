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
import { SiteMore } from "../_components/fold";
import { Gates, Tiles, Tree, type Node } from "@/components/diagram/kit";
import { Fold } from "@/components/guide/more";

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
  const doctorSymptoms = DOCTOR_SYMPTOMS.map((k) => symptom[k].toLowerCase()).join(s.stop.or);
  const restSymptoms = STOP_SYMPTOMS.filter((k) => !DOCTOR_SYMPTOMS.includes(k));

  /* Layer 1 keeps every rule's name in view (the safety rules are never folded away); a tap opens its sentence. */
  const rules: Node[] = [
    { key: "questions", icon: <Icon name="questions" />, label: s.questions.title, say: <><p>{s.questions.body(TRIAGE_KEYS.length)}</p><p>{s.questions.yes}</p></> },
    { key: "doctor", icon: <Icon name="doctor" />, label: s.doctor.title, say: <><p>{s.doctor.body}</p><p className="notice" data-b="warn">{s.doctor.urgent}</p></> },
    { key: "cap", icon: <Icon name="cap" />, label: s.cap.title(MAX_DAILY_MINUTES), say: <p>{s.cap.body}</p> },
    { key: "age", icon: <Icon name="age" />, label: s.age.title(MIN_SCREEN_AGE), say: <p>{s.age.body}</p> },
    { key: "consent", icon: <Icon name="consent" />, label: s.consent.title, say: <p>{s.consent.body}</p> },
    { key: "counsellor", icon: <Icon name="counsellor" />, label: s.counsellor.title, say: <p>{s.counsellor.body(listed(level2.map((p) => p.name)))}</p> },
    { key: "ai", icon: <Icon name="ai" />, label: s.ai.title, say: <p>{s.ai.body}</p> },
    { key: "flash", icon: <Icon name="flash" />, label: s.flash.title, say: <p>{s.flash.body}</p> },
    { key: "not", icon: <Icon name="research" />, label: s.not.title, say: <p>{s.not.body}</p> },
  ];

  return (
    <main className="s-page">
      <Hero picture="safety-doctor" kicker={s.hero.kicker} title={s.hero.title} lead={s.hero.lead}>
        <div className="s-stats" style={{ marginTop: 34 }}>
          <div className="s-stat"><b>{MAX_DAILY_MINUTES}</b><span>{s.facts.cap.unit}</span></div>
          <div className="s-stat"><b>{MIN_SCREEN_AGE}</b><span>{s.facts.age.unit}</span></div>
          <div className="s-stat"><b>{TRIAGE_KEYS.length}</b><span>{s.facts.questions.unit}</span></div>
          <div className="s-stat"><b>{STOP_SYMPTOMS.length}</b><span>{s.facts.stop.unit}</span></div>
        </div>
      </Hero>

      <Section id="order" alt>
        <Head id="order" kicker={s.order.kicker} title={s.order.title} lead={s.order.lead} />
        <Gates
          label={s.order.diagram(order.length)} failWord={s.order.no}
          gates={order.map((k) => ({ key: k, ask: { key: `${k}-ask`, label: s.order.steps[k] }, fail: { key: `${k}-no`, label: train.blocked[k] } }))}
          pass={{ key: "start", label: s.order.then }}
        />
      </Section>

      <Section id="rules">
        <Head id="rules" kicker={s.rules.kicker} title={s.rules.title} />
        <Tiles label={s.rules.diagram} nodes={rules} cols={3} />
      </Section>

      <Section id="stop" alt>
        <Head id="stop" kicker={s.stop.kicker} title={s.stop.heading} />
        <Tree
          label={s.stop.diagram}
          question={{ key: "stop", icon: <Icon name="stop" />, label: train.stop.button, say: <><p>{s.stop.body}</p><p>{s.stop.asks}</p></> }}
          branches={[
            { key: "doctor", answer: s.stop.doctor(doctorSymptoms), to: { key: "to-doctor", tone: "stop", label: s.stop.toDoctor, say: <p>{train.stop.doctor}</p> } },
            { key: "rest", answer: s.stop.rest, to: { key: "to-rest", tone: "warn", label: s.stop.toRest, say: <><p>{train.stop.rest}</p><div className="s-chips">{restSymptoms.map((k) => <Chip key={k}>{symptom[k]}</Chip>)}</div></> } },
          ]}
        />
        <p className="s-note" style={{ marginTop: 18 }}>{s.stop.log}</p>
      </Section>

      <Section id="more" narrow>
        <SiteMore>
          <Fold title={s.questions.title}>
            <p>{s.questions.body(TRIAGE_KEYS.length)}</p>
            <ul className="s-points" aria-label={s.questions.list}>
              {TRIAGE_KEYS.map((k) => <li key={k}><span>{settings.triage.questions[k]}</span></li>)}
            </ul>
            <p>{s.questions.yes}</p>
            <p className="s-note">{s.questions.never}</p>
          </Fold>
          <Fold title={s.stop.title} warn>
            <p>{s.stop.body}</p>
            <p>{s.stop.asks}</p>
            <div className="s-chips">{STOP_SYMPTOMS.map((k) => <Chip key={k}>{symptom[k]}</Chip>)}</div>
            <p><b>{s.stop.doctor(doctorSymptoms)}</b> {train.stop.doctor}</p>
            <p><b>{s.stop.rest}</b> {train.stop.rest}</p>
            <p className="s-note">{s.stop.log}</p>
          </Fold>
          <Fold title={s.cap.title(MAX_DAILY_MINUTES)}><p>{s.cap.body}</p><p>{s.cap.why}</p></Fold>
          <Fold title={s.counsellor.title}>
            <p>{s.counsellor.body(listed(level2.map((p) => p.name)))}</p>
            <p>{s.counsellor.why}</p>
            <div className="s-chips s-foot-row">
              <LevelChip level={2} />
              {level2.map((p) => <Link key={p.slug} className="s-link" href={`/programmes/${p.slug}`}>{p.name}</Link>)}
            </div>
          </Fold>
          <Fold title={s.ai.title}><p>{s.ai.body}</p><ul className="s-points no">{s.ai.never.map((line) => <li key={line}><span>{line}</span></li>)}</ul></Fold>
          <Fold title={s.order.title}>
            <p>{s.order.lead}</p>
            <ol className="s-steps">
              {order.map((k) => <li key={k}><h3>{s.order.steps[k]}</h3><p>{train.blocked[k]}</p></li>)}
              <li><h3>{s.order.then}</h3></li>
            </ol>
          </Fold>
        </SiteMore>
        <p className="s-note" style={{ marginTop: 28 }}>{common.notMedical}</p>
      </Section>

      <Cta second={{ href: "/evidence", label: t.cta.evidence }} />
    </main>
  );
}
