/**
 * Links an edition adds to the member menu (src/components/shell/menu.ts), by the group they join. The public edition
 * adds none; a fuller build replaces this one file.
 */
import type { NavItem } from "@/components/nav";
import type { Member } from "@/lib/session";

export interface MenuExtra { track: NavItem[]; test: NavItem[]; train: NavItem[]; you: NavItem[] }

export const menuExtra = (_m: Member): MenuExtra => ({ track: [], test: [], train: [], you: [] });
