/**
 * Links an edition adds to the member menu (src/components/shell/menu.ts), by the group they join. The public edition
 * adds none; a fuller build replaces this one file.
 */
import type { NavItem } from "@/components/nav";

export const menuExtra = (): { test: NavItem[]; train: NavItem[] } => ({ test: [], train: [] });
