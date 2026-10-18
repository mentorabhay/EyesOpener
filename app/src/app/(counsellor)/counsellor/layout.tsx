import type { ReactNode } from "react";
import { PortalShell } from "@/components/portal";
import { cinemaClub } from "@/copy/cinema-club";
import { counsellor as t } from "@/copy/counsellor";
import { requireCounsellor } from "@/lib/auth";

export default async function CounsellorLayout({ children }: { children: ReactNode }) {
  const viewer = await requireCounsellor();
  /* A person can hold other roles too. Each sees only the areas their roles open. */
  const other = [
    ...(viewer.staff ? [{ href: "/admin", label: t.nav.admin }] : []),
    ...(viewer.sponsors.some((s) => s.status !== "suspended") ? [{ href: "/sponsor", label: t.nav.sponsor }] : []),
  ];
  return (
    <PortalShell
      area={t.area} viewer={viewer} role={t.role}
      groups={[
        { title: t.nav.title, items: [{ href: "/counsellor", label: t.nav.members }, { href: "/counsellor/profile", label: t.nav.profile }, { href: "/counsellor/cinema-club", label: cinemaClub.nav }] },
        ...(other.length ? [{ title: t.nav.other, items: other }] : []),
      ]}
    >
      {children}
    </PortalShell>
  );
}
