import type { Metadata } from "next";
import paper from "@/components/gatherings/paper.module.css";
import { PrintButton } from "@/components/gatherings/print-button";
import { PageHead } from "@/components/ui";
import { classMission } from "@/copy/class-mission";
import { together } from "@/copy/together";
import { COVER_SECONDS, MISSION_SECONDS, stepTimes } from "@/lib/class-mission";
import { requireMember } from "@/lib/session";

const t = classMission.kit, steps = classMission.what.steps;
export const generateMetadata = (): Metadata => ({ title: t.title });

/**
 * The Class Mission kit, to print: a note for the teacher, the plan, the leader's cards, a paper comet and a
 * sheet for the classroom wall. Read-only, and it holds nothing about any child: the same sheets for every family.
 */
export default async function ClassMissionKitPage() {
  await requireMember();
  const n = t.note, minutes = MISSION_SECONDS / 60;
  const sections = [
    { ...n.what, lines: n.what.lines(minutes) }, n.why, n.not, n.test, { ...n.safe, lines: n.safe.lines(COVER_SECONDS) },
  ];
  return (
    <div className={paper.doc}>
      <div className={paper.hide}>
        <PageHead title={t.title} sub={t.sub} crumb={[together.crumb, { href: "/together/class-mission", label: t.crumb }]} />
      </div>
      <div className={`row ${paper.hide}`}><PrintButton label={t.print} /><span className="muted small">{t.printHint}</span></div>
      <div className={paper.pages}>
        <article className={paper.paper}>
          <h2>{n.title}</h2>
          {sections.slice(0, 2).map((s) => <section key={s.title}><h3>{s.title}</h3><ul>{s.lines.map((line) => <li key={line}>{line}</li>)}</ul></section>)}
          <div className={paper.box}><b>{n.words.title}</b><p>{n.words.say}</p><p className="soft">{n.words.note}</p></div>
          {sections.slice(2).map((s) => <section key={s.title}><h3>{s.title}</h3><ul>{s.lines.map((line) => <li key={line}>{line}</li>)}</ul></section>)}
          <p className={paper.foot}>{n.kept} {n.foot}</p>
        </article>

        <article className={paper.paper}>
          <h2>{t.plan.title}</h2>
          <p className="soft">{t.plan.sub}</p>
          <table className={paper.plan}>
            <thead><tr><th scope="col">{t.plan.cols.at}</th><th scope="col">{t.plan.cols.what}</th></tr></thead>
            <tbody>
              {stepTimes().map((s) => (
                <tr key={s.key}>
                  <th scope="row">{s.from}</th>
                  <td><b>{steps[s.key].name} ({classMission.seconds(s.seconds)})</b>{steps[s.key].what}<div className="soft">{t.plan.grownUp[s.key]}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="lead">{t.plan.total(minutes)}</p>
          <div className={paper.badge}>
            <div className="big">{t.sheet.title}</div>
            <p>{t.sheet.line}</p>
            <div className={paper.fill} style={{ width: "100%" }}>
              <div>{t.sheet.ledBy}<span /></div>
              <div>{t.sheet.date}<span /></div>
            </div>
            <p className="soft">{t.sheet.ledNote} {t.sheet.noNames}</p>
          </div>
        </article>

        <article className={paper.paper}>
          <h2>{t.cards.title}</h2>
          <p className="soft">{t.cards.sub}</p>
          <div className={paper.cards}>
            {t.cards.list.map((card, i) => (
              <div className={paper.cut} key={card.say}>
                <span className="n">{t.cards.n(i + 1)}</span>
                <span className="say">{card.say}</span>
                <span className="do">{card.doing}</span>
              </div>
            ))}
          </div>
          <section>
            <h3>{t.comet.title}</h3>
            <p className="soft">{t.comet.sub}</p>
            <div className={paper.cut} style={{ alignItems: "center" }}>
              <svg viewBox="0 0 320 130" width="320" height="130" style={{ maxWidth: "100%", height: "auto" }} role="img" aria-label={t.comet.label}>
                <path d="M10 96 Q110 60 208 52" fill="none" stroke="#111418" strokeWidth="3" strokeLinecap="round" />
                <path d="M30 116 Q120 86 214 74" fill="none" stroke="#111418" strokeWidth="3" strokeLinecap="round" />
                <path d="M54 72 Q130 48 204 34" fill="none" stroke="#111418" strokeWidth="3" strokeLinecap="round" />
                <path d="M250 8 l13.5 32.4 35 3 -26.6 23 8.1 34.2 -30 -18.4 -30 18.4 8.1 -34.2 -26.6 -23 35 -3z" fill="#111418" />
              </svg>
            </div>
          </section>
        </article>
      </div>
    </div>
  );
}
