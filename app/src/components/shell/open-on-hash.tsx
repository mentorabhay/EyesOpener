"use client";
/**
 * Opens the fold a link points at: when the address ends in #name and that element is a folded part of the page (or
 * is inside one), it is opened and brought into view. On the page's first load and on every press of such a link.
 */
import { useEffect } from "react";

export function OpenOnHash() {
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      const el = id ? document.getElementById(id) : null;
      if (!el) return;
      for (let d: Element | null = el; d; d = d.parentElement) if (d instanceof HTMLDetailsElement) d.open = true;
      el.scrollIntoView({ block: "start" });
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, []);
  return null;
}
