// The one motion of the diagram kit and the line art: lines draw in once as each first comes into view.
"use client";
/**
 * Marks every diagram ([data-diagram]) and line drawing ([data-lineart]) below the screen as "pre" when the reader
 * first scrolls, and "in" as each arrives, so its lines draw once. Nothing is hidden without scripts, in a print,
 * for reduced motion, or when the Look and feel motion setting is calm or off. Escape closes an open step.
 */
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const SEL = "[data-diagram], [data-lineart]";

export function DiagramMotion() {
  const path = usePathname();
  useEffect(() => {
    /* Escape closes the step it is pressed in, and focus stays on its name */
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const open = (e.target as HTMLElement | null)?.closest?.("details[data-tap][open]") as HTMLDetailsElement | null;
      if (!open) return;
      open.open = false;
      open.querySelector("summary")?.focus();
    };
    document.addEventListener("keydown", onKey);
    const motion = document.documentElement.dataset.motion;
    const still = motion === "calm" || motion === "off" || !("IntersectionObserver" in window)
      || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still) return () => document.removeEventListener("keydown", onKey);
    let io: IntersectionObserver | null = null;
    const arm = () => {
      window.removeEventListener("scroll", arm);
      io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.in = "";
          io?.unobserve(e.target);
        }
      }, { rootMargin: "0px 0px -12% 0px" });
      for (const el of document.querySelectorAll<HTMLElement>(SEL)) {
        if (el.getBoundingClientRect().top > window.innerHeight) { el.dataset.pre = ""; io.observe(el); }
      }
    };
    window.addEventListener("scroll", arm, { passive: true });
    return () => { window.removeEventListener("scroll", arm); document.removeEventListener("keydown", onKey); io?.disconnect(); };
  }, [path]);
  return null;
}
