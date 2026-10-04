"use client";
import { useState } from "react";
import { measure as t } from "@/copy/test";
import {
  CONTRAST_BACKGROUND, acuityLevels, answerStaircase, contrastGrey, contrastLevels, startStaircase, thresholdCm,
  type EyeResult, type Screen,
} from "@/engine";
import { ArrowPad } from "./arrow-pad";
import { ECanvas, devicePixels, type Turn } from "./canvas";
import { LIMITS } from "./limits";

export type LetterKind = "acuity" | "contrast";
/** logMAR for the letter test, logCS for the faint-letter test. */
export interface LetterResult { value: number; note: EyeResult["note"] }

interface Level { stroke: number; ink: string; field: string; value: number }

const grey = (v: number) => `rgb(${v} ${v} ${v})`;
/** The faint letter is 2.5 degrees tall (30 times the 6/6 letter), kept between 60 and 160 pixels. */
const FAINT_LETTER_LOGMAR = Math.log10(30);

/** What each step of the staircase shows, easiest first. */
function levelsFor(kind: LetterKind, screen: Screen): Level[] {
  const k = devicePixels();
  if (kind === "acuity") return acuityLevels(screen, k).map((l) => ({ stroke: l.stroke, ink: "#000", field: "#fff", value: l.logMar }));
  const tall = Math.min(160, Math.max(60, thresholdCm(screen.dist, FAINT_LETTER_LOGMAR) * screen.ppc));
  const stroke = Math.max(2, Math.round((tall * k) / 5));
  return contrastLevels().map((cs) => ({ stroke, ink: grey(contrastGrey(cs, screen.gamma)), field: grey(CONTRAST_BACKGROUND), value: cs }));
}

const randomTurn = () => Math.floor(Math.random() * 4) as Turn;
const within = ([lo, hi]: readonly [number, number], v: number) => Math.round(Math.max(lo, Math.min(hi, v)) * 100) / 100;

/** One eye's letter test or faint-letter test: a tumbling E on the engine's staircase. */
export function LetterTest({ kind, screen, onDone }: { kind: LetterKind; screen: Screen; onDone: (r: LetterResult) => void }) {
  const [levels] = useState(() => levelsFor(kind, screen));
  const [stair, setStair] = useState(() => startStaircase(levels.length));
  const [turn, setTurn] = useState(randomTurn);
  const level = levels[stair.level];

  function answer(given: Turn | null) {
    const next = answerStaircase(stair, given === turn);
    if (next.result === null) { setStair(next); setTurn(randomTurn()); return; }
    const i = next.result;
    if (kind === "contrast") onDone({ value: i < 0 ? 0 : levels[i].value, note: "" });
    /* not even the largest letter: recorded as one step worse than the largest */
    else if (i < 0) onDone({ value: within(LIMITS.va, levels[0].value + 0.1), note: "worse" });
    else onDone({ value: within(LIMITS.va, levels[i].value), note: i === levels.length - 1 ? "floor" : "" });
  }

  return (
    <>
      <ECanvas stroke={level.stroke} turn={turn} ink={level.ink} field={level.field} />
      <p><b>{t.letterAsk}</b> {t.letterHow[kind]} {t.letterKeys}</p>
      <ArrowPad onAnswer={answer} />
      <p className="muted small">{t.letterCount(stair.trials + 1)}</p>
    </>
  );
}
