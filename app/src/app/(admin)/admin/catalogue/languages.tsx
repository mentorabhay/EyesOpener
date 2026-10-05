/**
 * The Languages section of the Catalogue room: for each of the ten languages, its status, how much of the app is
 * translated and how much a person has checked, and the three statuses to choose from.
 * Shown to a super admin and to content staff. Every change is written to the audit log.
 */
import { Card, Chip } from "@/components/ui";
import { languages as t } from "@/copy/languages";
import { LANG_STATUSES, statusOfLang, type LangStatus } from "@/i18n/decide";
import { isHeld, LANGUAGE, TRANSLATED } from "@/i18n/languages";
import { allProgress, readManifest, share } from "@/i18n/progress";
import { langStatuses } from "@/i18n/status";
import type { StaffRole } from "@/lib/roles";
import { setLanguageStatus } from "./languages-actions";

/** Who may switch a language on: the people who answer for what families read. */
export const mayManageLanguages = (role: StaffRole | null): boolean => role === "super_admin" || role === "content";

const tone = (s: LangStatus) => (s === "on" ? "ok" : s === "review" ? "warn" : "plain");

export async function LanguagesSection({ role, said }: { role: StaffRole; said?: string }) {
  if (!mayManageLanguages(role)) return null;
  const s = t.staff, statuses = await langStatuses(true), manifest = readManifest();
  const progress = manifest ? allProgress(manifest) : [];
  const anyFiles = progress.some((p) => p.files > 0);
  const refused = said === "nothing" || said === "unknown" || said === "held" ? s.refused[said] : null;
  return (
    <Card title={s.title} as="section">
      <p className="muted small">{s.sub} {s.rule}</p>
      {refused && <p className="notice" data-b="warn" role="status">{refused}</p>}
      {!manifest && <p className="notice" data-b="warn">{s.noList}</p>}
      {manifest && !anyFiles && <p className="notice">{s.noFiles}</p>}
      <dl className="kv">{LANG_STATUSES.map((x) => <div key={x}><dt>{s.status[x]}</dt><dd className="small" style={{ fontWeight: 400 }}>{s.means[x]}</dd></div>)}</dl>
      <div className="tbwrap">
        {/* wide enough to read; on a phone the table moves sideways inside its own frame, the page does not */}
        <table className="tb" style={{ minWidth: 680 }}>
          <thead><tr><th>{s.cols.language}</th><th>{s.cols.translated}</th><th>{s.cols.reviewed}</th><th>{s.cols.status}</th></tr></thead>
          <tbody>
            <tr>
              <td><b>{LANGUAGE.en.own}</b></td>
              <td className="tnum">{manifest ? s.of(manifest.units, manifest.units) : <span className="void" />}</td>
              <td className="tnum">{manifest ? s.of(manifest.units, manifest.units) : <span className="void" />}</td>
              <td><Chip tone="ok">{s.always}</Chip></td>
            </tr>
            {TRANSLATED.map((lang) => {
              const p = progress.find((x) => x.lang === lang), status = statusOfLang(statuses, lang), name = LANGUAGE[lang].english;
              return (
                <tr key={lang}>
                  <td><b>{name}</b> <span lang={lang} dir={LANGUAGE[lang].dir}>{LANGUAGE[lang].own}</span> <Chip tone={tone(status)}>{s.status[status]}</Chip>
                    {p && p.drafts > 0 && <div className="muted small">{s.drafts(p.drafts)}</div>}
                    {p && p.stale > 0 && <div className="muted small">{s.stale(p.stale)}</div>}
                    {isHeld(lang) && <div className="muted small">{s.held}</div>}
                  </td>
                  <td className="tnum">{p ? <>{s.of(p.translated, p.total)} <span className="muted small">{s.percent(share(p.translated, p.total))}</span></> : <span className="void" />}</td>
                  <td className="tnum">{p ? <>{s.of(p.reviewed, p.total)} <span className="muted small">{s.percent(share(p.reviewed, p.total))}</span></> : <span className="void" />}</td>
                  <td>
                    <form action={setLanguageStatus} className="row" style={{ flexWrap: "nowrap", gap: 6 }}>
                      <input type="hidden" name="lang" value={lang} />
                      {/* The key redraws the box with the saved value after a change. */}
                      <select key={status} name="status" defaultValue={status} className="input" aria-label={s.statusLabel(name)} style={{ minWidth: 130 }}>
                        {LANG_STATUSES.filter((x) => x !== "on" || !isHeld(lang)).map((x) => <option key={x} value={x}>{s.status[x]}</option>)}
                      </select>
                      <button className="btn btn-sm" aria-label={s.saveLabel(name)}>{s.save}</button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {manifest && <p className="muted small">{s.counted(manifest.made)}</p>}
    </Card>
  );
}
