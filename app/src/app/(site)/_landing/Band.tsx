// Eyes Opener: A picture between two landing scenes, shown only once staff have approved one for its slot.
import { SitePicture } from "@/components/site-picture/site-picture";
import { livePicture } from "@/lib/site-pictures/read";
import type { SlotId } from "@/lib/site-pictures/slots";

/** With no approved picture there is nothing here at all, so the landing page reads as it always did. */
export async function Band({ slot }: { slot: SlotId }) {
  if (!(await livePicture(slot))) return null;
  return <div className="lp-band"><SitePicture slot={slot} sizes="(max-width: 1160px) 100vw, 1120px" /></div>;
}
