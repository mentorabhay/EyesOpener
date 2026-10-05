import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PortalShell } from "@/components/portal";
import { admin as t } from "@/copy/admin";
import { roomHref, roomsFor } from "@/lib/admin";
import { requireStaff } from "@/lib/auth";

export const generateMetadata = (): Metadata => ({ title: { default: t.area, template: `%s · ${t.area}` }, robots: { index: false } });

/** The frame of the admin console. The gate runs here and again in every page and every action. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const viewer = await requireStaff("overview");
  /* Only the rooms this role may open are listed. Any other room answers "not found". */
  const items = roomsFor(viewer.staff).map((area) => ({ href: roomHref(area), label: t.rooms[area].name }));
  return (
    <PortalShell area={t.area} who={viewer.user.displayName} role={t.roles[viewer.staff]} groups={[{ title: t.navTitle, items }]}>
      {children}
    </PortalShell>
  );
}
