import Link from "next/link";
import { screen as t } from "@/copy/screen";
import { leakFor } from "@/engine";
import { screenFacts } from "@/lib/screen-rules";
import type { Member } from "@/lib/session";

/**
 * One line for any page that shows two-eye scenes: it appears only when the colour leak measured on this screen is
 * so high for the active profile that the stronger eye can see the weaker eye's pictures as well as its own
 * (`leakFor` in src/engine/calibrate.ts). It reads what the session already holds, so it costs no query.
 * Nothing is shown while the leak is not measured: an unmeasured screen is not a bad screen.
 */
export function ScreenWarning({ m }: { m: Pick<Member, "device" | "eye"> }) {
  if (!m.device || !m.eye) return null;
  const leak = screenFacts(m.device).leak;
  if (!leak || leakFor(leak, m.eye.strongContrast).level !== "high") return null;
  return <p className="notice" data-b="danger">{t.warning} <Link href="/settings/screen">{t.title}</Link></p>;
}
