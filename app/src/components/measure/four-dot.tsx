"use client";
import { useState } from "react";
import { measure as t } from "@/copy/test";
import type { DotCount, Lens } from "@/engine";
import { FourDotCanvas } from "./scenes";

export type BottomDot = Lens | "mix";
/** What the member reported: how many dots, and the colour of the bottom dot when there were four. */
export interface DotsResult { dots: DotCount; bottom: BottomDot | null }

const COUNTS: DotCount[] = [2, 3, 4, 5];
const BOTTOMS: BottomDot[] = ["red", "cyan", "mix"];

/** The four-dot check at full strength. It only records what the member says they see. */
export function FourDotTest({ ppc, onDone }: { ppc: number; onDone: (r: DotsResult) => void }) {
  const [dots, setDots] = useState<DotCount | null>(null);
  const [bottom, setBottom] = useState<BottomDot | null>(null);
  const ready = dots !== null && (dots !== 4 || bottom !== null);

  return (
    <>
      <FourDotCanvas ppc={ppc} />
      <p>{t.dots.look}</p>
      <p id="dots-count"><b>{t.dots.askCount}</b></p>
      <div className="pills" role="group" aria-labelledby="dots-count">
        {COUNTS.map((n) => (
          <button type="button" className="pill" key={n} aria-pressed={dots === n} onClick={() => { setDots(n); setBottom(null); }}>{n}</button>
        ))}
      </div>
      {dots === 4 && (
        <>
          <p id="dots-bottom"><b>{t.dots.askBottom}</b></p>
          <div className="pills" role="group" aria-labelledby="dots-bottom">
            {BOTTOMS.map((b) => <button type="button" className="pill" key={b} aria-pressed={bottom === b} onClick={() => setBottom(b)}>{t.dots.bottom[b]}</button>)}
          </div>
        </>
      )}
      <button type="button" className="btn btn-g" disabled={!ready} onClick={() => ready && onDone({ dots, bottom: dots === 4 ? bottom : null })}>{t.dots.save}</button>
    </>
  );
}
