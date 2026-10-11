// Eyes Opener: Sit still for the camera: the camera's scale against a tape, a distance, a minute of working distance, a minute.
"use client";
/**
 * Sit still for the camera: the camera's scale against a tape, a distance, a minute of working distance, a minute
 * of blinks. It uses the on-device vision parts built for the workday monitor (src/vision).
 *
 * What stays on this device: every camera picture and every face point. A picture goes from the video element into
 * the face model and is gone. What is sent when the clip ends: one or two numbers (a distance, a count, seconds).
 * The camera's scale is kept in this browser only. The camera is switched off the moment the clip ends or the page
 * is left.
 */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { clips as c } from "@/copy/clips";
import {
  blinkStep, closeCamera, distanceCm, loadLandmarker, loadScale, median, openCamera, saveScale, SET_AT_CM, SET_PICTURES, setUpScale, showIn, startBlinks, startRunner,
  type BlinkState, type CameraProblem, type CameraScale, type Landmarker, type OpenCamera, type Runner, type SetUp, type VisionFrame, type VisionProblem,
} from "@/vision";
import css from "./clips.module.css";
import type { TaskProps } from "./types";

const t = c.camera;
type Problem = CameraProblem | VisionProblem | "noPicture" | "model";
/** The scale is set from the last few seconds of pictures taken square to the camera. */
const WINDOW_MS = 3000, SET_UP_WAIT_MS = 7000;

interface Engine {
  camera: OpenCamera; landmarker: Landmarker; runner: Runner;
  readings: { at: number; iris: number; offCentre: number }[];
  distances: number[];
  blinks: BlinkState; counted: number; watchedMs: number;
  /** When the timed reading began, or null while only the live number is shown. */
  since: number | null;
}

