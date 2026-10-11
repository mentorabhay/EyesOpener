// Eyes Opener: First Depth Day for the active profile: the day a Depth check-up first found depth, the scene, and what the.
import { More } from "@/components/guide/more";
import type { Metadata } from "next";
import Link from "next/link";
import { GlassesOn } from "@/components/measure/cover";
import css from "@/components/together/rewards.module.css";
import { Btn, Card, Empty, PageHead } from "@/components/ui";
import { depthDay as t } from "@/copy/depth-day";
import { together } from "@/copy/together";
import { ideaBySlug, testByKey } from "@/data";
import { dayText } from "@/lib/community";
import { nextAnniversary } from "@/lib/depth-day";
import { depthDayFor } from "@/lib/depth-day-data";
import { currentHero } from "@/lib/hero";
import { dayOf } from "@/lib/league";
import { requireMember } from "@/lib/session";
import { DepthScene } from "./scene";

const idea = ideaBySlug("first-depth-day")!;
export const metadata: Metadata = { title: idea.name };

/**
 * First Depth Day for the active profile: the day a Depth check-up first found depth, the scene, and what the
 * check-ups since have found. It says what was measured and never why. Anyone of the household who may look may
 * open it; the scene's "played" mark is set only by someone who may train.
 */
export default async function DepthDayPage() {
  const m = await requireMember();
  const [v, hero] = await Promise.all([depthDayFor(m), currentHero(m)]);
  const s = v.story, mayTest = m.can("test");
  const every = testByKey("stereo")?.everyDays;
  const ppc = m.device?.pxPerCm ?? 0;
  const eye = {
    contrast: m.eye?.strongContrast ?? 1, gamma: m.device?.gamma ?? 2.2,
    targetPx: (m.eye?.targetCm ?? 0) * ppc, letterPx: (m.eye?.letterCm ?? 0) * ppc, ppc, distCm: m.device?.distanceCm ?? 0,
    cyanEye: m.eye?.cyanEye === "right" ? "R" as const : "L" as const,
    weakInk: m.eye?.weakInk === "red" ? "red" as const : "cyan" as const,
  };
  /* A kept day stays the day, whatever the check-up rows say later: it decides what the page shows. */
  const kept = v.kept, day = kept?.day ?? null;
  const found = kept ? kept.arcsec : s.state === "from_start" ? s.arcsec : null;
  const scene = found !== null && (
    <Card title={t.scene.title} span={7}>
      {v.mayWatch ? (
        <>
          <GlassesOn cyanEye={eye.cyanEye} />
          <p>{t.scene.how}</p>
          <DepthScene found={found} date={day ? dayText(day) : ""} eye={eye} hero={hero} mark={!!kept && !kept.playedAt && m.can("train")} />
          <p className="small muted">{hero ? t.scene.ownHero : <>{t.scene.noHero} <Link href="/together/hero">{t.scene.heroLink}</Link></>}</p>
          {!m.eye && <p className="small muted">{t.scene.noEye}</p>}
          <p className="small muted">{t.scene.flat} {t.scene.stopIf}</p>
        </>
      ) : <Empty title={t.scene.underAge} />}
    </Card>
  );

  return (
    <>
      <PageHead
        title={idea.name} crumb={[together.crumb]}
        stats={day ? [{ value: dayText(day), label: t.first.stat }] : undefined}
      />
      {v.years && <p className="notice" data-b="ok"><b>{t.first.years(v.years)}</b></p>}

      {!kept && s.state === "untested" && (
        <Empty title={t.untested.title}>
          <span>{t.untested.body}</span>
          {mayTest && <div><Btn href="/test/stereo" kind="g" small>{t.untested.cta}</Btn></div>}
        </Empty>
      )}

      {!kept && s.state === "not_yet" && (
        <div className={`bento ${css.stage}`}>
          <Card title={t.notYet.title}>
            <p>{t.notYet.taken(s.checks, dayText(s.last))}</p>
            <p>{t.notYet.common} {t.notYet.notAMark}</p>
            <p className="muted">{t.notYet.kept}{every ? ` ${t.notYet.every(every)}` : ""}</p>
            <div className="row"><Btn href="/test/stereo" small>{t.notYet.cta}</Btn></div>
          </Card>
        </div>
      )}

      {!kept && s.state === "from_start" && (
        <div className="bento">
          <Card title={t.fromStart.title} span={5}>
            <p>{t.fromStart.body(dayText(s.first), s.arcsec)}</p>
            <p>{t.fromStart.noDay}</p>
            <p className="muted">{t.fromStart.scene}</p>
            <div className="row"><Btn href="/test/stereo" small kind="gh">{t.notYet.cta}</Btn></div>
          </Card>
          {scene}
        </div>
      )}

      {kept && (
        <div className="bento">
          <Card title={t.first.head} span={5} tone="grad">
            <p className={`${css.date} tnum`}>{dayText(kept.day)}</p>
            <p>{s.state === "first" ? t.first.found(s.before) : t.first.foundPlain} {t.first.step(kept.arcsec)}</p>
            {v.since && (
              <p>
                {v.since.checks === 0 ? t.first.since.none : t.first.since.some(v.since.checks, v.since.found)}
                {v.since.latestFound === false && ` ${t.first.since.latestNot}`}
              </p>
            )}
            <p className="notice">{t.first.careful}</p>
            <p className="small muted">{t.first.kept(dayText(nextAnniversary(kept.day, dayOf(new Date()))))}</p>
            <div className="row"><Btn href="/test/stereo" small kind="gh">{t.notYet.cta}</Btn></div>
          </Card>
          {scene}
        </div>
      )}
      <More><p>{idea.what}</p></More>
    </>
  );
}
