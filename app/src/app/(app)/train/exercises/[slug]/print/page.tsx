import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, PageHead } from "@/components/ui";
import { print as t } from "@/copy/drills-tools";
import { exerciseBySlug } from "@/data";
import { guideFor } from "@/data/guides";
import { cardFor } from "@/drills/print/cards";
import { requireMember } from "@/lib/session";
import { statusFor } from "@/lib/sessions";
import { isListed } from "@/lib/status";
import { PrintButton } from "./print-button";
import css from "./print.module.css";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const key = guideFor((await params).slug)?.print;
  return { title: key ? cardFor(key).title : undefined };
}

/** The card an exercise needs, to print at its real size. Read-only: anyone who may look at the exercise may print its card. */
export default async function PrintCardPage({ params }: Props) {
  const { slug } = await params;
  const m = await requireMember();
  const e = exerciseBySlug(slug);
  const key = guideFor(slug)?.print;
  if (!e || !key) notFound();
  /* an exercise staff have hidden has no card page either */
  if (!isListed(await statusFor("exercise", slug), m.tester)) notFound();
  const card = cardFor(key);

  return (
    <div className={css.sheet}>
      <div className={css.hide}>
        <PageHead title={card.title} sub={t.sub} crumb={[{ href: "/train/exercises", label: t.crumb }, { href: `/train/exercises/${slug}`, label: e.name }]} />
      </div>
      <div className={`bento ${css.hide}`}>
        <Card title={t.printTitle} span={5}>
          <p><b>{t.size}</b></p>
          <p>{t.check}</p>
          <p className="muted small">{t.paper}</p>
          <div className="row"><PrintButton label={t.button} /></div>
        </Card>
        <Card title={t.howTitle} span={7}>
          <ol className={css.list}>{card.how.map((line) => <li key={line}>{line}</li>)}</ol>
        </Card>
      </div>
      <h2 className={css.hide}>{t.sheets}</h2>
      <div className={css.pages}>
        {card.pages.map((page, i) => (
          <figure key={i} className={css.paper}>
            <figcaption className={`muted small ${css.hide}`}>{t.sheet(i + 1, card.pages.length)}</figcaption>
            <div className={css.card}>{page}</div>
          </figure>
        ))}
      </div>
    </div>
  );
}
