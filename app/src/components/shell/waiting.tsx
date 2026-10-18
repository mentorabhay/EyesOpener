import { common } from "@/copy/common";

/**
 * Shown at once while a page of the app is on its way (audit U2): the press is acknowledged, the frame and its menu
 * stay, and grey blocks stand where the heading and the cards will be. Still, not flashing: the blocks only dim slowly,
 * and not at all when the device asks for less motion.
 */
export function Waiting() {
  return (
    <div className="waiting" role="status" aria-busy="true">
      <span className="sr-only">{common.loading}</span>
      <div className="wait-block wait-title" aria-hidden="true" />
      <div className="wait-block wait-sub" aria-hidden="true" />
      <div className="bento" aria-hidden="true">
        <div className="card wait-card" style={{ gridColumn: "span 7" }} />
        <div className="card wait-card" style={{ gridColumn: "span 5" }} />
        <div className="card wait-card wait-low" style={{ gridColumn: "span 12" }} />
      </div>
    </div>
  );
}
