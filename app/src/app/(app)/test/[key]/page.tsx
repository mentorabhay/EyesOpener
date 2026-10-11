// Eyes Opener: Page controller component for the app/src/app/(app)/test/[key] web route.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StepFlow } from "@/components/guide/flow";
import { More } from "@/components/guide/more";
import { checkupSteps } from "@/components/guide/steps";
import { Btn, Card, Chip, Empty, PageHead } from "@/components/ui";
import { test as c } from "@/copy/test";
import { testByKey } from "@/data";
import { testWords } from "@/data/words";
import { testBlock } from "@/lib/eye-profile";
import { requireMember } from "@/lib/session";
import { ChangeAlert } from "../alert";
import { change, dayText, dueIn, meaningOf, reading, resultsOf, runPath, seriesOf } from "../results";
import { Chart } from "./chart";

type Props = { params: Promise<{ key: string }> };
const h = c.historyOf;
const TONE = { better: "ok", worse: "warn", same: "plain" } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = testByKey((await params).key);
  return { title: t ? testWords(t).name : undefined };
}

export default async function HistoryPage({ params }: Props) {
  const t = testByKey((await params).key);
  if (!t) notFound();
  const m = await requireMember();
  const series = seriesOf(t, await resultsOf(m.profile.id, t.key));
  const rows = series.flatMap((s) => s.rows.map((r) => ({ r, first: s.first! }))).sort((a, b) => b.r.takenAt.getTime() - a.r.takenAt.getTime());
  const days = dueIn(t, series);
  const block = testBlock(m);
  const latest = series[0].last;
  const meaning = !t.perEye && latest ? meaningOf(t, latest) : [];
  const pair = t.key === "fusion_break" ? "fusion_recovery" : t.key === "fusion_recovery" ? "fusion_break" : null;

  return (
    <>
      <PageHead
        title={testWords(t).name} crumb={[{ href: "/test", label: c.title }]}
        stats={series.filter((s) => s.last).map((s) => ({ value: reading(t, s.last!), label: s.eye ? c.eye[s.eye] : c.latest }))}
      />
      {t.built && <StepFlow steps={checkupSteps(t.key, m.eye?.cyanEye === "right" ? "R" : "L")} compact />}
      {t.built ? (
        <div className="row">
          {block ? <span>{c.blocked[block]}</span> : <Btn href={runPath(t.key)} kind="g">{c.take}</Btn>}
          <Chip tone={days <= 0 ? "warn" : "plain"}>{days <= 0 ? c.dueNow : c.dueIn(days)}</Chip>
          {t.glasses && <Chip>{c.glasses}</Chip>}
        </div>
      ) : <Empty title={c.notBuilt.title}><span>{c.notBuilt.body}</span></Empty>}
      <ChangeAlert t={t} series={series} />
      {meaning.length > 0 && (
        <Card title={c.meaning.title} right={<span className="muted small">{dayText(latest!.takenAt)}</span>}>
          {meaning.map((line) => <p key={line}>{line}</p>)}
          <p className="muted small">{c.meaning.own}</p>
          {pair && <div className="row"><Btn href={`/test/${pair}`} kind="gh" small>{c.meaning.fusionPair[pair === "fusion_recovery" ? "break" : "recovery"]}</Btn></div>}
        </Card>
      )}
      {rows.length ? (
        <div className="bento">
          <Card title={h.chart} span={7}><Chart t={t} series={series} /></Card>
          <Card title={h.table} span={5}>
            <div className="tbwrap">
              <table className="tb">
                <thead><tr><th>{h.date}</th>{t.perEye && <th>{h.eye}</th>}<th>{h.result}</th><th>{h.against}</th></tr></thead>
                <tbody>
                  {rows.map(({ r, first }) => (
                    <tr key={r.id}>
                      <td>{dayText(r.takenAt)}</td>
                      {t.perEye && <td>{r.eye && c.eyeShort[r.eye]}</td>}
                      <td className="tnum">{reading(t, r)}</td>
                      <td>{r.id === first.id ? <Chip>{c.first}</Chip> : <Chip tone={TONE[change(t, first, r)]}>{c.change[change(t, first, r)]}</Chip>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : t.built && <Empty title={h.none.title}><span>{h.none.body}</span></Empty>}
      <More hint={`${testWords(t).what} ${c.every(t.everyDays)}.`}>
        <p>{testWords(t).what} {c.every(t.everyDays)}.</p>
        {t.glasses && <p className="muted small">{c.glasses}</p>}
      </More>
    </>
  );
}
