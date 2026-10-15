"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCounsellor } from "@/lib/auth";
import { answerRequest } from "@/lib/counsellor";

const Answer = z.object({ linkId: z.uuid(), answer: z.enum(["accept", "decline"]) });

/** Accept or decline a link request. The link must be this counsellor's and still waiting. */
export async function answer(formData: FormData) {
  const viewer = await requireCounsellor();
  const input = Answer.safeParse(Object.fromEntries(formData));
  if (!input.success) return;
  await answerRequest(viewer, input.data.linkId, input.data.answer === "accept");
  revalidatePath("/counsellor");
}
