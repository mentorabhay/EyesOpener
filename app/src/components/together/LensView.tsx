"use client";
import { useState, type ReactNode } from "react";
import { common } from "@/copy/common";

const LENSES = ["none", "weak", "strong"] as const;

/** Glasses-view switch: tints every scene inside it to show what one eye sees through its lens. */
export function LensView({ label, children }: { label: string; children: ReactNode }) {
  const [lens, setLens] = useState<(typeof LENSES)[number]>("none");
  return (
    <div className="stack" data-lens={lens}>
      <div className="pills" role="group" aria-label={label}>
        {LENSES.map((k) => (
          <button key={k} type="button" className="pill" aria-pressed={lens === k} onClick={() => setLens(k)}>{common.lens[k]}</button>
        ))}
      </div>
      {children}
    </div>
  );
}
