/**
 * Calls a function at a steady pace, in view or not. It uses a worker's clock (tick.worker.ts) and falls back to an
 * ordinary timer where a worker cannot be started; the ordinary timer slows down when the page is hidden.
 */
export interface Ticker {
  /** Change the pace. */
  every(ms: number): void;
  stop(): void;
  /** False when the fallback timer is in use. */
  readonly steady: boolean;
}

export function startTicker(everyMs: number, onTick: () => void): Ticker {
  let worker: Worker | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  const plain = (ms: number) => { if (timer !== null) clearInterval(timer); timer = setInterval(onTick, ms); };
  try {
    worker = new Worker(new URL("./tick.worker.ts", import.meta.url));
    worker.onmessage = onTick;
    worker.onerror = () => { worker?.terminate(); worker = null; plain(everyMs); };
    worker.postMessage(everyMs);
  } catch {
    worker = null;
    plain(everyMs);
  }
  return {
    get steady() { return worker !== null; },
    every(ms) { everyMs = ms; if (worker) worker.postMessage(ms); else plain(ms); },
    stop() {
      worker?.postMessage(0);
      worker?.terminate();
      worker = null;
      if (timer !== null) clearInterval(timer);
      timer = null;
    },
  };
}
