"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import type { FormState } from "@/components/together/StateForm";
import { assistCopy } from "@/copy/assist";
import { together } from "@/copy/together";
import { tests } from "@/data";
import { db, schema } from "@/db";
import { assist } from "@/lib/assist/extra";
import type { AiFlag, IdeaSuggestion, SimilarIdea } from "@/lib/assist/types";
import { fieldProblems, screenHazards } from "@/lib/community";
import { requireMember } from "@/lib/session";

const t = together.shareForm;
const words = (min: number, max: number) => z.string().trim().min(min).max(max);
const Story = words(20, 2000);
const Idea = z.object({
  story: Story, title: words(3, 80), forWhom: words(3, 200), doWhat: words(3, 400), howMuch: words(3, 200),
  weeks: z.coerce.number().int().min(1).max(12),
  moves: z.enum(tests.map((x) => x.key) as [string, ...string[]]),
});

const REASON = "New idea from a member. Passed the hazard screen; needs a person's approval.";

/**
 * Saves a story and its protocol for a person to review. Anything on the hazard blocklist is refused and nothing is saved.
 *
 * In an edition with an assistant, a text that passed the blocklist gets a second opinion. It can only add caution:
 * its flags are kept for the reviewer, and the idea goes to a person either way. It never lets a blocked text through.
 */
export async function shareIdea(_: FormState, form: FormData): Promise<FormState> {
  const m = await requireMember();
  if (!m.can("share")) return { ok: false, message: together.cannot.share };
  const parsed = Idea.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: t.invalid, reasons: fieldProblems(parsed.error, t.errors) };
  const { story, ...idea } = parsed.data;
  const text = [story, idea.title, idea.forWhom, idea.doWhat, idea.howMuch].join("\n");
  const reasons = await screenHazards(text);
  if (reasons.length) return { ok: false, message: t.blocked, reasons };

  const opinion = assist.available ? await assist.hazardOpinion(m, text).catch(() => null) : null;
  const flagged = [...new Set(opinion?.flags.map((f) => f.reason) ?? [])];
  const suggested = form.get("assisted") === "1";
  const aiFlag: AiFlag | null = opinion || (assist.available && suggested)
    ? { v: 1, ...(opinion ? { hazard: { flags: opinion.flags, at: new Date().toISOString() } } : {}), ...(suggested ? { suggested } : {}), ...(opinion?.standIn ? { standIn: true } : {}) }
    : null;

  const saved = await db.transaction(async (tx) => {
    const [kept] = await tx.insert(schema.story).values({ profileId: m.profile.id, body: story, status: "in_review" }).returning({ id: schema.story.id });
    const [protocol] = await tx.insert(schema.protocol)
      .values({ ...idea, storyId: kept.id, profileId: m.profile.id, step: "protocol", status: "in_review", hazard: { blocked: [], flagged } })
      .returning({ id: schema.protocol.id });
    const [item] = await tx.insert(schema.moderationItem)
      .values({ kind: "protocol", refId: protocol.id, reason: flagged.length ? assistCopy.review.reasonFlagged : REASON, aiFlag })
      .returning({ id: schema.moderationItem.id });
    return { id: protocol.id, itemId: item.id };
  });
  /* The reviewer's note is written after the member has their answer. If it cannot be, staff can ask for it later. */
  if (assist.available) after(() => assist.noteItem(saved.itemId).catch(() => undefined));
  revalidatePath("/together");
  return { ok: true, message: t.saved, href: `/together/ideas/${saved.id}`, hrefLabel: t.seeIt };
}

export interface StoryReading { suggestion: IdeaSuggestion | { ok: false; why: "short" }; similar: SimilarIdea[] }

/**
 * Reads a story for the share form: suggested lines, and ideas already shared that say something similar.
 * Nothing is saved. The blocklist runs first and its answer stands: a story it stops gets no suggestion.
 * In an edition with no assistant this answers "none" and the form does not offer it.
 */
export async function readStory(story: string): Promise<StoryReading> {
  const m = await requireMember();
  if (!m.can("share") || !assist.available) return { suggestion: { ok: false, why: "none" }, similar: [] };
  const text = Story.safeParse(story);
  if (!text.success) return { suggestion: { ok: false, why: "short" }, similar: [] };
  const reasons = await screenHazards(text.data);
  if (reasons.length) return { suggestion: { ok: false, why: "refused", refusal: "hazard", reasons }, similar: [] };
  const [suggestion, similar] = await Promise.all([
    assist.suggestIdea(m, text.data).catch((): IdeaSuggestion => ({ ok: false, why: "failed" })),
    assist.similarToText(m, text.data).catch((): SimilarIdea[] => []),
  ]);
  return { suggestion, similar };
}
