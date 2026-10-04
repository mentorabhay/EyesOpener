import type { Metadata } from "next";
import { site as t } from "@/copy/site";
import { MAX_DAILY_MINUTES, MIN_SCREEN_AGE } from "@/engine";
import { pageMeta } from "@/lib/site";
import { LegalPage, type LegalSection } from "../_components/legal";

const c = t.legal.children;
export const metadata: Metadata = pageMeta("/childrens-data", c.meta);

export default function ChildrensDataPage() {
  /* The limits are read from the engine, so this page cannot drift from what the app enforces. */
  const sections: LegalSection[] = c.sections.map((s) => ("limits" in s && s.limits
    ? { id: s.id, title: s.title, list: [s.limits.age(MIN_SCREEN_AGE), s.limits.cap(MAX_DAILY_MINUTES), s.limits.stop, s.limits.counsellor] }
    : s));
  return <LegalPage path="/childrens-data" title={c.title} lead={c.lead} sections={sections} />;
}
