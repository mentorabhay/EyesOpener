import Link from "next/link";
import { Card, Chip, Empty, PageHead, Progress } from "@/components/ui";
import { admin as t, dayTime, dollars } from "@/copy/admin";
import { aiSpendThisMonth, overviewCounts, readSwitches, recentActivity, roomHref, roomsFor } from "@/lib/admin";
import { requireStaff } from "@/lib/auth";
import { ADMIN_AREAS, staffCan, type AdminArea } from "@/lib/roles";
import css from "./admin.module.css";

const isArea = (x: string): x is AdminArea => (ADMIN_AREAS as readonly string[]).includes(x);

export default async function AdminOverviewPage() {
  const viewer = await requireStaff("overview");
  const [n, spend, switches, activity] = await Promise.all([overviewCounts(), aiSpendThisMonth(), readSwitches(), recentActivity(15)]);
  const o = t.overview;
  const may = (area: AdminArea) => staffCan(viewer.staff, area);

  const waiting: { area: AdminArea; label: string; n: number }[] = [
    { area: "moderation", label: o.waiting.moderation, n: n.moderation },
    { area: "requests", label: o.waiting.requests, n: n.requests },
    { area: "counsellors", label: o.waiting.counsellors, n: n.counsellors },
    { area: "sponsors", label: o.waiting.sponsors, n: n.sponsors },
  ];

  /* The name of what was changed is shown only to a role that may open the room it was changed in. */
  const say = (action: string, meta: unknown) => {
    const words = o.activity.did[action];
    if (!words) return action.startsWith("job.") ? o.activity.ranJob(action.slice(4)) : o.activity.other(action);
    const room = action.split(".")[1] ?? "";
    const name = meta && typeof meta === "object" && "name" in meta && typeof meta.name === "string" ? meta.name : undefined;
    return words(isArea(room) && may(room) ? name : undefined);
  };
  const left = switches.capUsd - spend.usd;

  return (
    <>
      <PageHead
        title={o.title} sub={o.sub(t.roles[viewer.staff])}
        stats={[
          { value: n.households, label: o.stats.households }, { value: n.profiles, label: o.stats.profiles },
          { value: n.sessionsToday, label: o.stats.sessionsToday }, { value: n.minutes, label: o.stats.minutes },
        ]}
      />
      <div className="bento">
        <Card title={o.waiting.title} span={5}>
          <div>
            {waiting.map((w) => (
              <div className="ins" key={w.area}>
                <div className="tx">{w.label}</div>
                <Chip tone={w.n ? "warn" : "ok"}><span className="tnum">{w.n}</span></Chip>
                {may(w.area) && <Link className="btn btn-sm" href={roomHref(w.area)} aria-label={o.waiting.openRoom(t.rooms[w.area].name)}>{o.waiting.open}</Link>}
              </div>
            ))}
          </div>
        </Card>

        <Card title={o.families.title} span={4} right={may("households") ? <Link className="btn btn-sm" href={roomHref("households")}>{t.rooms.households.name}</Link> : undefined}>
          <dl className="kv">
            <div><dt>{o.families.households}</dt><dd className="tnum">{n.households}</dd></div>
            <div><dt>{o.families.adults}</dt><dd className="tnum">{n.adults}</dd></div>
            <div><dt>{o.families.children}</dt><dd className="tnum">{n.children}</dd></div>
          </dl>
        </Card>

        <Card title={o.training.title} span={3}>
          <dl className="kv">
            <div><dt>{o.training.sessionsToday}</dt><dd className="tnum">{n.sessionsToday}</dd></div>
            <div><dt>{o.training.minutes}</dt><dd className="tnum">{n.minutes}</dd></div>
          </dl>
          <p className="muted small">{o.training.note}</p>
        </Card>

        <Card title={o.ai.title} span={5} right={may("switchboard") ? <Link className="btn btn-sm" href={roomHref("switchboard")}>{o.ai.change}</Link> : undefined}>
          <p className={`${css.big} tnum`}>{o.ai.line(dollars(spend.usd), dollars(switches.capUsd))}</p>
          <Progress value={spend.usd / switches.capUsd} label={o.ai.label} />
          <p className="muted small">{left > 0 ? o.ai.left(dollars(left)) : o.ai.over} {o.ai.calls(spend.calls)}.</p>
          <div className="row"><Chip tone={switches.saverMode ? "warn" : "plain"}>{switches.saverMode ? o.ai.saverOn : o.ai.saverOff}</Chip></div>
        </Card>

        <Card title={o.activity.title} span={7}>
          {activity.length ? (
            <div>
              {activity.map((a) => (
                <div className="ins" key={a.id}>
                  <div className="tx"><b>{a.who ?? (a.action.startsWith("job.") ? o.activity.job : o.activity.gone)}</b> {say(a.action, a.meta)}<div className="sub">{dayTime(a.createdAt)}</div></div>
                </div>
              ))}
            </div>
          ) : <Empty title={o.activity.empty.title}><span>{o.activity.empty.body}</span></Empty>}
        </Card>

        <Card title={t.catalogue.tester.title} span={12}>
          <p>{t.catalogue.tester.body}</p>
          <div className="row"><Link className="btn btn-g" href="/train">{t.catalogue.tester.go}</Link></div>
        </Card>

        <Card title={o.rooms.title} span={12}>
          <div className="grid-cards">
            {roomsFor(viewer.staff).filter((area) => area !== "overview").map((area) => (
              <Link key={area} href={roomHref(area)} className="gcard">
                <div className="b"><h3>{t.rooms[area].name}</h3><p>{t.rooms[area].about}</p></div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
