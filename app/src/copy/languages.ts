/**
 * Words for choosing a language: the household's setting, the menu on the public site, and the section staff use
 * to switch a language on. Plain words a school student can follow.
 * The names of the languages themselves are in src/i18n/languages.ts: each is written in its own language.
 */
import { texts } from "@/i18n/texts";

export const languages = texts("copy/languages", "languages", () => ({
  /** The menu on the public site and the card in Settings. */
  choose: {
    title: "Language",
    label: "Read Eyes Opener in",
    go: "Change language",
    sub: "This sets the language for everyone in your household, on every device.",
    childFollows: "Child mode uses the same language.",
    guardianOnly: "A guardian chooses the language for the household.",
    onlyEnglish: "Eyes Opener is in English for now. More languages are being checked by people who speak them.",
    mixed: "Where a sentence has not been checked in your language yet, it is shown in English.",
    notTranslated: "Game scenes, check-up letters and the names of games and exercises stay as they are in every language.",
    saved: (name: string) => `Saved. Eyes Opener is now in ${name}.`,
    notOffered: "That language is not switched on yet.",
    notAllowed: "Only a guardian can change the language.",
    inReview: "being checked",
    drafts: "Development view: machine drafts are shown. Nobody has checked them.",
  },
  /** The section in the staff's Catalogue room. */
  staff: {
    title: "Languages",
    sub: "A language is offered to families only when it is switched on here. English is always on.",
    meansTitle: "What each status means",
    status: { off: "Off", review: "In review", on: "On" },
    means: {
      off: "Nobody is offered this language.",
      review: "Only staff are offered it, so the people checking it can read the app in it.",
      on: "Every family is offered it. Sentences that no person has checked yet are shown in English.",
    },
    cols: { language: "Language", status: "Status", translated: "Translated", reviewed: "Checked by a person" },
    of: (done: number, all: number) => `${done} of ${all}`,
    percent: (n: number) => `${n}%`,
    none: "Nothing yet",
    save: "Save",
    saveLabel: (name: string) => `Save the status of ${name}`,
    statusLabel: (name: string) => `Status of ${name}`,
    always: "Always on",
    counted: (date: string) => `Counted against the list of English sentences made on ${date}.`,
    noList: "The list of English sentences is missing from this build, so nothing can be counted.",
    noFiles: "No translation files are in this build. A language cannot be switched on without them.",
    refused: {
      nothing: "No sentence of this language has been checked by a person yet. Switch it to \"In review\" first.",
      unknown: "That is not one of the languages.",
      held: "This language cannot be switched on for families yet. It can be put in review, so that staff can read the app in it.",
    },
    held: "Held at \"In review\": the right-to-left layout has not been checked screen by screen yet.",
    done: (name: string, status: string) => `${name} is now: ${status}.`,
    drafts: (n: number) => `${n} machine drafts wait for a person to check them.`,
    stale: (n: number) => `${n} translations are of an older English wording and are not shown.`,
    rule: "A machine translation is never shown to a family. A person who reads the language checks each sentence first.",
  },
}));
