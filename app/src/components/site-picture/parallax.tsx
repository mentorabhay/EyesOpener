// Eyes Opener: Lets a large picture drift a little as the page scrolls, within the Look and feel setting.
"use client";
import { type ReactNode, useEffect, useRef } from "react";
import css from "./site-picture.module.css";

/**
 * The picture moves by at most `--parallax` times 12% of its frame's height, against the scroll. Nothing moves when
 * the person's device asks for less motion, when the site's motion setting is calm or off, or before the frame is near
 * the screen. Only transform changes, so nothing else on the page shifts.
 */
export function Parallax({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current, root = document.documentElement;
    if (!el) return;
    const strength = Number.parseFloat(getComputedStyle(root).getPropertyValue("--parallax")) || 0;
    const still = root.dataset.motion === "calm" || root.dataset.motion === "off" || strength <= 0
      || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still) return;
    let frame = 0, seen = false;
    const draw = () => {
      frame = 0;
      const r = el.getBoundingClientRect(), view = window.innerHeight;
      /* -1 when the frame's middle is at the bottom of the screen, 1 at the top */
      const at = Math.max(-1, Math.min(1, ((view / 2) - (r.top + r.height / 2)) / (view / 2 + r.height / 2)));
      el.style.transform = `translate3d(0, ${(at * strength * 12).toFixed(2)}%, 0) scale(${(1 + strength * 0.24).toFixed(3)})`;
    };
    const ask = () => { if (seen && !frame) frame = requestAnimationFrame(draw); };
    const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; ask(); }, { rootMargin: "20% 0px" });
    io.observe(el);
    window.addEventListener("scroll", ask, { passive: true });
    window.addEventListener("resize", ask);
    return () => { io.disconnect(); window.removeEventListener("scroll", ask); window.removeEventListener("resize", ask); if (frame) cancelAnimationFrame(frame); };
  }, []);
  return <div ref={box} className={css.drift}>{children}</div>;
}
