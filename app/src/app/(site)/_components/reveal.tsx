// Eyes Opener: A quiet reveal on scroll for every `.s-reveal` element.
"use client";
/**
 * A quiet reveal on scroll for every `.s-reveal` element.
 *
 * Nothing is hidden until the reader first scrolls. At that moment the elements still below the screen are
 * hidden, and each one rises in as it arrives. So the page is whole without scripts, in a print, and for anyone
 * who asked for reduced motion, or when the Look and feel motion setting is calm or off (then this does nothing at all).
 */
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function Reveal() {
  const path = usePathname();
  useEffect(() => {
    const motion = document.documentElement.dataset.motion;
    if (motion === "calm" || motion === "off" || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let io: IntersectionObserver | null = null;
    const arm = () => {
      window.removeEventListener("scroll", arm);
      io = new IntersectionObserver((entries) => {
        let n = 0;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          /* Neighbours that arrive together follow one another by a beat. */
          el.style.transitionDelay = `${Math.min(n++, 5) * 70}ms`;
          el.classList.add("in");
          io?.unobserve(el);
        }
      }, { rootMargin: "0px 0px -6% 0px", threshold: 0 });
      const fold = window.innerHeight;
      for (const el of document.querySelectorAll<HTMLElement>(".s-reveal:not(.pre)")) {
        if (el.getBoundingClientRect().top > fold) { el.classList.add("pre"); io.observe(el); }
      }
    };
    window.addEventListener("scroll", arm, { passive: true });
    return () => { window.removeEventListener("scroll", arm); io?.disconnect(); };
  }, [path]);
  return null;
}
