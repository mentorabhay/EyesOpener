import type { Metadata } from "next";
import Link from "next/link";
import { Btn, Card, Chip, PageHead, type Tone } from "@/components/ui";
import { Ring } from "@/components/setup/setup";
import { lens } from "@/copy/lens";
import { screen as sc } from "@/copy/screen";
import { day } from "@/copy/settings";
import { setup as t } from "@/copy/setup";
import { cyanCode, EYE_NAME, weakLight } from "@/engine";
import { eyeOf, weakInkOf } from "@/lib/eye-profile";
import { mayCalibrate, screenFacts } from "@/lib/screen-rules";
import { requireMember } from "@/lib/session";
import { setupOf } from "@/lib/setup";
import { minutesLeft, type SetupPart, type SetupStep } from "@/lib/setup-rules";
import css from "./setup.module.css";

export const generateMetadata = (): Metadata => ({ title: t.title });

const TONE: Record<SetupStep["state"], Tone> = { done: "ok", todo: "plain", again: "warn", skip: "none" };

/**
 * /setup: what this screen, these glasses and this person still need before two-eye games open, in order, each one
 * press from being done. The rules: src/lib/setup-rules.ts. Onboarding (/onboarding) now opens here.
 */
export default async function SetupPage() {
  const m = await requireMember();
  const s = await setupOf(m);
  const name = m.profile.displayName;
  const canScreen = mayCalibrate(m), canTest = m.can("test");
  const facts = m.device ? screenFacts(m.device) : null;

  /* what is on record for a step, in a few words */
  const detail = (st: SetupStep): string | null => {
    if (st.why) return t.why[st.why];
    if (st.state !== "done") return null;
    if (st.key === "size" && m.device) return sc.record.size(m.device.pxPerCm, m.device.distanceCm, day(m.device.calibratedAt));
    if (st.key === "tune" && facts) return `${sc.record.greenValue(cyanCode(facts.tune, facts.gamma.value), weakLight(facts.tune.green, facts.tune.blue))} · ${sc.record.redTopValue(facts.tune.redTop)}`;
    if (st.key === "leak" && facts?.leak) return `${lens.leakRed(facts.leak.red)} · ${lens.leakCyan(facts.leak.cyan)}`;
    if (st.key === "eyes" && m.eye) return m.eye.weakEye ? lens.weakIs(eyeOf(m.eye.weakEye)) : t.detail.noWeak;
    if (st.key === "lens") return lens.settingsValue[weakInkOf(m.profile.weakInk)];
    return null;
  };
  const may = (st: SetupStep) => (st.part === "screen" ? canScreen : st.key === "lens" ? canScreen : canTest);

  const part = (p: SetupPart) => {
    const rows = s.steps.filter((st) => st.part === p);
    return (
      <Card span={6} title={p === "screen" ? t.parts.screen.title : t.parts.person.title(name)}>
        <p className="muted small">{p === "screen" ? t.parts.screen.sub : t.parts.person.sub}</p>
        <ol className={css.steps}>
          {rows.map((st) => (
            <li key={st.key} data-state={st.state} data-next={s.next?.key === st.key || undefined}>
              <span className={css.mark} aria-hidden="true" />
              <div className={css.body}>
                <div className={css.top}>
                  <b>{t.steps[st.key].name}</b>
                  <Chip tone={TONE[st.state]}>{t.state[st.state]}</Chip>
                  {!st.required && <Chip>{t.recommended}</Chip>}
                  <span className="muted small">{t.steps[st.key].time}</span>
                </div>
                <p className="small">{t.steps[st.key].what}</p>
                {detail(st) && <p className="muted small">{detail(st)}</p>}
              </div>
              {may(st) && st.state !== "skip" && <Btn href={st.href} small kind={s.next?.key === st.key ? "g" : ""}>{t.doIt[st.state]}</Btn>}
            </li>
          ))}
        </ol>
        {p === "screen" && !canScreen && <p className="notice">{t.grownUp}</p>}
      </Card>
    );
  };

  return (
    <>
      <PageHead
        title={t.head(name)} sub={t.sub}
        stats={[{ value: <span className={css.stat}><Ring done={s.done} of={s.of} size={40} />{t.count(s.done, s.of)}</span>, label: s.ready ? t.ready(name) : t.left(minutesLeft(s.steps)) }]}
      />
      {m.tester && <p className="notice">{t.tester}</p>}
      {s.ready
        ? <p className="notice" data-b="ok" role="status">{t.ready(name)} <Link href="/train">{t.detail.games}</Link></p>
        : s.next && may(s.next) && (
          <div className={css.next}>
            <Btn href={s.next.href} kind="g">{t.next}</Btn>
            <span>{t.nextIs(t.steps[s.next.key].name)}</span>
          </div>
        )}
      <div className="bento">
        {part("screen")}
        {part("person")}
        <Card span={12} title={t.open.title}><p className="small">{t.open.body}</p></Card>
      </div>
    </>
  );
}
