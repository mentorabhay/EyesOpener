"use client";
/**
 * The person's menu at the right of the top bar: one press shows who is using the app now and every profile of the
 * household, and one more switches to another (Ved, 18 October 2026: switching profiles was three pages deep). Below
 * them: Your account, Family, Settings, light or dark, and signing out. Escape or a press outside closes it.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { common } from "@/copy/common";
import { switchProfile } from "@/lib/actions";
import { signOutHere } from "@/app/(auth)/login/actions";
import { NavIcon } from "./icons";
import { ThemeChoice } from "./theme";

export interface MenuProfile { id: string; name: string; initial: string; sub: string }

export function AccountMenu({ initial, name, email, profiles, current, guardian }: {
  initial: string; name: string; email: string; profiles: MenuProfile[]; current: string; guardian: boolean;
}) {
  const w = common.shell.menu;
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); button.current?.focus(); } };
    document.addEventListener("pointerdown", away);
    window.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", away); window.removeEventListener("keydown", key); };
  }, [open]);

  const links = [
    { href: "/account", label: w.account },
    ...(guardian ? [{ href: "/family", label: w.family }] : []),
    { href: "/settings", label: w.settings },
  ];
  return (
    <div className="acct" ref={box}>
      <button ref={button} type="button" className="tb-person" aria-haspopup="menu" aria-expanded={open} aria-label={w.open} title={w.open} onClick={() => setOpen(!open)}>{initial}</button>
      {open && (
        <div className="acct-panel" role="menu" aria-label={w.open}>
          <div className="acct-me"><b>{name}</b><span>{email}</span></div>
          {profiles.length > 0 && (
            <div className="acct-group">
              <p className="acct-title">{w.using}</p>
              {profiles.map((p) => p.id === current ? (
                <div key={p.id} className="acct-profile" data-on role="menuitemradio" aria-checked="true">
                  <i aria-hidden="true">{p.initial}</i><span><b>{p.name}</b><small>{p.sub}</small></span><span className="acct-tick" aria-hidden="true">✓</span>
                </div>
              ) : (
                <form key={p.id} action={switchProfile} onSubmit={() => setOpen(false)}>
                  <input type="hidden" name="profileId" value={p.id} />
                  <button type="submit" className="acct-profile" role="menuitemradio" aria-checked="false" aria-label={w.switchTo(p.name)}>
                    <i aria-hidden="true">{p.initial}</i><span><b>{p.name}</b><small>{p.sub}</small></span>
                  </button>
                </form>
              ))}
            </div>
          )}
          <div className="acct-group">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="acct-link" role="menuitem" onClick={() => setOpen(false)}><NavIcon href={l.href} />{l.label}</Link>
            ))}
          </div>
          <div className="acct-group acct-theme"><span>{common.shell.theme.label}</span><ThemeChoice /></div>
          <form action={signOutHere} className="acct-group"><button type="submit" className="acct-link acct-out" role="menuitem"><NavIcon href="/login" />{w.signOut}</button></form>
        </div>
      )}
    </div>
  );
}
