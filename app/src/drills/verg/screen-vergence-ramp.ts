/**
 * Screen Vergence Ramp, and the same drill the other way (Screen Diverge Ramp).
 * It measures how far the eyes can follow before one picture turns into two (the break), and how far the
 * pull must come back before the two join again (the recovery). Both are in prism dioptres.
 *
 * Ink: the ring is the fusion target, one ring for each eye in that eye's ink, pulled apart sideways by the
 * demand. The left eye's ring has a dot at the top, the right eye's a dot at the bottom, so "one ring with both
 * dots" can only be seen with both eyes on and joined. The frame, the numbers, the instruction and the split
 * spot are in both ink: the same for the two eyes, they hold the eyes together.
 *
 * What the demand does: it starts at 0 and climbs 1 a second toward the limit of this screen.
 *  - "It split": the demand at that moment is the break. It eases at once, then comes down 1 a second until
 *    the member says "one ring again": the demand at that moment is the recovery. Two seconds of rest, then it
 *    climbs again from there.
 *  - No split all the way to the limit: it holds there three seconds, the limit is recorded as the break (the
 *    screen cannot ask for more), and the demand glides back to zero before the next climb.
 * There is no clock to beat and nothing to lose: a member can sit through as many climbs as the dose allows.
 */
import { words as t } from "@/copy/drills-verg";
import { W, type GameDef, type Kit } from "@/games/kit";
import { single } from "@/games/verg/parts";
import { aim, ease, newDemand, ramp, splitPressed, target, type Demand } from "@/games/vergence";
import { ask, cue, pd, plan } from "./parts";

interface State {
  d: Demand;
  /**
   * climb: the demand grows. back: it comes down after a split, until the member says it is one again.
   * rest: a short pause before the next climb. top: held at the screen's limit. home: gliding back to zero from the limit.
   */
  phase: "climb" | "back" | "rest" | "top" | "home";
  /** Seconds left in a pause or a hold. */
  wait: number;
  /** True while the words "The screen's limit" are shown. */
  limit: boolean;
}

/** Prism dioptres a second, up and down. */
const RATE = 1;
/** True once the drawn demand is exactly where it was sent. */
const arrived = (d: Demand) => Math.abs(d.goal - d.now) < 1e-9;

/** `way` is 1 for turning in (toward `k.convMax`) and -1 for turning out (toward `-k.divMax`). */
export function rampDrill(way: 1 | -1): GameDef<State> {
  const far = (k: Kit) => (way > 0 ? k.convMax : -k.divMax);
  return {
    init(k) {
      const d = newDemand();
      aim(k, d, far(k));
      return { d, phase: "climb", wait: 0, limit: false };
    },

    update(k, s) {
      const d = s.d;
      if (splitPressed(k)) {
        /* The break is read before the demand eases. A split while the demand is at rest is not a break. */
        const at = pd(d.now);
        if ((s.phase === "climb" || s.phase === "top") && at > 0) k.peak("break_pd", at);
        ease(k, d);
        aim(k, d, 0);
        s.phase = "back";
        s.limit = false;
        return;
      }
      if (s.phase === "back") {
        if (!single(k)) { ramp(k, d, RATE); return; }
        /* "One ring again": the recovery is the demand at this moment. Joined only at rest is no recovery to record. */
        const at = pd(d.now);
        if (at > 0) { k.peak("recover_pd", at); k.hit(); k.add(); }
        aim(k, d, d.now);
        s.phase = "rest";
        s.wait = 2;
      } else if (s.phase === "rest") {
        s.wait -= k.dt;
        if (s.wait > 0) return;
        s.limit = false;
        s.phase = "climb";
        aim(k, d, far(k));
      } else if (s.phase === "climb") {
        aim(k, d, far(k));
        ramp(k, d, RATE);
        if (arrived(d)) { s.phase = "top"; s.wait = 3; }
      } else if (s.phase === "top") {
        s.wait -= k.dt;
        if (s.wait > 0) return;
        /* Held at the most this screen can ask: that is recorded as the break, and the words say why. */
        if (pd(d.now) > 0) { k.peak("break_pd", pd(d.now)); k.hit(); k.add(); }
        s.limit = true;
        s.phase = "home";
        aim(k, d, 0);
      } else {
        ramp(k, d, RATE);
        if (arrived(d)) { s.phase = "rest"; s.wait = 2; }
      }
    },

    draw(k, s) {
      k.frame();
      const p = plan(k);
      target(k, W / 2, p.mid, p.r, s.d.now);
      k.hud(`${way > 0 ? t.turnedIn : t.turnedOut} ${Math.round(Math.abs(s.d.now))} · ${t.ramp.best} ${"break_pd" in k.stats ? k.stats.break_pd : t.none}`);
      cue(k, p, s.limit ? t.ramp.limit : s.phase === "back" ? t.ramp.again : s.phase === "rest" ? t.ramp.rest : t.keep);
      ask(k);
    },
  };
}

export const screenVergenceRamp = rampDrill(1);
