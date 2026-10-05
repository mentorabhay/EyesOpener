import type { Metadata } from "next";
import { Card, Chip, Empty, PageHead } from "@/components/ui";
import { admin as t } from "@/copy/admin";
import { compileHazard, HAZARD_PATTERN_MAX, HAZARD_TEXT_MAX, hazardRules } from "@/lib/admin";
import { requireStaff } from "@/lib/auth";
import css from "../admin.module.css";
import { Code } from "../parts";
import { switchRule } from "./actions";
import { AddRuleForm, TrySentenceForm } from "./forms";

const h = t.hazards;
export const generateMetadata = (): Metadata => ({ title: t.rooms.hazards.name });

export default async function HazardsPage() {
  await requireStaff("hazards");
  const rules = await hazardRules();
  return (
    <>
      <PageHead title={t.rooms.hazards.name} sub={h.sub} crumb={[{ href: "/admin", label: t.back }]} stats={[{ value: rules.filter((r) => r.active).length, label: h.stat }]} />
      <div className="bento">
        <Card title={h.list} span={12}>
          {rules.length ? (
            <div className="tbwrap">
              <table className="tb">
                <thead><tr><th scope="col">{h.cols.pattern}</th><th scope="col">{h.cols.reason}</th><th scope="col">{h.cols.state}</th><th scope="col" className="n">{h.cols.action}</th></tr></thead>
                <tbody>
                  {rules.map((r) => {
                    const works = compileHazard(r.pattern) !== null;
                    const next = r.active ? h.switchOff : h.switchOn;
                    return (
                      <tr key={r.id}>
                        <td className={css.pattern}><Code>{r.pattern}</Code></td>
                        <td>{r.reason}{!works && <div className="muted small">{h.brokenHint}</div>}</td>
                        <td>{!works ? <Chip tone="danger">{h.broken}</Chip> : r.active ? <Chip tone="ok">{h.on}</Chip> : <Chip tone="none">{h.off}</Chip>}</td>
                        <td className="n">
                          <form action={switchRule}>
                            <input type="hidden" name="id" value={r.id} />
                            <input type="hidden" name="active" value={r.active ? "off" : "on"} />
                            <button className="btn btn-sm" aria-label={h.switchOf(next, r.reason)}>{next}</button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <Empty title={h.empty.title}><span>{h.empty.body}</span></Empty>}
        </Card>

        <Card title={h.tryIt.title} span={6}>
          <p className="muted small">{h.tryIt.about}</p>
          <TrySentenceForm textMax={HAZARD_TEXT_MAX} />
        </Card>

        <Card title={h.add.title} span={6}>
          <AddRuleForm patternMax={HAZARD_PATTERN_MAX} />
        </Card>
      </div>
    </>
  );
}
