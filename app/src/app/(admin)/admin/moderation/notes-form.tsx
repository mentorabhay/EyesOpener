// Eyes Opener: Asks the AI check for notes on the open items that have none. Drawn only in an edition with an assistant. .
"use client";
import { assistCopy } from "@/copy/assist";
import { AnswerForm } from "../answer-form";
import { writeNotes } from "./actions";

const a = assistCopy.review;

/** Asks the AI check for notes on the open items that have none. Drawn only in an edition with an assistant. */
export function NotesForm({ count }: { count: number }) {
  return (
    <AnswerForm action={writeNotes} submit={a.askAll(count)} dark>
      <p className="muted small">{a.askAbout} {a.caution}</p>
    </AnswerForm>
  );
}
