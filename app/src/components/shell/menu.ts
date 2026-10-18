/**
 * The member app's menu: its groups of links, the phone's tabs, and every page the search may find
 * (src/components/shell). One list, so the sidebar, the rail, the tabs and the search never disagree.
 * Functions, not lists made once: the labels are read for each request, in that reader's language (docs/LANGUAGES.md).
 */
import type { NavItem } from "@/components/nav";
import { common } from "@/copy/common";
import { kids } from "@/copy/kids";
import { isGuardianSeat } from "@/lib/roles";
import type { Member } from "@/lib/session";
import { menuExtra } from "./menu-extra";

const n = common.nav, s = common.shell;
/** `icon`: the address whose picture stands for the whole group on the rail. */
export interface MenuGroup { title: string; items: NavItem[]; icon?: string }

export function menuGroups(m: Member): MenuGroup[] {
  const child = m.childMode, x = menuExtra(m);
  const you = child ? [] : [
    { href: "/account", label: n.account },
    ...(isGuardianSeat(m.seat) ? [{ href: "/family", label: n.family }] : [{ href: "/circle", label: n.circle }]),
    ...x.you,
    { href: "/settings", label: n.settings },
  ];
  /* Each person sees only the areas their roles open. Child mode hides the grown-up links. The try-out space and a
     household of one's own (Ved, 18 October 2026) for staff, counsellors and sponsors; "Sign in as someone else" only
     where the demo sign-in is on, which is for trying the app with the demo people. */
  const areas = child ? [] : [
    ...(m.viewer.staff ? [{ href: "/admin", label: n.admin }] : []),
    ...(m.viewer.counsellor ? [{ href: "/counsellor", label: n.counsellor }] : []),
    ...(m.viewer.sponsors.length ? [{ href: "/sponsor", label: n.sponsor }] : []),
    ...(m.canTry && !m.tryout ? [{ href: "/tryout", label: n.tryout }] : []),
    ...(m.tryout && m.ownHousehold ? [{ href: "/tryout/leave", label: n.leaveTryout }] : []),
    ...(m.tryout && !m.ownHousehold ? [{ href: "/login/own", label: n.ownEyes }] : []),
    ...(m.demo ? [{ href: "/login", label: n.switchPerson }] : []),
  ];
  return [
    { title: n.track, items: child ? [{ href: "/kids", label: kids.home }] : [
      { href: "/today", label: n.today },
      ...(m.enrolment ? [{ href: "/today/week", label: n.week }] : []),
      ...x.track,
    ] },
    { title: n.test, items: [{ href: "/test", label: n.checkups }, ...x.test, ...(child ? [] : [{ href: "/setup", label: n.onboarding }])] },
    { title: n.train, items: [{ href: "/train", label: n.games }, { href: "/train/exercises", label: n.exercises }, { href: "/train/cinema", label: n.cinema }, ...x.train] },
    { title: n.together, items: [{ href: "/together", label: n.community }, { href: "/together/league", label: n.league }] },
    ...(you.length ? [{ title: n.you, items: you, icon: "/account" }] : []),
    ...(areas.length ? [{ title: n.otherAreas, items: areas, icon: "/login" }] : []),
  ];
}

/** The phone's five tabs: a picture and a word each. In child mode the last is the way back to a grown-up. */
export const menuTabs = (m: Member): NavItem[] => [
  m.childMode ? { href: "/kids", label: s.tabs.kids } : { href: "/today", label: s.tabs.today },
  { href: "/test", label: s.tabs.checkups },
  { href: "/train", label: s.tabs.train },
  { href: "/together", label: s.tabs.together },
  m.childMode ? { href: "/leave-child-mode", label: s.tabs.grownUp } : { href: "/account", label: s.tabs.you },
];

/** Every page of the menu, once, for the search. */
export const menuPages = (m: Member): NavItem[] => menuGroups(m).flatMap((g) => g.items).filter((i) => i.href !== "/login");
