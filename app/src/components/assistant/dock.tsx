"use client";
/**
 * The floating corner at the bottom right: the back-to-top button (once the page is scrolled down) and the eye
 * helper (when this edition has one). It sits above the tab bar on a phone, and it steps out of the way while a
 * two-eye scene (a game, a drill, a check-up, a film) is on the screen, so nothing is drawn over the black field.
 */
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { EyeChat } from "./eye-chat";
import { ToTop } from "./to-top";
import css from "./assistant.module.css";

const SCENES = ".scene, [data-scene]";

export function Dock({ chat, place }: { chat: boolean; place: "site" | "app" }) {
  const path = usePathname();
  /* which page the reading is for: after a move to another page it counts for nothing until the scenes there answer */
  const [seen, setSeen] = useState<{ path: string; inView: boolean }>({ path: "", inView: false });
  const sceneInView = seen.path === path && seen.inView;

  useEffect(() => {
    const showing = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) showing.add(e.target);
        else showing.delete(e.target);
      }
      setSeen({ path, inView: showing.size > 0 });
    });
    const watch = () => document.querySelectorAll(SCENES).forEach((el) => io.observe(el));
    watch();
    /* a scene may be drawn after the page loads */
    const mo = new MutationObserver(watch);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, [path]);

  return (
    <div className={css.dock} data-place={place} data-hidden={sceneInView || undefined}>
      <ToTop />
      {chat && <EyeChat />}
    </div>
  );
}
