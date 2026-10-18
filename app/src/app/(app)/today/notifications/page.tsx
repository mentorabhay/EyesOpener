import type { Metadata } from "next";
import { BrowserNotices } from "@/components/notify/browser";
import { Btn, Card, Chip, PageHead } from "@/components/ui";
import { common } from "@/copy/common";
import { notify as w } from "@/copy/notify";
import { checkMine, listFor } from "@/lib/notify/service";
import { requireMember } from "@/lib/session";
import { readAll, readOne } from "./actions";

export const generateMetadata = (): Metadata => ({ title: w.list.title });

/** /today/notifications: this grown-up's notifications, newest first; reminders that came due and messages from the app. */
export default async function NotificationsPage() {
  const m = await requireMember();
  await checkMine(m.account.id);
  const rows = await listFor(m.user.id);
  const l = w.list;
  const fmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
  return (
    <>
      <PageHead title={l.title} sub={l.lead} crumb={[{ href: "/today", label: common.nav.today }]}>
        <Btn href="/settings/reminders" small>{l.reminders}</Btn>
      </PageHead>
      <BrowserNotices />
      <Card>
        {rows.length === 0 ? <p className="muted">{l.none}</p> : (
          <ul className="list">
            {rows.map((n) => (
              <li key={n.id} className="rowlink">
                <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                  <b>{n.href ? <a className="stretch" href={`/today/notifications/${n.id}`}>{n.title}</a> : n.title} {!n.readAt && <Chip tone="ok">{l.unread}</Chip>}</b>
                  <span className="muted small">{n.body}</span>
                  <span className="muted small">{fmt.format(n.createdAt)}</span>
                </div>
                {!n.readAt && <form action={readOne} style={{ position: "relative", zIndex: 1 }}><input type="hidden" name="id" value={n.id} /><button className="btn btn-sm">{l.read}</button></form>}
              </li>
            ))}
          </ul>
        )}
        {rows.some((n) => !n.readAt) && <form action={readAll}><button className="btn btn-sm">{l.readAll}</button></form>}
      </Card>
    </>
  );
}
