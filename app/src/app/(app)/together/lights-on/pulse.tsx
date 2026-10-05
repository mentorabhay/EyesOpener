"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Asks the server for the page again at a gentle interval, and once more at the moment the hour starts or ends.
 * There is no live connection: this is all that keeps the sky up to date. It rests while the tab is hidden.
 */
export function Pulse({ seconds, at }: {
  /** Seconds between two asks. */
  seconds: number;
  /** The next moment the page changes by itself (the hour starts or ends), as milliseconds since 1970. */
  at: number;
}) {
  const router = useRouter();
  useEffect(() => {
    const ask = () => { if (!document.hidden) router.refresh(); };
    const every = setInterval(ask, Math.max(30, seconds) * 1000);
    const wait = at - Date.now();
    /* a little after the moment, so the server is surely past it; never for a wait longer than a timer can hold */
    const once = wait > 0 && wait < 2 ** 31 - 2000 ? setTimeout(ask, wait + 1500) : null;
    const back = () => { if (!document.hidden) router.refresh(); };
    document.addEventListener("visibilitychange", back);
    return () => { clearInterval(every); if (once) clearTimeout(once); document.removeEventListener("visibilitychange", back); };
  }, [router, seconds, at]);
  return null;
}
