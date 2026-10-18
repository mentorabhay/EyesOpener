/**
 * The assistant of this edition. The public edition has none: every question is answered with "none" and nothing
 * is ever sent anywhere. A fuller build replaces this one file. The shapes and the rules are in ./types.
 */
import type { Assist } from "./types";

export const assist: Assist = {
  available: false,
  ready: async () => false,
  suggestIdea: async () => ({ ok: false, why: "none" }),
  similarToText: async () => [],
  similarToIdea: async () => [],
  hazardOpinion: async () => null,
  noteItem: async () => undefined,
  noteOpenItems: async () => ({ written: 0, left: 0, closed: "none" }),
  ideasChanged: async () => undefined,
  examParagraph: async () => ({ ok: false, why: "none" }),
  chat: async () => ({ ok: false, why: "none" }),
  extraPassages: async () => [],
  searchLibrary: async () => null,
};
