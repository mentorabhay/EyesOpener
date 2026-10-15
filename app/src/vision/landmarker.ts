/**
 * The face landmark model, loaded when a camera feature first needs it and not before.
 *
 * Both files it needs are served by this site and loaded from this site only:
 *   /vision/wasm/                the MediaPipe runtime (WebAssembly), copied from the npm package
 *   /vision/face_landmarker.task the model, put there by scripts/vision-files.mjs
 * Nothing is fetched from another site. When the model is not on this server the answer is "no_model", and the
 * feature says in plain words that it is not available here.
 *
 * The model runs on the device's processor. It still needs WebGL to take a picture from the camera, so a browser
 * with WebGL switched off answers "no_graphics".
 */
import { FACE_POINTS, type Point } from "./face";

export const VISION_RUNTIME = "/vision/wasm";
export const VISION_MODEL = "/vision/face_landmarker.task";

export type VisionProblem =
  | "no_model"     // the model file is not on this server
  | "no_runtime"   // the runtime files are not on this server
  | "no_graphics"  // this browser cannot give the model a picture (WebGL is off)
  | "failed";

export interface Landmarker {
  /**
   * The points of the nearest face in the picture the video shows now. Null when there is no face, when the video
   * has no picture yet, or when the model failed on this picture.
   */
  detect(video: HTMLVideoElement, timeMs: number): readonly Point[] | null;
  /** True once the model has failed too often to go on. */
  readonly broken: boolean;
  close(): void;
}

/** How many failures in a row end the run. One bad picture must not; a dead model must. */
const MAX_FAILURES = 5;

const there = async (url: string) => {
  try { return (await fetch(url, { method: "HEAD", cache: "no-store" })).ok; } catch { return false; }
};

/** The runtime writes its own log lines to the console as errors. They are kept here instead, newest last. */
export const runtimeLog: string[] = [];
const note = (line: unknown) => { runtimeLog.push(String(line).slice(0, 300)); if (runtimeLog.length > 40) runtimeLog.shift(); };

/**
 * The usage log of the MediaPipe Tasks package, and why it never leaves this device.
 *
 * As shipped, the package posts "metrics about the performance and utilization of the APIs" to Google about once
 * a minute and when a task closes (its README, "Privacy Notice"; in its code: https://odml.pa.googleapis.com/v1/log).
 * It has no switch for this. No picture and no face point is in that post. But Eyes Opener's rule is stricter: the
 * camera pipeline talks to no other site at all, and a member was told so.
 * So before the runtime starts, the page's `fetch` gets one extra rule: a request to that log is answered here with
 * "refused" and is never sent. The package's logger stops for good at its first refusal. Every other request
 * passes through untouched. `usageLogsRefused()` says how often the rule fired.
 * When the package is updated, check the network log again: docs and the builder's report say how.
 */
export function isUsageLog(url: string): boolean {
  try {
    const u = new URL(url, "https://same.site.invalid");
    const host = u.hostname.toLowerCase();
    return host === "odml.pa.googleapis.com" || host.endsWith(".odml.pa.googleapis.com") || (host.endsWith(".googleapis.com") && u.pathname === "/v1/log");
  } catch { return false; }
}
let refused = 0;
export const usageLogsRefused = () => refused;

function refuseUsageLog() {
  const w = self as unknown as { fetch: typeof fetch; __iopenerNoUsageLog?: true };
  if (w.__iopenerNoUsageLog || typeof w.fetch !== "function") return;
  const real = w.fetch.bind(self);
  w.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (isUsageLog(url)) { refused += 1; return Promise.resolve(new Response(null, { status: 403, statusText: "Not sent: kept on this device" })); }
    return real(input, init);
  };
  w.__iopenerNoUsageLog = true;
}

export async function loadLandmarker(): Promise<{ ok: true; landmarker: Landmarker } | { ok: false; why: VisionProblem }> {
  if (!(await there(VISION_MODEL))) return { ok: false, why: "no_model" };
  if (!(await there(`${VISION_RUNTIME}/vision_wasm_internal.wasm`))) return { ok: false, why: "no_runtime" };
  try {
    const probe = document.createElement("canvas");
    if (!probe.getContext("webgl2") && !probe.getContext("webgl")) return { ok: false, why: "no_graphics" };
  } catch { return { ok: false, why: "no_graphics" }; }

  refuseUsageLog();
  type Task = { detectForVideo(video: HTMLVideoElement, t: number): { faceLandmarks: Point[][] }; close(): void };
  let make: () => Promise<Task>;
  try {
    const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
    const files = await FilesetResolver.forVisionTasks(VISION_RUNTIME);
    make = () => {
      /* The runtime reads `self.Module` once while it starts: this sends its log lines to `runtimeLog`, not the console. */
      (self as unknown as { Module?: unknown }).Module = { print: note, printErr: note };
      return FaceLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: VISION_MODEL, delegate: "CPU" },
        runningMode: "VIDEO",
        /* One face: the person at the screen. Nothing is read from anyone else in the picture. */
        numFaces: 1,
        /* Only points are asked for. Expression scores are never computed: nothing here reads a mood. */
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      }) as Promise<Task>;
    };
  } catch (e) { note(e); return { ok: false, why: "failed" }; }

  let task: Task | null;
  try { task = await make(); } catch (e) { note(e); return { ok: false, why: "failed" }; }

  let lastT = 0, failures = 0, remaking = false, closed = false;
  const landmarker: Landmarker = {
    get broken() { return failures >= MAX_FAILURES; },
    detect(video, timeMs) {
      /* A video with no picture makes the model's graph fail for good, so it is never handed one. */
      if (closed || !task || video.readyState < 2 || !(video.videoWidth > 0) || !(video.videoHeight > 0)) return null;
      /* The model wants times that only go up. */
      lastT = Math.max(lastT + 1, Math.round(timeMs));
      try {
        const found = task.detectForVideo(video, lastT).faceLandmarks[0];
        failures = 0;
        return found && found.length >= FACE_POINTS ? found : null;
      } catch (e) {
        note(e);
        failures += 1;
        /* After an error the graph stays dead: make a new one, and report "no face" until it is ready. */
        const dead = task;
        task = null;
        try { dead.close(); } catch { /* already gone */ }
        if (!remaking && failures < MAX_FAILURES) {
          remaking = true;
          make().then((t) => { if (closed) t.close(); else task = t; }, (err) => { note(err); failures = MAX_FAILURES; }).finally(() => { remaking = false; });
        }
        return null;
      }
    },
    close() {
      closed = true;
      try { task?.close(); } catch { /* already gone */ }
      task = null;
    },
  };
  return { ok: true, landmarker };
}
