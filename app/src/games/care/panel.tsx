// Eyes Opener: A care companion: a log the family keeps about care away from the screen, shown as a small story.
/**
 * A care companion: a log the family keeps about care away from the screen, shown as a small story.
 * It is not a screen session, so it has no dose, no glasses and no black therapy scene.
 */
import { notFound } from "next/navigation";
import type { Member } from "@/lib/session";
import { BlinkPanel, FarPanel } from "./breaks";
import { extraCompanion } from "./extra";
import { SkyPanel } from "./outdoor";
import { slugs } from "./slugs";

function companion(slug: string, m: Member) {
  switch (slug) {
    case "sky-spotter": return <SkyPanel m={m} />;
    case "blink-garden": return <BlinkPanel m={m} />;
    case "far-window": return <FarPanel m={m} />;
  }
  return extraCompanion(slug, m);
}

export async function CarePanel({ slug, m }: { slug: string; m: Member }) {
  if (!slugs.includes(slug) || !m.can("view")) notFound();
  return companion(slug, m);
}
