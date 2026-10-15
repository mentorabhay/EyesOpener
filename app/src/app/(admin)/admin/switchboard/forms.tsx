"use client";
import { admin } from "@/copy/admin";
import { AnswerForm } from "../answer-form";
import { setCap } from "./actions";

const t = admin.switchboard.cap;

export function CapForm({ cap, min, max }: { cap: number; min: number; max: number }) {
  return (
    <AnswerForm action={setCap} submit={t.submit} dark>
      <div className="field">
        <label htmlFor="cap">{t.label}</label>
        <input id="cap" className="input" type="number" name="cap" required min={min} max={max} step="0.5" inputMode="decimal" defaultValue={cap} style={{ maxWidth: 160 }} />
      </div>
    </AnswerForm>
  );
}
