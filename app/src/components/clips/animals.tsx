// Eyes Opener: The eye balance test with two animal shapes in place of two letters, for a child who does not yet read.
"use client";
/**
 * The eye balance test with two animal shapes in place of two letters, for a child who does not yet read.
 * The staircase and the result are the balance check-up's own (src/engine/measure.ts): the shape that looks
 * stronger is dimmed until neither wins.
 */
import { useCallback, useState } from "react";
import { TrueSize, useDraw, type Draw } from "@/components/measure/canvas";
import { clips as c } from "@/copy/clips";
import { SCENE_FIELD, answerBalance, balanceContrasts, startBalance, strongInk, weakInk } from "@/engine";
import css from "./clips.module.css";

/** Plain outlines in a box 100 units wide and 100 tall. */
const ANIMALS = {
  fish: "M12 50Q38 20 66 50Q38 80 12 50ZM62 50L90 28V72Z",
  cat: "M24 46L20 10L44 27Q50 25 56 27L80 10L76 46Q82 82 50 88Q18 82 24 46Z",
  rabbit: "M30 56Q22 6 36 5Q47 6 44 40Q50 38 56 40Q53 6 64 5Q78 6 70 56Q76 88 50 92Q24 88 30 56Z",
  bird: "M18 56Q28 30 54 34Q60 20 74 26L92 30L77 38Q80 62 56 72L32 74L8 84L20 64Z",
  butterfly: "M50 50Q22 2 8 34Q4 56 50 50Q12 60 20 86Q42 94 50 50Q58 94 80 86Q88 60 50 50Q96 56 92 34Q78 2 50 50Z",
} as const;
type Animal = keyof typeof ANIMALS;
const NAMES = Object.keys(ANIMALS) as Animal[];
type Ink = "red" | "cyan";

function nextPair() {
  const a = Math.floor(Math.random() * NAMES.length);
  let b = Math.floor(Math.random() * (NAMES.length - 1));
  if (b >= a) b++;
  return { red: NAMES[a], cyan: NAMES[b], order: (Math.random() < 0.5 ? ["red", "cyan"] : ["cyan", "red"]) as [Ink, Ink] };
}

const Shape = ({ animal }: { animal: Animal }) => <svg viewBox="0 0 100 100" aria-hidden="true"><path d={ANIMALS[animal]} fill="currentColor" /></svg>;

export function AnimalBalance({ gamma, onDone }: { gamma?: number; onDone: (x: number) => void }) {
  const [state, setState] = useState(startBalance);
  const [shown, setShown] = useState(nextPair);

  const draw = useCallback<Draw>((g, w, h) => {
    const con = balanceContrasts(state.x), size = Math.min(w, h) * 0.86, k = size / 100;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.fillStyle = SCENE_FIELD; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "lighter";
    g.setTransform(k, 0, 0, k, (w - size) / 2, (h - size) / 2);
    g.fillStyle = strongInk(con.red, gamma); g.fill(new Path2D(ANIMALS[shown.red]));
    g.fillStyle = weakInk(con.cyan, gamma); g.fill(new Path2D(ANIMALS[shown.cyan]));
    g.setTransform(1, 0, 0, 1, 0, 0);
  }, [state.x, shown, gamma]);

  function pick(picked: Ink | "equal") {
    const next = answerBalance(state, picked);
    if (next.result !== null) return onDone(next.result);
    setState(next);
    setShown(nextPair());
  }
  const button = (ink: Ink) => <button type="button" className="btn" aria-label={c.choose.animal[shown[ink]]} onClick={() => pick(ink)}><Shape animal={shown[ink]} /></button>;

  return (
    <>
      <TrueSize><canvas ref={useDraw(draw)} className={`chart dark ${css.tall}`} role="img" aria-label={c.choose.animalsLabel} /></TrueSize>
      <p><b>{c.choose.animalsAsk}</b></p>
      <div className={css.three} role="group" aria-label={c.choose.animalsGroup}>
        {button(shown.order[0])}
        <button type="button" className="btn" onClick={() => pick("equal")}>{c.choose.equal}</button>
        {button(shown.order[1])}
      </div>
      <p className="muted small">{c.choose.pair(state.trials + 1)}</p>
    </>
  );
}
