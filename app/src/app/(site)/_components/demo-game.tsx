"use client";
/**
 * A 60-second taste of one two-eye game for a visitor who has not signed in: Firefly Catch on the game kit, in the
 * kit's own inks. Nothing is saved and nothing is sent: there is no member and no session. It is not a test of the
 * eyes and does not train them; the page says so. The kit's rules hold: nothing flashes, and the game never ends
 * itself (the 60-second clock here is the page's, like the Stage's clock in the app).
 */
import { useCallback, useEffect, useState } from "react";
import { marketing } from "@/copy/marketing";
import { kitGame } from "@/games/canvas";
import { defs } from "@/games/defs";

const SECONDS = 60;
const SLUG = "firefly-catch";
/* Made once, when the file loads: a component must not be made again on every drawing of the page. */
const Game = defs[SLUG] ? kitGame(defs[SLUG]) : null;

export function DemoGame() {
  const t = marketing.demo;
  const [phase, setPhase] = useState<"ready" | "playing" | "done">("ready");
  const [left, setLeft] = useState(SECONDS);
  const [score, setScore] = useState(0);
  const onScore = useCallback((n: number) => setScore(n), []);

  useEffect(() => {
    if (phase !== "playing") return;
    const ends = Date.now() + SECONDS * 1000;
    const id = window.setInterval(() => {
      const s = Math.max(0, Math.ceil((ends - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) setPhase("done");
    }, 250);
    return () => window.clearInterval(id);
  }, [phase]);

  const start = () => { setScore(0); setLeft(SECONDS); setPhase("playing"); };
  if (!Game) return null;
  return (
    <div className="stack">
      <div className="scene ratio" aria-label={t.scene}>
        <Game running={phase === "playing"} onScore={onScore} contrast={0.6} gamma={2.2} targetPx={0} letterPx={0} ppc={0} distCm={0} cyanEye="L" />
      </div>
      <div className="row" style={{ alignItems: "center" }}>
        {phase === "playing"
          ? <button type="button" className="btn" onClick={() => setPhase("done")}>{t.stop}</button>
          : <button type="button" className="btn btn-g" onClick={start}>{phase === "done" ? t.again : t.start}</button>}
        <span className="tnum" role="status">{phase === "playing" ? `${t.left(left)} · ${t.score(score)}` : phase === "done" ? t.done(score) : ""}</span>
      </div>
    </div>
  );
}
