"use client";
/**
 * The bell at the top of the member pages: a quiet count of new notifications and, on a press, the latest few.
 * Once a minute, while the page is in view, it asks the server for news (which also fires the household's due
 * reminders, src/app/api/notifications/route.ts). Nothing pops up over the page. When the person has switched on the
 * browser's notifications on this computer (Notifications page), a new one is also shown by the browser.
 */
import { useEffect, useRef, useState } from "react";
import { notify } from "@/copy/notify";
import css from "./notify.module.css";

interface Item { id: string; title: string; body: string; href: string | null; createdAt: number; read?: boolean }

const KEY = "eo.notify.browser";
export const browserWanted = () => { try { return localStorage.getItem(KEY) === "on"; } catch { return false; } };
export const CHANGED = "eo-notify-browser";
export const setBrowserWanted = (on: boolean) => {
  try { localStorage.setItem(KEY, on ? "on" : "off"); } catch { /* private window */ }
  window.dispatchEvent(new Event(CHANGED));
};
const HEADERS = { "x-iopener-notify": "1" };

export function NotifyBell({ start }: { start: number }) {
  const words = notify.bell;
  const [count, setCount] = useState(start);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[] | null>(null);
  /* 0 until the first check, which then asks for the last five minutes */
  const since = useRef<number>(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (document.hidden) return;
      if (!since.current) since.current = Date.now() - 5 * 60_000;
      const r = await fetch(`/api/notifications?since=${since.current}`, { headers: HEADERS, cache: "no-store" }).catch(() => null);
      if (!r?.ok || stop) return;
      const b = (await r.json()) as { count: number; fresh: Item[]; now: number };
      since.current = b.now;
      setCount(b.count);
      if (b.fresh.length && browserWanted() && "Notification" in window && Notification.permission === "granted") {
        for (const f of b.fresh) {
          const n = new Notification(f.title, { body: f.body, tag: f.id, icon: "/icon.png", silent: true });
          n.onclick = () => { window.focus(); if (f.href) location.href = f.href; };
        }
      }
    };
    void tick();
    const t = setInterval(() => void tick(), 60_000);
    const vis = () => { if (!document.hidden) void tick(); };
    document.addEventListener("visibilitychange", vis);
    return () => { stop = true; clearInterval(t); document.removeEventListener("visibilitychange", vis); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next) return;
    const r = await fetch(`/api/notifications?list=1&since=${since.current}`, { headers: HEADERS, cache: "no-store" }).catch(() => null);
    if (r?.ok) { const b = (await r.json()) as { count: number; recent: Item[] }; setItems(b.recent); setCount(b.count); }
  };
  const read = async (id?: string) => {
    const r = await fetch("/api/notifications", { method: "POST", headers: { ...HEADERS, "content-type": "application/json" }, body: JSON.stringify(id ? { id } : { all: true }) }).catch(() => null);
    if (r?.ok) { const b = (await r.json()) as { count: number }; setCount(b.count); setItems((xs) => xs?.map((x) => (!id || x.id === id ? { ...x, read: true } : x)) ?? null); }
  };

  return (
    <div className={css.bellWrap} ref={box}>
      <button type="button" className={css.bell} aria-label={words.label(count)} aria-expanded={open} onClick={() => void toggle()}>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9" /><path d="M10 19a2 2 0 0 0 4 0" />
        </svg>
        {count > 0 && <span className={css.badge}>{count > 99 ? "99+" : count}</span>}
      </button>
      {open && (
        <div className={css.panel} role="dialog" aria-label={words.title}>
          <div className={css.panelHead}><b>{words.title}</b>{count > 0 && <button type="button" className="btn btn-sm" onClick={() => void read()}>{words.readAll}</button>}</div>
          {items === null ? null : items.length === 0 ? <p className="muted small">{words.none}</p> : (
            <ul className={css.items}>
              {items.map((x) => (
                <li key={x.id} data-read={x.read || undefined}>
                  <a href={x.href ?? "/today/notifications"} onClick={() => void read(x.id)}><b>{x.title}</b><span>{x.body}</span></a>
                </li>
              ))}
            </ul>
          )}
          <a className={css.all} href="/today/notifications">{words.all}</a>
        </div>
      )}
    </div>
  );
}
