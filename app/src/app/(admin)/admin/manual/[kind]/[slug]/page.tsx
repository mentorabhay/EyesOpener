import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExerciseManual, GameManual } from "@/components/play/manual";
import { PageHead } from "@/components/ui";
import { admin as t } from "@/copy/admin";
import { exerciseBySlug, gameBySlug } from "@/data";
import { requireStaff } from "@/lib/auth";
import { readStatuses } from "@/lib/catalogue";
import { statusOf } from "@/lib/status";

type Props = { params: Promise<{ kind: string; slug: string }> };
const c = t.manual;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kind, slug } = await params;
  return { title: (kind === "game" ? gameBySlug(slug)?.name : exerciseBySlug(slug)?.name) ?? c.crumb };
}

/** One item of the library, explained in full for staff: the member's guide, then why it is there and what it cannot tell. */
export default async function ManualItemPage({ params }: Props) {
  await requireStaff("manual");
  const { kind, slug } = await params;
  if (kind !== "game" && kind !== "exercise") notFound();
  const item = kind === "game" ? gameBySlug(slug) : exerciseBySlug(slug);
  if (!item) notFound();
  const status = statusOf(await readStatuses(), kind, slug);
  return (
    <>
      <PageHead title={item.name} sub={item.purpose} crumb={[{ href: "/admin", label: t.back }, { href: "/admin/manual", label: c.crumb }]} />
      <div className="row"><Link className="btn btn-sm" href={kind === "game" ? `/train/games/${slug}` : `/train/exercises/${slug}`}>{c.tryIt}</Link></div>
      {kind === "game" ? <GameManual slug={slug} staff status={status} /> : <ExerciseManual slug={slug} staff status={status} />}
    </>
  );
}
