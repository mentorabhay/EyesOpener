"use client";
/**
 * The site navigation: logo, the page links, and sign-in or "Open the app".
 * One list of links serves both layouts. On a wide screen it sits in the bar; on a phone it is a menu the
 * button opens. Closed, the menu is `display: none`, so it is out of the tab order. Escape closes it.
 */
import Link from "next/link";
import { BrandMark } from "@/components/brand";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { site as t } from "@/copy/site";
import { inEdition } from "@/edition";
import { ThemeChoice, ThemeToggle } from "@/components/shell/theme";
import { common } from "@/copy/common";

const MENU_ID = "site-menu";

/** A small line picture for each page of the menu, shown beside it on a phone. */
const ICON: Record<string, string> = {
  "/how-it-works": "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM12 11v5M12 8h.01",
  "/try": "M7 9h10a4 4 0 0 1 4 4v1a3 3 0 0 1-5.4 1.8L14.5 14h-5l-1.1 1.8A3 3 0 0 1 3 14v-1a4 4 0 0 1 4-4ZM8 11v3M6.5 12.5h3",
  "/programmes": "M5 5h14v4H5zM5 11h14v4H5zM5 17h9",
  "/evidence": "M8 4h8v3H8zM6 6H5v14h14V6h-1M9 13l2 2 4-4",
  "/library": "M5 4h4v16H5zM10 4h4v16h-4zM15.5 5l3.5 1-3 14-3.5-1Z",
  "/stories": "M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5ZM12 6v13.5",
};
const Icon = ({ href }: { href: string }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d={ICON[href] ?? "M12 11a1 1 0 1 0 0 2"} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export function Mark() {
  return <BrandMark />;
}

export function SiteNav({ home }: { home: string | null }) {
  const path = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const bar = useRef<HTMLElement>(null);
  const burger = useRef<HTMLButtonElement>(null);

  /* The hairline under the bar appears once the page has moved. Written straight to the element: no re-render on scroll. */
  useEffect(() => {
    const on = () => { if (bar.current) bar.current.dataset.scrolled = String(window.scrollY > 8); };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  /* While the phone menu is open: a tap outside closes it. */
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (bar.current && !bar.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  /* the page behind the open phone menu does not scroll */
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement, was = root.style.overflow;
    root.style.overflow = "hidden";
    return () => { root.style.overflow = was; };
  }, [open]);

  const close = () => setOpen(false);
  const current = (href: string) => (path === href || path.startsWith(href + "/") ? "page" as const : undefined);

  return (
    <header
      ref={bar} className="s-nav" data-open={open}
      onKeyDown={(e) => { if (e.key === "Escape" && open) { setOpen(false); burger.current?.focus(); } }}
    >
      <Link className="s-logo" href="/" aria-label={t.logoLabel} onClick={close}><Mark />{t.name}</Link>
      {/* The menu button sits before the links in the page order, so Tab moves from the button into the menu it opened. */}
      <button
        ref={burger} type="button" className="s-burger" aria-expanded={open} aria-controls={MENU_ID}
        aria-label={open ? t.nav.closeMenu : t.nav.openMenu} onClick={() => setOpen(!open)}
      >
        <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          {open ? <path d="M4 4l10 10M14 4L4 14" /> : <path d="M2.5 5h13M2.5 9h13M2.5 13h13" />}
        </svg>
      </button>
      <nav id={MENU_ID} className="s-links" aria-label={t.nav.label} data-open={open}>
        <form className="s-menu-search" action="/library" method="get" role="search" onSubmit={close}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M15 15l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          <input type="search" name="q" placeholder={t.nav.search} aria-label={t.nav.search} enterKeyHint="search" maxLength={60} />
          <button type="submit" className="s-sr">{t.nav.searchGo}</button>
        </form>
        {t.nav.links.filter((l) => inEdition(l.href)).map((l) => (
          <Link key={l.href} href={l.href} aria-current={current(l.href)} onClick={close}>
            <span className="s-link-icon"><Icon href={l.href} /></span>
            <span className="s-link-words"><span className="s-link-label">{l.label}</span><span className="s-link-text">{l.text}</span></span>
          </Link>
        ))}
        <div className="s-menu-theme"><span>{common.shell.theme.label}</span><ThemeChoice /></div>
        <div className="s-menu-actions">
          {home
            ? <Link className="btn btn-d" href={home} onClick={close}>{t.nav.openApp}</Link>
            : <>
                <Link className="btn btn-gh" href="/login" onClick={close}>{t.nav.signIn}</Link>
                <Link className="btn btn-d" href="/register" onClick={close}>{t.nav.register}</Link>
              </>}
        </div>
      </nav>
      <div className="s-navr">
        <ThemeToggle className="s-theme" />
        {home
          ? <Link className="btn btn-d btn-sm" href={home}>{t.nav.openApp}</Link>
          : <>
              <Link className="btn btn-gh btn-sm s-wide-only" href="/login">{t.nav.signIn}</Link>
              <Link className="btn btn-d btn-sm" href="/register">{t.nav.register}</Link>
            </>}
      </div>
    </header>
  );
}
