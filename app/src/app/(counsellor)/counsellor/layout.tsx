import type { ReactNode } from "react";
import { PortalShell } from "@/components/portal";
import { counsellor as t } from "@/copy/counsellor";
import { requireCounsellor } from "@/lib/auth";

export default async function CounsellorLayout({ children }: { children: ReactNode }) {
  const viewer = await requireCounsellor();
  /* A person can hold other roles too. Each sees only the areas their roles open. */
  const other = [
    ...(viewer.seat ? [{ href: viewer.seat === "circle" ? "/circle" : "/today", label: t.nav.family }] : []),
    ...(viewer.staff ? [{ href: "/admin", label: t.nav.admin }] : []),
    ...(viewer.sponsors.some((s) => s.status !== "suspended") ? [{ href: "/sponsor", label: t.nav.sponsor }] : []),
  ];
  return (
    <PortalShell
      area={t.area} who={viewer.user.displayName} role={t.role}
      groups={[
        { title: t.nav.title, items: [{ href: "/counsellor", label: t.nav.members }, { href: "/counsellor/profile", label: t.nav.profile }] },
        ...(other.length ? [{ title: t.nav.other, items: other }] : []),
      ]}
    >
      {children}
    </PortalShell>
  );
}
