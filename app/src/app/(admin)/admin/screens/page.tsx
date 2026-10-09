import type { Metadata } from "next";
import { Card, Chip, PageHead } from "@/components/ui";
import { admin, day } from "@/copy/admin";
import { screensAdmin as t } from "@/copy/screens-admin";
import { cyanCode, USUAL_GAMMA } from "@/engine";
import { requireStaff } from "@/lib/auth";
import { screensRoom, type Shown } from "@/lib/screens-admin";
import { readSetupSettings } from "@/lib/setup-settings";
import { setGate } from "./actions";
import { PresetsForm } from "./forms";

export const generateMetadata = (): Metadata => ({ title: admin.rooms.screens.name });

const n = (v: Shown) => (v === "few" ? t.few : String(v));

/** /admin/screens: how families' screens and glasses are set up, as counts only, and the two setup settings. */
export default async function ScreensRoomPage() {
  const viewer = await requireStaff("screens");
  const [c, set] = await Promise.all([screensRoom(), readSetupSettings()]);
  const superAdmin = viewer.staff === "super_admin";
  const k = t.table;
  return (
    <>
      <PageHead
        title={admin.rooms.screens.name} sub={t.sub} crumb={[{ href: "/admin", label: admin.back }]}
        stats={[
          { value: n(c.finished), label: `${t.stats.finished} · ${t.of(n(c.profiles))}` },
          { value: n(c.tuned), label: `${t.stats.tuned} · ${t.of(n(c.screens))}` },
          { value: n(c.swapped), label: t.stats.swapped },
          { value: n(c.ghost), label: `${t.stats.ghost} · ${t.of(n(c.leakMeasured))}` },
        ]}
      />
      <div className="bento">
        <Card title={k.title} span={12}>
          <div className="tbwrap">
            <table className="tb">
              <thead><tr><th>{k.kind}</th><th>{k.screens}</th><th>{k.red}</th><th>{k.cyan}</th><th>{k.tuned}</th></tr></thead>
              <tbody>
                {c.kinds.map((r) => (
                  <tr key={r.kind}>
                    <td>{k.kinds[r.kind]}</td><td className="tnum">{n(r.screens)}</td>
                    <td className="tnum">{r.red === null ? k.fewer : k.pct(r.red)}</td><td className="tnum">{r.cyan === null ? k.fewer : k.pct(r.cyan)}</td>
                    <td className="tnum">{n(r.tuned)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">{k.ghostNote}</p>
          <p className="muted small">{k.compare}</p>
        </Card>

        <Card title={t.gate.title} span={6} right={<Chip tone={set.gate ? "ok" : "warn"}>{set.gate ? t.gate.on : t.gate.off}</Chip>}>
          <p>{t.gate.what}</p>
          {superAdmin && (
            <form action={setGate} className="row">
              <input type="hidden" name="gate" value={set.gate ? "off" : "on"} />
              <button className="btn btn-d">{set.gate ? t.gate.turnOff : t.gate.turnOn}</button>
            </form>
          )}
          {set.gateAt && <p className="muted small">{t.changed(day(set.gateAt))}</p>}
        </Card>

        <Card title={t.presets.title} span={6}>
          <p>{t.presets.what}</p>
          {superAdmin
            ? <PresetsForm key={JSON.stringify(set.presets)} lessBlue={cyanCode(set.presets.lessBlue, USUAL_GAMMA)} lessGreen={cyanCode(set.presets.lessGreen, USUAL_GAMMA)} />
            : <p className="tnum">{t.presets.lessBlue} {cyanCode(set.presets.lessBlue, USUAL_GAMMA)} · {t.presets.lessGreen} {cyanCode(set.presets.lessGreen, USUAL_GAMMA)}</p>}
          {set.presetsAt && <p className="muted small">{t.changed(day(set.presetsAt))}</p>}
        </Card>
      </div>
      {!superAdmin && <p className="notice">{t.superOnly}</p>}
    </>
  );
}
