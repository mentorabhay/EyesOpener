"use client";
import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { HeroShape } from "@/components/together/hero-art";
import { hero as t } from "@/copy/hero";
import { STARTER_KEYS, starter, type Sprite, type StarterKey } from "@/games/hero";
import type { HeroVia } from "@/lib/hero-rules";
import { TRACE_SIDE, filled, trace, type TraceFail } from "@/lib/hero/trace";
import { allow, keep, type HeroAnswer } from "./actions";
import css from "./hero.module.css";

const WAYS = ["paper", "screen", "starter"] as const;
type Way = (typeof WAYS)[number];
const PAD = 256, BRUSH = 14;

/**
 * Makes a hero on the device. A camera frame, a picked photo or the drawing sheet is read into a small canvas,
 * traced to a grid of squares (src/lib/hero/trace.ts) and thrown away at once. The only thing this component
 * ever sends is that grid, through `keep`. The photo input has no name and sits in no form, so it cannot be posted.
 */
export function Maker({ cameraAllowed, canAllow, name }: { cameraAllowed: boolean; canAllow: boolean; name: string }) {
  const [way, setWay] = useState<Way>("paper");
  const [made, setMade] = useState<{ sprite: Sprite; via: HeroVia; starter?: StarterKey } | null>(null);
  const [solid, setSolid] = useState(false);
  const [fail, setFail] = useState<TraceFail | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [answer, setAnswer] = useState<HeroAnswer | null>(null);
  const [live, setLive] = useState(false);
  const [saving, startSaving] = useTransition();
  const [consent, giveConsent, consenting] = useActionState(allow, null);
  const video = useRef<HTMLVideoElement>(null), stream = useRef<MediaStream | null>(null);
  const pad = useRef<HTMLCanvasElement>(null), pen = useRef<{ x: number; y: number } | null>(null), photo = useRef<HTMLInputElement>(null);

  const fresh = () => { setFail(null); setNote(null); setAnswer(null); };
  const closeCamera = useCallback(() => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    setLive(false);
  }, []);
  /* The camera never stays on after the page is left. */
  useEffect(() => closeCamera, [closeCamera]);

  /** Reads a picture into a small canvas, traces it and wipes the canvas. `box` is the part of the source to read. */
  const read = (source: CanvasImageSource, box: { x: number; y: number; w: number; h: number }, via: HeroVia) => {
    const scale = Math.min(1, TRACE_SIDE / Math.max(box.w, box.h)), w = Math.max(1, Math.round(box.w * scale)), h = Math.max(1, Math.round(box.h * scale));
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const g = cv.getContext("2d", { willReadFrequently: true });
    if (!g) return;
    g.fillStyle = "#fff";
    g.fillRect(0, 0, w, h);
    g.drawImage(source, box.x, box.y, box.w, box.h, 0, 0, w, h);
    const result = trace(g.getImageData(0, 0, w, h));
    cv.width = cv.height = 0;
    fresh();
    setSolid(false);
    if (result.ok) setMade({ sprite: result.sprite, via }); else { setMade(null); setFail(result.why); }
  };

  const openCamera = async () => {
    fresh();
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false });
      stream.current = s;
      setLive(true);
    } catch { setNote(t.make.paper.noCamera); }
  };
  /* The video element appears once the camera is live; the stream is handed to it then. */
  useEffect(() => { if (live && video.current && stream.current) { video.current.srcObject = stream.current; void video.current.play().catch(() => undefined); } }, [live]);

  const takePicture = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    /* The middle square of the frame, a little inside the guide. */
    const side = Math.min(v.videoWidth, v.videoHeight) * 0.9;
    read(v, { x: (v.videoWidth - side) / 2, y: (v.videoHeight - side) / 2, w: side, h: side }, "camera");
    closeCamera();
  };

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    fresh();
    try {
      const bitmap = await createImageBitmap(file);
      read(bitmap, { x: 0, y: 0, w: bitmap.width, h: bitmap.height }, "photo");
      bitmap.close();
    } catch { setMade(null); setNote(t.make.paper.noPhoto); }
    if (photo.current) photo.current.value = "";
  };

  /* The drawing sheet: white paper, a thick dark pen. */
  const wipe = useCallback(() => {
    const g = pad.current?.getContext("2d");
    if (!g) return;
    g.fillStyle = "#fff";
    g.fillRect(0, 0, PAD, PAD);
  }, []);
  useEffect(() => { if (way === "screen") wipe(); }, [way, wipe]);
  const spot = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * PAD) / r.width, y: ((e.clientY - r.top) * PAD) / r.height };
  };
  const draw = (to: { x: number; y: number }) => {
    const g = pad.current?.getContext("2d"), from = pen.current ?? to;
    if (!g) return;
    g.strokeStyle = "#111"; g.lineWidth = BRUSH; g.lineCap = g.lineJoin = "round";
    g.beginPath(); g.moveTo(from.x, from.y); g.lineTo(to.x + 0.01, to.y); g.stroke();
    pen.current = to;
  };
  const penDown = (e: React.PointerEvent<HTMLCanvasElement>) => { e.currentTarget.setPointerCapture(e.pointerId); pen.current = null; draw(spot(e)); };
  const penMove = (e: React.PointerEvent<HTMLCanvasElement>) => { if (pen.current) draw(spot(e)); };
  const penUp = () => {
    if (!pen.current || !pad.current) return;
    pen.current = null;
    read(pad.current, { x: 0, y: 0, w: PAD, h: PAD }, "screen");
  };

  const choose = (next: Way) => { closeCamera(); fresh(); setMade(null); setSolid(false); setWay(next); };
  const full = made && made.via !== "starter" ? filled(made.sprite) : null;
  const shown = made ? (solid && full ? full : made.sprite) : null;
  const save = () => {
    if (!shown || !made) return;
    startSaving(async () => {
      const a = await keep(shown, made.via);
      setAnswer(a);
      if (a.ok) { setMade(null); setSolid(false); if (way === "screen") wipe(); }
    });
  };

  return (
    <div className="stack">
      <div className="pills" role="group" aria-label={t.make.waysLabel}>
        {WAYS.map((w) => <button key={w} type="button" className="pill" aria-pressed={way === w} onClick={() => choose(w)}>{t.make.ways[w]}</button>)}
      </div>

      <div className={css.maker}>
        <div className="stack">
          {way === "paper" && (
            <>
              <ol className={css.steps}>{t.make.paper.steps.map((step) => <li key={step}>{step}</li>)}</ol>
              {live && (
                <>
                  <div className={css.cam}><video ref={video} playsInline muted aria-label={t.make.paper.cameraView} /><i /></div>
                  <p className="small muted">{t.make.paper.guide}</p>
                </>
              )}
              <div className="row">
                {live
                  ? <><button type="button" className="btn btn-g" onClick={takePicture}>{t.make.paper.take}</button><button type="button" className="btn" onClick={closeCamera}>{t.make.paper.close}</button></>
                  : <>
                      {cameraAllowed && <button type="button" className="btn btn-d" onClick={() => void openCamera()}>{t.make.paper.camera}</button>}
                      <button type="button" className="btn" onClick={() => photo.current?.click()}>{t.make.paper.photo}</button>
                    </>}
                <input ref={photo} type="file" accept="image/*" className={css.hidden} tabIndex={-1} aria-label={t.make.paper.photoLabel} onChange={(e) => void pickPhoto(e.target.files?.[0])} />
              </div>
              {!cameraAllowed && (
                <div className="notice stack">
                  <b>{t.camera.title}</b>
                  <p>{t.camera.ask}</p>
                  {canAllow ? (
                    <form action={giveConsent} className="stack">
                      <label className={css.agree}><input type="checkbox" name="agree" /> <span>{t.camera.agree(name)}</span></label>
                      <div className="row"><button className="btn btn-sm" disabled={consenting}>{t.camera.allow}</button></div>
                      {consent && <p role="status">{consent.message}</p>}
                    </form>
                  ) : <p className="muted">{t.camera.guardianOnly}</p>}
                </div>
              )}
            </>
          )}

          {way === "screen" && (
            <>
              <p className="small muted">{t.make.screen.hint}</p>
              <canvas ref={pad} width={PAD} height={PAD} className={css.pad} role="img" aria-label={t.make.screen.pad}
                onPointerDown={penDown} onPointerMove={penMove} onPointerUp={penUp} onPointerCancel={penUp} />
              <div className="row"><button type="button" className="btn" onClick={() => { wipe(); fresh(); setMade(null); }}>{t.make.screen.clear}</button></div>
              <p className="small muted">{t.make.screen.keys}</p>
            </>
          )}

          {way === "starter" && (
            <>
              <p className="small muted">{t.make.starter.hint}</p>
              <div className={css.starters}>
                {STARTER_KEYS.map((key) => (
                  <button key={key} type="button" aria-pressed={made?.starter === key} aria-label={t.make.starter.pick(t.make.starter.names[key])}
                    onClick={() => { fresh(); setSolid(false); setMade({ sprite: starter(key), via: "starter", starter: key }); }}>
                    <span className={`scene ${css.thumb}`}><HeroShape sprite={starter(key)} label="" /></span>
                    <span>{t.make.starter.names[key]}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="stack">
          <b>{t.preview.title}</b>
          {shown
            ? <div className={`scene ${css.stage}`} data-preview=""><HeroShape sprite={shown} label={t.preview.label} /></div>
            : <div className={css.waiting}>{t.preview.nothing}</div>}
          <div role="status" className="stack">
            {fail && <p className="notice" data-b="warn"><b>{t.make.notSeen}</b> {t.make.hints[fail]}</p>}
            {note && <p className="notice" data-b="warn">{note}</p>}
            {answer && <p className="notice" data-b={answer.ok ? "ok" : "warn"}>{answer.message}</p>}
          </div>
          {shown && (
            <>
              <p className="small muted">{t.preview.note}</p>
              {full && (
                <div className="pills" role="group" aria-label={t.preview.style.label}>
                  <button type="button" className="pill" aria-pressed={!solid} onClick={() => setSolid(false)}>{t.preview.style.drawn}</button>
                  <button type="button" className="pill" aria-pressed={solid} onClick={() => setSolid(true)}>{t.preview.style.filled}</button>
                </div>
              )}
              <div className="row"><button type="button" className="btn btn-g" disabled={saving} onClick={save}>{saving ? t.preview.keeping : t.preview.keep}</button></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
