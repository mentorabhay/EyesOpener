// Eyes Opener: Keeps a page from staying in one language after the browser's language has changed.
"use client";
/**
 * Keeps a page from staying in one language after the browser's language has changed.
 *
 * A page is loaded in one language: its `<html lang>`, its typeface and the words its own code uses are fixed at
 * that moment. The language can change afterwards without a full load: a sign-in on this device, staff switching
 * a language off, a change made in another tab. The next thing the server sends would then be in the new language
 * while the page's own parts stay in the old one. So after every move from page to page, and whenever the tab is
 * looked at again, the language cookie is compared with the language the page was loaded in. When they differ, the
 * page is loaded afresh. A guard stops it from ever reloading in a loop.
 */
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const read = (name: string): string | undefined => document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1);

export function LanguageWatch({ lang, drafts, cookie, draftsCookie }: { lang: string; drafts: boolean; cookie: string; draftsCookie: string }) {
  const path = usePathname();
  useEffect(() => {
    const check = () => {
      const now = read(cookie) ?? "en";
      /* the drafts switch only matters in a language other than English, and only where the server honours it */
      const same = now === lang && (lang === "en" || !drafts || read(draftsCookie) === "on");
      if (same) return;
      let tries = 0;
      try { const kept = JSON.parse(sessionStorage.getItem("io-lang-reload") ?? "null") as { at: number; n: number } | null; tries = kept && Date.now() - kept.at < 60_000 ? kept.n : 0; } catch { tries = 0; }
      if (tries >= 2) return;
      try { sessionStorage.setItem("io-lang-reload", JSON.stringify({ at: Date.now(), n: tries + 1 })); } catch { /* private mode: reload once anyway */ }
      window.location.reload();
    };
    check();
    const seen = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", seen);
    return () => document.removeEventListener("visibilitychange", seen);
  }, [path, lang, drafts, cookie, draftsCookie]);
  return null;
}
