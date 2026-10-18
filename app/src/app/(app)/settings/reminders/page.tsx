import type { Metadata } from "next";
import { ProfileReminders } from "@/components/notify/reminders";
import { Card, PageHead } from "@/components/ui";
import { notify as w } from "@/copy/notify";
import { maySetReminder } from "@/lib/notify/rules";
import { remindersOf } from "@/lib/notify/service";
import { requireMember } from "@/lib/session";
import { mailSettings } from "@/lib/signin/mail";
import { changeReminder, saveReminder, setNeedsHelp } from "./actions";

export const generateMetadata = (): Metadata => ({ title: w.page.title });
type Search = Promise<Record<string, string | string[] | undefined>>;

/**
 * /settings/reminders: every profile's reminders in the household. A guardian or co-guardian adds, changes, pauses
 * or removes one, and ticks a grown-up who needs help; a cheer seat only looks. A linked counsellor sets them from
 * the counsellor's own page. The service that fires them: src/lib/notify/service.ts.
 */
export default async function RemindersPage({ searchParams }: { searchParams: Search }) {
  const m = await requireMember();
  const q = await searchParams;
  const rows = await remindersOf(m.account.id);
  const p = w.page;
  const err = typeof q.err === "string" ? (p as unknown as Record<string, unknown>)[q.err] : null;
  const by = { role: m.seat, childMode: m.childMode };
  return (
    <>
      <PageHead title={p.title} crumb={[{ href: "/settings", label: p.crumb }]} sub={p.lead} />
      {q.saved && <p className="notice" data-b="ok" role="status">{p.saved}</p>}
      {q.removed && <p className="notice" data-b="ok" role="status">{p.removed}</p>}
      {typeof err === "string" && <p className="notice" data-b="warn" role="alert">{err}</p>}
      {!mailSettings() && <p className="notice">{p.emailOff}</p>}
      <p className="muted small">{p.rule}</p>
      {m.can("manage_family") && m.profiles.some((x) => x.kind === "adult") && (
        <Card title={p.needsHelp}>
          <p className="muted small">{p.needsHelpText}</p>
          {m.profiles.filter((x) => x.kind === "adult").map((x) => (
            <form key={x.id} action={setNeedsHelp} style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <input type="hidden" name="profile" value={x.id} />
              <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><input type="checkbox" name="needsHelp" defaultChecked={x.needsHelp} />{x.displayName}</label>
              <button className="btn btn-sm">{p.needsHelpSave}</button>
            </form>
          ))}
        </Card>
      )}
      {m.profiles.map((x) => (
        <ProfileReminders key={x.id} profile={x} rows={rows.filter((r) => r.profileId === x.id)}
          may={maySetReminder(by, x)} save={saveReminder} change={changeReminder} />
      ))}
    </>
  );
}
