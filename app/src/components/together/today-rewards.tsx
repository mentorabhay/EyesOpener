/**
 * What the rewards add to the Today page, for the active profile:
 *  - one quiet line when a Depth check-up has just found depth for the first time, and on that day's anniversary;
 *  - the sunset, once the day's practice minutes are done.
 * It shows nothing at all on an ordinary day. Server only.
 */
import Link from "next/link";
import { depthDay as d } from "@/copy/depth-day";
import { dayText } from "@/lib/community";
import { depthDayNote } from "@/lib/depth-day-data";
import type { Member } from "@/lib/session";
import { sunsetFor } from "@/lib/sunset-data";
import { SunsetPanel } from "./sunset-sky";

export async function TodayRewards({ m }: { m: Member }) {
  const [note, view] = await Promise.all([depthDayNote(m), sunsetFor(m)]);
  const name = m.profile.displayName;
  return (
    <>
      {note && (
        <p className="notice" data-b={note.kind === "new" ? "ok" : undefined}>
          {note.kind === "new" ? d.today.fresh(name, dayText(note.day)) : d.today.years(name, note.years)}{" "}
          <Link href="/together/depth-day">{note.kind === "new" ? d.today.freshLink : d.today.yearsLink}</Link>
        </p>
      )}
      <SunsetPanel view={view} />
    </>
  );
}
