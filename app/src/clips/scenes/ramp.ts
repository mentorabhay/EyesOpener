/**
 * The fusion-range clips on the game kit: how far the eyes follow a ring before it splits in two (the break), and
 * where it joins again on the way back (the recovery). One scene, set by direction and speed.
 *
 * Ink: the ring is the fusion target, one ring for each eye in that eye's ink, pulled apart sideways by the
 * demand. The left eye's ring has a dot at the top, the right eye's a dot at the bottom, so "one ring with both
 * dots" can only be seen with both eyes on and joined. The frame, the words and the split spot are in both ink.
 *
 * The limits are the kit's own (src/games/vergence.ts): the demand starts at zero in every repeat, `ramp` never
 * moves it faster than 2 prism dioptres a second, turning in stops at what the screen has room for and turning
 * out stops at 4 cm of separation, and the "it split in two" spot is always there.
 *
 * This is a measurement, so it differs from the training drill in three ways. It runs a set number of repeats and
 * then says it is done. Each repeat waits for the member's own "ready". And when the member says "it split", the
 * demand turns round at once and comes back at the same speed, with no sudden step, so the recovery is read on a
 * steady way down, as in the published test and the fusion range check-up.
 *
 * What it reports, for repeat n (1 to 3): `bn` the break, `rn` the recovery, `ln` 1 when the screen's limit was
 * reached with no split. Also `limit` (the most this screen could ask, cut to half a prism dioptre), `rate` (the
 * speed really used: slower when the member asked for reduced motion), `cannot` (1 when the member could not see
 * one ring with both dots at rest) and `done`.
 */
import { scenes as t } from "@/copy/clips";
import { ask, cue, pd, plan } from "@/drills/verg/parts";
import { FUSION_REPEATS } from "@/engine";
import { W, type GameDef, type Kit } from "@/games/kit";
import { single } from "@/games/verg/parts";
import { aim, newDemand, ramp, splitPressed, target, type Demand } from "@/games/vergence";

export interface RampState {
  d: Demand;
  phase: "ready" | "climb" | "top" | "back" | "home" | "rest" | "done";
  /** Repeats finished. */
  n: number;
  /** Seconds in this phase, and seconds left of a hold. */
  since: number; wait: number;
  /** The demand at the split of this repeat. */
  split: number;
  /** What the last repeat ran into, for one line of words. */
  why: "" | "limit" | "no_join";
}

/** A press this soon after a phase begins is the press that began it. */
const SETTLE = 0.4;
/** Seconds held at the screen's limit before the repeat is recorded there. */
const HOLD = 1.5;
const arrived = (d: Demand) => Math.abs(d.goal - d.now) < 1e-9;
const half = (v: number) => Math.floor(v * 2 + 1e-6) / 2;

/** The most this screen may ask this way, cut to half a prism dioptre. */
export const rampLimit = (k: Kit, way: 1 | -1) => half(way > 0 ? k.convMax : k.divMax);

export function rampClip(way: 1 | -1, rate: number): GameDef<RampState> {
  const far = (k: Kit) => way * rampLimit(k, way);
  const go = (s: RampState, phase: RampState["phase"]) => { s.phase = phase; s.since = 0; };
  const record = (k: Kit, s: RampState, brk: number, rec: number, atLimit: boolean) => {
    s.n += 1;
    k.report(`b${s.n}`, brk);
    k.report(`r${s.n}`, Math.min(rec, brk));
    k.report(`l${s.n}`, atLimit ? 1 : 0);
  };
  return {
    init(k) {
      k.report("limit", rampLimit(k, way));
      return { d: newDemand(), phase: "ready", n: 0, since: 0, wait: 0, split: 0, why: "" };
    },

    update(k, s) {
      const d = s.d;
      s.since += k.dt;
      k.report("limit", rampLimit(k, way));
      k.report("rate", Math.min(2, rate) * k.slow);
      if (s.phase === "done") return;

      if (s.phase === "ready" || s.phase === "rest") {
        /* at rest the split spot means "I do not see one ring with both dots": nothing can be measured today */
        if (splitPressed(k) && s.since > SETTLE) { k.report("cannot", 1); k.report("done", 1); go(s, "done"); return; }
        if (s.phase === "rest" && s.n >= FUSION_REPEATS) { k.report("done", 1); go(s, "done"); return; }
        if (single(k) && s.since > SETTLE) { s.why = ""; s.split = 0; aim(k, d, far(k)); go(s, "climb"); }
        return;
      }
      if (s.phase === "climb" || s.phase === "top") {
        if (splitPressed(k) && s.since > SETTLE && pd(d.now) > 0) {
          s.split = pd(d.now);
          aim(k, d, 0);
          go(s, "back");
          return;
        }
        if (s.phase === "climb") {
          aim(k, d, far(k));
          ramp(k, d, rate);
          if (arrived(d)) { s.wait = HOLD; go(s, "top"); }
        } else {
          s.wait -= k.dt;
          if (s.wait > 0) return;
          const limit = rampLimit(k, way);
          record(k, s, limit, limit, true);
          s.why = "limit";
          aim(k, d, 0);
          go(s, "home");
        }
        return;
      }
      if (s.phase === "back") {
        if (single(k) && s.since > SETTLE) { record(k, s, s.split, pd(d.now), false); aim(k, d, 0); go(s, "home"); return; }
        ramp(k, d, rate);
        if (arrived(d)) { record(k, s, s.split, 0, false); s.why = "no_join"; go(s, "rest"); }
        return;
      }
      /* home: glide back to rest before the next repeat, never faster than the kit allows */
      ramp(k, d, 2);
      if (arrived(d)) go(s, "rest");
    },

    draw(k, s) {
      k.frame();
      const p = plan(k);
      target(k, W / 2, p.mid, p.r, s.d.now);
      const repeat = Math.min(FUSION_REPEATS, s.n + (s.phase === "rest" || s.phase === "done" ? 0 : 1));
      k.hud(s.phase === "done" ? t.done : t.repeat(Math.max(1, repeat), FUSION_REPEATS));
      const line = s.phase === "done" ? (k.stats.cannot ? t.cannot : t.finished)
        : s.phase === "ready" ? t.ready
          : s.phase === "rest" ? (s.why === "limit" ? t.atLimit : s.why === "no_join" ? t.noJoin : t.rest)
            : s.phase === "back" ? t.back
              : s.phase === "home" ? (s.why === "limit" ? t.atLimit : t.home)
                : t.keep;
      cue(k, p, line);
      ask(k);
    },
  };
}
