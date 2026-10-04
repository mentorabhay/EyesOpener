import type { Metadata } from "next";
import { site as t } from "@/copy/site";
import { pageMeta } from "@/lib/site";
import { LegalPage } from "../_components/legal";

const p = t.legal.privacy;
export const metadata: Metadata = pageMeta("/privacy", p.meta);

export default function PrivacyPage() {
  return <LegalPage path="/privacy" title={p.title} lead={p.lead} sections={p.sections} />;
}
