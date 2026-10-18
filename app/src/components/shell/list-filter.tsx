"use client";
/**
 * A field that narrows a long list on the page as the person types (the Games and Exercises lists). It hides the rows
 * of the list whose words do not match (each row carries its words in `data-q`), opens every fold that holds a match,
 * and puts the folds back as they were when the field is cleared. Nothing is fetched: the list is already on the page.
 */
import { useEffect, useRef, useState } from "react";
import { common } from "@/copy/common";

const words = (q: string) => q.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").split(/[^\p{L}\p{N}]+/u).filter(Boolean);

export function ListFilter({ target, placeholder }: { target: string; placeholder: string }) {
  const [q, setQ] = useState("");
  const none = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const root = document.getElementById(target);
    if (!root) return;
    const want = words(q);
    let hits = 0;
    root.querySelectorAll<HTMLElement>("[data-q]").forEach((el) => {
      const have = words(el.dataset.q ?? "");
      const hit = want.every((w) => have.some((h) => h.startsWith(w)));
      el.toggleAttribute("data-lf-hidden", !hit);
      if (hit) hits += 1;
    });
    root.querySelectorAll<HTMLDetailsElement>("details").forEach((d) => {
      const any = !!d.querySelector("[data-q]:not([data-lf-hidden])");
      if (want.length) {
        if (d.dataset.lfWas === undefined) d.dataset.lfWas = d.open ? "1" : "0";
        d.open = any;
        d.toggleAttribute("data-lf-hidden", !any);
      } else {
        if (d.dataset.lfWas !== undefined) { d.open = d.dataset.lfWas === "1"; delete d.dataset.lfWas; }
        d.removeAttribute("data-lf-hidden");
      }
    });
    root.querySelectorAll<HTMLElement>("[data-lf-section]").forEach((s) => s.toggleAttribute("data-lf-hidden", !!want.length && !s.querySelector("[data-q]:not([data-lf-hidden])")));
    if (none.current) none.current.hidden = !want.length || hits > 0;
  }, [q, target]);
  return (
    <div className="stack" style={{ gap: 6 }}>
      <label className="lfilter">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M15 15l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder} aria-controls={target} autoComplete="off" />
      </label>
      <p ref={none} className="muted small" role="status" hidden>{common.shell.filter.none}</p>
    </div>
  );
}
