import type { Metadata } from "next";
import { Card, Chip, Empty, PageHead } from "@/components/ui";
import { admin as t } from "@/copy/admin";
import { dataAdmin as r, day, dayTime } from "@/copy/data";
import { requireStaff } from "@/lib/auth";
import { DELETED_HOUSEHOLD, JOB_NAME, staffRequests } from "@/lib/data/requests";
import { stateOf } from "@/lib/data/state";
import { JOBS } from "@/lib/jobs";
import { Confirm } from "../parts";
import { runNow } from "./actions";
import css from "./requests.module.css";

export const metadata: Metadata = { title: t.rooms.requests.name };

type Counts = Record<string, number | boolean | undefined>;
const numbers = (meta: unknown): Counts => (meta && typeof meta === "object" ? (meta as Counts) : {});

/**
 * Where each data request stands. Staff see the household's name and the state of its request, and can run the
 * daily job by hand. They never see what a copy holds, and a household that was deleted is shown only as a count.
 */
export default async function RequestsPage() {
  await requireStaff("requests");
  const now = new Date();
  const { rows, deleted, lastRun } = await staffRequests(now);
  const job = JOBS.find((j) => j.name === JOB_NAME);
  const waiting = rows.filter((q) => q.kind === "delete" && ["asked", "waiting", "due"].includes(stateOf(q, now))).length;
  const ran = numbers(lastRun?.meta), ranCounts = numbers(ran.counts);
  const shown = Object.entries(r.job.counts).filter(([key]) => Number(ranCounts[key]) > 0);

  return (
    <>
      <PageHead title={t.rooms.requests.name} sub={r.sub} crumb={[{ href: "/admin", label: t.back }]} stats={[{ value: waiting, label: r.stat }]} />
      <div className="bento">
        <Card title={r.list.title} span={12}>
          {rows.length ? (
            <div>
              {rows.map((q) => {
                const state = stateOf(q, now);
                const on = q.downloadedAt && state === "downloaded" ? q.downloadedAt : state === "cancelled" ? q.cancelledAt : q.doneAt;
                const until = q.kind === "export" ? q.expiresAt : q.deleteAfter;
                const what = q.kind === "export" ? r.list.what.export : q.scope === "profile" ? r.list.what.profile : r.list.what.household;
                return (
                  <div className={css.req} key={q.id}>
                    <div className={css.who}>
                      <span className="row"><b>{q.household}</b>{q.testHousehold && <Chip>{r.list.test}</Chip>}{q.isDemo && <Chip>{r.list.demo}</Chip>}</span>
                      <small>{r.list.line(what, day(q.createdAt))}</small>
                    </div>
                    <div className={css.state}><Chip tone={r.tone[state]}>{r.state[state]({ on: on ? day(on) : t.none, until: until ? day(until) : t.none })}</Chip></div>
                  </div>
                );
              })}
            </div>
          ) : <Empty title={r.list.empty.title}><span>{r.list.empty.body}</span></Empty>}
        </Card>

        <Card title={r.job.title} span={5}>
          <p>{job?.what}</p>
          <p className="muted small">{lastRun ? r.job.last(dayTime(lastRun.at), lastRun.who) : r.job.never}</p>
          {lastRun && ran.ok === false && <p className="notice" data-b="danger">{r.job.failed}</p>}
          {lastRun && (shown.length ? (
            <dl className="kv">
              {shown.map(([key, label]) => <div key={key}><dt>{label}</dt><dd className="tnum">{Number(ranCounts[key])}</dd></div>)}
            </dl>
          ) : <p className="muted small">{r.job.nothing}</p>)}
          <Confirm ask={r.job.run} label={r.job.runLabel} warn={r.job.warn}>
            <form action={runNow}><button className="btn btn-sm btn-d">{r.job.yes}</button></form>
          </Confirm>
        </Card>

        <Card title={r.gone.title} span={7}>
          <p className="muted small">{r.gone.about}</p>
          {deleted.length ? (
            <div className="tbwrap">
              <table className="tb">
                <thead><tr><th scope="col">{r.gone.cols.when}</th><th scope="col">{r.gone.cols.what}</th><th scope="col">{r.gone.cols.counts}</th></tr></thead>
                <tbody>
                  {deleted.map((d) => {
                    const c = numbers(d.meta), n = (key: string) => (typeof c[key] === "number" ? (c[key] as number) : undefined);
                    return (
                      <tr key={d.id}>
                        <td>{day(d.at)}</td>
                        <td>{d.action !== DELETED_HOUSEHOLD ? r.gone.profile : c.testHousehold ? r.gone.testHousehold : r.gone.household}</td>
                        <td>{r.gone.counts({ profiles: d.action === DELETED_HOUSEHOLD ? n("profiles") : undefined, people: d.action === DELETED_HOUSEHOLD ? n("people") : undefined, peopleKept: n("peopleKept"), rows: n("rows") })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <p className="muted">{r.gone.empty}</p>}
        </Card>
      </div>
    </>
  );
}
