/**
 * Items an edition adds to the top of the Games and Exercises lists (lib/for-you.ts), before the week's plan: the
 * public edition adds none; a fuller build replaces this one file with a linked counsellor's list.
 */
import type { Member } from "@/lib/session";

export interface ForYouExtra { kind: "game" | "exercise" | "film"; slug: string; by: string }

export const forYouExtra = async (_m: Member): Promise<ForYouExtra[]> => [];
