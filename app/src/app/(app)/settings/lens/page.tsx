import type { Metadata } from "next";
import { Btn, Card, Chip, PageHead } from "@/components/ui";
import { lens as t } from "@/copy/lens";
import type { WeakInk } from "@/engine";
import { eyeOf, weakInkOf } from "@/lib/eye-profile";
import { cyanEyeFor, suggestInk, upsideDown } from "@/lib/lens-choice";
import { mayCalibrate, screenFacts } from "@/lib/screen-rules";
import { requireMember } from "@/lib/session";
import { Lenses } from "../screen/lenses";
import { chooseInk } from "./actions";
import css from "./lens.module.css";

export const generateMetadata = (): Metadata => ({ title: t.title("") });
type Search = Promise<Record<string, string | string[] | undefined>>;

/**
 * /settings/lens: which ink the active profile's weaker eye sees (engine/profile.ts, `WeakInk`), with the leak check's
 * suggestion (src/lib/lens-choice.ts). Everyone with a seat may look; a guardian or co-guardian chooses.
 */
export default async function LensPage({ searchParams }: { searchParams: Search }) {
  const m = await requireMember();
  const q = await searchParams;
  const now = weakInkOf(m.profile.weakInk);
  const weak = m.eye?.weakEye ? eyeOf(m.eye.weakEye) : null;
  const leak = m.device ? screenFacts(m.device).leak : null;
  const suggestion = suggestInk(leak);
  const canChoose = mayCalibrate(m);
  /* a choice never made, or never confirmed, is a step of setup still to do */
  const confirmed = !!m.profile.weakInkAt;

  const option = (ink: WeakInk) => {
    const words = t.options[ink], cyanEye = weak ? cyanEyeFor(weak, ink) : null;
    return (
      <Card key={ink} span={6}>
        <div className={css.option} data-current={ink === now || undefined}>
          <div className={css.top}>
            <h2>{words.title}</h2>
            <Chip>{words.tag}</Chip>
            {ink === now && <Chip tone="ok">{t.current}</Chip>}
            {ink === suggestion.ink && suggestion.why === "red_leaks_more" && ink !== now && <Chip tone="warn">{t.suggested}</Chip>}
          </div>
          {cyanEye && <div className={css.glasses}><Lenses look="both" turned={cyanEye === "L"} label={t.picture(cyanEye)} /><span>{t.wear(cyanEye, upsideDown(cyanEye))}</span></div>}
          <p>{words.sees}</p>
          <p className="muted small">{words.ghost}</p>
          {canChoose && (ink !== now || !confirmed) && (
            <form action={chooseInk}><input type="hidden" name="ink" value={ink} /><button className={ink === now ? "btn" : "btn btn-g"}>{ink === now ? t.keep : t.save}</button></form>
          )}
        </div>
      </Card>
    );
  };

  return (
    <>
      <PageHead title={t.title(m.profile.displayName)} sub={t.sub} crumb={[{ href: "/setup", label: t.crumbSetup }, { href: "/settings", label: t.crumb }]} />
      {!confirmed && weak && <p className="notice" data-b="warn">{t.confirm}</p>}
      {q.kept && <p className="notice" data-b="ok" role="status">{t.kept} <Btn href="/setup" small>{t.crumbSetup}</Btn></p>}
      {q.saved && <p className="notice" data-b="ok" role="status">{t.saved} <Btn href="/test/balance" small>{t.balanceLink}</Btn></p>}
      <Card>
        <div className={css.facts}>
          <p>{weak ? t.weakIs(weak) : t.noWeak}</p>
          {leak && (
            <div className={css.leak} aria-label={t.leakTitle}>
              <span className="muted small">{t.leakTitle}</span>
              <Chip tone={leak.red >= 0.02 ? "warn" : "ok"}>{t.leakRed(leak.red)}</Chip>
              <Chip tone={leak.cyan >= 0.02 ? "warn" : "ok"}>{t.leakCyan(leak.cyan)}</Chip>
            </div>
          )}
          <p className="small">{t.suggest[suggestion.why]}</p>
        </div>
      </Card>
      <div className="bento">
        {option("cyan")}
        {option("red")}
        <Card title={t.whatChanges.title} span={6}><ul className={css.list}>{t.whatChanges.items.map((l) => <li key={l}>{l}</li>)}</ul></Card>
        <Card title={t.evidence.title} span={6}><p className="small">{t.evidence.body}</p></Card>
      </div>
      {!canChoose && <p className="notice">{t.lookOnly}</p>}
    </>
  );
}
