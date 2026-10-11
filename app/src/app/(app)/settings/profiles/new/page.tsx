import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StepFlow } from "@/components/guide/flow";
import { More } from "@/components/guide/more";
import { listSteps } from "@/components/guide/steps";
import { guide as gw } from "@/copy/guide";
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
      <PageHead title={t.title} crumb={[{ href: "/settings", label: settings.title }]} />
      <StepFlow steps={listSteps(gw.profile, ["list", "sun", "people"])} compact />
      <div className="bento">
        <Card span={7}><ProfileForm minYear={years.min} maxYear={years.max} /></Card>
      </div>
      <More hint={t.sub}><p>{t.sub}</p></More>
    </>
  );
}
