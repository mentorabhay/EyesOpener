import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SetPlayer } from "@/components/clips/set-player";
import { StepFlow } from "@/components/guide/flow";
import { More } from "@/components/guide/more";
import { listSteps } from "@/components/guide/steps";
import { Btn, PageHead } from "@/components/ui";
import { guide as gw } from "@/copy/guide";
import { clips as c } from "@/copy/clips";
import { test } from "@/copy/test";
import { testByKey } from "@/data";
import { isSetKey } from "@/data/clips";
import { clipContext, setView } from "@/lib/clips";
import { testBlock } from "@/lib/eye-profile";
import { requireMember } from "@/lib/session";
import { runPath } from "../../../results";

type Props = { params: Promise<{ key: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { key } = await params;
  return { title: isSetKey(key) ? c.sets.name[key] : undefined };
}

/** One set: the clips it plays for this profile on this screen, and the player. */
export default async function SetPage({ params }: Props) {
  const { key } = await params;
  if (!isSetKey(key)) notFound();
  const m = await requireMember();
  const block = testBlock(m);
  if (block === "seat") notFound();
  const [view, ctx] = await Promise.all([setView(m, key), clipContext(m)]);
  const steps = view.items.map((i) => ({ ...i, done: view.done.includes(i.code) }));
  const seconds = steps.filter((x) => !x.blocked).length;
  const end = key === "visit" ? { href: "/test/summary", label: c.result.summary } : key === "screen" ? { href: "/settings/screen", label: c.result.screenPage } : undefined;

  return (
    <>
      <PageHead
        title={c.sets.name[key]}
        crumb={[{ href: "/test", label: test.title }, { href: "/test/clips", label: c.crumb }]}
        stats={[{ value: seconds, label: c.sets.steps(seconds).replace(/^\d+\s/, "") }]}
      />
      {!block && <StepFlow steps={listSteps(gw.clipSet, ["play", "tap", "check"])} compact />}
      {block && <p className="notice" data-b="warn">{c.blocked[block]}</p>}
      {view.checkups.length > 0 && (
        <div className="row">
          <span className="muted">{c.sets.checkups}</span>
          {view.checkups.map((k) => { const t = testByKey(k); return t && <Btn key={k} href={runPath(k)} small>{c.sets.takeCheckup(t.name)}</Btn>; })}
        </div>
      )}
      <SetPlayer key={`${m.profile.id}${key}`} setKey={key} steps={block ? steps.map((x) => ({ ...x, blocked: x.blocked ?? block })) : steps} ctx={ctx} endHref={end} />
      <More>
        <p>{key === "weekly" ? (view.from ? c.sets.weeklyFrom.plan(view.from.name, view.from.week) : c.sets.weeklyFrom.due) : c.sets.what[key]}</p>
        <p className="muted small">{c.sets.sub}</p>
      </More>
    </>
  );
}
