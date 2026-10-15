/**
 * A clock in a worker. A browser slows the timers of a page that is not in view to one a second or less; a worker's
 * timer keeps its pace. The page tells it how often to tick and does the work itself on each tick.
 */
const scope = self as unknown as { onmessage: ((e: MessageEvent<number>) => void) | null; postMessage(message: number): void };
let timer: ReturnType<typeof setInterval> | null = null;
scope.onmessage = (e) => {
  if (timer !== null) clearInterval(timer);
  timer = e.data > 0 ? setInterval(() => scope.postMessage(0), e.data) : null;
};
