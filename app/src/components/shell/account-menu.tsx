"use client";
/**
 * The person's menu at the right of the top bar: one press shows who is using the app now and every profile of the
 * household, and one more switches to another (Ved, 18 October 2026: switching profiles was three pages deep). Below
 * them: handing the device to a child in child mode (with an exit PIN chosen on the spot when there is none yet),
 * Your account, Family, Settings, light or dark, and signing out. Escape or a press outside closes it.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { common } from "@/copy/common";
import { switchProfile } from "@/lib/actions";
import { signOutHere } from "@/app/(auth)/login/actions";
import { handOverQuick } from "@/app/(app)/family/actions";
import { NavIcon } from "./icons";
import { ThemeChoice } from "./theme";
import { isAction } from "@/lib/from-here";

export interface MenuProfile { id: string; name: string; initial: string; sub: string }

export function AccountMenu({ initial, name, email, profiles, current, guardian, hand = [], hasPin = false, canPin = false, links: own }: {
  initial: string; name: string; email: string; profiles: MenuProfile[]; current: string; guardian: boolean;
  /** The links of the menu, when the area has its own (a portal): else Your account, Family and Settings. */
  links?: { href: string; label: string }[];
  /** The children this grown-up may hand the device to. */
  hand?: { id: string; name: string }[];
  /** The household has an exit PIN; without one, a guardian who may set it types it here. */
  hasPin?: boolean; canPin?: boolean;
}) {
  const w = common.shell.menu;
  const [open, setOpen] = useState(false);
  /* the child waiting for a PIN to be chosen first */
  const [pinFor, setPinFor] = useState<{ id: string; name: string } | null>(null);
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
  const toggle = () => { setOpen(!open); setPinFor(null); };

  const links = own ?? [
    { href: "/account", label: w.account },
    ...(guardian ? [{ href: "/family", label: w.family }] : []),
    { href: "/settings", label: w.settings },
  ];
  return (
    <div className="acct" ref={box}>
      <button ref={button} type="button" className="tb-person" aria-expanded={open} aria-label={w.open} title={w.open} onClick={toggle}>{initial}</button>
      {/* when open: a plain group of links and buttons that Tab moves through, not a "menu" (that role promises arrow keys; audit A8) */}
      {open && (
        <div className="acct-panel" role="group" aria-label={w.open}>
          <div className="acct-me"><b>{name}</b><span>{email}</span></div>
          {profiles.length > 0 && (
            <div className="acct-group">
              <p className="acct-title">{w.using}</p>
              {profiles.map((p) => p.id === current ? (
                <div key={p.id} className="acct-profile" data-on aria-current="true">
                  <i aria-hidden="true">{p.initial}</i><span><b>{p.name}</b><small>{p.sub}</small></span><span className="acct-tick" aria-hidden="true">✓</span>
                </div>
              ) : (
                <form key={p.id} action={switchProfile} onSubmit={() => setOpen(false)}>
                  <input type="hidden" name="profileId" value={p.id} />
                  <button type="submit" className="acct-profile" aria-label={w.switchTo(p.name)}>
                    <i aria-hidden="true">{p.initial}</i><span><b>{p.name}</b><small>{p.sub}</small></span>
                  </button>
                </form>
              ))}
            </div>
          )}
          {hand.length > 0 && (
            <div className="acct-group">
              <p className="acct-title">{w.handTitle}</p>
              {pinFor ? (
                <form action={handOverQuick} className="acct-pin">
                  <input type="hidden" name="profileId" value={pinFor.id} />
                  <p className="small muted">{w.pinFirst}</p>
                  <label className="small" htmlFor="acct-pin">{w.pinLabel}</label>
                  <input id="acct-pin" className="input" type="password" name="pin" inputMode="numeric" pattern="[0-9]{4,6}" minLength={4} maxLength={6} required autoComplete="off" autoFocus />
                  <div className="row"><button type="submit" className="btn btn-g btn-sm">{w.pinGo(pinFor.name)}</button><button type="button" className="btn btn-gh btn-sm" onClick={() => setPinFor(null)}>{w.pinBack}</button></div>
                </form>
              ) : hand.map((c) => hasPin ? (
                <form key={c.id} action={handOverQuick}>
                  <input type="hidden" name="profileId" value={c.id} />
                  <button type="submit" className="acct-link"><NavIcon href="/kids" /><span>{w.hand(c.name)}<small>{w.handSub}</small></span></button>
                </form>
              ) : canPin ? (
                <button key={c.id} type="button" className="acct-link" onClick={() => setPinFor(c)}><NavIcon href="/kids" /><span>{w.hand(c.name)}<small>{w.handSub}</small></span></button>
              ) : (
                <Link key={c.id} href="/family" className="acct-link" onClick={() => setOpen(false)}><NavIcon href="/kids" /><span>{w.hand(c.name)}<small>{w.handSub}</small></span></Link>
              ))}
            </div>
          )}
          <div className="acct-group">
            {links.map((l) => isAction(l.href) ? (
              <a key={l.href} href={l.href} className="acct-link"><NavIcon href={l.href} />{l.label}</a>
            ) : (
              <Link key={l.href} href={l.href} className="acct-link" onClick={() => setOpen(false)}><NavIcon href={l.href} />{l.label}</Link>
            ))}
          </div>
          <div className="acct-group acct-theme"><span>{common.shell.theme.label}</span><ThemeChoice /></div>
          <form action={signOutHere} className="acct-group"><button type="submit" className="acct-link acct-out"><NavIcon href="/login" />{w.signOut}</button></form>
        </div>
      )}
    </div>
  );
}
