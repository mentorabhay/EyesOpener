"use client";
/**
 * Answer a survey. The near-work list is the symptom survey check-up's own part. The screen-strain and dry-eye
 * lists are Eyes Opener's own questions, answered on the same five-step scale and added up.
 */
import { useState } from "react";
import { SurveyTest } from "@/components/measure/survey";
import measure from "@/components/measure/measure.module.css";
import { surveys as s } from "@/copy/clips";
import type { TaskProps } from "./types";

function Questions({ questions, child, onDone }: { questions: readonly string[]; child: boolean; onDone: (answers: number[]) => void }) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const answered = answers.filter((v) => v !== null).length, ready = answered === questions.length;
  return (
    <>
      <p>{s.intro}</p>
      {child && <p className="notice">{s.child}</p>}
      <ol className={measure.questions}>
        {questions.map((question, q) => (
          <li key={question}>
            <p id={`own-${q}`}><span className="muted small">{s.number(q + 1, questions.length)}</span><b>{question}</b></p>
            <div className="pills" role="group" aria-labelledby={`own-${q}`}>
              {s.answers.map((label, value) => (
                <button type="button" className="pill" key={label} aria-pressed={answers[q] === value} onClick={() => setAnswers(answers.map((was, n) => (n === q ? value : was)))}>{label}</button>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <p className="muted small" role="status">{s.answered(answered, questions.length)}</p>
      <p className="muted small">{s.own}</p>
      <button type="button" className="btn btn-g" style={{ alignSelf: "flex-start" }} disabled={!ready} onClick={() => ready && onDone(answers as number[])}>{s.save}</button>
    </>
  );
}

export function SurveyTask({ def, ctx, onDone }: TaskProps) {
  const kind = def.play.template === "survey" ? def.play.kind : "near_work";
  if (kind === "near_work") return <SurveyTest child={ctx.child} onDone={(answers) => onDone({ answers })} />;
  return <Questions questions={s[kind]} child={ctx.child} onDone={(answers) => onDone({ answers })} />;
}
