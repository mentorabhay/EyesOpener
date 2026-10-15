import Link from "next/link";
import { test as c } from "@/copy/test";
import type { TestDef } from "@/data";
import { changesOf, type Series } from "./results";

const a = c.alert;

/**
 * The change alert of one test: shown when the latest result is worse than the one before it, or than the first one,
 * by more than the test's usual wobble. It asks for a repeat, and for an eye doctor only when the change stays.
 * A large letter-size drop since the last test asks for an eye doctor soon. Nothing is shown for an improvement.
 * `compact` leaves out which earlier result it was measured against: the hub's cards are small.
 */
export function ChangeAlert({ t, series, compact }: { t: TestDef; series: Series[]; compact?: boolean }) {
  const changed = changesOf(t, series);
  if (!changed.length) return null;
  /* an eye with a large drop gets the stronger sentence; any other changed eye keeps the usual one */
  const groups = [
    { head: a.urgent, lines: changed.filter((x) => x.urgent) },
    { head: a.changed, lines: changed.filter((x) => !x.urgent) },
  ].filter((g) => g.lines.length);
  return (
    <div className="notice stack" data-b={changed.some((x) => x.urgent) ? "danger" : "warn"} role="status">
      {groups.map((g) => (
        <div className="stack" key={g.head}>
          <p><b>{g.head}</b></p>
          {!compact && g.lines.map((x) => (
            <p className="small" key={x.eye ?? "both"}>
              {x.eye && `${c.eye[x.eye]}. `}{x.against.length === 2 ? a.against.both : a.against[x.against[0]]}
            </p>
          ))}
        </div>
      ))}
      <p className="small"><Link href="/test/summary">{a.openSummary}</Link></p>
    </div>
  );
}