export function CameraTask({ def, onDone }: TaskProps) {
  const play = def.play.template === "camera" ? def.play : { kind: "scale" as const, seconds: 5 };
  const { kind, seconds } = play;
  const video = useRef<HTMLVideoElement>(null), engine = useRef<Engine | null>(null), here = useRef(true), done = useRef(false);
  const [step, setStep] = useState<"idle" | keyof typeof t.step>("idle");
  const [problem, setProblem] = useState<Problem | null>(null);
  const [scale, setScale] = useState<CameraScale | null>(null);
  const [live, setLive] = useState<{ face: boolean; cm: number | null }>({ face: false, cm: null });
  const [cm, setCm] = useState("");
  const [setUp, setSetUp] = useState<"busy" | "ok" | Extract<SetUp, { ok: false }>["why"] | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const [read, setRead] = useState<{ cm: number; pictures: number } | null>(null);
  const [slow, setSlow] = useState(false);
  const scaleRef = useRef<CameraScale | null>(null);
  useEffect(() => { scaleRef.current = scale; }, [scale]);

  const stop = useCallback(() => {
    const e = engine.current;
    if (!e) return;
    e.runner.stop(); e.landmarker.close(); closeCamera(e.camera);
    if (video.current) video.current.srcObject = null;
    engine.current = null;
    setStep("idle"); setLeft(null);
  }, []);
  useEffect(() => { here.current = true; return () => { here.current = false; stop(); }; }, [stop]);

  /** One picture's facts: the live number, and whatever this clip is collecting. */
  const onFrame = useCallback((f: VisionFrame) => {
    const e = engine.current;
    if (!e) return;
    const facts = f.facts, s = scaleRef.current?.scale ?? null;
    if (facts?.square && facts.iris !== null) {
      e.readings.push({ at: f.t, iris: facts.iris, offCentre: facts.offCentre });
      while (e.readings.length && f.t - e.readings[0].at > WINDOW_MS) e.readings.shift();
      const d = distanceCm(facts.iris, facts.offCentre, s);
      if (d !== null && e.since !== null) e.distances.push(d);
    }
    if (kind === "blinks" && e.since !== null) {
      const b = blinkStep(e.blinks, f.t, facts?.facing ? facts.open : null);
      e.blinks = b.state; e.watchedMs += b.watchedMs;
      if (b.blink) e.counted += 1;
    }
  }, [kind]);

  /* the screen is drawn again twice a second: the live number, the seconds left, and the end of a timed reading */
  useEffect(() => {
    if (step !== "ready") return;
    const id = setInterval(() => {
      const e = engine.current;
      if (!e) return;
      const now = performance.now(), recent = e.readings.filter((r) => now - r.at < 1200), s = scaleRef.current?.scale ?? null;
      const mid = recent.length ? distanceCm(median(recent.map((r) => r.iris)), median(recent.map((r) => r.offCentre))!, s) : null;
      setLive({ face: recent.length > 0, cm: mid === null ? null : Math.round(mid) });
      if (e.since === null) return;
      const spent = (now - e.since) / 1000;
      setLeft(Math.max(0, Math.ceil(seconds - spent)));
      if (spent < seconds || done.current) return;
      if (kind === "blinks") {
        done.current = true;
        const watched = e.watchedMs / 1000, counted = e.counted;
        stop();
        if (watched < 30) setSlow(true); else onDone({ blinks: counted, seconds: watched });
      } else {
        const got = e.distances.length ? median(e.distances) : null, pictures = e.distances.length;
        e.since = null; e.distances = [];
        /* no face, or a face for only a few moments of the minute: nothing is made up, the reading begins again */
        if (got === null || (kind === "working" && pictures < seconds * 2)) { e.since = now; return; }
        setLeft(null);
        if (kind === "working") { done.current = true; stop(); onDone({ cm: got, seconds }); }
        else setRead({ cm: Math.round(got), pictures });
      }
    }, 500);
    return () => clearInterval(id);
  }, [step, kind, seconds, stop, onDone]);

  async function start() {
    if (engine.current || step !== "idle") return;
    setProblem(null); setSlow(false); setRead(null); setSetUp(null); done.current = false;
    setStep("model");
    const model = await loadLandmarker();
    if (!model.ok) { setProblem(model.why); setStep("idle"); return; }
    if (!here.current) { model.landmarker.close(); return; }
    setStep("camera");
    const cam = await openCamera();
    if (!cam.ok) { model.landmarker.close(); setProblem(cam.why); setStep("idle"); return; }
    if (!here.current || !video.current || !(await showIn(video.current, cam.camera.stream))) {
      model.landmarker.close(); closeCamera(cam.camera);
      if (here.current) { setProblem("noPicture"); setStep("idle"); }
      return;
    }
    const known = loadScale(cam.camera.key);
    setScale(known); scaleRef.current = known;
    const runner = startRunner({ landmarker: model.landmarker, video: video.current, onFrame, onBroken: () => { stop(); setProblem("model"); } });
    engine.current = { camera: cam.camera, landmarker: model.landmarker, runner, readings: [], distances: [], blinks: startBlinks(), counted: 0, watchedMs: 0, since: null };
    setStep("ready");
    /* the two baselines begin at once; a distance reading begins when a scale is there */
    if (kind === "blinks" || ((kind === "working" || kind === "distance") && known)) engine.current.since = performance.now();
  }

  /** The one-step set-up: the scale of this camera from the typed distance and the last few seconds of pictures. */
  async function readScale() {
    const e = engine.current, at = Number(cm.replace(",", "."));
    if (!e || !(at >= SET_AT_CM[0] && at <= SET_AT_CM[1])) { setSetUp("distance"); return; }
    setSetUp("busy");
    const until = performance.now() + SET_UP_WAIT_MS;
    e.readings = [];
    while (performance.now() < until && here.current && engine.current === e && e.readings.length < SET_PICTURES * 2) await new Promise((r) => setTimeout(r, 200));
    if (!here.current || engine.current !== e) return;
    const got = setUpScale(e.readings, at);
    if (!got.ok) { setSetUp(got.why); return; }
    const value = { scale: got.scale, atCm: at, setAt: Date.now() };
    saveScale(e.camera.key, value);
    setScale(value);
    setSetUp("ok");
  }

  const on = step === "ready";
  const needScale = on && !scale && (kind === "distance" || kind === "working");
  const atCm = Number(cm.replace(",", "."));

  return (
    <div className="stack">
      <video ref={video} className={css.video} muted playsInline aria-label={t.preview} style={{ display: step === "idle" ? "none" : undefined }} />
      {step === "idle" && !slow && <button type="button" className={`btn btn-g ${css.big}`} style={{ alignSelf: "flex-start" }} onClick={() => void start()}>{t.start}</button>}
      {(step === "model" || step === "camera") && <p role="status">{t.step[step]}</p>}
      {problem && <p className="notice" data-b="warn" role="alert">{t.problem[problem]}</p>}
      {slow && <p className="notice" data-b="warn" role="status">{t.slow}</p>}

      {on && (
        <>
          <p className="muted small">{t.preview}</p>
          <p role="status">{live.face ? (live.cm !== null ? <span className={css.live}>{t.live(live.cm)}</span> : t.reading) : t.noFace}</p>

          {kind === "scale" && (
            <>
              <div className={`field ${css.num}`}>
                <label htmlFor="cam-cm">{t.tape}</label>
                <input id="cam-cm" type="number" inputMode="decimal" min={SET_AT_CM[0]} max={SET_AT_CM[1]} step={0.5} value={cm} onChange={(e) => { setCm(e.target.value); setSetUp(null); }} />
              </div>
              <p className="muted small">{t.tapeRange}</p>
              {setUp !== "ok" && <button type="button" className="btn btn-g" style={{ alignSelf: "flex-start" }} disabled={setUp === "busy" || !cm} onClick={() => void readScale()}>{setUp === "busy" ? t.reading : t.read}</button>}
              {setUp && setUp !== "busy" && setUp !== "ok" && <p className="notice" data-b="warn" role="alert">{t.scale[setUp]}</p>}
              {setUp === "ok" && (
                <>
                  <p className="notice" data-b="ok" role="status">{t.scale.ok(atCm, live.cm ?? Math.round(atCm))}</p>
                  <button type="button" className="btn btn-g" style={{ alignSelf: "flex-start" }} onClick={() => { const readCm = live.cm ?? atCm; stop(); onDone({ atCm, readCm }); }}>{c.runner.done}</button>
                </>
              )}
            </>
          )}

          {needScale && <p className="notice" data-b="warn">{t.needScale} <Link href="/test/clips/C05">{t.openScale}</Link></p>}
          {left !== null && <p className="muted" role="status">{kind === "distance" ? t.reading : t.watching(left)}</p>}
          {kind === "distance" && read && (
            <>
              <p><b>{t.distance(read.cm)}</b></p>
              <div className={css.acts}>
                <button type="button" className="btn btn-g" onClick={() => { stop(); onDone({ cm: read.cm, pictures: read.pictures }); }}>{t.useIt}</button>
                <button type="button" className="btn" onClick={() => { setRead(null); if (engine.current) { engine.current.distances = []; engine.current.since = performance.now(); } }}>{t.measureAgain}</button>
              </div>
            </>
          )}
          <button type="button" className="btn btn-gh btn-sm" style={{ alignSelf: "flex-start" }} onClick={stop}>{t.stop}</button>
        </>
      )}
    </div>
  );
}
