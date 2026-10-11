// Eyes Opener: The workday monitor on the page: the camera, the face model, the clock and the sending.
"use client";
/**
 * The workday monitor on the page: the camera, the face model, the clock and the sending.
 *
 * What stays on this computer: every camera picture and every face point. A picture goes from the video element
 * into the model (src/vision) and is gone. What is sent: one measured minute of numbers at a time, and the time of
 * a break (./actions.ts). The rules are pure and tested: src/lib/monitor-core.ts and src/lib/monitor-rules.ts.
 *
 * Running while the member works. A browser slows a page that is out of view. Three things are done about it:
 *  1. the pace is kept by a worker's clock, which browsers do not slow (src/vision/ticker.ts);
 *  2. where the browser has one, a small always-on-top window shows the reminders, and while it is open the browser
 *     keeps this page at full pace;
 *  3. the page says "Not watching" as soon as pictures stop arriving, and a minute that was not watched is never
 *     sent. Tried in Chromium 141 on a desktop: behind another tab the worker's clock kept its pace and pictures
 *     kept arriving for the eight minutes tried. Firefox and Safari were not tried.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { monitor as t } from "@/copy/monitor";
import { coreClock, coreFrame, coreLive, corePutOff, coreStartBreak, coreStopBreak, startCore, type Core, type CoreOut, type CoreSettings, type Live } from "@/lib/monitor-core";
import { RULE, type BreakEvent, type MinuteSample, type PromptKind } from "@/lib/monitor-rules";
import {
  closeCamera, LEVEL_TILT_DEG, loadLandmarker, loadScale, openCamera, saveScale, SET_AT_CM, setUpScale, showIn, startRunner, VISION_MODEL, VISION_RUNTIME,
  type CameraProblem, type CameraScale, type Landmarker, type OpenCamera, type Runner, type SetUp, type VisionProblem,
} from "@/vision";
import { startTicker, type Ticker } from "@/vision/ticker";
import { monitorBreak, monitorMinute, monitorStart, monitorStop } from "./actions";
import css from "./monitor.module.css";
import { savePrefs, useHasNotices, useHasPip, useInBrowser, usePhone, usePrefs, type Prefs } from "./prefs";

type Problem = VisionProblem | CameraProblem | "noPicture";
type StopReason = keyof typeof t.stopped;
type Phase = { at: "idle" } | { at: "starting"; step: keyof typeof t.step } | { at: "running" };

/** A break waits this long before it is sent, so a break the member also logs in a care companion gets there first and is counted once. */
const BREAK_SEND_DELAY_MS = 2 * 60_000;
/** The screen is drawn again this often while the monitor runs. */
const SCREEN_EVERY_MS = 500;
/** The one-step distance set-up reads for at least this long, and on a slow computer waits up to the longer time for enough pictures. */
const SET_UP_MS = 2000, SET_UP_MAX_MS = 7000;
const TOOK_SHOWS_MS = 8000;
const REFRESH_EVERY_MS = 5 * 60_000;

interface Engine {
  runId: string;
  /** Server time minus this computer's time, so minutes are stamped with the true time. */
  offset: number;
  camera: OpenCamera; landmarker: Landmarker; runner: Runner; clock: Ticker;
  core: Core;
  unsent: MinuteSample[];
  breaks: { taken: BreakEvent; sendAt: number }[];
  /** The last few seconds of iris readings from a head that was square to the camera, for the distance set-up. */
  readings: { at: number; iris: number; offCentre: number }[];
  sending: boolean;
  stopped: boolean;
  /** When the last break was taken, for a few seconds of "Break taken". */
  tookAt: number | null;
  tookEarned: boolean;
  /** When the numbers lower on the page were last asked for again. */
  refreshedAt: number;
}

interface PipApi { requestWindow(o: { width: number; height: number }): Promise<Window> }

