/**
 * Words for what an assistant adds to the pages: a suggestion on the share form, similar ideas, the reviewer's note,
 * the plain-words paragraph of the exam summary and the research library.
 * In an edition with no assistant none of these is drawn, except the research library, which then searches by words.
 * Every place says when words came from AI, and that a person decides.
 */
import type { Closed, HazardReason, IdeaGap, IdeaRefusal, ReviewRule } from "@/lib/assist/types";
import type { PassageKind } from "@/lib/library";
import { texts } from "@/i18n/texts";

const many = (n: number, one: string, more: string) => `${n} ${n === 1 ? one : more}`;

/** Why the assistant gave no answer, for a member. An edition with no assistant never shows these. */
const closed: Record<Closed, string> = {
  none: "",
  off: "The AI helper is not switched on yet.",
  saver: "The AI helper is resting to save cost.",
  cap: "The AI helper has used its budget for this month.",
  limit: "Your household has used the AI helper as often as it may today. It opens again tomorrow.",
  failed: "The AI helper did not answer this time.",
};

/** What each hazard reason of a second opinion reads as. */
const hazard: Record<HazardReason, string> = {
  sun: "Looking at the sun or another strong light",
  stop_treatment: "Stopping or changing glasses, a patch, drops or other care an eye doctor set",
  in_or_on_eye: "Putting something in the eye or pressing on it",
  supplement_or_drug: "A medicine, drops or a supplement",
  flashing_light: "Flashing or flickering light",
  over_dose: "More practice than Eyes Opener's daily limit",
  cure_claim: "A promise of a cure or of a sure result",
  other_harm: "Something else that could hurt",
};

/** What each house rule of a reviewer's note reads as. */
const rule: Record<ReviewRule, string> = {
  hazard: "Could hurt someone",
  cure_claim: "Promises a cure or a sure result",
  medical_advice: "Tells others what treatment to take, change or stop",
  dose: "Sets an amount of practice or treatment for others",
  private_details: "Names a person, a school or a place, or gives a contact",
  unkind: "Unkind to someone",
  off_topic: "Not about eyes, or an advert",
  unclear: "Hard to tell what it asks others to do",
};

export const assistCopy = texts("copy/assist", "assistCopy", () => ({
  closed,
  hazard,
  rule,
  /** Shown wherever a development stand-in answered in place of a model. */
  standIn: "This came from a stand-in used for testing, not from a real model.",

  share: {
    title: "Let AI suggest the lines",
    what: "AI can read your story and suggest the lines below. It is only a start. You read every line, change what is wrong, and you decide what is shared.",
    button: "Read my story",
    working: "Reading your story",
    short: "Write your story first. It needs at least 20 letters.",
    done: "These lines were suggested by AI from your story. Read every line and change anything that is not right. Nothing is shared until you press Send for review.",
    kept: "Lines you had already written were left as you wrote them.",
    gaps: {
      howMuch: "Your story does not say how much. Fill that line in yourself.",
      weeks: "Your story does not say for how many weeks. Choose that yourself.",
      moves: "Your story does not say which check-up should change. Choose that yourself.",
    } as Record<IdeaGap, string>,
    refused: {
      stops_care: "Your story is about stopping or changing care an eye doctor set. Eyes Opener does not share ideas like that. Talk to the eye doctor first.",
      hazard: "Your story mentions something that could hurt someone, so no lines were suggested.",
      treatment_dose: "Your story is about how much of a treatment to use, such as a patch, drops or glasses. Only an eye doctor sets that, so no lines were suggested.",
      not_an_idea: "AI could not find something in your story that another member could try. You can still fill in the lines yourself.",
    } as Record<IdeaRefusal, string>,
    still: "You can fill in the lines yourself.",
    similar: {
      title: "Someone has shared something like this",
      what: "AI compared the words of your story with the ideas already shared. Have a look before you send yours. You can still share your own.",
      opens: "opens in a new tab",
    },
  },

  idea: {
    similarTitle: "Ideas that say something similar",
    similarWhat: "Found by AI, by comparing the words of the ideas. Similar words do not mean the idea is the same, or that it helps.",
  },

  review: {
    title: "Note from the AI check",
    caution: "A second reader, and it can be wrong. It never approves or removes anything. You decide.",
    what: "What it is",
    suggested: "The member started from lines suggested by AI, then confirmed them.",
    hazards: "The second opinion on hazards flagged:",
    concerns: "It points at:",
    quote: (words: string) => `"${words}"`,
    nothing: "It saw nothing against the house rules. That is not an approval.",
    other: "What the AI check said",
    askAll: (n: number) => `Ask the AI check for notes on ${many(n, "item", "items")}`,
    askAbout: "Items shared while the AI check was resting have no note yet.",
    wrote: (n: number, left: number) => (left > 0 ? `Notes written for ${many(n, "item", "items")}. ${many(left, "item is", "items are")} still without one.` : `Notes written for ${many(n, "item", "items")}.`),
    wroteNone: "No note could be written.",
    reasonFlagged: "New idea from a member. It passed the fixed hazard rules. The AI second opinion flagged it. It needs a person's approval.",
    library: "Search the research library",
  },

  exam: {
    title: "In plain words",
    what: "AI can write one short paragraph that says the numbers of this page in plain words. It uses only the numbers on this page.",
    button: "Write the paragraph",
    again: "Write it again",
    working: "Writing",
    label: "Written by AI from the numbers on this page. It is not advice and it is not from an eye doctor. Check it against the table: the table is the record.",
    nothing: "There is no check-up result on this page yet, so there is nothing to put into words.",
    check: "The paragraph did not pass Eyes Opener's checks, so it is not shown. The table on this page has every number.",
  },

  research: {
    name: "Research library",
    what: "Look up what the trials found, with a link to each source.",
    title: "Research library",
    sub: "Search what Eyes Opener's own pages say about the research. You get the passages, word for word, each with its source. Nothing here writes an answer for you.",
    label: "What do you want to look up?",
    hint: "For example: patching hours, pencil push-ups, outdoor time",
    submit: "Search",
    clear: "Clear",
    count: (n: number) => many(n, "passage", "passages"),
    stat: "Passages in the library",
    byMeaning: "Found by meaning",
    byWords: "Found by its words",
    byMeaningNote: "AI compared the meaning of your question with each passage and chose the closest ones. It did not write or change any of them.",
    byWordsNote: "These passages carry the words of your question.",
    none: { title: "Nothing found", body: "Try other words, or fewer of them. The library holds only what Eyes Opener's own pages say." },
    start: { title: "Type a question above", body: "Or browse the kinds of passage below." },
    sources: "Sources",
    noSource: "This passage names no source of its own. The trials behind it are in the library too.",
    from: "From",
    open: "Open the page",
    kinds: {
      trial: "Trial", method: "Method", label: "Evidence label", exercise: "Exercise guide", game: "Game guide", story: "Story",
    } as Record<PassageKind, string>,
    kindCount: (kind: string, n: number) => `${kind}: ${n}`,
    notAdvice: "A passage says what a study found in the people it studied. It cannot say what will happen for you. Ask an eye doctor about your own eyes.",
    tooLong: "Use a shorter question, up to 200 letters.",
  },
}));
