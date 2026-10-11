// Eyes Opener: The site navigation: logo, the page links, and sign-in or "Open the app".
"use client";
/**
 * The site navigation: logo, the page links, and sign-in or "Open the app".
 * One list of links serves both layouts. On a wide screen it sits in the bar; on a phone it is a menu the
 * button opens. Closed, the menu is `display: none`, so it is out of the tab order. Escape closes it.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { site as t } from "@/copy/site";
import { inEdition } from "@/edition";

const MENU_ID = "site-menu";

export function Mark() {
  return <span className="s-mark" aria-hidden="true"><i /><i /></span>;
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
        {t.nav.links.filter((l) => inEdition(l.href)).map((l) => <Link key={l.href} href={l.href} aria-current={current(l.href)} onClick={close}>{l.label}</Link>)}
        {!home && <Link className="s-phone-only" href="/login" onClick={close}>{t.nav.signIn}</Link>}
        {!home && <Link className="s-phone-only" href="/register" onClick={close}>{t.nav.register}</Link>}
      </nav>
      <div className="s-navr">
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
