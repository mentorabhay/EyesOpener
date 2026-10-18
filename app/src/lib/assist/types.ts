/**
 * The assistant: what an edition with AI may add to the pages of this app, and the shapes it answers in.
 *
 * The public edition has no assistant. `src/lib/assist/extra.ts` answers "none" to everything, and the pages then show
 * nothing about it: no button, no card, no note. A fuller build replaces that one file.
 *
 * Rules every assistant must keep. The pages rely on them:
 *  - It suggests and it flags. A person decides. It never publishes, approves, removes or sets a dose.
 *  - It can only add caution. The fixed hazard rules run first, and what they say stands whatever the assistant says.
 *  - No name and no contact detail leaves the server.
 *  - Every call is counted in `ai_call` against the monthly limit, and saver mode turns the assistant off.
 *  - What it writes is checked on the server before a page shows it. A text that fails its check is not shown.
 */
import { z } from "zod";
import type { LadderStep } from "@/lib/community";
import type { Passage } from "@/lib/library";
import type { Member } from "@/lib/session";

/** Why the assistant gave no answer. */
export type Closed =
  /** This edition has no assistant. */
  | "none"
  /** It is not set up: no model is named, a price is missing, or the server has no access to the model. */
  | "off"
  /** Saver mode is on. */
  | "saver"
  /** This month's limit for AI spend is reached. */
  | "cap"
  /** This household has used today's share. */
  | "limit"
  /** The model could not be reached, or its answer could not be used. */
  | "failed";

/* ───────────── a story becomes an idea ───────────── */

/** The fields of the share form. A field the story does not give is left empty (or null) for the member to fill in. */
export interface IdeaFields { title: string; forWhom: string; doWhat: string; howMuch: string; weeks: number | null; moves: string | null }

/** Why a story gets no suggestion at all. */
export const IDEA_REFUSALS = ["stops_care", "hazard", "treatment_dose", "not_an_idea"] as const;
export type IdeaRefusal = (typeof IDEA_REFUSALS)[number];

/** The fields the story did not give. The member fills them in. */
export type IdeaGap = "howMuch" | "weeks" | "moves";

export type IdeaSuggestion =
  | { ok: true; fields: IdeaFields; gaps: IdeaGap[]; /** True when a development stand-in answered, not a model. */ standIn?: boolean }
  | { ok: false; why: Closed }
  /** `reasons` are the fixed hazard rules the story tripped, in their own words. Empty when the assistant refused by itself. */
  | { ok: false; why: "refused"; refusal: IdeaRefusal; reasons: string[] };

/** A published idea that says something close to a text or to another idea. */
export interface SimilarIdea { id: string; title: string; forWhom: string; step: LadderStep; /** True when a development stand-in compared the words, not a model. */ standIn?: boolean }

/* ───────────── the second opinion on hazards ───────────── */

/** The only reasons a second opinion may give. They follow the hazard list of the concept. */
export const HAZARD_REASONS = ["sun", "stop_treatment", "in_or_on_eye", "supplement_or_drug", "flashing_light", "over_dose", "cure_claim", "other_harm"] as const;
export type HazardReason = (typeof HAZARD_REASONS)[number];
/** `quote` is the words of the text the flag points at. Empty when the words could not be found in the text. */
export interface HazardFlag { reason: HazardReason; quote: string }
/** No flags means only that the second opinion saw nothing. It never clears a text: the fixed rules and a person do that. */
export interface HazardOpinion { flags: HazardFlag[] }

/* ───────────── the note for a reviewer ───────────── */

/** The house rules a note may point at. */
export const REVIEW_RULES = ["hazard", "cure_claim", "medical_advice", "dose", "private_details", "unkind", "off_topic", "unclear"] as const;
export type ReviewRule = (typeof REVIEW_RULES)[number];
export interface ReviewConcern { rule: ReviewRule; why: string; quote: string }

const FlagZ = z.object({ reason: z.enum(HAZARD_REASONS), quote: z.string().max(200) });
const ConcernZ = z.object({ rule: z.enum(REVIEW_RULES), why: z.string().max(300), quote: z.string().max(200) });
/**
 * What `moderation_item.ai_flag` holds when an assistant wrote it. All of it is for the reviewer to read.
 * Nothing in it approves or removes an item.
 */
export const AiFlagZ = z.object({
  v: z.literal(1),
  /** The second opinion on hazards, taken when the item was shared. */
  hazard: z.object({ flags: z.array(FlagZ).max(8), at: z.string() }).optional(),
  /** A short note: what the item is, and any concern with the rule it touches. */
  note: z.object({ what: z.string().max(300), concerns: z.array(ConcernZ).max(6), at: z.string() }).optional(),
  /** The member started from an AI suggestion for the idea's fields, then confirmed them. */
  suggested: z.boolean().optional(),
  /** True when a development stand-in wrote this, not a model. */
  standIn: z.boolean().optional(),
});
export type AiFlag = z.infer<typeof AiFlagZ>;

