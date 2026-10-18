"use client";
/** The switch that lets this computer show notifications while Eyes Opener is open. The browser asks the person once. */
import { useSyncExternalStore } from "react";
import { notify as w } from "@/copy/notify";
import { CHANGED, browserWanted, setBrowserWanted } from "./bell";

type State = "loading" | "none" | "blocked" | "on" | "off";

/* The state is read from the browser; the switch below tells this page when it changed. */
const subscribe = (changed: () => void) => { window.addEventListener(CHANGED, changed); return () => window.removeEventListener(CHANGED, changed); };
const read = (): State => {
  if (!("Notification" in window)) return "none";
  if (Notification.permission === "denied") return "blocked";
  return Notification.permission === "granted" && browserWanted() ? "on" : "off";
};

export function BrowserNotices() {
  const s = useSyncExternalStore(subscribe, read, (): State => "loading");
  const l = w.list;
  if (s === "loading") return null;
  if (s === "none") return <p className="notice">{l.browserNone}</p>;
  if (s === "blocked") return <p className="notice" data-b="warn">{l.browserBlocked}</p>;
  if (s === "on") return <p className="notice" data-b="ok">{l.browserOff}</p>;
  return (
    <p className="notice">
      <button type="button" className="btn btn-sm btn-g" onClick={async () => {
        const p = await Notification.requestPermission();
        setBrowserWanted(p === "granted");
      }}>{l.browserOn}</button>{" "}<span className="muted small">{l.browserOnText}</span>
    </p>
  );
}
