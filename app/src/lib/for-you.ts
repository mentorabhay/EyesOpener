/**
 * What goes at the top of the Games and Exercises lists for the person using the app (Ved, 18 October 2026: 61 games
 * one after another, and the ones a member is asked to play were somewhere in the middle): a counsellor's list first
 * (lib/for-you-extra.ts), then this week's plan of the programme, then what was played lately. Order only: nothing
 * is added to the library or taken out of it, and an item staff have hidden stays hidden. Server only.
 */
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { programmeView } from "@/lib/programme";
import type { Member } from "@/lib/session";
import { forYouExtra } from "./for-you-extra";

export type ForYouWhy = "counsellor" | "week" | "recent";
export interface ForYou { slug: string; why: ForYouWhy; by?: string }

const TAKE = 6, RECENT = 3;

export async function forYou(m: Member, kind: "game" | "exercise"): Promise<ForYou[]> {
  const [extra, view, recent] = await Promise.all([
    forYouExtra(m),
    m.enrolment ? programmeView(m) : Promise.resolve({ state: "none" as const }),
    db.select({ slug: schema.session.itemSlug }).from(schema.session)
      .where(and(eq(schema.session.profileId, m.profile.id), eq(schema.session.kind, kind)))
      .orderBy(desc(schema.session.startedAt)).limit(30),
  ]);
  const out: ForYou[] = [];
  const add = (slug: string, why: ForYouWhy, by?: string) => { if (!out.some((o) => o.slug === slug)) out.push({ slug, why, ...(by ? { by } : {}) }); };
  for (const it of extra) if (it.kind === kind) add(it.slug, "counsellor", it.by);
  if (view.state === "active") {
    /* each part's suggestion for today first, then its other choices */
    const parts = view.chapter.parts;
    for (const it of [...parts.map((p) => p.items[0]), ...parts.flatMap((p) => p.items.slice(1))]) if (it?.kind === kind) add(it.slug, "week");
  }
  const lately = [...new Set(recent.map((r) => r.slug))].slice(0, RECENT);
  for (const slug of lately) add(slug, "recent");
  return out.slice(0, TAKE);
}
