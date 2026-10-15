/**
 * Screen Diverge Ramp. The ramp drill the other way: the two pictures drift so the eyes must relax outward to
 * keep one ring. It measures the break and the recovery turning out, reported as positive prism dioptres.
 *
 * Ink and rules are those of Screen Vergence Ramp (read its header). The one difference is the limit: turning
 * out stops at `k.divMax`, which the kit holds to 4 cm of separation so the eyes are never asked to point
 * outward past straight ahead.
 */
import { rampDrill } from "./screen-vergence-ramp";

export const screenDivergeRamp = rampDrill(-1);
