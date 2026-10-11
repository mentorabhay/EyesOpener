// Eyes Opener: The staff manual: every game and exercise, with why it is in the library. Each row opens the item's full page. .
import type { Metadata } from "next";
import Link from "next/link";
import { Card, Chip, EvidenceChip, PageHead, Pills } from "@/components/ui";
import { admin as t } from "@/copy/admin";
import { train } from "@/copy/train";
import { catalogue, exercises, gameLevel, games, mechanismOf } from "@/data";
import { gameGuideFor } from "@/data/game-guides";
import { staffNotesFor } from "@/data/game-guides/staff-notes";
import { guideFor } from "@/data/guides";
import { exerciseStaffNotesFor } from "@/data/guides/staff-notes";
import { kindOf } from "@/games/built";
import { requireStaff } from "@/lib/auth";
import { readStatuses } from "@/lib/catalogue";
import { exerciseLevel, statusOf, type Status } from "@/lib/status";

const c = t.manual;
export const generateMetadata = (): Metadata => ({ title: t.rooms.manual.name });
const tone = (s: Status) => (s === "open" ? "ok" : s === "counsellor" ? "plain" : "warn");

/** The staff manual: every game and exercise, with why it is in the library. Each row opens the item's full page. */
export default async function ManualPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireStaff("manual");
  const sp = await searchParams;
  const kind = c.kinds.find((k) => k.key === sp.kind)?.key ?? "all";
  const statuses = await readStatuses();
  const rows = [
    ...games.map((g) => {
      const built = kindOf(g.slug);
      return { kind: built === "cinema" ? "film" as const : built === "care" ? "care" as const : "game" as const, of: "game" as const, slug: g.slug, name: g.name, mechanism: g.mechanism, level: gameLevel(g), guide: !!gameGuideFor(g.slug), notes: staffNotesFor(g.slug).length };
    }),
    ...exercises.map((e) => ({ kind: "exercise" as const, of: "exercise" as const, slug: e.slug, name: e.name, mechanism: e.mechanism, level: exerciseLevel(e), guide: !!guideFor(e.slug), notes: exerciseStaffNotesFor(e.slug).length })),
  ];
  const shown = rows.filter((r) => kind === "all" || (kind === "game" ? r.kind === "game" || r.kind === "care" : r.kind === kind));
  const used = (key: string) => ({ games: games.filter((g) => g.mechanism === key).length, exercises: exercises.filter((e) => e.mechanism === key).length });

  return (
    <>
      <PageHead
        title={t.rooms.manual.name} sub={c.sub} crumb={[{ href: "/admin", label: t.back }]}
        stats={[{ value: rows.length, label: c.stat.items }, { value: rows.filter((r) => r.guide).length, label: c.stat.guides }, { value: rows.filter((r) => r.notes > 0).length, label: c.stat.notes }]}
      />
      <div className="bento">
        <Card title={c.readTitle} span={7}>
          <ul style={{ margin: 0, paddingLeft: "1.3em", display: "grid", gap: 8 }}>{c.read.map((line) => <li key={line}>{line}</li>)}</ul>
        </Card>
        <Card title={c.labelsTitle} span={5}>
          <dl className="kv">
            {catalogue.evidence.map((e) => <div key={e.key}><dt><EvidenceChip level={e.key} /></dt><dd>{e.meaning}</dd></div>)}
          </dl>
        </Card>
        <Card title={c.methodsTitle}>
          <div className="tbwrap">
            <table className="tb">
              <tbody>
                {catalogue.mechanisms.filter((mech) => used(mech.key).games + used(mech.key).exercises > 0).map((mech) => (
                  <tr key={mech.key}>
                    <td><b>{mech.label}</b><div className="small muted">{c.count(used(mech.key).games, used(mech.key).exercises)}</div></td>
                    <td><EvidenceChip level={mech.evidence} /></td>
                    <td>{mech.basis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <div className="row"><Pills items={c.kinds} current={kind} param="kind" base="/admin/manual" /></div>
      <Card>
        <div className="tbwrap">
          <table className="tb">
            <thead><tr><th>{c.cols.item}</th><th>{c.cols.kind}</th><th>{c.cols.method}</th><th>{c.cols.label}</th><th className="n">{c.cols.level}</th><th>{c.cols.status}</th><th className="n">{c.cols.notes}</th></tr></thead>
            <tbody>
              {shown.map((r) => {
                const status = statusOf(statuses, r.of, r.slug);
                return (
                  <tr key={`${r.of}:${r.slug}`}>
                    <td><Link href={`/admin/manual/${r.of}/${r.slug}`}><b>{r.name}</b></Link></td>
                    <td>{c.kind[r.kind]}</td>
                    <td>{mechanismOf(r.mechanism).label}</td>
                    <td><EvidenceChip level={mechanismOf(r.mechanism).evidence} /></td>
                    <td className="n tnum">{r.level}</td>
                    <td><Chip tone={tone(status)}>{train.exercise.statusFor[status]}</Chip></td>
                    <td className="n tnum">{r.notes || ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
