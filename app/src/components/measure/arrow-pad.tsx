"use client";
import { useEffect, useEffectEvent } from "react";
import { measure as t } from "@/copy/test";
import type { Turn } from "./canvas";
import css from "./measure.module.css";

const KEYS: Record<string, Turn> = { ArrowRight: 0, ArrowDown: 1, ArrowLeft: 2, ArrowUp: 3 };

/** Four arrows and a "cannot tell" button. The arrow keys answer too. `null` means cannot tell. */
export function ArrowPad({ onAnswer }: { onAnswer: (turn: Turn | null) => void }) {
  const answer = useEffectEvent(onAnswer);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const turn = KEYS[e.key];
      if (turn === undefined || e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      answer(turn);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const arrow = (turn: Turn, glyph: string, label: string) => <button type="button" aria-label={label} onClick={() => onAnswer(turn)}>{glyph}</button>;
  return (
    <div className={css.pad} role="group" aria-label={t.pad.group}>
      <span />{arrow(3, "↑", t.pad.up)}<span />
      {arrow(2, "←", t.pad.left)}
      <button type="button" className={css.mid} onClick={() => onAnswer(null)}>{t.pad.cannot}</button>
      {arrow(0, "→", t.pad.right)}
      <span />{arrow(1, "↓", t.pad.down)}<span />
    </div>
  );
}
