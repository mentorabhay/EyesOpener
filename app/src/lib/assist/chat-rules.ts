/**
 * The fixed rules of the eye-care chat, written to be read. Pure: no clock, no database, no model.
 *
 *  - A question is at most QUESTION_MAX letters; the browser keeps the conversation and sends back the last
 *    HISTORY_TURNS turns, each cut to TURN_MAX letters. Nothing of it is kept on the server.
 *  - Emergency signs are caught here first (`urgentSign`). A question that names one gets the fixed emergency answer
 *    in the page's words, and no model reads it. The list follows the NHS page "Eye problems: when to get urgent
 *    help" and the American Academy of Ophthalmology's "When to see an ophthalmologist urgently"; it can only add
 *    caution, so a question it misses is still answered with "see an eye doctor" by the assistant's own rules.
 *  - A visitor who is not signed in has a smaller share a day than a household (`PER_DAY`).
 */
import type { ChatTopic, ChatTurn } from "./types";

export const QUESTION_MAX = 400;
export const TURN_MAX = 600;
export const HISTORY_TURNS = 6;
/** How many questions a day: a household's grown-ups together, or one network of visitors. */
export const PER_DAY = { member: 40, visitor: 15 } as const;

export const isTopic = (v: unknown): v is ChatTopic => v === "eyes" || v === "app";

/** The question as it is sent on: spaces tidied, cut to the limit. Null when nothing is left. */
export function tidyQuestion(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const q = raw.replace(/\s+/g, " ").trim();
  return q ? q.slice(0, QUESTION_MAX) : null;
}

/** The last turns, each tidied and cut. Anything not in the shape is dropped. */
export function tidyHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatTurn[] = [];
  for (const t of raw.slice(-HISTORY_TURNS)) {
    const v = t as { from?: unknown; text?: unknown };
    if ((v.from !== "you" && v.from !== "assistant") || typeof v.text !== "string") continue;
    const text = v.text.replace(/\s+/g, " ").trim().slice(0, TURN_MAX);
    if (text) out.push({ from: v.from, text });
  }
  return out;
}

/** The emergency signs, each as a few ways people write it. Lower case; the question is lower-cased first. */
const URGENT: { key: string; words: RegExp }[] = [
  { key: "sudden_loss", words: /\b(sudden(ly)?|all of a sudden|overnight)\b.{0,40}\b(can'?t see|cannot see|lost (my |the )?(sight|vision)|loss of (sight|vision)|went (dark|black|blind)|blind|vision (gone|loss|went)|blurr?(ed|y)? (vision|sight)?)/ },
  { key: "sudden_loss", words: /\b(lost|losing) (the |my |his |her |their )?(sight|vision)\b|\bwent blind\b|\bcan'?t see (anything|at all)\b/ },
  { key: "curtain", words: /\b(curtain|shadow|veil|shade)\b.{0,40}\b(vision|sight|eye|over|across|coming)\b|\b(new|sudden|lots of|shower of) (flash(es)?|floaters?)\b|\bflash(es)? of light\b/ },
  { key: "chemical", words: /\b(chemical|bleach|acid|alkali|lime|cement|cleaner|detergent|battery (acid|fluid)|super ?glue|glue)\b.{0,40}\b(in|into|on) (my |the |his |her |their |an? )?eyes?\b|\b(splash(ed)?|sprayed|got)\b.{0,30}\b(chemical|bleach|acid)\b/ },
  { key: "injury", words: /\b(got hit|was hit|been hit|struck|punched|poked|scratched|stabbed|injur(ed|y)|trauma)\b.{0,40}\beyes?\b|\beyes?\b.{0,30}\b(injur(ed|y)|bleeding|hit by|cut)\b|\b(something|metal|glass|wood|object|splinter)\b.{0,30}\b(stuck|went|flew|in) (in|into)? ?(my |the |his |her |their |an? )?eyes?\b/ },
  { key: "pain", words: /\b(severe|very bad|terrible|unbearable|intense|worst)\b.{0,30}\b(eye ?pain|pain in (my |the |his |her |their )?eyes?|eyes? (pain|hurts?|ache))\b|\b(eye ?pain|red eye|painful eye)\b.{0,50}\b(vomit(ing)?|being sick|halos?|rainbow rings?|nausea)\b/ },
  { key: "double", words: /\b(sudden(ly)?|all of a sudden|new)\b.{0,30}\b(double vision|seeing double|see double|seeing two)\b/ },
  { key: "stroke", words: /\b(droop(ing|y)?|face drop(ping)?|slurred speech|weak(ness)? (in|on) (one|an?) (side|arm|leg))\b/ },
];

/** The first emergency sign a question names, or null. Only adds caution: it never clears a question. */
export function urgentSign(question: string): string | null {
  const q = ` ${question.toLowerCase().replace(/[’`]/g, "'")} `;
  for (const u of URGENT) if (u.words.test(q)) return u.key;
  return null;
}
