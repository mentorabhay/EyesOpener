"use server";
import { requireMember } from "@/lib/session";
import { sunsetFor, type SunsetView } from "@/lib/sunset-data";

/**
 * What the sky shows for the active profile now. The end of a session asks this, so that the sunset is decided by
 * the server from the day's own rows and never by the browser. It reads and writes nothing else.
 */
export async function sunsetNow(): Promise<SunsetView | null> {
  const m = await requireMember();
  if (!m.can("view")) return null;
  return sunsetFor(m);
}
