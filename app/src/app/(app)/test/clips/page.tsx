import type { Metadata } from "next";
import Link from "next/link";
import clipCss from "@/components/clips/clips.module.css";
import { StepFlow } from "@/components/guide/flow";
import { More } from "@/components/guide/more";
import { listSteps } from "@/components/guide/steps";
import { Btn, Chip, Empty, PageHead, Pills } from "@/components/ui";
import { guide as gw } from "@/copy/guide";
import { clips as c } from "@/copy/clips";
import { test } from "@/copy/test";
import { CLIPS, SET_KEYS, clipGroups, clipLine, isCalibration } from "@/data/clips";
import { clipState } from "@/lib/clip-rules";
import { clipPerson, lastRuns, setView } from "@/lib/clips";
import { requireMember } from "@/lib/session";
import { dayText } from "../results";

export const generateMetadata = (): Metadata => ({ title: c.title });

const TONE = { saved: "ok", pass: "ok", note: "plain", fail: "warn", na: "plain" } as const;

/**
 * The clip library: the three sets, then every one of the 100 clips by group, with what it needs and whether it
 * can run on this screen for this profile. Anyone with a seat may look; who may run a clip is checked again on
 * the clip's own page and on the server when a result arrives.
 */
export default async function ClipsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const m = await requireMember();
  const sp = await searchParams;
  const show = c.filter.find((f) => f.key === sp.show)?.key ?? "all";
  const [person, runs, sets] = await Promise.all([clipPerson(m), lastRuns(m), Promise.all(SET_KEYS.map((key) => setView(m, key)))]);
  const all = CLIPS.map((entry) => ({ ...entry, blocked: clipState(entry.def, person), last: runs.get(entry.line.code) }));
  const here = all.filter((x) => !x.blocked || x.blocked === "camera").length, withheld = all.filter((x) => !x.def.offered).length;
  const shown = all.filter((x) => show === "all" || (show === "screen") === isCalibration(x.line.code));
  const dist = m.device?.distanceCm ?? 0;
  /* A cheer seat may read the library but cannot open a clip or a set: those pages answer "not found" for it, so they are not linked. */
  const mayOpen = person.block !== "seat";

  return (
    <>
      <PageHead
        title={c.title} crumb={[{ href: "/test", label: test.title }]}
        stats={[{ value: here, label: c.stat.here }, { value: all.filter((x) => x.last).length, label: c.stat.done }, { value: withheld, label: c.stat.withheld }]}
      />
      {person.block && <p className="notice" data-b="warn">{c.blocked[person.block]}</p>}
      {!person.block && !m.device && (
        <Empty title={test.noScreen.title}><span>{c.blocked.no_screen}</span><Btn href="/setup" kind="g" small>{c.onboarding}</Btn></Empty>
      )}
      <StepFlow steps={listSteps(gw.clips, ["tap", "list", "check"])} compact />

      <section className={clipCss.group} aria-labelledby="sets-head">
        <h2 id="sets-head">{c.sets.title}<small>{c.sets.sub}</small></h2>
        <div className="grid-cards">
          {sets.map((s) => {
            const can = s.items.filter((i) => !i.blocked), left = can.filter((i) => !s.done.includes(i.code));
            const seconds = left.reduce((sum, i) => sum + (clipLine(i.code)?.seconds ?? 0), 0);
            return (
              <article className={`c ${clipCss.setcard}`} key={s.key}>
                <div className="c-head"><h3>{mayOpen ? <Link href={`/test/clips/set/${s.key}`}>{c.sets.name[s.key]}</Link> : c.sets.name[s.key]}</h3></div>
                <p className="muted small">{c.sets.what[s.key]}</p>
                {s.key === "weekly" && <p className="muted small">{s.from ? c.sets.weeklyFrom.plan(s.from.name, s.from.week) : c.sets.weeklyFrom.due}</p>}
                <div className={clipCss.chips}>
                  <Chip>{c.sets.steps(can.length)}</Chip>
                  {left.length > 0 && <Chip>{c.minutes(seconds)}</Chip>}
                  {can.length > 0 && left.length === 0 && <Chip tone="ok">{c.sets.state.done}</Chip>}
                </div>
                {mayOpen && <div className="row">
                  <Btn href={`/test/clips/set/${s.key}`} kind={left.length > 0 && !person.block ? "g" : ""} small>{left.length > 0 && !person.block ? c.sets.start : c.sets.open}</Btn>
                </div>}
              </article>
            );
          })}
        </div>
      </section>

      <div className="row"><Pills items={[...c.filter]} current={show} param="show" base="/test/clips" /></div>

      {clipGroups.map((group) => {
        const list = shown.filter((x) => x.line.group === group);
        if (!list.length) return null;
        return (
          <section className={clipCss.group} key={group} aria-label={group}>
            <h2>{group}<small>{c.kinds[isCalibration(list[0].line.code) ? "C" : "M"]}</small></h2>
            <div className={`grid-cards ${clipCss.cards}`}>
              {list.map(({ line, def, blocked, last }) => (
                <article className={`c ${clipCss.card}`} key={line.code}>
                  <h3>{mayOpen ? <Link href={`/test/clips/${line.code}`}>{line.title}</Link> : line.title}</h3>
                  <p className="muted">{c.what(line.code)}</p>
                  <div className={clipCss.chips}>
                    {def.offered ? (
                      <>
                        <Chip>{c.short(line.seconds)}</Chip>
                        {def.gear.slice(0, 2).map((g) => <Chip key={g}>{c.gearShort[g]}</Chip>)}
                        {def.place !== "any" && <Chip tone={blocked === "need_near" || blocked === "need_far" ? "none" : "plain"}>{c.placeShort[def.place]}</Chip>}
                        {blocked && blocked !== "need_near" && blocked !== "need_far" && blocked !== "seat" && blocked !== "under_age" && <Chip tone="none">{c.blockedShort[blocked]}</Chip>}
                        {last && <Chip tone={TONE[last.outcome as keyof typeof TONE] ?? "plain"}>{c.lastDone(dayText(last.at))}</Chip>}
                      </>
                    ) : <Chip tone="none">{c.withheld}</Chip>}
                  </div>
                  {(blocked === "need_near" || blocked === "need_far") && <p className="muted small">{c.blocked[blocked](dist)}</p>}
                </article>
              ))}
            </div>
          </section>
        );
      })}
      <More hint={c.sub}><p>{c.sub}</p><p className="muted small">{c.estimate}</p></More>
    </>
  );
}
