"use client";
import { useState } from "react";
import { measure as t } from "@/copy/test";
import { SURVEY_QUESTIONS } from "@/engine";
import css from "./measure.module.css";

const s = t.survey;

/** The symptom survey: fifteen questions, each answered never (0) to always (4). `onDone` gets the fifteen answers. */
export function SurveyTest({ child, onDone }: { child: boolean; onDone: (answers: number[]) => void }) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => Array<number | null>(SURVEY_QUESTIONS).fill(null));
  const answered = answers.filter((a) => a !== null).length;
  const ready = answered === SURVEY_QUESTIONS;

  return (
    <>
      <p>{s.intro}</p>
      {child && <p className="notice">{s.child}</p>}
      <ol className={css.questions}>
        {s.questions.map((question, q) => (
          <li key={question}>
            <p id={`survey-${q}`}><span className="muted small">{s.number(q + 1, SURVEY_QUESTIONS)}</span><b>{question}</b></p>
            <div className="pills" role="group" aria-labelledby={`survey-${q}`}>
              {s.answers.map((label, value) => (
                <button
                  type="button" className="pill" key={label} aria-pressed={answers[q] === value}
                  onClick={() => setAnswers(answers.map((was, n) => (n === q ? value : was)))}
                >{label}</button>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <p className="muted small" role="status">{s.answered(answered, SURVEY_QUESTIONS)}</p>
      <button type="button" className="btn btn-g" disabled={!ready} onClick={() => ready && onDone(answers as number[])}>{s.save}</button>
    </>
  );
}
