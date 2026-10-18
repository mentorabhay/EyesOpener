import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PortalShell } from "@/components/portal";
import { admin as t } from "@/copy/admin";
import { roomHref, roomsFor } from "@/lib/admin";
import { requireStaff } from "@/lib/auth";
import { ADMIN_GROUPS, type AdminArea } from "@/lib/roles";

/** The picture that stands for each group on the folded menu: an address whose picture it borrows (components/shell/icons.tsx). */
const GROUP_ICON: Record<keyof typeof ADMIN_GROUPS, string> = { people: "/together", library: "/admin/catalogue", content: "/admin/stories", system: "/admin/switchboard" };

export const generateMetadata = (): Metadata => ({ title: { default: t.area, template: `%s · ${t.area}` }, robots: { index: false } });

/** The frame of the admin console. The gate runs here and again in every page and every action. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const viewer = await requireStaff("overview");
  /* Only the rooms this role may open are listed. Any other room answers "not found". */
  const open = roomsFor(viewer.staff);
  const item = (area: AdminArea) => ({ href: roomHref(area), label: t.rooms[area].name });
  /* the overview, then the rooms in four groups; a group with no room open to this role is left out */
  const groups = [
    { title: t.navTitle, items: open.filter((a) => a === "overview").map(item) },
    ...(Object.keys(ADMIN_GROUPS) as (keyof typeof ADMIN_GROUPS)[]).map((g) => ({
      title: t.groups[g], icon: GROUP_ICON[g], items: (ADMIN_GROUPS[g] as readonly AdminArea[]).filter((a) => open.includes(a)).map(item),
    })),
  ].filter((g) => g.items.length);
  return (
    <PortalShell area={t.area} viewer={viewer} role={t.roles[viewer.staff]} groups={groups}>
      {children}
    </PortalShell>
  );
}