/** Reads `ai_flag`. Null when it is empty or was not written in this shape. */
export const readAiFlag = (raw: unknown): AiFlag | null => AiFlagZ.safeParse(raw).data ?? null;

/* ───────────── the plain-words paragraph of the exam summary ───────────── */

/** The numbers of the summary page, as the page prints them. A paragraph may use these and nothing else. */
export interface ExamFacts {
  /** One for each check-up line that has a result. */
  results: { name: string; latest: string; latestDay: string; first: string | null; firstDay: string | null; count: number; changed: boolean }[];
  /** The check-ups with no result yet, by name. */
  notTaken: string[];
  practice: { programme: string | null; minutes: number; days: number; windowDays: number };
  stops: { symptom: string; day: string }[];
}

export type ExamParagraph =
  | { ok: true; text: string; standIn?: boolean }
  /** "nothing": there is no result to write about. "check": a paragraph was written, failed its check and is not shown. */
  | { ok: false; why: Closed | "nothing" | "check" };

/* ───────────── the research library, by meaning ───────────── */

/** A passage of the library with how close it is to the question, from 0 to 1. */
export interface MeaningHit { key: string; closeness: number }

/* ───────────── the eye-care chat ───────────── */

/** "eyes": questions about eyes in general. "app": questions about Eyes Opener itself, answered from its own pages. */
export const CHAT_TOPICS = ["eyes", "app"] as const;
export type ChatTopic = (typeof CHAT_TOPICS)[number];
/** One earlier turn of the conversation, kept in the browser only and sent back with the next question. */
export interface ChatTurn { from: "you" | "assistant"; text: string }
/** A page of this app the answer points to, from the app's own passages. */
export interface ChatLink { label: string; href: string }

/** Who is asking. A visitor has no member; the network stands in for them in the day's share. Never sent to a model. */
export interface ChatAsker { member: Member | null; network: string }

export type ChatAnswer =
  | { ok: true; text: string; links: ChatLink[]; /** The answer says to see an eye doctor. */ seeDoctor: boolean; standIn?: boolean }
  /** "check": an answer was written, failed its check and is not shown. */
  | { ok: false; why: Closed | "check" };

/* ───────────── the seam ───────────── */

export interface Assist {
  /** False in an edition with no assistant. Pages check this before they draw anything about it. */
  readonly available: boolean;
  /**
   * Can the assistant do this job right now? False while it is not set up, while saver mode is on and once the
   * month's limit is reached. A member's page offers a button only when this is true, so nobody presses one that
   * cannot answer. No model is called to find out.
   */
  ready(job: "idea" | "exam" | "chat"): Promise<boolean>;

  /** Reads a member's story and suggests the fields of the idea. The member edits and confirms; nothing is saved here. */
  suggestIdea(m: Member, story: string): Promise<IdeaSuggestion>;
  /** Published ideas that say something close to this text. Empty when there are none, or no assistant. */
  similarToText(m: Member, text: string): Promise<SimilarIdea[]>;
  /** Published ideas close to this one. No model is called: it reads what was worked out before. */
  similarToIdea(protocolId: string): Promise<SimilarIdea[]>;

  /** A second opinion on a text the fixed rules have already passed. Null when there is no opinion. */
  hazardOpinion(m: Member, text: string): Promise<(HazardOpinion & { standIn?: boolean }) | null>;

  /** Writes the reviewer's note on one open item. Safe to call for an item that has one, or that is gone. */
  noteItem(itemId: string): Promise<void>;
  /** Writes notes on open items that have none. Answers how many were written and how many are still without. */
  noteOpenItems(max: number): Promise<{ written: number; left: number; closed?: Closed }>;
  /** Called after staff approve or remove an item, so the search by meaning follows what is published. */
  ideasChanged(): Promise<void>;

  /** A plain-words paragraph from the numbers of the summary page. */
  examParagraph(m: Member, facts: ExamFacts): Promise<ExamParagraph>;

  /**
   * Answers one question of the eye-care chat. The fixed rules of src/lib/assist/chat-rules.ts run first on the
   * page's server, and a question they answer (an emergency sign) never reaches this. It never diagnoses, never
   * gives a dose and never says a treatment can stop. Nothing of the conversation is kept.
   */
  chat(who: ChatAsker, topic: ChatTopic, question: string, history: readonly ChatTurn[]): Promise<ChatAnswer>;

  /** Passages an edition adds to the research library. */
  extraPassages(): Promise<Passage[]>;
  /** The passages closest to a question by meaning, closest first. Null when the search by meaning cannot answer. */
  searchLibrary(m: Member, question: string, keys: readonly string[]): Promise<{ hits: MeaningHit[]; standIn?: boolean } | null>;
}
