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

/** Hatched until a pooled result exists; green only once someone outside the community has checked it. */
const stepTone = (step: LadderStep): Tone => (!isTested(step) ? "none" : step === "signal" ? "plain" : "ok");


export default async function TogetherPage() {
  const m = await requireMember();
  const all = await listProtocols(m.profile.id);
  const published = all.filter((p) => p.status === "published");
  const features = [
    { href: "/together/experiments", name: experiments.hub.name, what: experiments.hub.what, theme: null },
    { href: "/together/league", name: t.features.league.name, what: t.features.league.what, theme: null },
    { href: "/together/research", name: assistCopy.research.name, what: assistCopy.research.what, theme: null },
    ...Object.entries(IDEA_PAGES).map(([slug, page]) => {
      const idea = ideaBySlug(slug)!;
      return { href: `/together/${page}`, name: idea.name, what: idea.what, theme: catalogue.themes.find((x) => x.key === idea.theme)?.name ?? null };
    }),
  ];

  return (
    <>
      <PageHead
        title={t.title} sub={t.sub}
        stats={[
          { value: published.length, label: t.stats.published },
          { value: published.reduce((n, p) => n + p.open, 0), label: t.stats.open },
          { value: published.filter((p) => isTested(p.step)).length, label: t.stats.signal },
        ]}
      />
      <div className="bento">
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
      </div>

      <h2>{t.features.title}</h2>
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
    </>
  );
}
