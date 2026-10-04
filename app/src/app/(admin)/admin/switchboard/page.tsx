import type { Metadata } from "next";
import { Card, Chip, Empty, PageHead } from "@/components/ui";
import { admin as t, day, dollars } from "@/copy/admin";
import { aiSpendThisMonth, CAP_MAX, CAP_MIN, readSwitches } from "@/lib/admin";
import { requireStaff } from "@/lib/auth";
import { setSaver } from "./actions";
import { CapForm } from "./forms";

const sw = t.switchboard;
export const metadata: Metadata = { title: t.rooms.switchboard.name };

export default async function SwitchboardPage() {
  await requireStaff("switchboard");
  const [now, spend] = await Promise.all([readSwitches(), aiSpendThisMonth()]);
  return (
    <>
      <PageHead title={t.rooms.switchboard.name} sub={sw.sub} crumb={[{ href: "/admin", label: t.back }]} />
      <div className="bento">
        <Card title={sw.saver.title} span={6} right={<Chip tone={now.saverMode ? "warn" : "plain"}>{now.saverMode ? sw.saver.on : sw.saver.off}</Chip>}>
          <p>{sw.saver.what}</p>
          <form action={setSaver} className="row">
            <input type="hidden" name="saver" value={now.saverMode ? "off" : "on"} />
            <button className="btn btn-d">{now.saverMode ? sw.saver.turnOff : sw.saver.turnOn}</button>
          </form>
          {now.saverChangedAt && <p className="muted small">{sw.changed(day(now.saverChangedAt))}</p>}
        </Card>

        <Card title={sw.cap.title} span={6} right={<Chip><span className="tnum">{dollars(now.capUsd)}</span></Chip>}>
          <p>{sw.cap.what}</p>
          <p className="muted small">{sw.cap.now(dollars(now.capUsd), dollars(spend.usd))}</p>
          {/* The key redraws the box with the saved value after a change. */}
          <CapForm key={now.capUsd} cap={now.capUsd} min={CAP_MIN} max={CAP_MAX} />
          {now.capChangedAt && <p className="muted small">{sw.changed(day(now.capChangedAt))}</p>}
        </Card>
      </div>
      <Empty title={sw.notBuilt.title}><span>{sw.notBuilt.body}</span></Empty>
    </>
  );
}
