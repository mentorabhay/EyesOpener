import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ProfileReminders } from "@/components/notify/reminders";
import { PageHead } from "@/components/ui";
import { counsellor as t } from "@/copy/counsellor";
import { notify as w } from "@/copy/notify";
import { requireCounsellor } from "@/lib/auth";
import { linkedProfile } from "@/lib/counsellor";
import { remindersOf } from "@/lib/notify/service";
import { counsellorChangeReminder, counsellorSaveReminder } from "./actions";

export const generateMetadata = (): Metadata => ({ title: w.page.title });
type Search = Promise<Record<string, string | string[] | undefined>>;

/** /counsellor/members/<link>/reminders: a linked counsellor sets the linked person's reminders. They reach the household's grown-ups. */
export default async function CounsellorReminders({ params, searchParams }: { params: Promise<{ linkId: string }>; searchParams: Search }) {
  const viewer = await requireCounsellor();
  const linkId = z.uuid().safeParse((await params).linkId);
  if (!linkId.success) notFound();
  const p = await linkedProfile(viewer, linkId.data);
  if (!p) notFound();
  const q = await searchParams;
  const rows = await remindersOf(p.accountId, p.id);
  const err = typeof q.err === "string" ? (w.page as unknown as Record<string, unknown>)[q.err] : null;
  return (
    <>
      <PageHead title={w.page.for(p.displayName)} sub={w.page.rule} crumb={[{ href: "/counsellor", label: t.member.crumb }, { href: `/counsellor/members/${linkId.data}`, label: p.displayName }]} />
      {q.saved && <p className="notice" data-b="ok" role="status">{w.page.saved}</p>}
      {q.removed && <p className="notice" data-b="ok" role="status">{w.page.removed}</p>}
      {typeof err === "string" && <p className="notice" data-b="warn" role="alert">{err}</p>}
      <ProfileReminders profile={p} rows={rows} may save={counsellorSaveReminder} change={counsellorChangeReminder} extra={{ link: linkId.data }} />
    </>
  );
}
