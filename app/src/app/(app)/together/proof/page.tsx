// Eyes Opener: Hatched until a pooled result exists; green only once someone outside the community has checked it. As on the Together page. .
import { More } from "@/components/guide/more";
import type { Metadata } from "next";
import Link from "next/link";
import { Btn, Card, Chip, Empty, PageHead, Void, type Tone } from "@/components/ui";
import { proof as t } from "@/copy/proof";
import { together } from "@/copy/together";
import { ideaBySlug } from "@/data";
import { isTested } from "@/lib/community";
import { MIN_FINISHED_PER_GROUP } from "@/lib/experiments";
import { standingOf, type Proof, type Step } from "@/lib/proof";
import { householdProof, ideasWithResult } from "@/lib/proof-data";
import { requireMember } from "@/lib/session";

const idea = ideaBySlug("proof-of-help")!;
export const metadata: Metadata = { title: idea.name };

/** Hatched until a pooled result exists; green only once someone outside the community has checked it. As on the Together page. */
const stepTone = (step: Step): Tone => (!isTested(step) ? "none" : step === "signal" ? "plain" : "ok");

/** What an idea has done, in the words its numbers support. */
function Said({ proof: p, whose }: { proof: Proof; whose: "your" | "this" }) {
  if (p.stage === "waiting" || p.stage === "not_published" || p.stage === "published") return <p>{t.stage[p.stage]}</p>;
  if (p.stage === "being_tested" || !p.result) return <p>{t.stage.being_tested(p.joined, p.finished.tried, p.finished.control, MIN_FINISHED_PER_GROUP)}</p>;
  return (
    <>
      <p>{t.result.lead(p.result.tried, whose)} {t.result.lean[p.result.lean]}</p>
      <p className="small muted">{t.result.compared(p.result.control)} {t.result.honest}</p>
      {p.trialled ? <p className="small">{t.trialled}</p> : p.reviewed && <p className="small">{t.reviewed}</p>}
    </>
  );
}

export default async function ProofPage() {
  const m = await requireMember();
  const [own, all] = await Promise.all([householdProof(m), ideasWithResult(m)]);
  const standing = standingOf(own.map((i) => i.proof));
  /* a name is only worth showing when the family has more than one profile to tell apart */
  const named = m.profiles.length > 1;

  return (
    <>
      <PageHead
        title={idea.name} crumb={[together.crumb]}
        stats={[
          { value: standing.ideas, label: t.stats.ideas },
          { value: standing.joined, label: t.stats.joined },
          { value: standing.tried ?? <Void label={t.noResultYet} />, label: t.stats.tried },
        ]}
      />
      <p className="notice">{t.rule}</p>

      <div className="bento">
        <Card title={t.own.title} span={7}>
          {own.length === 0 ? (
            <Empty title={t.own.none}>{m.can("share") && <Btn href="/together/share" kind="g">{t.own.share}</Btn>}</Empty>
          ) : (
            <div>
              {own.map((i) => (
                <article className="ins" key={i.id}>
                  <div className="tx stack">
                    <div className="row">
                      <Link href={`/together/ideas/${i.id}`}><b>{i.title}</b></Link>
                      <Chip tone={stepTone(i.step)}>{together.ladder.steps[i.step].name}</Chip>
                    </div>
                    {named && i.sharedBy && <div className="sub">{t.own.sharedAs(i.sharedBy)}</div>}
                    <Said proof={i.proof} whose="your" />
                    {i.proof.stage === "result" && <p className="small muted tnum">{t.result.joined(i.proof.joined)}</p>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </Card>

        <Card title={t.how.title} span={5}>
          <ul className="stack" style={{ margin: 0, paddingLeft: 18 }}>{t.how.points.map((line) => <li key={line}>{line}</li>)}</ul>
        </Card>

        <Card title={t.all.title} span={12}>
          <p className="muted small">{t.all.sub}</p>
          {all.length === 0 ? <Empty title={t.all.none} /> : (
            <div>
              {all.map((i) => (
                <article className="ins" key={i.id}>
                  <div className="tx stack">
                    <div className="row">
                      <Link href={`/together/ideas/${i.id}`}><b>{i.title}</b></Link>
                      <Chip tone={stepTone(i.step)}>{together.ladder.steps[i.step].name}</Chip>
                      {i.mine && <Chip>{t.all.yours}</Chip>}
                    </div>
                    <Said proof={i.proof} whose="this" />
                  </div>
                </article>
              ))}
            </div>
          )}
        </Card>
      </div>
      <More><p>{idea.what}</p></More>
    </>
  );
}
