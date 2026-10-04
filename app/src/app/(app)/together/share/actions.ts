"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/together/StateForm";
import { together } from "@/copy/together";
import { tests } from "@/data";
import { db, schema } from "@/db";
import { fieldProblems, screenHazards } from "@/lib/community";
import { requireMember } from "@/lib/session";

const t = together.shareForm;
const words = (min: number, max: number) => z.string().trim().min(min).max(max);
const Idea = z.object({
  story: words(20, 2000), title: words(3, 80), forWhom: words(3, 200), doWhat: words(3, 400), howMuch: words(3, 200),
  weeks: z.coerce.number().int().min(1).max(12),
  moves: z.enum(tests.map((x) => x.key) as [string, ...string[]]),
});

/** Saves a story and its protocol for a person to review. Anything on the hazard blocklist is refused and nothing is saved. */
export async function shareIdea(_: FormState, form: FormData): Promise<FormState> {
  const m = await requireMember();
  if (!m.can("share")) return { ok: false, message: together.cannot.share };
  const parsed = Idea.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: t.invalid, reasons: fieldProblems(parsed.error, t.errors) };
  const { story, ...idea } = parsed.data;
  const reasons = await screenHazards([story, idea.title, idea.forWhom, idea.doWhat, idea.howMuch].join("\n"));
  if (reasons.length) return { ok: false, message: t.blocked, reasons };

  const id = await db.transaction(async (tx) => {
    const [saved] = await tx.insert(schema.story).values({ profileId: m.profile.id, body: story, status: "in_review" }).returning({ id: schema.story.id });
    const [protocol] = await tx.insert(schema.protocol)
      .values({ ...idea, storyId: saved.id, profileId: m.profile.id, step: "protocol", status: "in_review", hazard: { blocked: [], flagged: [] } })
      .returning({ id: schema.protocol.id });
    await tx.insert(schema.moderationItem).values({ kind: "protocol", refId: protocol.id, reason: "New idea from a member. Passed the hazard screen; needs a person's approval." });
    return protocol.id;
  });
  revalidatePath("/together");
  return { ok: true, message: t.saved, href: `/together/ideas/${id}`, hrefLabel: t.seeIt };
}
