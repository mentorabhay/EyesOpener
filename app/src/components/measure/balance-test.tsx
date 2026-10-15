"use client";
import { useState } from "react";
import { measure as t } from "@/copy/test";
import { answerBalance, startBalance } from "@/engine";
import { BalanceCanvas } from "./canvas";
import css from "./measure.module.css";

const POOL = "CDHKNORSVZ";
type Ink = "red" | "cyan";

/** Two different letters, and which ink the first button stands for. */
function nextPair() {
  const a = Math.floor(Math.random() * POOL.length);
  let b = Math.floor(Math.random() * (POOL.length - 1));
  if (b >= a) b++;
  return { pair: POOL[a] + POOL[b], order: (Math.random() < 0.5 ? ["red", "cyan"] : ["cyan", "red"]) as [Ink, Ink] };
}

/**
 * The balance test: the red letter goes to the red-lens eye, so choosing it dims red; choosing the cyan letter dims cyan.
 * `onDone` gets the balance value, log10 of red over cyan contrast.
 */
export function BalanceTest({ gamma, onDone }: { gamma?: number; onDone: (x: number) => void }) {
  const [state, setState] = useState(startBalance);
  const [shown, setShown] = useState(nextPair);

  function pick(picked: Ink | "equal") {
    const next = answerBalance(state, picked);
    if (next.result !== null) return onDone(next.result);
    setState(next);
    setShown(nextPair());
  }
  const letter = (ink: Ink) => <button type="button" onClick={() => pick(ink)}>{shown.pair[ink === "red" ? 0 : 1]}</button>;

  return (
    <>
      <BalanceCanvas pair={shown.pair} x={state.x} gamma={gamma} />
      <p><b>{t.balanceAsk}</b></p>
      <div className={css.pick} role="group" aria-label={t.balanceGroup}>
        {letter(shown.order[0])}
        <button type="button" className={css.mid} onClick={() => pick("equal")}>{t.equal}</button>
        {letter(shown.order[1])}
      </div>
      <p className="muted small">{t.pairCount(state.trials + 1)}</p>
    </>
  );
}
