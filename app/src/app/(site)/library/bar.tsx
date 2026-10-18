"use client";
/**
 * The library's filters, folded into one row once the full filter panel has scrolled away. The row sits just under
 * the site's top bar and stays there while the page scrolls, down to the very end. It holds the name search and the
 * three choices as drop-downs; a change opens the library with that filter, as the full panel's links do.
 */
import { useEffect, useRef, useState } from "react";

interface Choice { key: string; label: string }
export interface BarProps {
  watch: string;
  q: string; tag: string; evidence: string; kind: string;
  tags: Choice[]; evidences: Choice[]; kinds: Choice[];
  words: { search: string; placeholder: string; go: string; tag: string; evidence: string; kind: string; shown: string; more: string };
}

export function LibraryBar(p: BarProps) {
  const [folded, setFolded] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const el = document.getElementById(p.watch);
    if (!el) return;
    /* folded while the full panel is above the screen (scrolled past), open again when it comes back */
    const io = new IntersectionObserver(([e]) => setFolded(!e.isIntersecting && e.boundingClientRect.top < 0), { rootMargin: "-64px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [p.watch]);
  const go = () => form.current?.requestSubmit();
  const pick = (name: string, value: string, label: string, list: Choice[]) => (
    <label className="s-bar-pick">
      <span className="s-sr">{label}</span>
      <select name={name} defaultValue={value} onChange={go} aria-label={label}>
        {list.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
      </select>
    </label>
  );
  return (
    <div className="s-bar" hidden={!folded} aria-hidden={!folded}>
      <div className="s-wrap">
        <form ref={form} action="/library" method="get" className="s-bar-row" role="search">
          <label className="s-bar-q">
            <span className="s-sr">{p.words.search}</span>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input type="search" name="q" defaultValue={p.q} placeholder={p.words.placeholder} maxLength={60} enterKeyHint="search" />
          </label>
          {pick("tag", p.tag, p.words.tag, p.tags)}
          {pick("evidence", p.evidence, p.words.evidence, p.evidences)}
          {pick("kind", p.kind, p.words.kind, p.kinds)}
          <button className="btn btn-sm btn-g" type="submit">{p.words.go}</button>
          <span className="s-bar-n tnum" role="status">{p.words.shown}</span>
          <a className="s-link s-bar-more" href={`#${p.watch}`}>{p.words.more}</a>
        </form>
      </div>
    </div>
  );
}
