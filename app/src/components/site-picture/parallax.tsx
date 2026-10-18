// The fixed-picture parallax of the site's large pictures, within the Look and feel setting.
"use client";
import { type ReactNode, useEffect, useRef, useState } from "react";
import css from "./site-picture.module.css";

/**
 * Once its frame reaches the screen, the picture stays still, as if pinned behind the page, and the page slides over
 * it: the frame is a window onto a picture held to the screen (Ved, 18 October 2026: "it stays stuck on screen and the
 * next part passes over the static image"). The picture is pinned with position: fixed inside a clipped window, the way
 * that also works on an iPhone, and keeps the frame's width so its subject stays where the frame is.
 * Nothing is pinned when the person's device asks for less motion, when the site's motion setting is calm or off, or
 * when the parallax strength is 0: the picture then sits in its frame as an ordinary picture. Before the page's script
 * runs the picture is ordinary too, so it is never missing.
 */
export function Parallax({ children }: { children: ReactNode }) {
  const win = useRef<HTMLDivElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const strength = Number.parseFloat(getComputedStyle(root).getPropertyValue("--parallax")) || 0;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const still = () => root.dataset.motion === "calm" || root.dataset.motion === "off" || strength <= 0 || motion.matches;
    const decide = () => setPinned(!still());
    decide();
    motion.addEventListener("change", decide);
    return () => motion.removeEventListener("change", decide);
  }, []);

  /* the pinned picture keeps the frame's left edge and width; only its height is the screen's */
  useEffect(() => {
    if (!pinned) return;
    const place = () => {
      const w = win.current, p = pin.current;
      if (!w || !p) return;
      const r = w.getBoundingClientRect();
      p.style.left = `${r.left}px`;
      p.style.width = `${r.width}px`;
    };
    place();
    const ro = new ResizeObserver(place);
    if (win.current) ro.observe(win.current);
    window.addEventListener("resize", place);
    return () => { ro.disconnect(); window.removeEventListener("resize", place); };
  }, [pinned]);

  if (!pinned) return <>{children}</>;
  return (
    <div ref={win} className={css.window}>
      <div ref={pin} className={css.pinned}>{children}</div>
    </div>
  );
}
