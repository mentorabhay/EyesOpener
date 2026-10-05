import type { Metadata } from "next";
import Link from "next/link";
import { Btn, Chip, Empty, PageHead, Void } from "@/components/ui";
import { clips } from "@/copy/clips";
import { test as c } from "@/copy/test";
import { tests } from "@/data";
import { testWords } from "@/data/words";
import { testBlock } from "@/lib/eye-profile";
import { requireMember } from "@/lib/session";
import { ChangeAlert } from "./alert";
import { change, changesOf, dueIn, reading, resultsOf, runPath, seriesOf } from "./results";
import css from "./test.module.css";

export const generateMetadata = (): Metadata => ({ title: c.title });

const TONE = { better: "ok", worse: "warn", same: "plain" } as const;

export default async function CheckupsPage() {
  const m = await requireMember();
  const rows = await resultsOf(m.profile.id);
  const cards = tests.map((t) => {
    const series = seriesOf(t, rows);
    return { t, series, days: dueIn(t, series) };
  });
  const due = cards.filter((x) => x.t.built && x.days <= 0);
  const block = testBlock(m);
  const changed = cards.filter((x) => changesOf(x.t, x.series).length).length;

  return (
    <>
      <PageHead title={c.title} sub={c.sub} stats={[{ value: due.length, label: c.dueCount }]} />
      <div className="row">
        <Btn href="/test/summary" small>{c.summaryLink}</Btn>
        <Btn href="/test/clips" small>{clips.hubLink}</Btn>
        {changed > 0 && <span className={css.changed}>{c.alert.hub(changed)}</span>}
      </div>
      {block && <p className="notice" data-b="warn">{c.blocked[block]}</p>}
      {!block && !m.device && (
        <Empty title={c.noScreen.title}><span>{c.noScreen.body}</span><Btn href="/onboarding" kind="g" small>{c.noScreen.cta}</Btn></Empty>
      )}
      <div className={`grid-cards ${css.cards}`}>
        {cards.map(({ t, series, days }) => (
          <article className="c" key={t.key}>
            <div className="c-head">
              <h2><Link href={`/test/${t.key}`}>{testWords(t).name}</Link></h2>
              {t.built && <div className="r"><Chip tone={days <= 0 ? "warn" : "plain"}>{days <= 0 ? c.dueNow : c.dueIn(days)}</Chip></div>}
            </div>
            <p className="muted small">{testWords(t).what} {c.every(t.everyDays)}.</p>
            {(t.built || series.some((s) => s.last)) && (
              <dl className="kv">
                {series.map(({ eye, first, last }) => (
                  <div key={eye ?? "both"}>
                    <dt>{eye ? c.eye[eye] : c.latest}</dt>
                    {first && last ? (
                      <dd className="tnum">
                        {reading(t, last)}{" "}
                        {first.id === last.id ? <Chip>{c.first}</Chip> : <Chip tone={TONE[change(t, first, last)]}>{c.change[change(t, first, last)]}</Chip>}
                        {first.id !== last.id && <small>{c.startedAt(reading(t, first))}</small>}
                      </dd>
                    ) : <dd><Void /><small>{c.never}</small></dd>}
                  </div>
                ))}
              </dl>
            )}
            <ChangeAlert t={t} series={series} compact />
            {t.built ? (
              <div className="row">
                {!block && <Btn href={runPath(t.key)} kind={t.key === due[0]?.t.key ? "g" : ""} small>{c.take}</Btn>}
                <Btn href={`/test/${t.key}`} kind="gh" small>{c.history}</Btn>
                {t.glasses && <Chip>{c.glasses}</Chip>}
              </div>
            ) : <Empty title={c.notBuilt.title}><span>{c.notBuilt.body}</span></Empty>}
          </article>
        ))}
      </div>
    </>
  );
}
