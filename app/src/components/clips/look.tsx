// Eyes Opener: Five soft sounds, a second and a half apart. Each one is also the moment the ring on the panel grows. .
"use client";
import { useRef, useState } from "react";
import { clips as c, eyeWord } from "@/copy/clips";
import { LOOKS } from "@/data/clips";
import { other, type Eye } from "@/engine";
import css from "./clips.module.css";
import { PatternCanvas } from "./pattern-canvas";
import type { TaskProps } from "./types";

/** Five soft sounds, a second and a half apart. Each one is also the moment the ring on the panel grows. */
const CUES = 5, CUE_GAP_MS = 1500;
function tone(audio: AudioContext, at: number) {
  const osc = audio.createOscillator(), gain = audio.createGain();
  osc.type = "sine"; osc.frequency.value = 660;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(0.07, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
  osc.connect(gain).connect(audio.destination);
  osc.start(at); osc.stop(at + 0.25);
}

/** {cyan} and {red} in the words become the member's own left and right. */
export const fillEyes = (text: string, cyanEye: Eye) => text.replaceAll("{cyan}", eyeWord(cyanEye)).replaceAll("{red}", eyeWord(other(cyanEye)));

/**
 * Look and answer: a still picture, what to do, and one or more questions. The answers are sent as the number of the
 * option chosen; what each answer means is decided on the server from src/data/clips/looks.ts.
 */
export function LookTask({ def, ctx, onDone }: TaskProps) {
  const scene = def.play.template === "look" ? def.play.scene : "", look = LOOKS[scene];
  const [answers, setAnswers] = useState<(number | null)[]>(() => look.questions.map(() => null));
  const [playing, setPlaying] = useState(false);
  const pulse = useRef(-1), audio = useRef<AudioContext | null>(null), timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const say = (text: string) => fillEyes(text, ctx.cyanEye);
  const ready = answers.every((a) => a !== null);

  function play() {
    if (playing) return;
    setPlaying(true);
    try { audio.current ??= new AudioContext(); } catch { /* no sound on this device: the ring still grows, and "I heard nothing" is an answer */ }
    const a = audio.current, from = a ? a.currentTime + 0.05 : 0;
    for (let i = 0; i < CUES; i++) {
      if (a) { try { tone(a, from + (i * CUE_GAP_MS) / 1000); } catch { /* as above */ } }
      timers.current.push(setTimeout(() => { pulse.current = performance.now(); }, 50 + i * CUE_GAP_MS));
    }
    timers.current.push(setTimeout(() => setPlaying(false), 50 + CUES * CUE_GAP_MS));
  }

  return (
    <>
      <ol className={css.list}>{look.steps.map((s) => <li key={s}>{say(s)}</li>)}</ol>
      <PatternCanvas scene={scene} gamma={ctx.screen?.gamma ?? 2.2} label={c.what(def.code)} fill={look.fill} pulse={scene === "sync" ? pulse : undefined} />
      {scene === "sync" && <button type="button" className="btn" style={{ alignSelf: "flex-start" }} disabled={playing} onClick={play}>{c.runner.playCue}</button>}
      {look.questions.map((q, n) => (
        <div className={css.q} key={q.ask}>
          <p id={`look-${n}`}><b>{say(q.ask)}</b></p>
          <div className={css.opts} role="group" aria-labelledby={`look-${n}`}>
            {q.options.map((o, i) => (
              <button type="button" className="btn" key={o.label} aria-pressed={answers[n] === i} onClick={() => setAnswers(answers.map((was, at) => (at === n ? i : was)))}>{say(o.label)}</button>
            ))}
          </div>
        </div>
      ))}
      <button type="button" className={`btn btn-g ${css.big}`} style={{ alignSelf: "flex-start" }} disabled={!ready} onClick={() => ready && onDone({ answers })}>{c.count.save}</button>
    </>
  );
}
