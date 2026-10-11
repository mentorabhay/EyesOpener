// Eyes Opener: What every template is given: the clip, what the server knows about this member and screen, and where the measurement goes. .
import type { OfferedClip } from "@/data/clips";
import type { ClipCtx } from "@/lib/clips";

/** What every template is given: the clip, what the server knows about this member and screen, and where the measurement goes. */
export interface TaskProps {
  def: OfferedClip;
  ctx: ClipCtx;
  /** Called once, with what the browser measured. The server works out and saves the result. */
  onDone: (data: unknown) => void;
}
