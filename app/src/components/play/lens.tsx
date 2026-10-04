"use client";
import { useState, type ReactNode } from "react";
import { common } from "@/copy/common";

const LENSES = ["none", "weak", "strong"] as const;

/** Glasses-view switch: tints every `.scene` inside it to show what each eye sees through its lens. */
export function LensView({ right, children }: { right?: ReactNode; children: ReactNode }) {
  const [lens, setLens] = useState<(typeof LENSES)[number]>("none");
  return (
    <div className="stack" data-lens={lens === "none" ? undefined : lens}>
      <div className="row">
        <div className="pills" role="group" aria-label={common.lens.label}>
          {LENSES.map((l) => <button key={l} type="button" className="pill" aria-pressed={lens === l} onClick={() => setLens(l)}>{common.lens[l]}</button>)}
        </div>
        <span className="sp" />
        {right}
      </div>
      {children}
    </div>
  );
}
