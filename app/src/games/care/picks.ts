/** What each day shows, worked out from the date alone so the page and the action agree. */
import { care as t } from "@/copy/games-care";
import { pickSeeded } from "@/lib/care";

/** Today's ten far-off things for Sky Spotter. The same for everyone on the same day. */
export const skyThings = (day: string) => pickSeeded(t.sky.things, 10, `sky:${day}`);

/** Things already found in today's hunt. */
export function skyFound(entries: { data: unknown }[]) {
  const found = new Set<string>();
  for (const e of entries) {
    const ids = (e.data as { found?: unknown } | null)?.found;
    if (Array.isArray(ids)) for (const id of ids) if (typeof id === "string") found.add(id);
  }
  return found;
}
