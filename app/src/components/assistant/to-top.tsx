"use client";
/**
 * Back to the top: a small round button beside the eye helper. It shows once the page is scrolled down more than
 * one screen, and scrolls back smoothly (at once with "reduce motion"). Focus goes to the top of the page.
 */
import { useEffect, useState } from "react";
import { assistant as t } from "@/copy/assistant";
import css from "./assistant.module.css";

export function ToTop() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let frame = 0;
    const check = () => { frame = 0; setShown(window.scrollY > window.innerHeight * 0.9); };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(check); };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (frame) cancelAnimationFrame(frame); };
  }, []);

  const up = () => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: still ? "auto" : "smooth" });
    const target = document.getElementById("page") ?? document.querySelector<HTMLElement>("main");
    target?.focus({ preventScroll: true });
  };

  return (
    <button type="button" className={css.toTop} data-shown={shown || undefined} onClick={up} aria-label={t.toTop} title={t.toTop} tabIndex={shown ? 0 : -1} aria-hidden={!shown || undefined}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  );
}
