import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import clipCss from "@/components/clips/clips.module.css";
import { ClipRunner } from "@/components/clips/runner";
import { Card, Chip, Empty, PageHead } from "@/components/ui";
import { clips as c, reading, usedFor } from "@/copy/clips";
import { test } from "@/copy/test";
import { clipDef, clipLine, clipTest, type OfferedClip } from "@/data/clips";
import { EYE_NAME } from "@/engine";
import { clipState } from "@/lib/clip-rules";
import { clipContext, clipPerson, clipResults, clipRuns } from "@/lib/clips";
import { requireMember } from "@/lib/session";
import { dayText } from "../../results";

type Props = { params: Promise<{ code: string }> };
const TONE = { saved: "ok", pass: "ok", note: "plain", fail: "warn", na: "plain" } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: clipLine((await params).code.toUpperCase())?.title };
}

function storesText(def: OfferedClip): string {
  const s = def.store;
  if (s.to === "result") return c.stores.result([...new Set(s.keys.map((k) => clipTest(k)!.name))]);
  return s.to === "screen" ? c.stores.screen[s.field] : s.to === "browser" ? c.stores.browser : c.stores.note;
}

/** One clip: what it measures, what it needs, the runner, how the result is used, and what it is modelled on. */
export default async function ClipPage({ params }: Props) {
  const code = (await params).code.toUpperCase();
  const def = clipDef(code), line = clipLine(code);
  if (!def || !line) notFound();
  const m = await requireMember();
  const crumb = [{ href: "/test", label: test.title }, { href: "/test/clips", label: c.crumb }];
  const sources = (
    <>
      <p>{def.basis}</p>
      {def.sources.length > 0
        ? <ul className={clipCss.sources}>{def.sources.map((s) => <li key={s.url}><a href={s.url} rel="noreferrer">{s.label}</a></li>)}</ul>
        : def.offered && <p className="muted small">{c.page.noSource}</p>}
    </>
  );

  if (!def.offered) {
    return (
      <>
        <PageHead title={line.title} sub={c.what(code)} crumb={crumb} />
        <div className="bento">
          <Card title={c.withheldWhy} span={7}><Empty title={c.withheld}><span>{def.why}</span></Empty></Card>
          <Card title={c.page.measures} span={5}>
            <dl className="kv"><div><dt>{c.page.catalogue}</dt><dd>{line.measures}</dd></div></dl>
            {sources}
          </Card>
        </div>
      </>
    );
  }

  const [person, ctx, results, runs] = await Promise.all([clipPerson(m), clipContext(m), clipResults(m, def), clipRuns(m, def)]);
  const blocked = clipState(def, person);
  /* a cheer seat looks and encourages: a page that runs a test is not theirs */
  if (blocked === "seat") notFound();
  const play = def.play, eye = "eye" in play && play.eye !== "both" ? play.eye : null;
  const checkup = def.store.to === "result" ? def.store.keys.map((k) => clipTest(k)).find((t) => t?.checkup) : undefined;
  const need = [
    ...def.gear.map((g) => c.gear[g]),
    ...(def.place !== "any" ? [c.place[def.place]] : []),
    ...(eye ? [c.eyeNeed(eye)] : []),
    ...(def.who !== "anyone" ? [c.who[def.who]] : []),
  ];

  return (
    <>
      <PageHead title={line.title} sub={c.what(code)} crumb={crumb} stats={[{ value: c.short(line.seconds), label: c.page.length }]} />
      <div className="bento">
        <div className="span7 stack" style={{ gap: 16 }}>
          <ClipRunner key={`${m.profile.id}${code}`} def={def} ctx={ctx} blocked={blocked} />
        </div>
        <div className="span5 stack" style={{ gap: 16 }}>
          <Card title={c.page.measures}>
            <dl className="kv">
              <div><dt>{c.page.catalogue}</dt><dd>{line.measures}</dd></div>
              <div><dt>{c.page.stores}</dt><dd>{storesText(def)}</dd></div>
              {need.length > 0 && <div><dt>{c.page.need}</dt><dd><ul className={clipCss.plain}>{need.map((n) => <li key={n}>{n}</li>)}</ul></dd></div>}
            </dl>
            <p className="muted small">{c.estimate}</p>
          </Card>
          <Card title={c.page.use}><p>{usedFor(def.store, code)}</p></Card>
          {def.store.to === "result" ? (
            <Card title={c.page.past}>
              {results.length ? (
                <div className="tbwrap">
                  <table className="tb">
                    <tbody>
                      {results.map((r) => {
                        const t = clipTest(r.testKey)!;
                        return (
                          <tr key={r.id}>
                            <td>{dayText(r.takenAt)}</td>
                            <td>{t.name}{r.eye && `, ${EYE_NAME[r.eye === "left" ? "L" : "R"].toLowerCase()}`}</td>
                            <td className="tnum">{reading(r.testKey, r.unit, r.value, r.note)}{r.isBaseline && <> <Chip>{c.page.first}</Chip></>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <Empty title={c.never}><span>{c.page.pastNone}</span></Empty>}
              {checkup && <div className="row"><Link className="btn btn-sm" href={`/test/${checkup.key}`}>{c.page.history(checkup.name)}</Link></div>}
            </Card>
          ) : runs.length > 0 && (
            <Card title={c.page.runs}>
              <ul className={clipCss.steps}>
                {runs.map((r, i) => <li key={i}><span>{dayText(r.at)}</span><Chip tone={TONE[r.outcome as keyof typeof TONE] ?? "plain"}>{c.outcome[r.outcome as keyof typeof c.outcome] ?? r.outcome}</Chip></li>)}
              </ul>
            </Card>
          )}
          <Card title={c.page.basis}>{sources}</Card>
        </div>
      </div>
    </>
  );
}
