"use client";
import { useState, type ReactNode } from "react";
import { common } from "@/copy/common";

const LENSES = ["none", "weak", "strong", "joined"] as const;
type Lens = (typeof LENSES)[number];

/**
 * The view switch above a scene, for checking a game without wearing the glasses.
 *  - weaker eye, stronger eye: tints every `.scene` inside to show what that eye gets through its lens
 *  - eyes joined (only when `onJoined` is given): asks the game to draw the two eyes' pictures in one place,
 *    the way joined eyes see them. It is a practice view; nothing is trained in it.
 */
export function LensView({ right, children, onJoined }: { right?: ReactNode; children: ReactNode; onJoined?: (on: boolean) => void }) {
  const [lens, setLens] = useState<Lens>("none");
  const pick = (l: Lens) => {
    setLens(l);
    onJoined?.(l === "joined");
  };
  return (
    <div className="stack" data-lens={lens === "weak" || lens === "strong" ? lens : undefined}>
      <div className="row">
        <div className="pills" role="group" aria-label={common.lens.label}>
          {LENSES.filter((l) => l !== "joined" || onJoined).map((l) => <button key={l} type="button" className="pill" aria-pressed={lens === l} onClick={() => pick(l)}>{common.lens[l]}</button>)}
        </div>
        <span className="sp" />
        {right}
      </div>
      {lens !== "none" && <p className="notice small" role="status">{common.lens.note[lens]}</p>}
      {children}
    </div>
  );
}
