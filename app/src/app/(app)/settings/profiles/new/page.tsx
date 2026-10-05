import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, PageHead } from "@/components/ui";
import { settings } from "@/copy/settings";
import { childBirthYears } from "@/lib/family";
import { requireMember } from "@/lib/session";
import { ProfileForm } from "./profile-form";

const t = settings.newProfile;

export const generateMetadata = (): Metadata => ({ title: t.title });

export default async function NewProfilePage() {
  if (!(await requireMember()).can("manage_family")) notFound();
  const years = childBirthYears();
  return (
    <>
      <PageHead title={t.title} sub={t.sub} crumb={[{ href: "/settings", label: settings.title }]} />
      <div className="bento">
        <Card span={7}><ProfileForm minYear={years.min} maxYear={years.max} /></Card>
      </div>
    </>
  );
}
