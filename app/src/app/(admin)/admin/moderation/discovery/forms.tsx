// Eyes Opener: Core system module providing logic and utilities for forms.
"use client";
import { discovery } from "@/copy/discovery";
import { AnswerForm } from "../../answer-form";
import { addQuestionAction, answerQuestionAction, openRoundAction } from "./actions";

const t = discovery.staff;
type Limit = { min: number; max: number };

export function NewRoundForm({ title, firstDay, lastDay }: { title: Limit; firstDay: string; lastDay: string }) {
  return (
    <AnswerForm action={openRoundAction} submit={t.newRound.submit} dark>
      <div className="field">
        <label htmlFor="round-title">{t.newRound.name}</label>
        <input id="round-title" className="input" type="text" name="title" required minLength={title.min} maxLength={title.max} autoComplete="off" aria-describedby="round-title-hint" />
        <span id="round-title-hint" className="muted small">{t.newRound.nameHint}</span>
      </div>
      <div className="field">
        <label htmlFor="round-closes">{t.newRound.closesOn}</label>
        <input id="round-closes" className="input" type="date" name="closesOn" required min={firstDay} max={lastDay} />
      </div>
    </AnswerForm>
  );
}

export function AddQuestionForm({ roundId, question, why }: { roundId: string; question: Limit; why: Limit }) {
  return (
    <AnswerForm action={addQuestionAction} submit={t.add.submit} dark>
      <input type="hidden" name="roundId" value={roundId} />
      <div className="field">
        <label htmlFor="question-text">{t.add.question}</label>
        <input id="question-text" className="input" type="text" name="question" required minLength={question.min} maxLength={question.max} autoComplete="off" aria-describedby="question-text-hint" />
        <span id="question-text-hint" className="muted small">{t.add.questionHint}</span>
      </div>
      <div className="field">
        <label htmlFor="question-why">{t.add.why}</label>
        <textarea id="question-why" name="why" required minLength={why.min} maxLength={why.max} aria-describedby="question-why-hint" />
        <span id="question-why-hint" className="muted small">{t.add.whyHint}</span>
      </div>
    </AnswerForm>
  );
}

export function AnswerQuestionForm({ questionId, answer, basis, minMembers }: { questionId: string; answer: Limit; basis: Limit; minMembers: number }) {
  const id = (name: string) => `answer-${name}-${questionId}`;
  return (
    <AnswerForm action={answerQuestionAction} submit={t.answer.submit} dark>
      <input type="hidden" name="id" value={questionId} />
      <div className="field">
        <label htmlFor={id("text")}>{t.answer.text}</label>
        <textarea id={id("text")} name="answer" required minLength={answer.min} maxLength={answer.max} aria-describedby={id("text-hint")} />
        <span id={id("text-hint")} className="muted small">{t.answer.textHint}</span>
      </div>
      <div className="field">
        <label htmlFor={id("basis")}>{t.answer.basis}</label>
        <input id={id("basis")} className="input" type="text" name="basis" required minLength={basis.min} maxLength={basis.max} autoComplete="off" aria-describedby={id("basis-hint")} />
        <span id={id("basis-hint")} className="muted small">{t.answer.basisHint}</span>
      </div>
      <div className="field">
        <label htmlFor={id("members")}>{t.answer.members}</label>
        <input id={id("members")} className="input" type="number" name="members" required min={minMembers} step={1} inputMode="numeric" aria-describedby={id("members-hint")} />
        <span id={id("members-hint")} className="muted small">{t.answer.membersHint(minMembers)}</span>
      </div>
    </AnswerForm>
  );
}
