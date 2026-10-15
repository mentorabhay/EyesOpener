"use client";
import { useState, useTransition } from "react";
import { assistCopy } from "@/copy/assist";
import type { ExamParagraph } from "@/lib/assist/types";
import { plainWords } from "./actions";
import css from "./summary.module.css";

const t = assistCopy.exam;

/**
 * One paragraph that says the page's numbers in plain words, written by an assistant when a grown-up asks.
 * It is shown only after it passed its checks on the server, it says it came from AI, and it prints with the page.
 * Drawn only in an edition that has an assistant.
 */
export function PlainWords() {
  const [answer, setAnswer] = useState<ExamParagraph | null>(null);
  const [pending, start] = useTransition();
  const ask = () => start(async () => setAnswer(await plainWords()));
  const why = answer && !answer.ok ? answer.why : null;
  return (
    <section className="c span12">
      <div className="c-head"><h2>{t.title}</h2></div>
      {answer?.ok ? (
        <>
          <p>{answer.text}</p>
          <p className="muted small">{t.label}{answer.standIn ? ` ${assistCopy.standIn}` : ""}</p>
        </>
      ) : <p className={`muted ${css.hide}`}>{t.what}</p>}
      <div className={`row ${css.hide}`}>
        <button type="button" className="btn btn-sm btn-d" onClick={ask} disabled={pending}>{pending ? t.working : answer?.ok ? t.again : t.button}</button>
      </div>
      <div role="status" className={css.hide}>
        {why && why !== "none" && <p className="notice" data-b="warn">{why === "nothing" ? t.nothing : why === "check" ? t.check : assistCopy.closed[why]}</p>}
      </div>
    </section>
  );
}
