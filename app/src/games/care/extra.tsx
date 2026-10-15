/**
 * More care companions, when the build includes them. This edition has none.
 * Returns the screen for a companion, or nothing when the slug is not one of the extras.
 */
import type { ReactNode } from "react";
import type { Member } from "@/lib/session";

export function extraCompanion(slug: string, m: Member): ReactNode {
  void slug; void m;
  return undefined;
}
