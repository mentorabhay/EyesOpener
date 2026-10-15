import { More } from "@/components/guide/more";
import type { Metadata } from "next";
import { Btn, Card, PageHead } from "@/components/ui";
import css from "@/components/together/rewards.module.css";
import { SunsetSky, SunsetWords } from "@/components/together/sunset-sky";
import { sunset as t } from "@/copy/sunset";
import { today } from "@/copy/today";
import { together } from "@/copy/together";
import { train } from "@/copy/train";
import { ideaBySlug } from "@/data";
import { requireMember } from "@/lib/session";
import { dayMinutes, sunHeight } from "@/lib/sunset";
import { sunsetFor } from "@/lib/sunset-data";

const idea = ideaBySlug("sunset-rule")!;
export const metadata: Metadata = { title: idea.name };

/** The Sunset Rule: how the day closes, and where today's sun stands for the active profile. Read-only. */
export default async function SunsetPage() {
  const m = await requireMember();
  const view = await sunsetFor(m), s = view.sunset;
  const goal = dayMinutes(m.enrolment?.dailyMinutes ?? 0), height = sunHeight(s);

  return (
    <>
      <PageHead
        title={idea.name} crumb={[together.crumb]}
        stats={[
          { value: `${Math.round(view.minutes)} of ${goal}`, label: t.stats.minutes },
          { value: `${Math.round(view.light.done)} of ${view.light.goal}`, label: t.stats.light },
        ]}
      />
      <div className="bento">
        <Card title={s.state === "set" ? t.set.title : t.now.title} span={7}>
          <div className={css.sky}><SunsetSky height={height} label={s.state === "set" ? t.alt.set : t.alt.up(Math.round((1 - height) * 100))} /></div>
          {s.state === "set" && <SunsetWords view={view} />}
          {s.state === "open" && (
            <>
              <p>{t.now.open(s.left)}</p>
              {m.can("train") && <div className="row"><Btn href="/today" kind="g">{t.now.start}</Btn></div>}
            </>
          )}
          {s.state === "rest" && <p className="notice" data-b="warn"><b>{train.ended.stop_rule}</b> {train.stop.rest}</p>}
          {s.state === "closed" && <p className="notice" data-b={s.why === "doctor_first" ? "danger" : undefined}>{today.blocked[s.why]} {t.now.closed}</p>}
          {s.state === "tester" && <p className="notice">{t.now.tester}</p>}
        </Card>
        <Card title={t.rule.title} span={5}>
          <ul className={css.points}>{t.rule.points.map((p) => <li key={p}>{p}</li>)}</ul>
          <p className="muted small">{idea.why}</p>
        </Card>
      </div>
      <More><p>{idea.what}</p></More>
    </>
  );
}
