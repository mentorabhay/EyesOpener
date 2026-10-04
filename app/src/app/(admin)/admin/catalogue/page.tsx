import type { Metadata } from "next";
import Link from "next/link";
import { Card, Chip, PageHead, Pills } from "@/components/ui";
import { admin as t } from "@/copy/admin";
import { exerciseBySlug, gameBySlug } from "@/data";
import { kindOf } from "@/games/built";
import { requireStaff } from "@/lib/auth";
import { libraryItems, readStatuses } from "@/lib/catalogue";
import { forWhom, ITEM_KINDS, recommendedStatus, statusOf, STATUSES, type ItemKind, type Status } from "@/lib/status";
import { Confirm } from "../parts";
import { setAll, setStatus } from "./actions";

const c = t.catalogue;
export const metadata: Metadata = { title: t.rooms.catalogue.name };

const hrefOf = (kind: ItemKind, slug: string) => (kind === "game" ? `/train/games/${slug}` : kind === "exercise" ? `/train/exercises/${slug}` : "/train/cinema");
const whoFor = (kind: ItemKind, slug: string) => forWhom((kind === "game" ? gameBySlug(slug)?.for : kind === "exercise" ? exerciseBySlug(slug)?.for : "") ?? "");
const tone = (s: Status) => (s === "open" ? "ok" : s === "counsellor" ? "plain" : "warn");

export default async function CataloguePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireStaff("catalogue");
  const sp = await searchParams;
  const kind = ITEM_KINDS.find((k) => k === sp.kind) ?? "all";
  const statuses = await readStatuses();
  const items = libraryItems().map((i) => ({ ...i, status: statusOf(statuses, i.kind, i.slug), recommended: recommendedStatus(i.kind, i.slug) }));
  const shown = items.filter((i) => kind === "all" || i.kind === kind);
  const count = (s: Status) => items.filter((i) => i.status === s).length;

  return (
    <>
      <PageHead title={t.rooms.catalogue.name} sub={c.sub} crumb={[{ href: "/admin", label: t.back }]} stats={STATUSES.map((s) => ({ value: count(s), label: c.stats[s] }))} />
      <div className="bento">
        <Card title={c.meansTitle} span={7}>
          <dl className="kv">{STATUSES.map((s) => <div key={s}><dt>{c.status[s]}</dt><dd>{c.means[s]}</dd></div>)}</dl>
          <p className="muted small">{c.recommendedNote}</p>
        </Card>
        <Card title={c.all.title} span={5}>
          <div className="row">
            {(["open", "recommended"] as const).map((to) => (
              <Confirm key={to} ask={c.all[to].ask} warn={c.all[to].warn}>
                <form action={setAll}><input type="hidden" name="to" value={to} /><button className="btn btn-d btn-sm">{c.all[to].go}</button></form>
              </Confirm>
            ))}
          </div>
          <p><b>{c.tester.title}.</b> {c.tester.body}</p>
          <div className="row"><Link className="btn btn-g btn-sm" href="/train">{c.tester.go}</Link></div>
        </Card>
      </div>
      <div className="row"><Pills items={c.kinds} current={kind} param="kind" base="/admin/catalogue" /></div>
      <Card>
        <div className="tbwrap">
          <table className="tb">
            <thead><tr><th>{c.cols.item}</th><th>{c.cols.kind}</th><th>{c.cols.forWhom}</th><th>{c.cols.recommended}</th><th>{c.cols.status}</th></tr></thead>
            <tbody>
              {shown.map((i) => (
                <tr key={`${i.kind}:${i.slug}`}>
                  <td><b>{i.name}</b><div className="row" style={{ gap: 10 }}><Link className="small" href={hrefOf(i.kind, i.slug)}>{c.tryIt}</Link>{i.kind !== "film" && <Link className="small" href={`/admin/manual/${i.kind}/${i.slug}`}>{c.manual}</Link>}</div></td>
                  <td>{i.kind === "game" && kindOf(i.slug) === "cinema" ? c.kind.activity : c.kind[i.kind]}</td>
                  <td className="small">{whoFor(i.kind, i.slug)}</td>
                  <td><Chip tone={tone(i.recommended)}>{c.status[i.recommended]}</Chip></td>
                  <td>
                    <form action={setStatus} className="row" style={{ flexWrap: "nowrap", gap: 6 }}>
                      <input type="hidden" name="kind" value={i.kind} />
                      <input type="hidden" name="slug" value={i.slug} />
                      {/* The key redraws the box with the saved value after a change. */}
                      <select key={i.status} name="status" defaultValue={i.status} className="input" aria-label={`${c.cols.status}: ${i.name}`} style={{ minWidth: 170 }}>
                        {STATUSES.map((s) => <option key={s} value={s}>{c.status[s]}</option>)}
                      </select>
                      <button className="btn btn-sm" aria-label={c.saveLabel(i.name)}>{c.save}</button>
                    </form>
                    {i.status !== i.recommended && <div className="muted small">{c.differs}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
