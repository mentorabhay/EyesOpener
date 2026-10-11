// Eyes Opener: One training session in the browser. The server decides whether it may start and for how long;.
"use client";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { finishTrainSession, startTrainSession } from "@/app/(app)/train/actions";
import type { Detail, EndReason, StartResult, TrainKind } from "@/lib/sessions";

export type Refusal = Extract<StartResult, { ok: false }>["reason"] | "failed";
export interface Ended { sessionId: string; endReason: EndReason; saved: { seconds: number; score: number | null; detail: Detail | null; counted: boolean } | null }
export type TrainSession = ReturnType<typeof useTrainSession>;

/**
 * One training session in the browser. The server decides whether it may start and for how long;
 * this counts the seconds actually spent, ends the session when the allowed time is used, and saves it.
 * `scoreRef` and `detailRef` (what the session measured) are read when the session ends.
 */
export function useTrainSession(kind: TrainKind, itemSlug: string, scoreRef?: RefObject<number>, detailRef?: RefObject<Detail | null>) {
  const [phase, setPhase] = useState<"idle" | "starting" | "active" | "saving" | "ended">("idle");
  const [ticking, setTicking] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [allowed, setAllowed] = useState(0);
  const [refused, setRefused] = useState<Refusal | null>(null);
  const [ended, setEnded] = useState<Ended | null>(null);
  const live = useRef({ id: "", ms: 0, allowedMs: 0 });

  /** Resolves to true when the server opened a session. */
  const begin = useCallback(async () => {
    setPhase("starting");
    setRefused(null);
    const r = await startTrainSession({ kind, itemSlug }).catch(() => ({ ok: false as const, reason: "failed" as const }));
    if (!r.ok) {
      setRefused(r.reason);
      setPhase("idle");
      return false;
    }
    live.current = { id: r.sessionId, ms: 0, allowedMs: r.minutes * 60_000 };
    setAllowed(r.minutes * 60);
    setSeconds(0);
    setTicking(true);
    setPhase("active");
    return true;
  }, [kind, itemSlug]);

  const end = useCallback(async (endReason: EndReason) => {
    const s = live.current;
    if (!s.id) return;
    const sessionId = s.id;
    s.id = "";
    setTicking(false);
    setPhase("saving");
    /* A copy: the game's own record is cleared when it draws its resting picture again. */
    const detail = detailRef?.current ? { ...detailRef.current } : undefined;
    const r = await finishTrainSession({ sessionId, minutes: Math.min(s.ms, s.allowedMs) / 60_000, score: scoreRef?.current, detail, endReason }).catch(() => ({ ok: false as const }));
    setEnded(r.ok ? { sessionId, endReason: r.endReason, saved: { seconds: r.minutes * 60, score: r.score, detail: r.detail, counted: r.counted } } : { sessionId, endReason, saved: null });
    setPhase("ended");
  }, [scoreRef, detailRef]);

  /* The clock counts only while the page is in view. A slow or sleeping tab adds at most one second per tick. */
  useEffect(() => {
    if (!ticking) return;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now(), s = live.current;
      if (!document.hidden) s.ms += Math.min(now - last, 1000);
      last = now;
      setSeconds(Math.floor(s.ms / 1000));
      if (s.ms >= s.allowedMs) void end("done");
    }, 250);
    return () => clearInterval(timer);
  }, [ticking, end]);

  /* Leaving the page mid-session saves the minutes spent so far. */
  useEffect(() => () => void end("left"), [end]);

  return { phase, ticking, seconds, allowed, refused, ended, begin, end, setTicking };
}
