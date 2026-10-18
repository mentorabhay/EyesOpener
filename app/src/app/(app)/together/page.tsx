import { More } from "@/components/guide/more";
import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Btn, Card, Chip, PageHead, type Tone } from "@/components/ui";
import s from "@/components/together/together.module.css";
import { assistCopy } from "@/copy/assist";
import { experiments } from "@/copy/experiments";
import { together as t } from "@/copy/together";
import { catalogue, ideaBySlug } from "@/data";
import { LADDER, isTested, listProtocols, type LadderStep } from "@/lib/community";
import { IDEA_PAGES } from "@/lib/idea-pages";
import { requireMember } from "@/lib/session";

export const generateMetadata = (): Metadata => ({ title: t.title });

type Tab = "cheer" | "share" | "join" | "learn";
const TABS: Tab[] = ["cheer", "share", "join", "learn"];
/** Which part of the page each community idea is in. An idea not named here goes under Join in. */
const TAB_OF: Readonly<Record<string, Tab>> = {
  "lend-a-light": "cheer", "fusion-mail": "cheer", "duet-streak": "cheer", "proof-of-help": "cheer", "keeper-graduation": "cheer", "sunset-rule": "cheer",
  "notes-from-four-weeks-ahead": "share", "draw-your-hero": "share", "wish-jam": "share", "focus-wall": "share", "locked-gallery": "share", "first-depth-day": "share",
};

/** Hatched until a pooled result exists; green only once someone outside the community has checked it. */
const stepTone = (step: LadderStep): Tone => (!isTested(step) ? "none" : step === "signal" ? "plain" : "ok");


export default async function TogetherPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const tab: Tab = TABS.find((x) => x === sp.tab) ?? "cheer";
  const m = await requireMember();
  const all = await listProtocols(m.profile.id);
  const published = all.filter((p) => p.status === "published");
  const features = [
    { href: "/together/experiments", name: experiments.hub.name, what: experiments.hub.what, theme: null, tab: "learn" as Tab },
    { href: "/together/research", name: assistCopy.research.name, what: assistCopy.research.what, theme: null, tab: "learn" as Tab },
    { href: "/together/league", name: t.features.league.name, what: t.features.league.what, theme: null, tab: "join" as Tab },
    ...Object.entries(IDEA_PAGES).map(([slug, page]) => {
      const idea = ideaBySlug(slug)!;
      return { href: `/together/${page}`, name: idea.name, what: idea.what, theme: catalogue.themes.find((x) => x.key === idea.theme)?.name ?? null, tab: TAB_OF[slug] ?? "join" };
    }),
  ].filter((f) => f.tab === tab);

  return (
    <>
      <PageHead
        title={t.title}
        stats={[
          { value: published.length, label: t.stats.published },
          { value: published.reduce((n, p) => n + p.open, 0), label: t.stats.open },
          { value: published.filter((p) => isTested(p.step)).length, label: t.stats.signal },
        ]}
      />
      <nav className="tabset" aria-label={t.tabs.label}>
        {TABS.map((x) => <Link key={x} href={x === "cheer" ? "/together" : `/together?tab=${x}`} aria-current={x === tab ? "page" : undefined} scroll={false}>{t.tabs.names[x]}</Link>)}
      </nav>
      <p className="muted">{t.tabs.subs[tab]}</p>
      {tab === "share" && <div className="bento">
        <Card title={t.list.title} span={7} right={m.can("share") && <Btn href="/together/share" kind="g">{t.share}</Btn>}>
          {!m.can("share") && <p className="muted small">{t.cannot.share}</p>}
          {all.length === 0 && <p className="muted">{t.list.none}</p>}
          <div>
            {all.map((p) => (
              <div className="ins" key={p.id}>
                <div className="tx">
                  <Link href={`/together/ideas/${p.id}`}><b>{p.title}</b></Link>
                  <div className="sub">{p.forWhom}</div>
                  <div className="row" style={{ marginTop: 6 }}>
                    <Chip tone={stepTone(p.step)}>{t.ladder.steps[p.step].name}</Chip>
                    {p.status === "in_review" ? <Chip tone="warn">{t.list.waiting}</Chip> : !isTested(p.step) && <Chip tone="none">{t.list.untested}</Chip>}
                    <span className="small muted tnum">{t.list.people(p.joined, p.tookPart)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title={t.ladder.title} span={5}>
          <p className="muted small">{t.ladder.intro}</p>
          <ol className={s.ladder}>
            {LADDER.map((step, i) => (
              <li key={step} style={{ "--i": i } as CSSProperties} data-tested={isTested(step)}>
                <b>{i + 1}. {t.ladder.steps[step].name}</b>
                <span className="small muted">{t.ladder.steps[step].meaning}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>}

      {tab === "share" && <h2>{t.features.title}</h2>}
      <div className="grid-cards">
        {features.map((f) => (
          <Link key={f.href} href={f.href} className="gcard">
            <div className="b">
              <h3>{f.name}</h3>
              <p>{f.what}</p>
              {f.theme && <span className="small muted">{f.theme}</span>}
            </div>
          </Link>
        ))}
      </div>
      <More><p>{t.sub}</p></More>
    </>
  );
}