/** Two soft notes. Only ever played when the member has turned sound on. */
function chime(audio: AudioContext) {
  const t0 = audio.currentTime;
  for (const [hz, at] of [[523.25, 0], [659.25, 0.2]] as const) {
    const osc = audio.createOscillator(), gain = audio.createGain();
    osc.type = "sine"; osc.frequency.value = hz;
    gain.gain.setValueAtTime(0.0001, t0 + at);
    gain.gain.linearRampToValueAtTime(0.06, t0 + at + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.6);
    osc.connect(gain).connect(audio.destination);
    osc.start(t0 + at); osc.stop(t0 + at + 0.65);
  }
}

export function Monitor({ onboardingCm, blinkHref }: { onboardingCm: number | null; blinkHref: string }) {
  const router = useRouter();
  const prefs = usePrefs(), phone = usePhone(), hasPip = useHasPip(), hasNotices = useHasNotices(), inBrowser = useInBrowser();
  const [phase, setPhase] = useState<Phase>({ at: "idle" });
  const [available, setAvailable] = useState<"checking" | "yes" | VisionProblem>("checking");
  const [problem, setProblem] = useState<Problem | null>(null);
  const [stopped, setStopped] = useState<StopReason | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [live, setLive] = useState<Live | null>(null);
  const [scale, setScale] = useState<CameraScale | null>(null);
  const [cm, setCm] = useState<string>("");
  const [setUp, setSetUp] = useState<{ busy: boolean; result: "ok" | Extract<SetUp, { ok: false }>["why"] | null }>({ busy: false, result: null });
  const [showSetUp, setShowSetUp] = useState(false);
  const [justTook, setJustTook] = useState<"ring" | "plain" | null>(null);
  const [pip, setPip] = useState<Window | null>(null);
  const [noticeState, setNoticeState] = useState<"default" | "granted" | "denied">("default");

  const video = useRef<HTMLVideoElement>(null);
  const engine = useRef<Engine | null>(null);
  const audio = useRef<AudioContext | null>(null);
  /** False once the member has left the page: a start that is still under way then switches everything off again. */
  const here = useRef(true);
  const prefsRef = useRef(prefs), scaleRef = useRef(scale), pipRef = useRef(pip);
  useEffect(() => { prefsRef.current = prefs; scaleRef.current = scale; pipRef.current = pip; }, [prefs, scale, pip]);

  /* Is the face finder on this server at all? Asked once, before anything is offered. */
  useEffect(() => {
    let live = true;
    const there = (url: string) => fetch(url, { method: "HEAD", cache: "no-store" }).then((r) => r.ok, () => false);
    Promise.all([there(VISION_MODEL), there(`${VISION_RUNTIME}/vision_wasm_internal.wasm`)]).then(([model, runtime]) => {
      if (live) setAvailable(!model ? "no_model" : !runtime ? "no_runtime" : "yes");
    });
    return () => { live = false; };
  }, []);

  const settings = (): CoreSettings => ({
    scale: scaleRef.current?.scale ?? null, usualCm: scaleRef.current?.atCm ?? null,
    sideScreen: prefsRef.current.sideScreen, prefs: prefsRef.current.prompts,
  });

  /** Everything on this computer is switched off: the camera light goes out. */
  const tearDown = useCallback(() => {
    const e = engine.current;
    if (!e) return;
    e.stopped = true;
    e.runner.stop(); e.clock.stop(); e.landmarker.close();
    closeCamera(e.camera);
    if (video.current) video.current.srcObject = null;
    engine.current = null;
    pipRef.current?.close();
    setLive(null); setJustTook(null); setShowSetUp(false);
    setPhase({ at: "idle" });
  }, []);

  /** The server said no, or the camera or the model gave up: stop here and say why. */
  const halt = useCallback((why: StopReason) => {
    const runId = engine.current?.runId;
    tearDown();
    setStopped(why);
    if (runId && (why === "camera" || why === "model")) void monitorStop(runId).catch(() => undefined);
    router.refresh();
  }, [router, tearDown]);

  const announce = useCallback((kind: PromptKind) => {
    const p = prefsRef.current;
    if (p.sound && audio.current) { try { chime(audio.current); } catch { /* no sound is not a failure */ } }
    if (p.notices && document.hidden && !pipRef.current && "Notification" in window && Notification.permission === "granted") {
      try {
        const n = new Notification(t.prompt[kind].title, { body: t.work.pipTitle, silent: true, tag: "iopener-monitor" });
        n.onclick = () => { window.focus(); n.close(); };
      } catch { /* this browser wants notices from a service worker: the page and the small window still show it */ }
    }
  }, []);

  /** Sends what is waiting: measured minutes at once, breaks once their delay has passed (or all of them when stopping). */
  const flush = useCallback(async (now: number, everything = false) => {
    const e = engine.current;
    if (!e || e.sending) return;
    e.sending = true;
    try {
      while (e.unsent.length) {
        const s = e.unsent[0];
        if (now - s.at > 14 * 60_000) { e.unsent.shift(); continue; }
        const { at, faceSeconds, distanceCm, blinksPerMin, halfBlinksPerMin, posture, minutesSinceBreak, prompt } = s;
        let out;
        try { out = await monitorMinute(e.runId, { at, faceSeconds, distanceCm, blinksPerMin, halfBlinksPerMin, posture, minutesSinceBreak, prompt }); }
        catch { setSaveFailed(true); break; }
        setSaveFailed(false);
        e.unsent.shift();
        if (!out.ok && (out.why === "ended" || out.why === "consent" || out.why === "not_allowed")) { halt(out.why); return; }
      }
      while (e.breaks.length && (everything || e.breaks[0].sendAt <= now)) {
        const { taken } = e.breaks[0];
        let out;
        try { out = await monitorBreak(e.runId, { at: Math.round(taken.at), seen: taken.seen, due: taken.due, earned: taken.earned }); }
        catch { break; }
        e.breaks.shift();
        if (out.ok && out.counted) router.refresh();
        if (!out.ok && (out.why === "ended" || out.why === "consent" || out.why === "not_allowed")) { halt(out.why); return; }
      }
    } finally { if (engine.current === e) e.sending = false; }
  }, [halt, router]);

  const take = useCallback((e: Engine, out: CoreOut, now: number) => {
    if (out.sample) e.unsent.push(out.sample);
    if (out.taken) { e.breaks.push({ taken: out.taken, sendAt: now + BREAK_SEND_DELAY_MS }); e.tookAt = now; e.tookEarned = out.taken.earned; }
    if (out.appeared) announce(out.appeared);
  }, [announce]);

  async function start() {
    if (engine.current || phase.at !== "idle") return;
    setProblem(null); setStopped(null); setSaveFailed(false);
    if (prefs.sound) audio.current ??= new AudioContext();

    setPhase({ at: "starting", step: "model" });
    const model = await loadLandmarker();
    if (!model.ok) { setProblem(model.why); setPhase({ at: "idle" }); return; }
    if (!here.current) { model.landmarker.close(); return; }

    setPhase({ at: "starting", step: "server" });
    const asked = Date.now();
    const run = await monitorStart().catch(() => null);
    if (!run || !run.ok) { model.landmarker.close(); setStopped(run ? run.why : "not_allowed"); setPhase({ at: "idle" }); router.refresh(); return; }
    /* the server's clock, taken at the middle of the request */
    const offset = run.now - (asked + Date.now()) / 2;
    const giveUp = (why: Problem) => {
      model.landmarker.close();
      void monitorStop(run.runId).catch(() => undefined);
      setProblem(why); setPhase({ at: "idle" });
    };

    setPhase({ at: "starting", step: "camera" });
    const cam = await openCamera();
    if (!cam.ok) { giveUp(cam.why); return; }
    const picture = !!video.current && (await showIn(video.current, cam.camera.stream));
    if (!here.current || !video.current || !picture) { closeCamera(cam.camera); giveUp("noPicture"); return; }

    const known = loadScale(cam.camera.key);
    setScale(known); scaleRef.current = known;
    setCm(String(known?.atCm ?? onboardingCm ?? ""));
    setShowSetUp(!known);

    const now = () => Date.now() + offset;
    const e: Engine = {
      runId: run.runId, offset, camera: cam.camera, landmarker: model.landmarker, core: startCore(now()),
      unsent: [], breaks: [], readings: [], sending: false, stopped: false, tookAt: null, tookEarned: false, refreshedAt: now(),
      runner: null as unknown as Runner, clock: null as unknown as Ticker,
    };
    e.runner = startRunner({
      landmarker: model.landmarker, video: video.current,
      onFrame: (frame) => {
        if (e.stopped) return;
        const n = now(), f = frame.facts;
        if (f && f.square && f.iris !== null) e.readings.push({ at: n, iris: f.iris, offCentre: f.offCentre });
        while (e.readings.length && n - e.readings[0].at > SET_UP_MAX_MS + 1000) e.readings.shift();
        const step = coreFrame(e.core, n, frame.t, f, settings());
        e.core = step.core;
        take(e, step.out, n);
      },
      onBroken: () => halt("model"),
    });
    e.clock = startTicker(SCREEN_EVERY_MS, () => {
      if (e.stopped) return;
      const n = now();
      const step = coreClock(e.core, n, settings());
      e.core = step.core;
      take(e, step.out, n);
      setLive(coreLive(e.core, n));
      setJustTook(e.tookAt !== null && n - e.tookAt < TOOK_SHOWS_MS ? (e.tookEarned ? "ring" : "plain") : null);
      /* the charts lower on the page are the server's: ask for them again now and then */
      if (n - e.refreshedAt > REFRESH_EVERY_MS) { e.refreshedAt = n; router.refresh(); }
      void flush(n);
    });
    cam.camera.track.addEventListener("ended", () => { if (!e.stopped) halt("camera"); });
    engine.current = e;
    setPhase({ at: "running" });
  }

  async function stop() {
    const e = engine.current;
    if (!e) return;
    await flush(Date.now() + e.offset, true).catch(() => undefined);
    const { runId } = e;
    tearDown();
    await monitorStop(runId).catch(() => undefined);
    router.refresh();
  }

  /* Leaving the page switches the camera off. */
  useEffect(() => { here.current = true; return () => { here.current = false; }; }, []);
  useEffect(() => () => {
    const e = engine.current;
    if (!e) return;
    const { runId } = e;
    e.stopped = true; e.runner.stop(); e.clock.stop(); e.landmarker.close(); closeCamera(e.camera);
    engine.current = null;
    pipRef.current?.close();
    /* a break taken in the last two minutes has not been sent yet: send it, then end the run */
    for (const { taken } of e.breaks) void monitorBreak(runId, { at: Math.round(taken.at), seen: taken.seen, due: taken.due, earned: taken.earned }).catch(() => undefined);
    void monitorStop(runId).catch(() => undefined);
  }, []);

  /* ───────────── the member's presses ───────────── */

  const act = (change: (core: Core, now: number) => Core) => {
    const e = engine.current;
    if (!e) return;
    const n = Date.now() + e.offset;
    e.core = change(e.core, n);
    setLive(coreLive(e.core, n));
  };
  const later = () => act(corePutOff);
  const startBreak = () => act(coreStartBreak);
  const stopBreak = () => act((core) => coreStopBreak(core));

  const change = (next: Partial<Prefs>) => savePrefs({ ...prefs, ...next });

  async function setDistance() {
    const e = engine.current;
    const known = Number(cm);
    if (!e || setUp.busy) return;
    if (!(known >= SET_AT_CM[0] && known <= SET_AT_CM[1])) { setSetUp({ busy: false, result: "distance" }); return; }
    setSetUp({ busy: true, result: null });
    const began = Date.now() + e.offset;
    let out: SetUp = { ok: false, why: "too_few" };
    for (let waited = 250; waited <= SET_UP_MAX_MS; waited += 250) {
      await new Promise((r) => setTimeout(r, 250));
      if (engine.current !== e) return;
      if (waited < SET_UP_MS) continue;
      out = setUpScale(e.readings.filter((r) => r.at >= began), known);
      if (out.ok || out.why !== "too_few") break;
    }
    if (out.ok) {
      const next = { scale: out.scale, atCm: known, setAt: Date.now() };
      saveScale(e.camera.key, next);
      setScale(next); scaleRef.current = next;
      setShowSetUp(false);
    }
    setSetUp({ busy: false, result: out.ok ? "ok" : out.why });
  }

  async function togglePip() {
    if (pip) { pip.close(); return; }
    const api = (window as unknown as { documentPictureInPicture?: PipApi }).documentPictureInPicture;
    if (!api) return;
    try {
      const w = await api.requestWindow({ width: 340, height: 230 });
      /* the small window is a page of its own: give it this page's styles and theme */
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          const style = w.document.createElement("style");
          style.textContent = Array.from(sheet.cssRules).map((r) => r.cssText).join("\n");
          w.document.head.appendChild(style);
        } catch { /* a sheet from another site cannot be read: skip it */ }
      }
      const root = document.documentElement;
      if (root.dataset.theme) w.document.documentElement.dataset.theme = root.dataset.theme;
      w.document.documentElement.lang = root.lang;
      w.document.documentElement.style.cssText = root.style.cssText;
      w.document.body.style.cssText = document.body.style.cssText;
      w.document.title = t.work.pipTitle;
      w.addEventListener("pagehide", () => setPip(null));
      setPip(w);
    } catch { /* the member closed the request, or the browser refused: nothing changes */ }
  }

  async function toggleNotices(on: boolean) {
    if (!on) { change({ notices: false }); return; }
    if (!("Notification" in window)) return;
    const answer = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    setNoticeState(answer);
    change({ notices: answer === "granted" });
  }
  function toggleSound(on: boolean) {
    change({ sound: on });
    if (on) { audio.current ??= new AudioContext(); try { chime(audio.current); } catch { /* quiet */ } }
  }

  /* ───────────── what is drawn ───────────── */

  const running = phase.at === "running";
  const watchLine = !live ? "" : !live.watching ? t.watch.no : !live.face ? t.watch.nobody : !live.facing ? t.watch.turned : t.watch.yes;

  const promptBox = (small: boolean) => {
    if (!running || !live) return null;
    if (live.timedLeftSec !== null) {
      return (
        <div className={css.prompt}>
          <b>{t.prompt.break.title}</b>
          <p className="tnum">{t.prompt.break.timed(live.timedLeftSec)}</p>
          <div className="row"><button type="button" className="btn btn-sm" onClick={stopBreak}>{t.prompt.break.cancel}</button></div>
        </div>
      );
    }
    if (live.prompt === "break") {
      return (
        <div className={css.prompt}>
          <b>{t.prompt.break.title}</b>
          <p className="tnum">{live.awaySec !== null ? t.prompt.break.seen(live.awaySec) : small ? null : t.prompt.break.body(live.sinceBreakSec)}</p>
          <div className="row">
            <button type="button" className="btn btn-sm btn-d" onClick={startBreak}>{t.prompt.break.start}</button>
            <button type="button" className="btn btn-sm" onClick={later}>{t.prompt.break.later}</button>
          </div>
        </div>
      );
    }
    if (live.prompt) {
      const kind = live.prompt;
      return (
        <div className={css.prompt}>
          <b>{t.prompt[kind].title}</b>
          {!small && <p>{kind === "close" ? t.prompt.close.body(live.distanceCm) : kind === "blink" ? t.prompt.blink.body : t.prompt.tilt.body}</p>}
          <div className="row">
            {kind === "blink" && !small && <Link className="btn btn-sm" href={blinkHref} target="_blank" rel="noreferrer">{t.prompt.blink.link}</Link>}
            <button type="button" className="btn btn-sm" onClick={later}>{t.prompt.notNow}</button>
          </div>
        </div>
      );
    }
    if (justTook) return <p className="notice" data-b="ok">{justTook === "ring" ? t.prompt.takenEarned : t.prompt.taken}</p>;
    if (live.awaySec !== null && live.awaySec >= 3 && live.awaySec < RULE.breakSeconds) return <p className={`${css.quiet} tnum`}>{t.live.away(live.awaySec)}</p>;
    return null;
  };

  const sinceLine = !live ? "" : live.breakDue ? t.live.dueNow : t.live.dueIn(live.sinceBreakSec);

  return (
    <div className="stack">
      {/* the camera sign: plain words and a steady mark, never a blinking one */}
      <div className="row" role="status">
        <span className={css.sign} data-on={running ? "true" : "false"}><i aria-hidden="true" />{running ? t.panel.cameraOn : t.panel.cameraOff}</span>
        {running && <span className={`small ${live && !live.watching ? css.warn : "muted"}`}>{watchLine}</span>}
        <span className="sp" />
        {running && <button type="button" className="btn btn-sm" onClick={stop}>{t.panel.stop}</button>}
      </div>

      {available !== "yes" && available !== "checking" && <p className="notice" data-b="warn">{t.problem[available]}</p>}
      {problem && <p className="notice" data-b="warn" role="alert">{t.problem[problem]}</p>}
      {stopped && <p className="notice" data-b="warn" role="alert">{t.stopped[stopped]}</p>}
      {saveFailed && running && <p className="notice" data-b="warn">{t.stopped.saveFailed}</p>}

      {phase.at !== "running" && (
        phone ? (
          <div className="empty"><b>{t.phone.title}</b><span>{t.phone.body}</span></div>
        ) : (
          <>
            <p className="muted">{phase.at === "starting" ? t.step[phase.step] : available === "checking" ? t.panel.checking : t.panel.idle}</p>
            <div className="row">
              <button type="button" className="btn btn-g" onClick={start} disabled={!inBrowser || phase.at === "starting" || available !== "yes"}>
                {phase.at === "starting" ? t.panel.starting : t.panel.start}
              </button>
            </div>
          </>
        )
      )}

      <div className={css.body} data-on={running ? "true" : "false"}>
        <div className={css.side}>
          <div className={css.preview} data-shown={running && prefs.preview ? "true" : "false"}>
            <video ref={video} className={css.video} muted playsInline aria-label={t.panel.previewAlt} aria-hidden={running && prefs.preview ? undefined : true} />
          </div>
          {running && (
            <>
              <button type="button" className="btn btn-sm" aria-pressed={!prefs.preview} onClick={() => change({ preview: !prefs.preview })}>{prefs.preview ? t.panel.hide : t.panel.show}</button>
              <p className="small muted">{prefs.preview ? t.panel.previewNote : t.panel.hidden}</p>
            </>
          )}
        </div>

        {running && live && (
          <div className={css.main}>
            <dl className={css.nums}>
              <div>
                <dt>{t.live.since}</dt>
                <dd className="tnum">{t.live.sinceValue(live.sinceBreakSec)}</dd>
                <small>{sinceLine}</small>
              </div>
              <div>
                <dt>{t.live.distance}</dt>
                <dd className="tnum">{live.distanceCm !== null ? t.live.cm(live.distanceCm) : <span className="void" role="img" aria-label={scale ? t.live.distanceNone : t.live.distanceNotSet} />}</dd>
                <small>{!scale ? t.live.distanceNotSet : live.distanceCm === null ? t.live.distanceNone : t.live.guide}</small>
              </div>
              <div>
                <dt>{t.live.blinks}</dt>
                <dd className="tnum">{live.blinksLastMinute !== null ? Math.round(live.blinksLastMinute) : <span className="void" role="img" aria-label={t.live.blinksWait} />}</dd>
                <small>{live.blinksBlind ? t.live.blinksBlind : live.blinksLastMinute !== null ? `${t.live.blinksLast}; ${t.live.blinksNow(live.blinksThisMinute)}` : t.live.blinksNow(live.blinksThisMinute)}</small>
              </div>
              <div>
                <dt>{t.live.head}</dt>
                <dd>{live.tilt === null ? <span className="void" role="img" aria-label={t.live.noHead} /> : Math.abs(live.tilt) <= LEVEL_TILT_DEG ? t.live.level : t.live.tilted(live.tilt)}</dd>
                <small>{live.tilt === null ? t.live.noHead : ""}</small>
              </div>
            </dl>

            <div role="status" aria-live="polite" aria-label={t.prompt.region} className={css.promptSlot}>{promptBox(false)}</div>

            {(showSetUp || !scale) ? (
              <div className={css.setUp}>
                <b>{t.setUp.title}</b>
                <p className="small">{t.setUp.body}</p>
                {onboardingCm !== null && <p className="small muted">{t.setUp.from(onboardingCm)}</p>}
                <div className="row">
                  <label className="field">
                    <span>{t.setUp.label}</span>
                    <input type="number" inputMode="numeric" min={SET_AT_CM[0]} max={SET_AT_CM[1]} step={1} value={cm} onChange={(ev) => setCm(ev.target.value)} className={css.cm} />
                  </label>
                  <button type="button" className="btn" onClick={setDistance} disabled={setUp.busy}>{setUp.busy ? t.setUp.working : t.setUp.go}</button>
                </div>
                <p role="status" className="small">{setUp.result && setUp.result !== "ok" ? t.setUp.result[setUp.result] : ""}</p>
              </div>
            ) : (
              <p className="small muted">
                <span role="status">{setUp.result === "ok" ? `${t.setUp.result.ok} ` : ""}</span>
                {t.setUp.setAt(scale.atCm)}{" "}
                <button type="button" className={css.linkish} onClick={() => { setShowSetUp(true); setSetUp({ busy: false, result: null }); }}>{t.setUp.again}</button>
              </p>
            )}
          </div>
        )}
      </div>

      {/* running while the member works: said plainly, in view, not folded away */}
      {!phone && (
        <div className={css.work}>
          <h3>{t.work.whenTitle}</h3>
          <ul className={css.plain}>{t.work.when.map((line) => <li key={line}>{line}</li>)}</ul>
          {hasPip ? (
            <div className="row">
              <p className={css.grow}>{t.work.pipBody}</p>
              <button type="button" className="btn btn-sm" onClick={togglePip} disabled={!running} aria-pressed={!!pip}>{pip ? t.work.pipClose : t.work.pipOpen}</button>
            </div>
          ) : inBrowser ? <p>{t.work.noPip}</p> : null}
          <p className="small muted">{t.work.tested}</p>
        </div>
      )}
      {!phone && (
        <details className={css.settings}>
          <summary>{t.work.settings}</summary>
          <div className="stack">
            <label className={css.check}>
              <input type="checkbox" checked={prefs.notices && hasNotices} disabled={!hasNotices} onChange={(ev) => toggleNotices(ev.target.checked)} />
              <span>{t.work.notices}{!hasNotices && inBrowser ? ` (${t.work.noticesNone})` : noticeState === "denied" ? ` (${t.work.noticesBlocked})` : ""}</span>
            </label>
            <label className={css.check}><input type="checkbox" checked={prefs.sound} onChange={(ev) => toggleSound(ev.target.checked)} /><span>{t.work.sound}</span></label>
            <label className={css.check}><input type="checkbox" checked={prefs.sideScreen} onChange={(ev) => change({ sideScreen: ev.target.checked })} /><span>{t.work.sideScreen}</span></label>
            <fieldset className={css.kinds}>
              <legend>{t.work.which}</legend>
              {(Object.keys(t.work.kinds) as PromptKind[]).map((k) => (
                <label key={k} className={css.check}>
                  <input type="checkbox" checked={prefs.prompts[k]} onChange={(ev) => change({ prompts: { ...prefs.prompts, [k]: ev.target.checked } })} /><span>{t.work.kinds[k]}</span>
                </label>
              ))}
            </fieldset>
            <p className="small muted">{t.work.limit}</p>
          </div>
        </details>
      )}

      {pip && createPortal(
        <div className={css.pip}>
          <div className="row">
            <span className={css.sign} data-on={running ? "true" : "false"}><i aria-hidden="true" />{running ? t.panel.cameraOn : t.panel.cameraOff}</span>
            <span className="sp" />
            {running && live && <b className="tnum">{t.live.sinceValue(live.sinceBreakSec)}</b>}
          </div>
          {running && live ? (
            <>
              <p className={`small ${live.watching ? "muted" : css.warn}`}>{watchLine}{live.distanceCm !== null ? ` ${t.live.cm(live.distanceCm)}.` : ""}</p>
              <div role="status" aria-live="polite" aria-label={t.prompt.region}>{promptBox(true) ?? <p className="small muted tnum">{sinceLine}</p>}</div>
            </>
          ) : <p className="small muted">{t.work.pipIdle}</p>}
        </div>,
        pip.document.body,
      )}
    </div>
  );
}
