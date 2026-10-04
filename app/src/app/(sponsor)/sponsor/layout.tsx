import type { ReactNode } from "react";
import { PortalShell } from "@/components/portal";
import { sponsor as t } from "@/copy/sponsor";
import { requireSponsor } from "@/lib/auth";
import { sponsorCan } from "@/lib/roles";

export default async function SponsorLayout({ children }: { children: ReactNode }) {
  const { viewer, sponsor } = await requireSponsor();
  const n = t.nav;
  /* A sponsor that is still waiting sees its status and nothing else. Editors do not see the team room. */
  const rooms = sponsor.status !== "approved" ? [] : [
    { href: "/sponsor/groups", label: n.groups },
    { href: "/sponsor/glasses", label: n.glasses },
    ...(sponsorCan(sponsor.role, "manage_team") ? [{ href: "/sponsor/team", label: n.team }] : []),
  ];
  const other = [
    ...(viewer.seat ? [{ href: viewer.seat === "circle" ? "/circle" : "/today", label: n.family }] : []),
    ...(viewer.staff ? [{ href: "/admin", label: n.admin }] : []),
    ...(viewer.counsellor ? [{ href: "/counsellor", label: n.counsellor }] : []),
  ];
  return (
    <PortalShell
      area={t.area} who={viewer.user.displayName} role={t.role[sponsor.role]}
      groups={[
        { title: n.title, items: [{ href: "/sponsor", label: n.overview }, ...rooms] },
        ...(other.length ? [{ title: n.other, items: other }] : []),
      ]}
    >
      {children}
    </PortalShell>
  );
}
