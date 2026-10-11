// Eyes Opener: The data section of Settings: a copy of the family's data, deleting everything, deleting one profile.
import Link from "next/link";
import { Card } from "@/components/ui";
import { data as t, day } from "@/copy/data";
import { familyRequests } from "@/lib/data/requests";
import { canCancel, canDeleteProfile, canDownload, stateOf } from "@/lib/data/state";
import type { Member } from "@/lib/session";
import { Confirm } from "../confirm";
import { askAll, askCopy, askOne, cancel } from "./actions";
import css from "./data.module.css";

const RECENT_MS = 30 * 86_400_000;

/**
 * The data section of Settings: a copy of the family's data, deleting everything, deleting one profile.
 * A guardian sees where each request stands and the buttons. Anyone else in the household sees that a guardian
 * does this, and the date if everything is set to be deleted. The actions check the seat again on the server.
 */
export async function DataCard({ m }: { m: Member }) {
  const now = new Date(), may = m.can("data");
  const rows = await familyRequests(m);
  const recent = (d: Date | null) => !!d && now.getTime() - d.getTime() < RECENT_MS;
  const name = (profileName: string | null) => profileName ?? t.one.someone;

  const copy = rows.find((r) => r.request.kind === "export" && ["asked", "ready", "downloaded"].includes(stateOf(r.request, now)))?.request;
  const deletions = rows.filter((r) => r.request.kind === "delete");
  const all = deletions.find((r) => r.request.scope === "household" && canCancel(r.request, now));
  const allCancelled = deletions.find((r) => r.request.scope === "household")?.request;
  const leaving = deletions.filter((r) => r.request.scope === "profile" && canCancel(r.request, now));
  /* The latest profile that was deleted and the latest deletion that was cancelled, for a month: one line each. */
  const past = deletions.filter((r) => r.request.scope === "profile" && !canCancel(r.request, now) && recent(r.request.doneAt ?? r.request.cancelledAt));
  const settled = [past.find((r) => r.request.status === "done"), past.find((r) => r.request.status === "cancelled")].filter((r) => !!r);
  const leavingIds = leaving.map((r) => r.request.profileId).filter((id): id is string => !!id);
  const choices = m.profiles.filter((p) => canDeleteProfile(m.profiles.map((x) => x.id), leavingIds, p.id) === "ok");

  const cancelForm = (id: string, label: string, aria?: string) => (
    <form action={cancel}>
      <input type="hidden" name="id" value={id} />
      <button className="btn btn-sm" aria-label={aria}>{label}</button>
    </form>
  );

  if (!may) {
    return (
      <Card title={t.title} span={6}>
        <p className="notice">{t.guardianOnly}</p>
        {all?.request.deleteAfter && <p className="notice" data-b="warn">{t.all.look(day(all.request.deleteAfter))}</p>}
      </Card>
    );
  }

  return (
    <Card title={t.title} span={6}>
      {m.account.isDemo && <p className="notice">{t.demo}</p>}
      {m.tester && <p className="notice">{t.tester}</p>}

      <section className={css.part} aria-labelledby="data-copy">
        <h3 id="data-copy">{t.copy.title}</h3>
        <p className="muted small">{t.copy.what}</p>
        {copy && canDownload(copy, now) && copy.expiresAt ? (
          <>
            <p className="notice" data-b="ok">{t.copy.ready(day(copy.expiresAt))}{copy.downloadedAt && <> {t.copy.downloaded(day(copy.downloadedAt))}</>}</p>
            <div className="row">
              {/* A plain link: the browser saves the file, and nothing fetches it ahead of the click. */}
              <a className="btn btn-sm" href="/settings/data/export" download>{t.copy.download}</a>
              <Link className="btn btn-sm" href="/settings/data" prefetch={false}>{t.copy.summary}</Link>
            </div>
            <p className="muted small">{t.copy.keepSafe} {t.copy.note}</p>
          </>
        ) : copy ? (
          <p className="notice" data-b="warn">{t.copy.asked(day(copy.createdAt))}</p>
        ) : (
          <form action={askCopy}><button className="btn btn-sm">{t.copy.ask}</button></form>
        )}
      </section>

      <section className={css.part} aria-labelledby="data-one">
        <h3 id="data-one">{t.one.title}</h3>
        <p className="muted small">{t.one.what}</p>
        {leaving.map(({ request: r, profileName }) => (
          <div className={`notice ${css.pending}`} data-b="warn" key={r.id}>
            <span>{stateOf(r, now) === "due" || !r.deleteAfter ? t.one.due(name(profileName)) : t.one.waiting(name(profileName), day(r.deleteAfter))}</span>
            {cancelForm(r.id, t.one.cancel, t.one.cancelOf(name(profileName)))}
          </div>
        ))}
        {settled.map(({ request: r }) => (
          <p className="muted small" key={r.id}>{r.status === "done" && r.doneAt ? t.one.deleted(day(r.doneAt)) : r.cancelledAt ? t.one.cancelled(day(r.cancelledAt)) : null}</p>
        ))}
        {all ? <p className="muted small">{t.one.allGoing}</p> : choices.length ? (
          <Confirm ask={t.one.ask} warn={t.one.warn}>
            <form action={askOne} className="stack">
              <div className="field">
                <label htmlFor="data-profile">{t.one.pick}</label>
                <select id="data-profile" name="profileId" className="input" required defaultValue="">
                  <option value="" disabled>{t.one.choose}</option>
                  {choices.map((p) => <option key={p.id} value={p.id}>{p.displayName}</option>)}
                </select>
              </div>
              <div><button className="btn btn-sm btn-d">{t.one.yes}</button></div>
            </form>
          </Confirm>
        ) : <p className="muted small">{t.one.onlyOne}</p>}
      </section>

      <section className={css.part} aria-labelledby="data-all">
        <h3 id="data-all">{t.all.title}</h3>
        <p className="muted small">{t.all.what}</p>
        {all ? (
          <div className={`notice ${css.pending}`} data-b="danger">
            <span>
              {stateOf(all.request, now) === "due" ? t.all.due : all.request.deleteAfter ? t.all.waiting(day(all.request.deleteAfter)) : t.all.asked(day(all.request.createdAt))}
              {all.askedByName && <> {t.askedBy(all.askedByName)}</>}
            </span>
            {cancelForm(all.request.id, t.all.cancel)}
          </div>
        ) : (
          <>
            {allCancelled?.status === "cancelled" && recent(allCancelled.cancelledAt) && <p className="muted small">{t.all.cancelled(day(allCancelled.cancelledAt!))}</p>}
            <Confirm ask={t.all.ask} warn={t.all.warn}>
              <form action={askAll}><button className="btn btn-sm btn-d">{t.all.yes}</button></form>
            </Confirm>
          </>
        )}
      </section>
    </Card>
  );
}
