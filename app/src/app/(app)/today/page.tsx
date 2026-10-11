// Eyes Opener: Page controller component for the app/src/app/(app)/today web route.
import type { Metadata } from "next";
import { and, desc, eq, gte } from "drizzle-orm";
import { Btn, Card, Chip, Empty, PageHead, Rings } from "@/components/ui";
import { today as t } from "@/copy/today";
import { programmeBySlug } from "@/data";
import { db, schema } from "@/db";
import { canStart, percent, ringShare } from "@/engine";
import { programme as plan } from "@/copy/programme";
import { programmeView } from "@/lib/programme";
import { lastDays, requireMember } from "@/lib/session";
import { TodayRewards } from "@/components/together/today-rewards";
import { TodayChapter } from "./chapter";
import { programmeWords } from "@/data/words";

export const generateMetadata = (): Metadata => ({ title: t.title });

export default async function TodayPage() {
  const m = await requireMember();
  const span = lastDays(7);
  const dayKey = span[6].key;
  const since = span[0].key;
  const days = await db.select().from(schema.daySummary)
    .where(and(eq(schema.daySummary.profileId, m.profile.id), gte(schema.daySummary.day, since)))
    .orderBy(desc(schema.daySummary.day));
  const d = days.find((x) => x.day === dayKey) ?? { restBreaks: 0, restGoal: 6, trainMinutes: 0, trainGoal: m.enrolment?.dailyMinutes ?? 0, lightMinutes: 0, lightGoal: 90, screenMinutes: 0 };
  const [streak] = await db.select().from(schema.streak).where(eq(schema.streak.profileId, m.profile.id));
  const programme = m.enrolment ? programmeBySlug(m.enrolment.programme) : null;
  /* The week of the programme and today's chapter. Reading it also moves the stored week on with the calendar. */
  const view = await programmeView(m);
  const dose = canStart({ kind: "game", minutesToday: d.trainMinutes, ...m.dose });

  const week = span.map(({ key, label }) => {
    const row = days.find((x) => x.day === key);
    return { label, minutes: row?.trainMinutes ?? 0, goal: row?.trainGoal ?? d.trainGoal };
  });
  const top = Math.max(60, ...week.map((w) => w.minutes));

  return (
    <>
      <PageHead
        title={t.title}
        sub={programme && view.state === "active" ? `${plan.card.weekOf(programmeWords(programme).name, view.week, view.weeks)} ${programmeWords(programme).doseBasis}` : t.notEnrolled}
        stats={[{ value: streak?.current ?? 0, label: t.streakDays }, { value: `${Math.round(d.screenMinutes / 6) / 10} h`, label: t.screen }]}
      />
      {/* Rewards: the sunset once the day's minutes are done, and a quiet line on a first depth day. */}
      <TodayRewards m={m} />
      <div className="bento">
        <Card title={t.ringsTitle} span={7}>
          <div className="rings">
            <Rings rest={ringShare(d.restBreaks, d.restGoal)} train={ringShare(d.trainMinutes, d.trainGoal)} light={ringShare(d.lightMinutes, d.lightGoal)} />
            <div className="ringkey">
              <div className="k"><i className="dot" style={{ background: "var(--ring-rest)" }} /><span>{t.rings.rest}</span><b className="tnum">{t.rings.of(d.restBreaks, d.restGoal)}</b><span className="muted">{t.rings.restUnit}</span></div>
              <div className="k"><i className="dot" style={{ background: "var(--ring-train)" }} /><span>{t.rings.train}</span><b className="tnum">{t.rings.of(Math.round(d.trainMinutes), d.trainGoal)}</b><span className="muted">{t.rings.minUnit}</span></div>
              <div className="k"><i className="dot" style={{ background: "var(--ring-light)" }} /><span>{t.rings.light}</span><b className="tnum">{t.rings.of(Math.round(d.lightMinutes), d.lightGoal)}</b><span className="muted">{t.rings.minUnit}</span></div>
            </div>
          </div>
          <TodayChapter view={view} dose={dose} />
          {/* The Rest and Light rings fill from the care companions: breaks taken and time outside. */}
          <div className="row">
            <Btn href="/train/games/far-window/play" small>{t.fill.rest}</Btn>
            <Btn href="/train/games/sky-spotter/play" small>{t.fill.light}</Btn>
            {/* The workday monitor is for a grown-up's profile, opened by a guardian seat. */}
            {m.profile.kind === "adult" && m.seat !== "circle" && <Btn href="/today/monitor" small>{t.fill.monitor}</Btn>}
          </div>
        </Card>

        <Card title={t.week} span={5}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 132 }} role="img" aria-label={week.map((w) => t.weekDay(w.label, Math.round(w.minutes))).join(", ")}>
            {week.map((w) => (
              <div key={w.label} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: 6, height: "100%" }}>
                <span className="small tnum muted">{Math.round(w.minutes) || ""}</span>
                <div className={w.minutes ? "" : "prog hatched"} style={{ width: "100%", borderRadius: 9, height: w.minutes ? `${Math.max(8, (w.minutes / top) * 84)}px` : 84, background: w.minutes ? "var(--grad)" : undefined }} />
                <span className="small muted">{w.label}</span>
              </div>
            ))}
          </div>
          <p className="muted small">{t.weekNote}</p>
        </Card>

        <Card title={t.settings} span={7} right={<Btn href={m.eye ? "/setup/eyes" : "/setup"} small>{m.eye ? t.again : t.noProfile.cta}</Btn>}>
          {m.eye ? (
            <dl className="kv">
              <div><dt>{t.rows.weak}</dt><dd>{m.eye.weakEye === "left" ? t.eye.left : m.eye.weakEye === "right" ? t.eye.right : t.eye.none}</dd></div>
              <div><dt>{t.rows.contrast}</dt><dd>{percent(m.eye.strongContrast)}<small>{m.eye.balanceLogRatio === null ? t.contrastFrom.start : t.contrastFrom.balance}</small></dd></div>
              <div><dt>{t.rows.letter}</dt><dd>{(m.eye.letterCm * 10).toFixed(1)} mm</dd></div>
            </dl>
          ) : <Empty title={t.noProfile.title}><span>{t.noProfile.body}</span></Empty>}
        </Card>

        <Card title={t.streak} span={5} tone="grad">
          <div className="row"><span className="hstat"><span className="v tnum">{streak?.current ?? 0}</span></span><span className="muted">{t.inARow}</span><span className="sp" /><Chip tone="plain">{t.lightsToGive(streak?.lights ?? 0)}</Chip></div>
          <div className="row"><Btn href="/together" small>{t.give}</Btn><Btn href="/together/league" small kind="gh">{t.league}</Btn></div>
        </Card>
      </div>
    </>
  );
}
