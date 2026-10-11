// Eyes Opener: The two starting points as cyan codes (#00GGBB), at the usual gamma. .
"use client";
import { screensAdmin as t } from "@/copy/screens-admin";
import { AnswerForm } from "../answer-form";
import { setPresets } from "./actions";

/** The two starting points as cyan codes (#00GGBB), at the usual gamma. */
export function PresetsForm({ lessBlue, lessGreen }: { lessBlue: string; lessGreen: string }) {
  return (
    <AnswerForm action={setPresets} submit={t.presets.save} dark>
      {([["lessBlue", t.presets.lessBlue, lessBlue], ["lessGreen", t.presets.lessGreen, lessGreen]] as const).map(([name, label, code]) => (
        <div className="field" key={name}>
          <label htmlFor={name}>{label} · {t.presets.code}</label>
          <input id={name} name={name} className="input" required defaultValue={code} maxLength={7} spellCheck={false} autoComplete="off" style={{ maxWidth: 160, fontFamily: "ui-monospace, monospace" }} />
        </div>
      ))}
    </AnswerForm>
  );
}
